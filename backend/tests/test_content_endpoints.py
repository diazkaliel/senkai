"""
Pruebas automatizadas para los endpoints del CMS y contenido dinámico de la tienda.
"""

import pytest
from starlette.testclient import TestClient

from app.main import app
from app.core.config import settings


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_get_public_content(client):
    """Verifica que la vitrina pública pueda leer el contenido consolidado."""
    res = client.get(f"{settings.API_V1_PREFIX}/content")
    assert res.status_code == 200
    data = res.json()
    assert "hero" in data
    assert "announcement" in data
    assert "stats" in data
    assert "statement" in data
    assert "editorial" in data
    assert "protocol" in data
    assert "contact" in data

    # Validar campos internos de Hero
    assert "headline" in data["hero"]
    assert "cta_text" in data["hero"]
    # Validar campos de Stats
    assert data["stats"]["dpi"] >= 150


def test_update_content_unauthorized(client):
    """Verifica que sin token de taller no se pueda actualizar ninguna sección."""
    payload = {
        "text": "Nuevo cintillo no autorizado",
        "is_active": True
    }
    res = client.put(f"{settings.API_V1_PREFIX}/admin/content/announcement", json=payload)
    assert res.status_code == 401


def test_update_announcement_authorized(client):
    """Verifica que con token de taller se actualice correctamente el anuncio."""
    headers = {"X-Workshop-Token": settings.WORKSHOP_SECRET_KEY}
    payload = {
        "text": "TALLER INDUSTRIAL ACTIVO // DESPACHO EN EL MISMO DÍA",
        "is_active": True
    }
    res = client.put(
        f"{settings.API_V1_PREFIX}/admin/content/announcement",
        json=payload,
        headers=headers
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["data"]["text"] == payload["text"]

    # Re-consultar el endpoint público para confirmar persistencia
    public_res = client.get(f"{settings.API_V1_PREFIX}/content")
    assert public_res.status_code == 200
    assert public_res.json()["announcement"]["text"] == payload["text"]


def test_update_content_invalid_section(client):
    """Verifica el manejo de error al intentar actualizar una sección que no existe."""
    headers = {"X-Workshop-Token": settings.WORKSHOP_SECRET_KEY}
    res = client.put(
        f"{settings.API_V1_PREFIX}/admin/content/seccion_inexistente",
        json={"algo": "invalido"},
        headers=headers
    )
    assert res.status_code == 404


def test_update_stats_validation_error(client):
    """Verifica que valores absurdos fuera de rango técnico sean rechazados con 422."""
    headers = {"X-Workshop-Token": settings.WORKSHOP_SECRET_KEY}
    # Temperatura de 900°C supera el rango físico de 120-220°C para poliamida DTF
    invalid_stats = {
        "dpi": 300,
        "min_order": 0,
        "wash_cycles": 50,
        "curing_temp": 900
    }
    res = client.put(
        f"{settings.API_V1_PREFIX}/admin/content/stats",
        json=invalid_stats,
        headers=headers
    )
    assert res.status_code == 422


def test_update_marquee_and_headers(client):
    """Verifica la actualización atómica del ticker Marquee y los encabezados de sección."""
    headers = {"X-Workshop-Token": settings.WORKSHOP_SECRET_KEY}
    
    # 1. Actualizar cinta Marquee
    marquee_payload = {
        "items": ["TEST DTF 2026", "EDICIÓN TALLER", "PRENSA 160C"],
        "is_active": True
    }
    res_m = client.put(
        f"{settings.API_V1_PREFIX}/admin/content/marquee",
        json=marquee_payload,
        headers=headers
    )
    assert res_m.status_code == 200
    assert res_m.json()["data"]["items"] == marquee_payload["items"]

    # 2. Actualizar encabezados de secciones
    headers_payload = {
        "catalog_tag": "NUEVAS COLECCIONES 2026",
        "catalog_title": "Streetwear Heavyweight Exclusivo",
        "catalog_desc": "Confección nacional y DTF de alta fidelidad.",
        "customizer_title": "Mesa de Personalización DTF",
        "customizer_desc": "Diseña en vivo y cotiza en segundos."
    }
    res_h = client.put(
        f"{settings.API_V1_PREFIX}/admin/content/headers",
        json=headers_payload,
        headers=headers
    )
    assert res_h.status_code == 200
    assert res_h.json()["data"]["catalog_title"] == headers_payload["catalog_title"]

    # 3. Comprobar que GET /content devuelve los datos actualizados
    res_pub = client.get(f"{settings.API_V1_PREFIX}/content")
    assert res_pub.status_code == 200
    pub_data = res_pub.json()
    assert pub_data["marquee"]["items"] == marquee_payload["items"]
    assert pub_data["headers"]["catalog_title"] == headers_payload["catalog_title"]
