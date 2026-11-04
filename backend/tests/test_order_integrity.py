"""
Regresiones de integridad de compra: stock, folios e idempotencia bajo concurrencia.

No utiliza mocks de la capa SQL. TestClient ejecuta la API real mientras varias
peticiones compiten por la misma base SQLite con conexiones independientes.
"""
import asyncio
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, update

from app.core.config import settings
from app.db.models import GarmentVariantModel
from app.db.session import async_session_factory
from app.main import app


GARMENT_ID = "garment-polera-classic-180"
ORDER_URL = f"{settings.API_V1_PREFIX}/orders/"


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(autouse=True)
def allow_burst_of_integrity_test_orders(monkeypatch):
    # Estas pruebas miden integridad transaccional, no el limitador de tráfico.
    monkeypatch.setattr(settings, "RATE_LIMIT_ORDERS_PER_MINUTE", 1000)


def make_order(customer_name: str, *, size: str = "XL", quantity: int = 1):
    return {
        "customer": {
            "full_name": customer_name,
            "email": "qa-integrity@senkai.example",
            "phone": "+56912345678",
            "delivery_method": "pickup",
        },
        "items": [{
            "garment_id": GARMENT_ID,
            "selected_color": {"name": "Negro", "hex_code": "#121212", "in_stock": True},
            "selected_size": size,
            "quantity": quantity,
        }],
    }


def variant_stock(size: str) -> int:
    async def read_stock():
        async with async_session_factory() as session:
            return await session.scalar(
                select(GarmentVariantModel.stock_quantity).where(
                    GarmentVariantModel.garment_id == GARMENT_ID,
                    GarmentVariantModel.color_hex == "#121212",
                    GarmentVariantModel.size == size,
                )
            )

    stock = asyncio.run(read_stock())
    assert stock is not None
    return stock


def set_variant_stock(size: str, quantity: int) -> None:
    async def write_stock():
        async with async_session_factory() as session:
            await session.execute(
                update(GarmentVariantModel).where(
                    GarmentVariantModel.garment_id == GARMENT_ID,
                    GarmentVariantModel.color_hex == "#121212",
                    GarmentVariantModel.size == size,
                ).values(stock_quantity=quantity)
            )
            await session.commit()

    asyncio.run(write_stock())


def submit_concurrently(client, payloads, headers=None):
    rendezvous = Barrier(len(payloads))

    def submit_order(payload):
        rendezvous.wait(timeout=10)
        return client.post(ORDER_URL, json=payload, headers=headers or {})

    with ThreadPoolExecutor(max_workers=len(payloads)) as workers:
        return list(workers.map(submit_order, payloads))


def test_duplicate_lines_consume_aggregate_stock(client):
    initial_stock = variant_stock("XL")
    try:
        set_variant_stock("XL", 3)
        payload = make_order("Pedido con variantes repetidas", quantity=2)
        payload["items"].append(dict(payload["items"][0]))

        response = client.post(ORDER_URL, json=payload)
        assert response.status_code == 400, response.text
        assert "Stock insuficiente" in response.json()["detail"]
        assert variant_stock("XL") == 3
    finally:
        set_variant_stock("XL", initial_stock)


def test_failed_multi_variant_order_rolls_back_first_stock_reservation(client):
    initial_medium = variant_stock("M")
    initial_large = variant_stock("L")
    try:
        set_variant_stock("M", 1)
        set_variant_stock("L", 0)
        payload = make_order("Rollback entre dos tallas", size="M")
        payload["items"].append(make_order("Rollback", size="L")["items"][0])

        response = client.post(ORDER_URL, json=payload)
        assert response.status_code == 400, response.text
        assert variant_stock("M") == 1
        assert variant_stock("L") == 0
    finally:
        set_variant_stock("M", initial_medium)
        set_variant_stock("L", initial_large)


