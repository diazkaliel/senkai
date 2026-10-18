"""
Suite de pruebas de integración automatizadas para Senkai DTF Studio.
Ejecuta sobre el kernel ASGI de FastAPI usando TestClient sin requerir
un servidor externo ni abrir puertos TCP de red.
"""

import os
import pytest
from fastapi.testclient import TestClient

import asyncio
from sqlalchemy import update
from app.main import app
from app.core.config import settings
from app.db.session import async_session_factory
from app.db.models import GarmentVariantModel


@pytest.fixture(scope="module")
def client():
    """Cliente de pruebas ASGI con ciclo de vida de aplicación completo e inventario verificado."""
    with TestClient(app) as test_client:
        async def reset_inventory():
            async with async_session_factory() as session:
                await session.execute(update(GarmentVariantModel).values(stock_quantity=50))
                await session.commit()

        asyncio.run(reset_inventory())
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

    # Prenda 240g con estampado incluido ($12.990 unitario)
    # Subtotal 2 un. = $25.980
    # Despacho shipping = $3.990
    # Total real = $29.970 CLP
    expected_unit_price = 12990
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
            "preview_front_summary": "A4 (Logotipo Senkai Pecho)",
            "preview_back_summary": "A3 (Ilustración Mecha Unit)",
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

    # Prenda con estampado incluido: $12.990 unitario
    # Subtotal 2 un: $25.980
    # Envío: $3.990
    # Total autoritativo: $29.970 CLP
    expected_unit = 12990
    expected_subtotal = expected_unit * 2
    expected_total = expected_subtotal + 3990

    item_res = created["items"][0]
    assert item_res["unit_price"] == expected_unit
    assert item_res["subtotal"] == expected_subtotal
    assert created["shipping_cost"] == 3990
    assert created["total_amount"] == expected_total
    assert item_res["preview_front_summary"] == "A4 (Logotipo Senkai Pecho)"
    assert item_res["preview_back_summary"] == "A3 (Ilustración Mecha Unit)"

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
    assert saved["items"][0]["preview_front_summary"] == "A4 (Logotipo Senkai Pecho)"
    assert saved["items"][0]["preview_back_summary"] == "A3 (Ilustración Mecha Unit)"
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


def test_admin_update_garment_price_and_photo(client):
    """
    PRUEBA DE GESTIÓN COMERCIAL:
    Verifica que el administrador pueda modificar de forma persistente el precio base
    y las fotos reales de una prenda, y que las órdenes posteriores calculen con el nuevo precio.
    """
    garment_id = "garment-polera-classic-180"

    # 1. Sin token debe fallar con 401
    res_unauth = client.patch(
        f"{settings.API_V1_PREFIX}/admin/garments/{garment_id}",
        json={"base_price": 9990}
    )
    assert res_unauth.status_code == 401

    # 2. Con token debe actualizar precio y fotos
    admin_headers = {"X-Workshop-Token": settings.WORKSHOP_SECRET_KEY}
    update_payload = {
        "base_price": 10990,
        "photo_front": "/static/assets/garments/tshirt_front.png",
        "photo_back": "/static/assets/garments/tshirt_back.png"
    }
    res_update = client.patch(
        f"{settings.API_V1_PREFIX}/admin/garments/{garment_id}",
        json=update_payload,
        headers=admin_headers
    )
    assert res_update.status_code == 200
    updated_data = res_update.json()
    assert updated_data["base_price"] == 10990
    assert updated_data["photo_front"] == "/static/assets/garments/tshirt_front.png"

    # 3. Comprobar que GET /garments/{garment_id} refleja el cambio
    res_get = client.get(f"{settings.API_V1_PREFIX}/garments/{garment_id}")
    assert res_get.status_code == 200
    assert res_get.json()["base_price"] == 10990

    # 4. Crear un pedido y verificar recálculo autoritativo con el nuevo precio base
    order_payload = {
        "customer": {
            "full_name": "Test Nuevo Precio",
            "email": "precio@senkai.cl",
            "phone": "+56911112222",
            "delivery_method": "pickup"
        },
        "items": [{
            "garment_id": garment_id,
            "selected_color": {"name": "Negro", "hex_code": "#121212", "in_stock": True},
            "selected_size": "M",
            "quantity": 2
        }]
    }
    res_order = client.post(f"{settings.API_V1_PREFIX}/orders/", json=order_payload)
    assert res_order.status_code == 201
    # 2 unidades a $10.990 = $21.980
    assert res_order.json()["total_amount"] == 21980


