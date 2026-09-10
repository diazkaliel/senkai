"""
Servicio de negocio y persistencia en memoria para Seiko DTF Studio.
Provee catálogo de prendas, motor de cotización DTF y gestión de flujo de taller.
"""

from datetime import datetime, timedelta
from typing import List, Optional
import uuid

from app.schemas.domain import (
    GarmentBase, GarmentCategory, GarmentSize, ColorVariant,
    DTFPrintPosition, DTFPrintSize, DTFConfiguration,
    OrderCreate, OrderResponse, OrderProductionStatus,
    WorkshopMetrics
)
from app.core.config import settings


class SeikoStoreService:
    def __init__(self):
        self._garments: List[GarmentBase] = self._seed_garments()
        self._orders: List[OrderResponse] = self._seed_initial_orders()

    def _seed_garments(self) -> List[GarmentBase]:
        return [
            GarmentBase(
                id="garment-polera-heavyweight-240",
                name="Polera Oversized Heavyweight 240g",
                category=GarmentCategory.OVERSIZED_T_SHIRT,
                description="Algodón peinado premium de 240g/m². Corte relajado drop-shoulder con cuello reforzado de 3cm. La base definitiva para estampas DTF con caída estructurada.",
                weight_gsm=240,
                composition="100% Algodón Peinado Ringspun",
                base_price=12990,
                colors=[
                    ColorVariant(name="Obsidian Black", hex_code="#121212", in_stock=True),
                    ColorVariant(name="Vintage Chalk White", hex_code="#F4F4F0", in_stock=True),
                    ColorVariant(name="Slate Washed Gray", hex_code="#3D404A", in_stock=True),
                    ColorVariant(name="Forest Deep Green", hex_code="#1E3329", in_stock=True),
                    ColorVariant(name="Raw Terracotta", hex_code="#8D4330", in_stock=True),
                ],
                sizes=[GarmentSize.S, GarmentSize.M, GarmentSize.L, GarmentSize.XL, GarmentSize.XXL],
                image_front_template="/assets/templates/tshirt_front.svg",
                image_back_template="/assets/templates/tshirt_back.svg",
                is_active=True
            ),
            GarmentBase(
                id="garment-polera-classic-180",
                name="Polera Clásica Regular Fit 180g",
                category=GarmentCategory.T_SHIRT,
                description="Algodón 180g/m² suave y transpirable. Costuras laterales reforzadas y tapacostura de hombro a hombro. Perfecta para merchandising y uso diario.",
                weight_gsm=180,
                composition="100% Algodón Jersey",
                base_price=8990,
                colors=[
                    ColorVariant(name="Obsidian Black", hex_code="#121212", in_stock=True),
                    ColorVariant(name="Pure White", hex_code="#FFFFFF", in_stock=True),
                    ColorVariant(name="Navy Deep Blue", hex_code="#101D2D", in_stock=True),
                    ColorVariant(name="Burgundy Red", hex_code="#4A1521", in_stock=True),
                ],
                sizes=[GarmentSize.S, GarmentSize.M, GarmentSize.L, GarmentSize.XL],
                image_front_template="/assets/templates/tshirt_front.svg",
                image_back_template="/assets/templates/tshirt_back.svg",
                is_active=True
            ),
            GarmentBase(
                id="garment-poleron-hoodie-320",
                name="Polerón Canguro Hoodie Heavy 320g",
                category=GarmentCategory.HOODIE,
                description="Polerón premium con interior afelpado (fleece) de 320g/m². Capucha forrada de doble capa, bolsillo canguro con remate reforzado y cordones gruesos al tono.",
                weight_gsm=320,
                composition="80% Algodón / 20% Poliéster Antipilling",
                base_price=24990,
                colors=[
                    ColorVariant(name="Obsidian Black", hex_code="#121212", in_stock=True),
                    ColorVariant(name="Cement Gray", hex_code="#7A7D84", in_stock=True),
                    ColorVariant(name="Deep Olive Green", hex_code="#2B3629", in_stock=True),
                    ColorVariant(name="Raw Bone", hex_code="#E8E4D9", in_stock=True),
                ],
                sizes=[GarmentSize.S, GarmentSize.M, GarmentSize.L, GarmentSize.XL, GarmentSize.XXL],
                image_front_template="/assets/templates/hoodie_front.svg",
                image_back_template="/assets/templates/hoodie_back.svg",
                is_active=True
            ),
            GarmentBase(
                id="garment-poleron-crewneck-300",
                name="Polerón Crewneck Cuello Redondo 300g",
                category=GarmentCategory.CREWNECK,
                description="Corte minimalista sin capucha con puños y pretina en rib 1x1 con elastano para máxima durabilidad. Tacto ultra suave y excelente retención térmica.",
                weight_gsm=300,
                composition="80% Algodón / 20% Poliéster",
                base_price=21990,
                colors=[
                    ColorVariant(name="Obsidian Black", hex_code="#121212", in_stock=True),
                    ColorVariant(name="Heather Gray", hex_code="#61646B", in_stock=True),
                    ColorVariant(name="Midnight Navy", hex_code="#141C2B", in_stock=True),
                ],
                sizes=[GarmentSize.S, GarmentSize.M, GarmentSize.L, GarmentSize.XL],
                image_front_template="/assets/templates/crewneck_front.svg",
                image_back_template="/assets/templates/crewneck_back.svg",
                is_active=True
            )
        ]

    def _seed_initial_orders(self) -> List[OrderResponse]:
        now = datetime.now()
        return [
            OrderResponse(
                id=str(uuid.uuid4()),
                order_number="SKO-2026-0801",
                customer={
                    "full_name": "Ignacio Valenzuela",
                    "email": "ignacio.valenzuela@gmail.com",
                    "phone": "+56987654321",
                    "delivery_method": "shipping",
                    "shipping_address": "Av. Providencia 1240, Dpto 802",
                    "shipping_city": "Santiago",
                    "notes": "Favor despachar después de las 18:00 hrs"
                },
                items=[{
                    "garment_id": "garment-polera-heavyweight-240",
                    "garment_name": "Polera Oversized Heavyweight 240g",
                    "selected_color": {"name": "Obsidian Black", "hex_code": "#121212", "in_stock": True},
                    "selected_size": GarmentSize.L,
                    "dtf_config": {
                        "position": DTFPrintPosition.BACK_FULL,
                        "print_size": DTFPrintSize.A3,
                        "design_name": "Cyberpunk Neo Tokyo Artwork (300DPI)",
                        "design_image_url": "/assets/sample_designs/neo_tokyo.png",
                        "scale_factor": 1.0,
                        "offset_x_pct": 50.0,
                        "offset_y_pct": 45.0,
                        "calculated_dtf_cost": 8900
                    },
                    "quantity": 2,
                    "unit_price": 21890,
                    "subtotal": 43780
                }],
                total_amount=47770,
                shipping_cost=3990,
                status=OrderProductionStatus.PRINT_QUEUE,
                created_at=(now - timedelta(hours=3)).isoformat(),
                updated_at=(now - timedelta(hours=1)).isoformat(),
                estimated_delivery=(now + timedelta(days=2)).strftime("%d/%m/%Y"),
                tracking_code="CHILEXPRESS-9923841"
            ),
            OrderResponse(
                id=str(uuid.uuid4()),
                order_number="SKO-2026-0802",
                customer={
                    "full_name": "Camila Morales",
                    "email": "camila.morales.dsgn@gmail.com",
                    "phone": "+56912345678",
                    "delivery_method": "pickup",
                    "shipping_address": None,
                    "shipping_city": None,
                    "notes": "Retira en taller Seiko Studio"
                },
                items=[{
                    "garment_id": "garment-poleron-hoodie-320",
                    "garment_name": "Polerón Canguro Hoodie Heavy 320g",
                    "selected_color": {"name": "Cement Gray", "hex_code": "#7A7D84", "in_stock": True},
                    "selected_size": GarmentSize.M,
                    "dtf_config": {
                        "position": DTFPrintPosition.CHEST_AND_BACK,
                        "print_size": DTFPrintSize.A4,
                        "design_name": "Seiko Studio Minimal Logo + Back Print",
                        "design_image_url": "/assets/sample_designs/seiko_kanji.png",
                        "scale_factor": 1.0,
                        "offset_x_pct": 50.0,
                        "offset_y_pct": 40.0,
                        "calculated_dtf_cost": 7900
                    },
                    "quantity": 1,
                    "unit_price": 32890,
                    "subtotal": 32890
                }],
                total_amount=32890,
                shipping_cost=0,
                status=OrderProductionStatus.HEAT_PRESSING,
                created_at=(now - timedelta(hours=5)).isoformat(),
                updated_at=(now - timedelta(minutes=45)).isoformat(),
                estimated_delivery=(now + timedelta(days=1)).strftime("%d/%m/%Y"),
                tracking_code=None
            ),
            OrderResponse(
                id=str(uuid.uuid4()),
                order_number="SKO-2026-0803",
                customer={
                    "full_name": "Rodrigo Silva",
                    "email": "rodrigo.silva@techcorp.io",
                    "phone": "+56944556677",
                    "delivery_method": "shipping",
                    "shipping_address": "Av. Las Condes 8830, Of 401",
                    "shipping_city": "Santiago",
                    "notes": "Pedido urgente para evento corporativo"
                },
                items=[{
                    "garment_id": "garment-polera-classic-180",
                    "garment_name": "Polera Clásica Regular Fit 180g",
                    "selected_color": {"name": "Obsidian Black", "hex_code": "#121212", "in_stock": True},
                    "selected_size": GarmentSize.XL,
                    "dtf_config": {
                        "position": DTFPrintPosition.CHEST_LEFT,
                        "print_size": DTFPrintSize.A6,
                        "design_name": "Tech Corp Minimal Badge",
                        "design_image_url": "/assets/sample_designs/badge_logo.png",
                        "scale_factor": 0.8,
                        "offset_x_pct": 30.0,
                        "offset_y_pct": 32.0,
                        "calculated_dtf_cost": 2500
                    },
                    "quantity": 10,
                    "unit_price": 11490,
                    "subtotal": 114900
                }],
                total_amount=118890,
                shipping_cost=3990,
                status=OrderProductionStatus.READY_SHIPPING,
                created_at=(now - timedelta(days=1)).isoformat(),
                updated_at=(now - timedelta(hours=2)).isoformat(),
                estimated_delivery=now.strftime("%d/%m/%Y"),
                tracking_code="STARKEN-10928374"
            )
        ]

    def get_all_garments(self) -> List[GarmentBase]:
        return self._garments

    def get_garment_by_id(self, garment_id: str) -> Optional[GarmentBase]:
        return next((g for g in self._garments if g.id == garment_id), None)

    def calculate_dtf_price(self, position: DTFPrintPosition, print_size: DTFPrintSize, quantity: int = 1) -> dict:
        """
        Calcula el costo de estampado DTF aplicando escalas de descuento por volumen.
        """
        if position == DTFPrintPosition.CHEST_AND_BACK:
            base_dtf = settings.DTF_PRINT_PRICING.get("DOUBLE_A4_A6", 7900)
        else:
            base_dtf = settings.DTF_PRINT_PRICING.get(print_size.value, 5900)

        # Descuentos por volumen de taller
        discount_pct = 0
        if quantity >= 20:
            discount_pct = 25
        elif quantity >= 10:
            discount_pct = 15
        elif quantity >= 5:
            discount_pct = 10

        unit_cost = int(base_dtf * (1 - discount_pct / 100))
        total_dtf = unit_cost * quantity

        return {
            "position": position,
            "print_size": print_size,
            "unit_dtf_price": unit_cost,
            "discount_percentage": discount_pct,
            "total_dtf_cost": total_dtf,
            "heat_press_specs": {
                "temperature_c": settings.DTF_HEAT_PRESS_TEMP_C,
                "seconds": settings.DTF_HEAT_PRESS_SECONDS,
                "peel": settings.DTF_PEEL_TYPE
            }
        }

    def create_order(self, payload: OrderCreate) -> OrderResponse:
        order_seq = len(self._orders) + 1
        now = datetime.now()
        new_order = OrderResponse(
            id=str(uuid.uuid4()),
            order_number=f"SKO-2026-{order_seq:04d}",
            customer=payload.customer,
            items=payload.items,
            total_amount=payload.total_amount,
            shipping_cost=payload.shipping_cost,
            status=OrderProductionStatus.PRINT_QUEUE,
            created_at=now.isoformat(),
            updated_at=now.isoformat(),
            estimated_delivery=(now + timedelta(days=2)).strftime("%d/%m/%Y"),
            tracking_code=None
        )
        self._orders.insert(0, new_order)
        return new_order

    def get_orders(self, status: Optional[OrderProductionStatus] = None) -> List[OrderResponse]:
        if status:
            return [o for o in self._orders if o.status == status]
        return self._orders

    def update_order_status(self, order_id: str, new_status: OrderProductionStatus, tracking_code: Optional[str] = None) -> Optional[OrderResponse]:
        for order in self._orders:
            if order.id == order_id:
                order.status = new_status
                order.updated_at = datetime.now().isoformat()
                if tracking_code:
                    order.tracking_code = tracking_code
                return order
        return None

    def get_workshop_metrics(self) -> WorkshopMetrics:
        orders = self._orders
        total_rev = sum(o.total_amount for o in orders if o.status != OrderProductionStatus.CANCELLED)
        
        # Estimación de metros lineales DTF (ancho 60cm): A3 = 0.4m, A4 = 0.3m, A6 = 0.15m
        meters = 0.0
        for order in orders:
            for item in order.items:
                if item.dtf_config:
                    size = item.dtf_config.print_size
                    multiplier = item.quantity
                    if size == DTFPrintSize.A3:
                        meters += 0.4 * multiplier
                    elif size == DTFPrintSize.A4:
                        meters += 0.3 * multiplier
                    else:
                        meters += 0.15 * multiplier

        return WorkshopMetrics(
            total_orders=len(orders),
            pending_print_count=len([o for o in orders if o.status == OrderProductionStatus.PRINT_QUEUE]),
            heat_pressing_count=len([o for o in orders if o.status == OrderProductionStatus.HEAT_PRESSING]),
            ready_for_pickup_count=len([o for o in orders if o.status == OrderProductionStatus.READY_SHIPPING]),
            completed_today=len([o for o in orders if o.status == OrderProductionStatus.COMPLETED]),
            linear_meters_film_estimated=round(meters, 2),
            total_revenue_clp=total_rev
        )


store_service = SeikoStoreService()
