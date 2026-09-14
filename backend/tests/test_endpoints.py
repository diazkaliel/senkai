"""
Suite de pruebas de integración automatizadas para Senkai DTF Studio.
Ejecuta sobre el kernel ASGI de FastAPI usando TestClient sin requerir
un servidor externo ni abrir puertos TCP de red.
"""

import pytest
from starlette.testclient import TestClient

from app.main import app
from app.core.config import settings


@pytest.fixture(scope="module")
def client():
    """Cliente de pruebas ASGI con ciclo de vida de aplicación completo."""
    with TestClient(app) as test_client:
        yield test_client


def test_healthcheck(client):
    """Verifica que el endpoint de salud responda 200 con la versión y servicio."""
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "Senkai" in data["service"] or "SENKAI" in data["service"]


def test_garments_catalog(client):
    """Valida la integridad del catálogo textil base (al menos 4 prendas de alta gama)."""
    res = client.get(f"{settings.API_V1_PREFIX}/garments/")
    assert res.status_code == 200
    garments = res.json()
    assert len(garments) >= 4

    first = garments[0]
    assert "id" in first
    assert "base_price" in first
    assert len(first["colors"]) > 0
    assert len(first["sizes"]) > 0


def test_garment_detail_and_not_found(client):
    """Verifica consulta de prenda individual y respuesta 404 ante ID inexistente."""
    res_ok = client.get(f"{settings.API_V1_PREFIX}/garments/garment-polera-heavyweight-240")
    assert res_ok.status_code == 200
    assert res_ok.json()["weight_gsm"] == 240

    res_404 = client.get(f"{settings.API_V1_PREFIX}/garments/prenda-fantasma-inexistente")
    assert res_404.status_code == 404


def test_dtf_volume_discounts_quote(client):
    """Verifica el cálculo de cotización y los escalones de descuento por volumen (1, 5, 10, 20 un)."""
    # 1 unidad: 0% descuento
    res1 = client.get(f"{settings.API_V1_PREFIX}/customizer/quote?position=espalda_completa&print_size=A3&quantity=1")
    assert res1.status_code == 200
    q1 = res1.json()
    assert q1["discount_percentage"] == 0
    assert q1["unit_dtf_price"] == 8900
    assert q1["total_dtf_cost"] == 8900

    # 5 unidades: 10% descuento
    res5 = client.get(f"{settings.API_V1_PREFIX}/customizer/quote?position=espalda_completa&print_size=A3&quantity=5")
    assert res5.status_code == 200
    q5 = res5.json()
    assert q5["discount_percentage"] == 10
    assert q5["unit_dtf_price"] == int(8900 * 0.90)

    # 10 unidades: 15% descuento
    res10 = client.get(f"{settings.API_V1_PREFIX}/customizer/quote?position=pecho_centro&print_size=A4&quantity=10")
    assert res10.status_code == 200
    q10 = res10.json()
    assert q10["discount_percentage"] == 15
    assert q10["unit_dtf_price"] == int(5900 * 0.85)

    # 20 unidades: 25% descuento
    res20 = client.get(f"{settings.API_V1_PREFIX}/customizer/quote?position=pecho_izquierdo&print_size=A6&quantity=20")
    assert res20.status_code == 200
    q20 = res20.json()
    assert q20["discount_percentage"] == 25
    assert q20["unit_dtf_price"] == int(2500 * 0.75)