def test_admin_auth_rejects_old_hardcoded_tokens(client):
    """
    Verifica que los tokens anteriormente hardcodeados en código sean rechazados con 401,
    haciendo cumplir que únicamente la variable de entorno WORKSHOP_SECRET_KEY sea válida.
    """
    # Si la variable de entorno es la por defecto, probamos con un token viejo variante
    fake_old_token = "senkai_taller_secret_2026_obsoleto"
    res = client.get(
        f"{settings.API_V1_PREFIX}/admin/metrics",
        headers={"X-Workshop-Token": fake_old_token}
    )
    assert res.status_code == 401
    assert "Acceso denegado" in res.json()["detail"]


def test_public_tracking_masks_pii_and_auth_reveals(client):
    """
    PRUEBA DE PRIVACIDAD CRÍTICA:
    1. Crea una orden con datos personales completos (nombre, email, teléfono, dirección exacta).
    2. Consulta pública: Verifica que el DTO sanitizado enmascare el nombre y NO exponga email, teléfono ni dirección.
    3. Consulta de taller autenticada: Verifica que un operario sí reciba los datos de despacho completos.
    """
    order_payload = {
        "customer": {
            "full_name": "Carlos Santana",
            "email": "carlos.santana@rock.com",
            "phone": "+56987654321",
            "delivery_method": "shipping",
            "shipping_address": "Av. Libertador Bernardo O'Higgins 1050",
            "shipping_city": "Santiago",
            "notes": "Dejar en conserjería"
        },
        "items": [{
            "garment_id": "garment-polera-heavyweight-240",
            "selected_color": {"name": "Negro", "hex_code": "#121212", "in_stock": True},
            "selected_size": "L",
            "quantity": 1
        }]
    }

    res_create = client.post(f"{settings.API_V1_PREFIX}/orders/", json=order_payload)
    assert res_create.status_code == 201
    order_data = res_create.json()
    order_number = order_data["order_number"]

    # Consulta Pública (sin cabecera de taller)
    res_public = client.get(f"{settings.API_V1_PREFIX}/orders/{order_number}")
    assert res_public.status_code == 200
    public_dto = res_public.json()

    assert "customer" in public_dto
    customer_pub = public_dto["customer"]
    assert customer_pub["full_name"] == "Carlos S.", "El nombre no fue enmascarado adecuadamente para proteger la privacidad"
    assert "email" not in customer_pub, "FUGA DE PRIVACIDAD: El correo fue expuesto a clientes no autenticados"
    assert "phone" not in customer_pub, "FUGA DE PRIVACIDAD: El teléfono fue expuesto a clientes no autenticados"
    assert "shipping_address" not in customer_pub, "FUGA DE PRIVACIDAD: La dirección exacta fue expuesta públicamente"
    assert customer_pub["shipping_city"] == "Santiago"
    assert customer_pub["notes"] == "Dejar en conserjería"

    # Consulta Autenticada con Token de Taller
    admin_headers = {"X-Workshop-Token": settings.WORKSHOP_SECRET_KEY}
    res_admin = client.get(f"{settings.API_V1_PREFIX}/orders/{order_number}", headers=admin_headers)
    assert res_admin.status_code == 200
    admin_dto = res_admin.json()

    assert admin_dto["customer"]["full_name"] == "Carlos Santana"
    assert admin_dto["customer"]["email"] == "carlos.santana@rock.com"
    assert admin_dto["customer"]["phone"] == "+56987654321"
    assert admin_dto["customer"]["shipping_address"] == "Av. Libertador Bernardo O'Higgins 1050"


