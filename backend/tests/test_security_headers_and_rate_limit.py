"""
Pruebas automatizadas de endurecimiento HTTP y control de tasa (Rate Limiting).
Verifica cabeceras OWASP (nosniff, DENY iframes) y respuesta 429 ante abuso de endpoints críticos.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.core.rate_limiter import limiter


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_security_headers_injected_in_responses(client):
    """Verifica que el middleware inyecte cabeceras OWASP de protección."""
    res = client.get("/health")
    assert res.status_code == 200
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert res.headers.get("X-Frame-Options") == "DENY"
    assert res.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert "camera=()" in res.headers.get("Permissions-Policy", "")


def test_rate_limiting_orders_endpoint_triggers_429(client):
    """Verifica que exceder la cuota por minuto en /orders devuelva 429 Too Many Requests."""
    # Reseteo temporal del historial para el test
    test_key = "testclient:orders"
    limiter._history[test_key] = []

    # Enviamos peticiones hasta saturar el límite configurado
    max_reqs = settings.RATE_LIMIT_ORDERS_PER_MINUTE
    responses = []
    for _ in range(max_reqs + 2):
        # Petición GET o POST a la ruta que activa la regla
        res = client.post(
            f"{settings.API_V1_PREFIX}/orders",
            json={"items": [], "shipping_cost": 0, "total_amount": 0}
        )
        responses.append(res)

    # Las últimas peticiones deben haber sido frenadas por el Rate Limiter
    blocked = [r for r in responses if r.status_code == 429]
    assert len(blocked) >= 1
    last_blocked = blocked[-1]
    assert "Retry-After" in last_blocked.headers
    data = last_blocked.json()
    assert "límite de solicitudes" in data["detail"].lower()
    assert "retry_after_seconds" in data

    # Limpiamos el historial para no afectar otros tests
    limiter._history.clear()


@pytest.mark.anyio
async def test_sqlite_wal_pragmas_active():
    """Verifica que el pool de conexiones SQLite aplique journal_mode WAL, busy_timeout y foreign keys."""
    from sqlalchemy import text
    from app.db.session import engine

    if "sqlite" in settings.DATABASE_URL:
        async with engine.connect() as conn:
            jm = (await conn.execute(text("PRAGMA journal_mode;"))).scalar()
            bt = (await conn.execute(text("PRAGMA busy_timeout;"))).scalar()
            fk = (await conn.execute(text("PRAGMA foreign_keys;"))).scalar()

            assert jm.lower() == "wal"
            assert bt >= 5000
            assert fk == 1


def test_production_mode_rejects_default_secret_key():
    """Valida que en modo 'production' Pydantic rechace la clave secreta por defecto."""
    from pydantic import ValidationError
    from app.core.config import Settings

    with pytest.raises(ValidationError) as exc_info:
        Settings(ENVIRONMENT="production", WORKSHOP_SECRET_KEY="senkai-taller-secret-key-2026")
    
    assert "RIESGO CRÍTICO DE SEGURIDAD" in str(exc_info.value)


def test_production_mode_accepts_strong_secret_key():
    """Valida que en modo 'production' una clave fuerte de 64 caracteres sea aceptada."""
    from app.core.config import Settings

    strong_secret = "a" * 64
    prod_settings = Settings(ENVIRONMENT="production", WORKSHOP_SECRET_KEY=strong_secret)
    assert prod_settings.ENVIRONMENT == "production"
    assert prod_settings.WORKSHOP_SECRET_KEY == strong_secret


def test_cache_control_headers_for_api_and_static(client):
    """Verifica que las rutas de API y SPA no tengan caché, mientras que los estáticos sí."""
    # 1. API: sin caché para datos en tiempo real
    res_api = client.get(f"{settings.API_V1_PREFIX}/catalog/garments")
    assert res_api.status_code == 200
    assert "no-store" in res_api.headers.get("Cache-Control", "")
    assert res_api.headers.get("Pragma") == "no-cache"

    # 2. Healthcheck: sin caché
    res_health = client.get("/health")
    assert res_health.status_code == 200
    assert "no-store" in res_health.headers.get("Cache-Control", "")

    # 3. SPA Root: sin caché para recarga inmediata de bundles
    res_root = client.get("/")
    assert res_root.status_code == 200
    assert "no-store" in res_root.headers.get("Cache-Control", "")

    # 4. Assets estáticos en desarrollo: no-cache
    res_static = client.get("/static/css/components.css")
    assert res_static.status_code == 200
    assert res_static.headers.get("Cache-Control") == "no-cache"