def test_price_tampering_prevention(client):
    """
    PRUEBA DE SEGURIDAD CRÍTICA:
    Envía una orden con precios manipulados fraudulentamente a $1 CLP por el cliente.
    El backend DEBE descartar los precios del cliente y calcular el valor real autoritativamente.
    """
    tampered_payload = {
        "customer": {
            "full_name": "Atacante Web",
            "email": "hacker@test.com",
            "phone": "+56911112222",
            "delivery_method": "shipping",
            "shipping_address": "Calle Falsa 123",
            "shipping_city": "Santiago"
        },
        "items": [{
            "garment_id": "garment-polera-heavyweight-240",
            "garment_name": "Polera Manipulada",
            "selected_color": {"name": "Obsidian Black", "hex_code": "#121212", "in_stock": True},
            "selected_size": "L",
            "dtf_config": {
                "position": "pecho_centro",
                "print_size": "A4",
                "calculated_dtf_cost": 1  # Intento de pagar 1 peso por estampa
            },
            "quantity": 2,
            "unit_price": 1,  # Intento de pagar 1 peso unitario
            "subtotal": 2     # Intento de subtotal 2 pesos
        }],
        "total_amount": 2,    # Intento de total 2 pesos
        "shipping_cost": 0    # Intento de despacho gratis forzado
    }

    res = client.post(f"{settings.API_V1_PREFIX}/orders/", json=tampered_payload)
    assert res.status_code == 201
    order = res.json()

    # Prenda base 240g ($12.990) + estampa A4 x2 ($5.900) = $18.890 unitario
    # Subtotal 2 un. = $37.780
    # Despacho shipping = $3.990
    # Total real = $41.770 CLP
    expected_unit_price = 12990 + 5900
    expected_subtotal = expected_unit_price * 2
    expected_total = expected_subtotal + 3990

    assert order["items"][0]["unit_price"] == expected_unit_price
    assert order["items"][0]["subtotal"] == expected_subtotal
    assert order["shipping_cost"] == 3990
    assert order["total_amount"] == expected_total
    assert order["total_amount"] != 2, "VULNERABILIDAD: El servidor aceptó el precio manipulado del cliente"


def test_order_creation_and_kanban_flow(client):
    """Valida el ciclo de vida completo de una orden: creación, persistencia y avance en Kanban."""
    # 1. Crear orden legítima
    order_payload = {
        "customer": {
            "full_name": "Andrea Tapia",
            "email": "andrea.tapia@empresa.cl",
            "phone": "+56999887766",
            "delivery_method": "pickup"
        },
        "items": [{
            "garment_id": "garment-poleron-crewneck-300",
            "selected_color": {"name": "Obsidian Black", "hex_code": "#121212", "in_stock": True},
            "selected_size": "M",
            "dtf_config": {
                "position": "pecho_izquierdo",
                "print_size": "A6"
            },
            "quantity": 1
        }]
    }

    res_post = client.post(f"{settings.API_V1_PREFIX}/orders/", json=order_payload)
    assert res_post.status_code == 201
    created = res_post.json()
    order_id = created["id"]
    order_number = created["order_number"]

    # Al ser pickup, costo de envío debe ser 0
    assert created["shipping_cost"] == 0
    assert created["status"] == "cola_impresion_dtf"

    # 2. Consultar orden creada por código
    res_get = client.get(f"{settings.API_V1_PREFIX}/orders/{order_number}")
    assert res_get.status_code == 200
    assert res_get.json()["id"] == order_id

    # 3. Consultar métricas de taller con token de autorización
    admin_headers = {"X-Workshop-Token": settings.WORKSHOP_SECRET_KEY}
    res_metrics = client.get(f"{settings.API_V1_PREFIX}/admin/metrics", headers=admin_headers)
    assert res_metrics.status_code == 200
    metrics = res_metrics.json()
    assert metrics["total_orders"] >= 1
    assert metrics["linear_meters_film_estimated"] > 0

    # 4. Rechazar token inválido
    bad_headers = {"X-Workshop-Token": "token-falso-invalido"}
    res_unauth = client.get(f"{settings.API_V1_PREFIX}/admin/metrics", headers=bad_headers)
    assert res_unauth.status_code == 401

    # 5. Mover orden en el Kanban a termofijado
    patch_payload = {
        "status": "en_planchado_curado",
        "tracking_code": "TRACK-SNK-001"
    }
    res_patch = client.patch(
        f"{settings.API_V1_PREFIX}/admin/orders/{order_id}/status",
        json=patch_payload,
        headers=admin_headers
    )
    assert res_patch.status_code == 200
    assert res_patch.json()["status"] == "en_planchado_curado"
    assert res_patch.json()["tracking_code"] == "TRACK-SNK-001"