def test_insufficient_stock_rejection(client):
    """
    PRUEBA DE CONSISTENCIA DE INVENTARIO:
    Intenta ordenar una cantidad que excede las existencias físicas disponibles.
    El backend debe rechazar con HTTP 400 indicando stock insuficiente.
    """
    excessive_payload = {
        "customer": {
            "full_name": "Comprador Excesivo",
            "email": "exceso@test.com",
            "phone": "+56900000000",
            "delivery_method": "pickup"
        },
        "items": [{
            "garment_id": "garment-polera-heavyweight-240",
            "selected_color": {"name": "Negro", "hex_code": "#121212", "in_stock": True},
            "selected_size": "XL",
            "quantity": 99999  # Excede los 50 disponibles en seed
        }]
    }

    res = client.post(f"{settings.API_V1_PREFIX}/orders/", json=excessive_payload)
    assert res.status_code == 400
    assert "Stock insuficiente" in res.json()["detail"]


def test_order_concurrency_numbering_sequential(client):
    """
    Valida que dos pedidos creados consecutivamente generen códigos secuenciales crecientes
    sin colisión de claves únicas.
    """
    def make_payload(name):
        return {
            "customer": {
                "full_name": name,
                "email": f"{name.lower().replace(' ', '')}@test.cl",
                "phone": "+56911223344",
                "delivery_method": "pickup"
            },
            "items": [{
                "garment_id": "garment-polera-classic-180",
                "selected_color": {"name": "Negro", "hex_code": "#121212", "in_stock": True},
                "selected_size": "S",
                "quantity": 1
            }]
        }

    res1 = client.post(f"{settings.API_V1_PREFIX}/orders/", json=make_payload("Orden Secuencial A"))
    res2 = client.post(f"{settings.API_V1_PREFIX}/orders/", json=make_payload("Orden Secuencial B"))

    assert res1.status_code == 201
    assert res2.status_code == 201

    num1 = res1.json()["order_number"]
    num2 = res2.json()["order_number"]

    assert num1 != num2
    seq1 = int(num1.split("-")[-1])
    seq2 = int(num2.split("-")[-1])
    assert seq2 > seq1


def test_admin_analytics_requires_auth(client):
    """Verifica que el endpoint de analítica exija token de taller (401 Unauthorized sin credencial)."""
    res = client.get(f"{settings.API_V1_PREFIX}/admin/analytics")
    assert res.status_code == 401


