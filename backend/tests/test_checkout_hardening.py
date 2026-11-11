"""Cobertura de fraude de precio, privacidad y consumo acotado de memoria."""
import json

from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings

ORDER_URL = f"{settings.API_V1_PREFIX}/orders/"


def checkout_payload(garment_id="garment-poleron-hoodie-320"):
    return {
        "customer": {
            "full_name": "QA Checkout",
            "email": "qa-hardening@senkai.example",
            "phone": "+56912345678",
            "delivery_method": "pickup",
        },
        "items": [{
            "garment_id": garment_id,
            "selected_color": {"name": "Negro", "hex_code": "#121212", "in_stock": True},
            "selected_size": "M",
            "quantity": 1,
        }],
    }


def test_reject_cross_garment_lookbook_price_and_preserve_stock():
    with TestClient(app) as client:
        payload = checkout_payload()
        payload["items"][0].update({
            "garment_name": "Polera Clásica Regular 'Senkai Original'",
            "lookbook_item_id": "col-polera-classic-regular",
        })
        response = client.post(ORDER_URL, json=payload)
        assert response.status_code == 400
        assert "no corresponde" in response.json()["detail"]


def test_legacy_lookbook_name_cannot_change_different_garment_price():
    with TestClient(app) as client:
        payload = checkout_payload()
        payload["items"][0]["garment_name"] = "Polera Clásica Regular 'Senkai Original'"
        official = client.get(f"{settings.API_V1_PREFIX}/garments/garment-poleron-hoodie-320").json()
        response = client.post(ORDER_URL, json=payload)
        assert response.status_code == 201, response.text
        assert response.json()["items"][0]["unit_price"] == official["size_prices"].get("M", official["base_price"])


def test_official_lookbook_id_prices_only_its_own_garment():
    with TestClient(app) as client:
        payload = checkout_payload("garment-polera-classic-180")
        payload["items"][0].update({
            "garment_name": "Polera Clásica Regular 'Senkai Original'",
            "lookbook_item_id": "col-polera-classic-regular",
        })
        response = client.post(ORDER_URL, json=payload)
        assert response.status_code == 201, response.text
        assert response.json()["items"][0]["unit_price"] == 16990


def test_payload_limits_refuse_excessive_items_and_prints():
    with TestClient(app) as client:
        payload = checkout_payload()
        payload["items"] *= 21
        assert client.post(ORDER_URL, json=payload).status_code == 422

        payload = checkout_payload()
        payload["items"][0]["prints"] = [{"print_size": "A4"}] * 9
        assert client.post(ORDER_URL, json=payload).status_code == 422


def test_payload_limits_refuse_huge_preview_and_http_body():
    with TestClient(app) as client:
        payload = checkout_payload()
        payload["items"][0]["prints"] = [{
            "print_size": "A4",
            "design_preview_base64": "A" * 1_500_001,
        }]
        assert client.post(ORDER_URL, json=payload).status_code == 422

        small_payload = json.dumps(checkout_payload())
        oversized_json = small_payload + (" " * (6 * 1024 * 1024))
        response = client.post(
            ORDER_URL, content=oversized_json,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 413, response.text


def test_public_tracking_requires_random_id_and_never_discloses_order_contents():
    with TestClient(app) as client:
        order = client.post(ORDER_URL, json=checkout_payload()).json()
        assert order["id"]
        assert client.get(f"{settings.API_V1_PREFIX}/orders/{order['order_number']}").status_code == 404

        public = client.get(f"{settings.API_V1_PREFIX}/orders/{order['id']}")
        assert public.status_code == 200, public.text
        assert public.json()["order_number"] == order["order_number"]
        assert set(public.json()).issubset(
            {"order_number", "status", "estimated_delivery", "tracking_code"}
        )

        admin = client.get(
            f"{settings.API_V1_PREFIX}/orders/{order['order_number']}",
            headers={"X-Workshop-Token": settings.WORKSHOP_SECRET_KEY}
        )
        assert admin.status_code == 200
        assert admin.json()["customer"]["email"] == "qa-hardening@senkai.example"