def test_multi_print_quote_calculation(client):
    """
    Verifica el endpoint de cotización multi-estampa (/customizer/quote-multi).
    Comprueba la agregación de múltiples transfers en ambas caras y aplicación de descuentos por volumen.
    """
    prints_payload = [
        {
            "view": "front",
            "print_size": "A4",
            "offset_x_pct": 50.0,
            "offset_y_pct": 38.0,
            "scale_factor": 1.0
        },
        {
            "view": "back",
            "print_size": "A3",
            "offset_x_pct": 50.0,
            "offset_y_pct": 42.0,
            "scale_factor": 1.0
        }
    ]

    # 1 unidad: 0% descuento (A4: 5900 + A3: 8900 = 14800)
    res1 = client.post(
        f"{settings.API_V1_PREFIX}/customizer/quote-multi",
        json={"prints": prints_payload, "quantity": 1}
    )
    assert res1.status_code == 200
    q1 = res1.json()
    assert q1["quantity"] == 1
    assert q1["discount_percentage"] == 0
    assert q1["unit_dtf_total"] == 14800
    assert q1["total_dtf_cost"] == 14800
    assert q1["linear_meters_estimated"] == 0.70  # A4 (0.30m) + A3 (0.40m)

    # 10 unidades: 15% descuento por volumen
    res10 = client.post(
        f"{settings.API_V1_PREFIX}/customizer/quote-multi",
        json={"prints": prints_payload, "quantity": 10}
    )
    assert res10.status_code == 200
    q10 = res10.json()
    assert q10["discount_percentage"] == 15
    # Unitario: A4 int(5900*0.85)=5015 + A3 int(8900*0.85)=7565 = 12580
    assert q10["unit_dtf_total"] == 12580
    assert q10["total_dtf_cost"] == 125800
    assert q10["linear_meters_estimated"] == 7.0


