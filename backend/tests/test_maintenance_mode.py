"""La ventana de mantenimiento no puede aceptar pedidos ni subir artes DTF."""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core import maintenance
from app.main import app


@pytest.fixture
def blocked_store(tmp_path, monkeypatch):
    marker = tmp_path / ".senkai-maintenance"
    monkeypatch.setattr(maintenance, "MAINTENANCE_FLAG_PATH", marker)
    with TestClient(app) as client:
        marker.touch()
        yield client, marker


def test_blocked_store_preserves_reads_and_healthcheck(blocked_store):
    client, _ = blocked_store

    assert client.get("/health").status_code == 200
    assert client.get("/api/v1/garments/").status_code == 200
    assert client.get("/api/v1/content").status_code == 200


def test_checkout_is_rejected_before_validation_and_without_processing(blocked_store):
    client, _ = blocked_store
    response = client.post("/api/v1/orders/", json={"customer": "invalid", "items": []})

    assert response.status_code == 503
    assert response.json()["code"] == "MAINTENANCE_MODE"
    assert response.headers["Retry-After"] == "120"
    assert response.headers["Cache-Control"] == "no-store"
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Correlation-ID"]


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("POST", "/api/v1/customizer/upload"),
        ("POST", "/api/v1/admin/upload-image"),
        ("PATCH", "/api/v1/admin/orders/not-an-order/status"),
        ("PUT", "/api/v1/admin/content/hero"),
        ("DELETE", "/api/v1/admin/garments/not-a-garment"),
        ("PATCH", "/api/v1/admin/garments/not-a-garment/variants/not-a-variant"),
    ],
)
def test_maintenance_blocks_uploads_and_admin_writes(blocked_store, method, path):
    client, _ = blocked_store

    response = client.request(method, path)

    assert response.status_code == 503
    assert response.json()["code"] == "MAINTENANCE_MODE"


def test_preflight_stays_available_during_maintenance(blocked_store):
    client, _ = blocked_store
    response = client.options(
        "/api/v1/orders/",
        headers={
            "Origin": "https://senkaistore.com",
            "Access-Control-Request-Method": "POST",
        },
    )

    assert response.status_code == 200
    assert response.headers["Access-Control-Allow-Origin"] == "https://senkaistore.com"


def test_removing_marker_reopens_only_future_requests(blocked_store):
    client, marker = blocked_store

    assert client.post("/api/v1/orders/", json={}).status_code == 503
    marker.unlink()
    # El JSON inválido vuelve al validador y no puede generar un pedido real.
    assert client.post("/api/v1/orders/", json={}).status_code == 422


def test_marker_stat_failure_fails_closed(blocked_store, monkeypatch):
    client, _ = blocked_store

    class UnreadableMarker:
        def stat(self):
            raise PermissionError("El volumen no está disponible")

    monkeypatch.setattr(maintenance, "MAINTENANCE_FLAG_PATH", UnreadableMarker())

    assert client.post("/api/v1/orders/", json={}).status_code == 503
