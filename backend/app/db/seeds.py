"""
Sembrado idempotente de datos iniciales para Senkai DTF Studio.
Puebla el catálogo textil de confección nacional, variantes de color/talla con stock inicial
y órdenes de demostración si la base de datos se inicializa desde cero.
"""

import json
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import GarmentModel, GarmentVariantModel, OrderModel, OrderItemModel
from app.schemas.domain import GarmentCategory, GarmentSize, OrderProductionStatus


# Catálogo textil oficial de alta gama
INITIAL_GARMENTS = [
    {
        "id": "garment-polera-heavyweight-240",
        "name": "Polera Oversized Heavyweight 240g",
        "category": GarmentCategory.OVERSIZED_T_SHIRT.value,
        "description": "Algodón peinado premium de 240g/m². Corte relajado drop-shoulder con cuello reforzado de 3cm. La base definitiva para estampas DTF con caída estructurada.",
        "weight_gsm": 240,
        "composition": "100% Algodón Peinado Ringspun",
        "base_price": 12990,
        "image_front_template": "/assets/templates/tshirt_front.svg",
        "image_back_template": "/assets/templates/tshirt_back.svg",
        "colors": [
            ("Obsidian Black", "#121212"),
            ("Vintage Chalk White", "#F4F4F0"),
            ("Slate Washed Gray", "#3D404A"),
            ("Forest Deep Green", "#1E3329"),
            ("Raw Terracotta", "#8D4330"),
        ],
        "sizes": ["S", "M", "L", "XL", "XXL"]
    },
    {
        "id": "garment-polera-classic-180",
        "name": "Polera Clásica Regular Fit 180g",
        "category": GarmentCategory.T_SHIRT.value,
        "description": "Algodón 180g/m² suave y transpirable. Costuras laterales reforzadas y tapacostura de hombro a hombro. Perfecta para merchandising y uso diario.",
        "weight_gsm": 180,
        "composition": "100% Algodón Jersey",
        "base_price": 8990,
        "image_front_template": "/assets/templates/tshirt_front.svg",
        "image_back_template": "/assets/templates/tshirt_back.svg",
        "colors": [
            ("Obsidian Black", "#121212"),
            ("Pure White", "#FFFFFF"),
            ("Navy Deep Blue", "#101D2D"),
            ("Burgundy Red", "#4A1521"),
        ],
        "sizes": ["S", "M", "L", "XL"]
    },
    {
        "id": "garment-poleron-hoodie-320",
        "name": "Polerón Canguro Hoodie Heavy 320g",
        "category": GarmentCategory.HOODIE.value,
        "description": "Polerón premium con interior afelpado (fleece) de 320g/m². Capucha forrada de doble capa, bolsillo canguro con remate reforzado y cordones gruesos al tono.",
        "weight_gsm": 320,
        "composition": "80% Algodón / 20% Poliéster Antipilling",
        "base_price": 24990,
        "image_front_template": "/assets/templates/hoodie_front.svg",
        "image_back_template": "/assets/templates/hoodie_back.svg",
        "colors": [
            ("Obsidian Black", "#121212"),
            ("Cement Gray", "#7A7D84"),
            ("Deep Olive Green", "#2B3629"),
            ("Raw Bone", "#E8E4D9"),
        ],
        "sizes": ["S", "M", "L", "XL", "XXL"]
    },
    {
        "id": "garment-poleron-crewneck-300",
        "name": "Polerón Crewneck Cuello Redondo 300g",
        "category": GarmentCategory.CREWNECK.value,
        "description": "Corte minimalista sin capucha con puños y pretina en rib 1x1 con elastano para máxima durabilidad. Tacto ultra suave y excelente retención térmica.",
        "weight_gsm": 300,
        "composition": "80% Algodón / 20% Poliéster",
        "base_price": 21990,
        "image_front_template": "/assets/templates/crewneck_front.svg",
        "image_back_template": "/assets/templates/crewneck_back.svg",
        "colors": [
            ("Obsidian Black", "#121212"),
            ("Heather Gray", "#61646B"),
            ("Midnight Navy", "#141C2B"),
        ],
        "sizes": ["S", "M", "L", "XL"]
    }
]


async def seed_database_if_empty(session: AsyncSession) -> None:
    """Siembra prendas, variantes de inventario y órdenes iniciales si las tablas están vacías."""
    # 1. Sembrar catálogo textil
    garments_count = (await session.execute(select(func.count()).select_from(GarmentModel))).scalar() or 0
    if garments_count == 0:
        for g_data in INITIAL_GARMENTS:
            garment = GarmentModel(
                id=g_data["id"],
                name=g_data["name"],
                category=g_data["category"],
                description=g_data["description"],
                weight_gsm=g_data["weight_gsm"],
                composition=g_data["composition"],
                base_price=g_data["base_price"],
                image_front_template=g_data["image_front_template"],
                image_back_template=g_data["image_back_template"],
                is_active=True
            )
            session.add(garment)

            # Crear variantes relacionales de color y talla con inventario inicial
            for color_name, hex_code in g_data["colors"]:
                for size in g_data["sizes"]:
                    variant_id = f"{g_data['id']}-{size}-{color_name.lower().replace(' ', '-')}"
                    variant = GarmentVariantModel(
                        id=variant_id,
                        garment_id=g_data["id"],
                        color_name=color_name,
                        color_hex=hex_code,
                        size=size,
                        stock_quantity=50,
                        is_active=True
                    )
                    session.add(variant)

        await session.commit()

    # 2. Sembrar órdenes de taller iniciales si no hay ninguna
    orders_count = (await session.execute(select(func.count()).select_from(OrderModel))).scalar() or 0
    if orders_count == 0:
        now = datetime.now(timezone.utc)
        showcase_order = OrderModel(
            id=str(uuid.uuid4()),
            order_number="SNK-2026-0001",
            customer_name="Ignacio Valenzuela",
            customer_email="ignacio.valenzuela@gmail.com",
            customer_phone="+56987654321",
            delivery_method="shipping",
            shipping_address="Av. Providencia 1240, Dpto 802",
            shipping_city="Santiago",
            notes="Favor despachar después de las 18:00 hrs",
            total_amount=47770,
            shipping_cost=3990,
            status=OrderProductionStatus.PRINT_QUEUE.value,
            created_at=now - timedelta(hours=3),
            updated_at=now - timedelta(hours=1),
            estimated_delivery=(now + timedelta(days=2)).strftime("%d/%m/%Y"),
            tracking_code="CHILEXPRESS-9923841",
            items_payload=json.dumps([{
                "garment_id": "garment-polera-heavyweight-240",
                "garment_name": "Polera Oversized Heavyweight 240g",
                "selected_color": {"name": "Obsidian Black", "hex_code": "#121212", "in_stock": True},
                "selected_size": "L",
                "prints": [{
                    "id": "print-back-1",
                    "view": "back",
                    "print_size": "A3",
                    "design_name": "Cyberpunk Neo Tokyo Artwork (300DPI)",
                    "design_image_url": "/static/assets/catalog_urbana.png",
                    "scale_factor": 1.0,
                    "offset_x_pct": 50.0,
                    "offset_y_pct": 45.0,
                    "calculated_dtf_cost": 8900
                }],
                "quantity": 2,
                "unit_price": 21890,
                "subtotal": 43780
            }], ensure_ascii=False)
        )
        session.add(showcase_order)
        await session.commit()