def test_multi_print_order_creation_and_recalculation(client):
    """
    Verifica el flujo completo de una orden con posicionamiento libre multi-estampa:
    1. Envía ítems con estampas frontales y traseras con coordenadas exactas.
    2. Valida que el recálculo autoritativo anule manipulaciones de precio del cliente.
    3. Comprueba que las coordenadas y formatos persistan fielmente en SQLite y sean consultables.
    """
    tampered_multi_payload = {
        "customer": {
            "full_name": "Valentina Morales",
            "email": "valentina.morales@diseno.cl",
            "phone": "+56987654321",
            "delivery_method": "shipping",
            "shipping_address": "Av. Providencia 1234, Depto 502",
            "shipping_city": "Providencia",
            "notes": "Centrar estampa frontal 4cm bajo cuello"
        },
        "items": [{
            "garment_id": "garment-polera-heavyweight-240",
            "garment_name": "Polera Oversized Heavyweight 240g",
            "selected_color": {"name": "Obsidian Black", "hex_code": "#121212", "in_stock": True},
            "selected_size": "L",
            "prints": [
                {
                    "view": "front",
                    "print_size": "A4",
                    "design_name": "Logotipo Senkai Pecho",
                    "offset_x_pct": 52.5,
                    "offset_y_pct": 36.0,
                    "scale_factor": 1.15
                },
                {
                    "view": "back",
                    "print_size": "A3",
                    "design_name": "Ilustración Mecha Unit",
                    "offset_x_pct": 50.0,
                    "offset_y_pct": 44.5,
                    "scale_factor": 1.0
                }
            ],
            "quantity": 2,
            "unit_price": 50,  # Manipulación maliciosa de precio
            "subtotal": 100
        }],
        "total_amount": 100,
        "shipping_cost": 0
    }

    res_post = client.post(f"{settings.API_V1_PREFIX}/orders/", json=tampered_multi_payload)
    assert res_post.status_code == 201
    created = res_post.json()

    # Base: $12.990 + A4: $5.900 + A3: $8.900 = $27.790 unitario
    # Subtotal 2 un: $55.580
    # Envío: $3.990
    # Total autoritativo: $59.570 CLP
    expected_unit = 12990 + 5900 + 8900
    expected_subtotal = expected_unit * 2
    expected_total = expected_subtotal + 3990

    item_res = created["items"][0]
    assert item_res["unit_price"] == expected_unit
    assert item_res["subtotal"] == expected_subtotal
    assert created["shipping_cost"] == 3990
    assert created["total_amount"] == expected_total

    # Validar que las 2 estampas preservaron sus coordenadas de calibración
    assert len(item_res["prints"]) == 2
    front_print = next(p for p in item_res["prints"] if p["view"] == "front")
    back_print = next(p for p in item_res["prints"] if p["view"] == "back")

    assert front_print["offset_x_pct"] == 52.5
    assert front_print["offset_y_pct"] == 36.0
    assert front_print["scale_factor"] == 1.15

    assert back_print["offset_x_pct"] == 50.0
    assert back_print["offset_y_pct"] == 44.5

    # Comprobar persistencia consultando por order_number
    order_number = created["order_number"]
    res_get = client.get(f"{settings.API_V1_PREFIX}/orders/{order_number}")
    assert res_get.status_code == 200
    saved = res_get.json()
    assert len(saved["items"][0]["prints"]) == 2
    assert saved["customer"]["notes"] == "Centrar estampa frontal 4cm bajo cuello"


def test_admin_auth_strictly_rejects_missing_token(client):
    """
    PRUEBA DE SEGURIDAD CRÍTICA:
    Verifica que omitir completamente la cabecera X-Workshop-Token retorne 401 Unauthorized,
    previniendo la vulnerabilidad de bypass por valor nulo.
    """
    res = client.get(f"{settings.API_V1_PREFIX}/admin/metrics")
    assert res.status_code == 401
    assert "Acceso denegado" in res.json()["detail"]


def test_orders_listing_strictly_rejects_unauthenticated(client):
    """
    PRUEBA DE PRIVACIDAD / PII:
    Verifica que el listado global de órdenes ya no sea público y requiera autorización de taller.
    """
    res = client.get(f"{settings.API_V1_PREFIX}/orders/")
    assert res.status_code == 401