def test_admin_analytics_metrics_calculation(client):
    """
    Verifica que el endpoint /admin/analytics:
    1. Retorne KPIs globales (ingresos, AOV, prendas totales).
    2. Construya una serie temporal continua con N días exactos.
    3. Incluya el ranking de prendas bestsellers y distribución logística.
    """
    admin_headers = {"X-Workshop-Token": settings.WORKSHOP_SECRET_KEY}
    res = client.get(f"{settings.API_V1_PREFIX}/admin/analytics?days=14", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()

    assert data["period_days"] == 14
    assert "total_revenue_period" in data
    assert "average_order_value_clp" in data
    assert "historical_revenue_clp" in data
    assert "timeseries" in data
    assert len(data["timeseries"]) == 14

    # Verificar estructura del punto de serie temporal
    first_point = data["timeseries"][0]
    assert "date" in first_point
    assert "label" in first_point
    assert "revenue_clp" in first_point
    assert "orders_count" in first_point

    # Verificar ranking de prendas
    assert "top_garments" in data
    if len(data["top_garments"]) > 0:
        top1 = data["top_garments"][0]
        assert "garment_name" in top1
        assert "units_sold" in top1
        assert "share_percentage" in top1

    # Verificar desglose logístico
    assert "logistics" in data
    assert "pickup_percentage" in data["logistics"]
    assert "shipping_percentage" in data["logistics"]
    assert data["logistics"]["pickup_percentage"] + data["logistics"]["shipping_percentage"] in (100.0, 0.0)


def test_admin_garment_variants_listing_and_stock_update(client):
    """
    PRUEBA DE GESTIÓN DE INVENTARIO FÍSICO:
    Verifica que el panel administrativo pueda listar variantes Talla x Color
    y actualizar el stock de forma atómica con autenticación de taller.
    """
    garment_id = "garment-polera-heavyweight-240"
    admin_headers = {"X-Workshop-Token": settings.WORKSHOP_SECRET_KEY}

    # 1. Sin auth debe fallar 401
    res_unauth = client.get(f"{settings.API_V1_PREFIX}/admin/garments/{garment_id}/variants")
    assert res_unauth.status_code == 401

    # 2. Con auth debe retornar lista de variantes
    res_variants = client.get(
        f"{settings.API_V1_PREFIX}/admin/garments/{garment_id}/variants",
        headers=admin_headers
    )
    assert res_variants.status_code == 200
    variants = res_variants.json()
    assert len(variants) > 0

    first_variant = variants[0]
    variant_id = first_variant["id"]
    assert "color_name" in first_variant
    assert "size" in first_variant
    assert "stock_quantity" in first_variant

    # 3. Actualizar stock de la variante
    update_payload = {"stock_quantity": 88, "is_active": True}
    res_patch = client.patch(
        f"{settings.API_V1_PREFIX}/admin/garments/{garment_id}/variants/{variant_id}",
        json=update_payload,
        headers=admin_headers
    )
    assert res_patch.status_code == 200
    updated_data = res_patch.json()
    assert updated_data["stock_quantity"] == 88

    # 4. Validación negativa: stock < 0 debe fallar con 422
    res_negative = client.patch(
        f"{settings.API_V1_PREFIX}/admin/garments/{garment_id}/variants/{variant_id}",
        json={"stock_quantity": -5},
        headers=admin_headers
    )
    assert res_negative.status_code == 422


def test_admin_upload_image(client):
    """Verifica la subida de imágenes de catálogo y vitrina desde el panel."""
    # 1. Sin autenticación -> 401
    file_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
    res_unauth = client.post(
        f"{settings.API_V1_PREFIX}/admin/upload-image",
        files={"file": ("test.png", file_bytes, "image/png")}
    )
    assert res_unauth.status_code == 401

    admin_headers = {"X-Workshop-Token": settings.WORKSHOP_SECRET_KEY}

    # 2. Extensión no permitida -> 400
    res_bad_ext = client.post(
        f"{settings.API_V1_PREFIX}/admin/upload-image",
        files={"file": ("script.exe", b"malware", "application/octet-stream")},
        headers=admin_headers
    )
    assert res_bad_ext.status_code == 400
    assert "Extensión no permitida" in res_bad_ext.json()["detail"]

    # 3. Subida exitosa -> 201
    res_ok = client.post(
        f"{settings.API_V1_PREFIX}/admin/upload-image",
        files={"file": ("cyber_kanji_front.png", file_bytes, "image/png")},
        headers=admin_headers
    )
    assert res_ok.status_code == 201
    data = res_ok.json()
    assert data["status"] == "success"
    assert data["url"].startswith("/static/assets/uploads/")
    assert data["filename"].endswith(".png")

    test_upload_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "frontend", "assets", "uploads", data["filename"]
    )
    if os.path.exists(test_upload_path):
        os.remove(test_upload_path)

    # 4. Rechazo de archivos SVG por riesgo de XSS (SEC-02) -> 400
    svg_payload = b"<svg xmlns='http://www.w3.org/2000/svg'><script>alert('xss')</script></svg>"
    res_svg = client.post(
        f"{settings.API_V1_PREFIX}/admin/upload-image",
        files={"file": ("malicious.svg", svg_payload, "image/svg+xml")},
        headers=admin_headers
    )
    assert res_svg.status_code == 400
    assert "Extensión no permitida" in res_svg.json()["detail"]

    # 5. Rechazo de archivo que excede el límite de 10 MB (SEC-03) -> 413
    oversized_bytes = b"0" * (10 * 1024 * 1024 + 1024)
    res_oversized = client.post(
        f"{settings.API_V1_PREFIX}/admin/upload-image",
        files={"file": ("huge_photo.png", oversized_bytes, "image/png")},
        headers=admin_headers
    )
    assert res_oversized.status_code == 413
    assert "excede el límite" in res_oversized.json()["detail"]