def test_reused_idempotency_key_with_different_payload_is_conflict(client):
    initial_stock = variant_stock("XL")
    try:
        set_variant_stock("XL", 3)
        same_key = str(uuid4())
        original_order = make_order("Primera solicitud")
        changed_order = make_order("Solicitud diferente")

        first = client.post(ORDER_URL, json=original_order, headers={"Idempotency-Key": same_key})
        assert first.status_code == 201, first.text
        assert variant_stock("XL") == 2

        conflict = client.post(ORDER_URL, json=changed_order, headers={"Idempotency-Key": same_key})
        assert conflict.status_code == 409, conflict.text
        assert variant_stock("XL") == 2

        replay = client.post(ORDER_URL, json=original_order, headers={"Idempotency-Key": same_key})
        assert replay.status_code == 201, replay.text
        assert replay.json()["id"] == first.json()["id"]
        assert variant_stock("XL") == 2
    finally:
        set_variant_stock("XL", initial_stock)


def test_parallel_orders_for_last_unit_cannot_oversell(client):
    initial_stock = variant_stock("XL")
    try:
        set_variant_stock("XL", 1)
        requests = [
            make_order("Competidor Uno"),
            make_order("Competidor Dos"),
        ]

        responses = submit_concurrently(client, requests)
        assert sorted(response.status_code for response in responses) == [201, 400], [
            response.text for response in responses
        ]
        assert variant_stock("XL") == 0
    finally:
        set_variant_stock("XL", initial_stock)


def test_parallel_orders_receive_distinct_sequential_numbers(client):
    initial_stock = variant_stock("XL")
    try:
        set_variant_stock("XL", 2)
        requests = [
            make_order("Folio simultáneo A"),
            make_order("Folio simultáneo B"),
        ]

        responses = submit_concurrently(client, requests)
        assert all(response.status_code == 201 for response in responses), [
            response.text for response in responses
        ]
        numbers = [response.json()["order_number"] for response in responses]
        assert len(set(numbers)) == 2
        assert variant_stock("XL") == 0
    finally:
        set_variant_stock("XL", initial_stock)


def test_parallel_retries_with_same_key_create_only_one_order(client):
    initial_stock = variant_stock("XL")
    try:
        set_variant_stock("XL", 2)
        same_key = str(uuid4())
        payload = make_order("Reintento simultáneo")

        responses = submit_concurrently(
            client,
            [payload, payload],
            headers={"Idempotency-Key": same_key},
        )
        assert all(response.status_code == 201 for response in responses), [
            response.text for response in responses
        ]
        assert responses[0].json()["id"] == responses[1].json()["id"]
        assert responses[0].json()["order_number"] == responses[1].json()["order_number"]
        assert variant_stock("XL") == 1
    finally:
        set_variant_stock("XL", initial_stock)


def test_idempotency_record_failure_rolls_back_order_and_stock(client, monkeypatch):
    """Ni el pedido ni el descuento sobreviven si falla el último paso transaccional."""
    from sqlalchemy import func

    from app.db.models import OrderModel
    from app.services.order_service import order_service

    async def count_orders():
        async with async_session_factory() as session:
            return await session.scalar(select(func.count()).select_from(OrderModel))

    async def fail_idempotency_record(session, record):
        raise ValueError("Fallo simulado guardando la clave de idempotencia")

    original_stock = variant_stock("XL")
    original_order_count = asyncio.run(count_orders())

    try:
        set_variant_stock("XL", 2)
        monkeypatch.setattr(order_service.repository, "save_idempotency_record", fail_idempotency_record)

        failed = client.post(
            ORDER_URL,
            json=make_order("Compra con fallo de persistencia"),
            headers={"Idempotency-Key": str(uuid4())},
        )

        assert failed.status_code == 400, failed.text
        assert variant_stock("XL") == 2
        assert asyncio.run(count_orders()) == original_order_count
    finally:
        set_variant_stock("XL", original_stock)