def test_orders_listing_authorized(client):
    """Verifica que operarios con token válido puedan consultar las órdenes de taller."""
    headers = {"X-Workshop-Token": settings.WORKSHOP_SECRET_KEY}
    res = client.get(f"{settings.API_V1_PREFIX}/orders/", headers=headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_spa_path_traversal_blocked(client):
    """
    PRUEBA DE SEGURIDAD:
    Verifica que intentos de Directory Traversal hacia archivos fuera de frontend
    sean interceptados y confinados.
    """
    res = client.get("/../../requirements.txt")
    assert res.status_code == 200
    # Debe retornar el index.html de la SPA, nunca el contenido crudo de requirements.txt
    assert "fastapi==" not in res.text


def test_unit_pricing_pure_calculations():
    """Prueba unitaria pura sobre PricingService sin I/O ni FastAPI."""
    from app.services.pricing_service import pricing_service
    from app.schemas.domain import DTFPrintItem, DTFPrintSize

    # Test escala de descuento
    assert pricing_service.get_volume_discount_percentage(1) == 0
    assert pricing_service.get_volume_discount_percentage(5) == 10
    assert pricing_service.get_volume_discount_percentage(10) == 15
    assert pricing_service.get_volume_discount_percentage(20) == 25

    # Test consumo de metros: 1x A3 (0.4m) + 1x A4 (0.3m) = 0.7m por unidad x 2 un = 1.4m
    prints = [
        DTFPrintItem(view="front", print_size=DTFPrintSize.A3),
        DTFPrintItem(view="back", print_size=DTFPrintSize.A4)
    ]
    res = pricing_service.calculate_multi_prints_price(prints, quantity=2)
    assert res["linear_meters_estimated"] == 1.4
    assert res["discount_percentage"] == 0


def test_idempotency_key_prevents_duplicate_orders(client):
    """
    PRUEBA DE IDEMPOTENCIA:
    Envía dos peticiones de compra idénticas con la misma Idempotency-Key.
    La segunda llamada DEBE devolver exactamente la misma orden sin crear un registro duplicado.
    """
    idemp_key = "idemp-test-uuid-999888"
    order_payload = {
        "customer": {
            "full_name": "Cliente Idempotente",
            "email": "idemp@senkai.cl",
            "phone": "+56912344321",
            "delivery_method": "pickup"
        },
        "items": [{
            "garment_id": "garment-polera-heavyweight-240",
            "selected_color": {"name": "Obsidian Black", "hex_code": "#121212", "in_stock": True},
            "selected_size": "M",
            "prints": [{
                "view": "front",
                "print_size": "A6",
                "design_name": "Logo Idempotente"
            }],
            "quantity": 1
        }]
    }

    headers = {"Idempotency-Key": idemp_key}
    res1 = client.post(f"{settings.API_V1_PREFIX}/orders/", json=order_payload, headers=headers)
    assert res1.status_code == 201
    order1 = res1.json()

    # Segunda petición idéntica simulando doble clic del usuario
    res2 = client.post(f"{settings.API_V1_PREFIX}/orders/", json=order_payload, headers=headers)
    assert res2.status_code == 201
    order2 = res2.json()

    assert order1["id"] == order2["id"]
    assert order1["order_number"] == order2["order_number"]


def test_state_machine_prevents_illegal_jump(client):
    """
    PRUEBA DE MÁQUINA DE ESTADOS:
    Intenta mover una orden directamente de 'cola_impresion_dtf' a 'entregado'.
    Debe fallar con 400 Bad Request y mensaje descriptivo de violación de etapas.
    """
    # 1. Crear una orden que entra en cola de impresión
    order_payload = {
        "customer": {
            "full_name": "Test Transición",
            "email": "fsm@senkai.cl",
            "phone": "+56955556666",
            "delivery_method": "pickup"
        },
        "items": [{
            "garment_id": "garment-polera-classic-180",
            "selected_color": {"name": "Obsidian Black", "hex_code": "#121212", "in_stock": True},
            "selected_size": "L",
            "quantity": 1
        }]
    }
    res_order = client.post(f"{settings.API_V1_PREFIX}/orders/", json=order_payload)
    assert res_order.status_code == 201
    order_id = res_order.json()["id"]

    # 2. Intentar salto ilegal a 'entregado'
    admin_headers = {"X-Workshop-Token": settings.WORKSHOP_SECRET_KEY}
    illegal_patch = {"status": "entregado"}
    res_illegal = client.patch(
        f"{settings.API_V1_PREFIX}/admin/orders/{order_id}/status",
        json=illegal_patch,
        headers=admin_headers
    )
    assert res_illegal.status_code == 400
    assert "sin completar las etapas intermedias" in res_illegal.json()["detail"]


def test_correlation_id_header_propagated(client):
    """
    PRUEBA DE OBSERVABILIDAD:
    Verifica que cada respuesta HTTP contenga los headers X-Correlation-ID y X-Response-Time-Ms.
    """
    custom_cid = "cid-custom-track-123"
    res = client.get("/health", headers={"X-Request-ID": custom_cid})
    assert res.status_code == 200
    assert res.headers.get("X-Correlation-ID") == custom_cid
    assert "X-Response-Time-Ms" in res.headers