def test_customizer_upload_endpoint(client):
    """
    Verifica la subida binaria multipart de archivos de diseño DTF desde el personalizador.
    Comprueba validación de formato, generación de URL estática y rechazo de extensiones inseguras.
    """
    # 1. Extensión no permitida -> 400
    res_bad = client.post(
        f"{settings.API_V1_PREFIX}/customizer/upload",
        files={"file": ("malicious.bat", b"echo off", "application/x-bat")}
    )
    assert res_bad.status_code == 400
    assert "Formato no permitido" in res_bad.json()["detail"]

    # 2. Subida exitosa de diseño PNG -> 201
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    res_png = client.post(
        f"{settings.API_V1_PREFIX}/customizer/upload",
        files={"file": ("my_dtf_artwork.png", png_bytes, "image/png")}
    )
    assert res_png.status_code == 201
    data_png = res_png.json()
    assert data_png["status"] == "success"
    assert data_png["url"].startswith("/static/assets/uploads/dtf_")
    assert data_png["filename"].endswith(".png")
    assert data_png["size_bytes"] == len(png_bytes)

    # Limpieza de archivo creado
    upload_file_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "frontend", "assets", "uploads", data_png["filename"]
    )
    if os.path.exists(upload_file_path):
        os.remove(upload_file_path)

    # 3. Subida exitosa de diseño vectorial SVG para taller -> 201
    svg_bytes = b'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" fill="red"/></svg>'
    res_svg = client.post(
        f"{settings.API_V1_PREFIX}/customizer/upload",
        files={"file": ("vector_logo.svg", svg_bytes, "image/svg+xml")}
    )
    assert res_svg.status_code == 201
    data_svg = res_svg.json()
    assert data_svg["url"].endswith(".svg")

    svg_file_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "frontend", "assets", "uploads", data_svg["filename"]
    )
    if os.path.exists(svg_file_path):
        os.remove(svg_file_path)


