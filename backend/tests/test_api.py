"""
Suite de pruebas de integracion para los endpoints de Seiko DTF Studio.
"""

import sys
import io
import urllib.request
import json

# Asegurar encoding UTF-8 en terminales Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')


def run_tests():
    base_url = "http://127.0.0.1:8000"

    print("[*] Iniciando pruebas de verificacion para Seiko DTF Studio...")

    # 1. Healthcheck
    with urllib.request.urlopen(f"{base_url}/health") as res:
        assert res.status == 200
        data = json.loads(res.read())
        print(f"[+] [1/6] Healthcheck OK: {data['service']} v{data['version']}")

    # 2. Catálogo de Prendas
    with urllib.request.urlopen(f"{base_url}/api/v1/garments/") as res:
        assert res.status == 200
        garments = json.loads(res.read())
        assert len(garments) >= 4
        print(f"[+] [2/6] Catalogo OK: {len(garments)} prendas textiles activas encontradas")

    # 3. Cotizador DTF
    with urllib.request.urlopen(f"{base_url}/api/v1/customizer/quote?position=espalda_completa&print_size=A3&quantity=2") as res:
        assert res.status == 200
        quote = json.loads(res.read())
        assert quote["total_dtf_cost"] > 0
        print(f"[+] [3/6] Cotizador DTF OK: Total estampa A3 x2 = ${quote['total_dtf_cost']} CLP")

    # 4. Creación de Pedido con Personalización DTF
    new_order_payload = {
        "customer": {
            "full_name": "Carlos Valenzuela",
            "email": "carlos.valenzuela@test.cl",
            "phone": "+56987654321",
            "delivery_method": "shipping",
            "shipping_address": "Av. Andres Bello 2777",
            "shipping_city": "Las Condes",
            "notes": "Estampar 3cm debajo de la costura de cuello"
        },
        "items": [{
            "garment_id": garments[0]["id"],
            "garment_name": garments[0]["name"],
            "selected_color": garments[0]["colors"][0],
            "selected_size": "XL",
            "dtf_config": {
                "position": "pecho_centro",
                "print_size": "A4",
                "design_name": "Seiko Studio Kanji Neo",
                "calculated_dtf_cost": 5900,
                "scale_factor": 1.0,
                "offset_x_pct": 50.0,
                "offset_y_pct": 42.0
            },
            "quantity": 2,
            "unit_price": 18890,
            "subtotal": 37780
        }],
        "total_amount": 41770,
        "shipping_cost": 3990
    }

    req = urllib.request.Request(
        f"{base_url}/api/v1/orders/",
        data=json.dumps(new_order_payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req) as res:
        assert res.status == 201
        created_order = json.loads(res.read())
        order_id = created_order["id"]
        order_num = created_order["order_number"]
        print(f"[+] [4/6] Creacion de Pedido OK: Pedido #{order_num} creado")

    # 5. Métricas de Taller
    with urllib.request.urlopen(f"{base_url}/api/v1/admin/metrics") as res:
        assert res.status == 200
        metrics = json.loads(res.read())
        print(f"[+] [5/6] Metricas de Taller OK: {metrics['total_orders']} pedidos, {metrics['linear_meters_film_estimated']}m de film DTF")

    # 6. Actualización de Estado en Kanban
    status_payload = {
        "status": "en_planchado_curado",
        "tracking_code": "SEIKO-STK-99001"
    }
    req_patch = urllib.request.Request(
        f"{base_url}/api/v1/admin/orders/{order_id}/status",
        data=json.dumps(status_payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="PATCH"
    )
    with urllib.request.urlopen(req_patch) as res:
        assert res.status == 200
        updated = json.loads(res.read())
        assert updated["status"] == "en_planchado_curado"
        print(f"[+] [6/6] Actualizacion Kanban OK: Pedido #{order_num} movido a 'en_planchado_curado'")

    print("\n[SUCCESS] Todas las pruebas de integracion pasaron exitosamente (6/6)!")


if __name__ == "__main__":
    run_tests()