def test_admin_differentiated_size_prices_and_order_calculation(client):
    """
    PRUEBA DE PRECIOS INDIVIDUALES POR TALLA:
    Verifica que el administrador pueda asignar valores específicos e independientes a cada talla
    (ej. S, XL y XXL) dentro del panel de administración, que se sincronicen con las variantes,
    y que las órdenes calculen autoritativamente el precio según la talla seleccionada.
    """
    garment_id = "garment-polera-heavyweight-240"
    admin_headers = {"X-Workshop-Token": settings.WORKSHOP_SECRET_KEY}

    # 1. Asignar precio base $12.990 y valores independientes para S ($12.990), XL ($14.490) y XXL ($15.990)
    res_patch = client.patch(
        f"{settings.API_V1_PREFIX}/admin/garments/{garment_id}",
        json={
            "base_price": 12990,
            "size_prices": {
                "S": 12990,
                "XL": 14490,
                "XXL": 15990
            }
        },
        headers=admin_headers
    )
    assert res_patch.status_code == 200
    updated_garment = res_patch.json()
    assert updated_garment["base_price"] == 12990
    assert updated_garment["size_prices"].get("S") == 12990
    assert updated_garment["size_prices"].get("XL") == 14490
    assert updated_garment["size_prices"].get("XXL") == 15990

    # 2. Verificar que las variantes en bodega reflejen custom_price en S, XL y XXL
    res_variants = client.get(
        f"{settings.API_V1_PREFIX}/admin/garments/{garment_id}/variants",
        headers=admin_headers
    )
    assert res_variants.status_code == 200
    variants = res_variants.json()
    xxl_variant = next(v for v in variants if v["size"] == "XXL")
    m_variant = next(v for v in variants if v["size"] == "M")
    assert xxl_variant["custom_price"] == 15990
    assert m_variant["custom_price"] is None

    # 3. Crear una orden con 1 unidad talla M ($12.990) y 1 unidad talla XXL ($15.990)
    order_payload = {
        "customer": {
            "full_name": "Cliente Tallas Diferenciadas",
            "email": "tallas@senkai.cl",
            "phone": "+56912345678",
            "delivery_method": "pickup"
        },
        "items": [
            {
                "garment_id": garment_id,
                "selected_color": {"name": "Negro", "hex_code": "#121212", "in_stock": True},
                "selected_size": "M",
                "quantity": 1
            },
            {
                "garment_id": garment_id,
                "selected_color": {"name": "Negro", "hex_code": "#121212", "in_stock": True},
                "selected_size": "XXL",
                "quantity": 1
            }
        ]
    }
    res_order = client.post(f"{settings.API_V1_PREFIX}/orders/", json=order_payload)
    assert res_order.status_code == 201
    order_data = res_order.json()
    assert order_data["items"][0]["unit_price"] == 12990
    assert order_data["items"][1]["unit_price"] == 15990
    assert order_data["total_amount"] == 12990 + 15990

    # 4. Restaurar todas las tallas al precio base enviando size_prices vacío
    res_reset = client.patch(
        f"{settings.API_V1_PREFIX}/admin/garments/{garment_id}",
        json={"base_price": 12990, "size_prices": {}},
        headers=admin_headers
    )
    assert res_reset.status_code == 200
    assert res_reset.json()["size_prices"] == {}


def test_admin_toggle_garment_availability_blocks_orders(client):
    """
    PRUEBA DE DISPONIBILIDAD DE TIPOS DE PRENDA (ENCENDER / APAGAR):
    Verifica que el administrador pueda apagar temporalmente un tipo de prenda (ej. Oversized)
    sin eliminarla del catálogo, bloqueando pedidos para esa prenda hasta que vuelva a encenderse.
    """
    garment_id = "garment-polera-heavyweight-240"
    admin_headers = {"X-Workshop-Token": settings.WORKSHOP_SECRET_KEY}

    # 1. Apagar temporalmente la prenda Oversized
    res_off = client.patch(
        f"{settings.API_V1_PREFIX}/admin/garments/{garment_id}",
        json={"is_active": False},
        headers=admin_headers
    )
    assert res_off.status_code == 200
    assert res_off.json()["is_active"] is False

    # 2. Verificar que sigue apareciendo en el listado de prendas (para no perderla en el admin) con is_active=False
    res_list = client.get(f"{settings.API_V1_PREFIX}/garments/")
    assert res_list.status_code == 200
    found = next(g for g in res_list.json() if g["id"] == garment_id)
    assert found["is_active"] is False

    # 3. Intentar crear un pedido de la prenda apagada debe ser rechazado con 400
    order_payload = {
        "customer": {
            "full_name": "Cliente Intento Oversize",
            "email": "oversize@senkai.cl",
            "phone": "+56912345678",
            "delivery_method": "pickup"
        },
        "items": [{
            "garment_id": garment_id,
            "selected_color": {"name": "Negro", "hex_code": "#121212", "in_stock": True},
            "selected_size": "L",
            "quantity": 1
        }]
    }
    res_blocked = client.post(f"{settings.API_V1_PREFIX}/orders/", json=order_payload)
    assert res_blocked.status_code == 400
    assert "no se encuentra disponible" in res_blocked.json()["detail"]

    # 4. Volver a encender la prenda Oversized
    res_on = client.patch(
        f"{settings.API_V1_PREFIX}/admin/garments/{garment_id}",
        json={"is_active": True},
        headers=admin_headers
    )
    assert res_on.status_code == 200
    assert res_on.json()["is_active"] is True

