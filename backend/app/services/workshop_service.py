"""
Servicio del taller industrial Senkai DTF.
Orquesta el tablero Kanban de producción, control de trazabilidad y métricas de consumo de película.
"""

import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.domain import (
    OrderResponse, OrderProductionStatus, WorkshopMetrics
)
from app.db.models import OrderModel
from app.repositories.order_repository import order_repository, OrderRepository
from app.services.pricing_service import pricing_service, PricingService
from app.services.order_service import order_service, OrderService
from app.core.state_machine import validate_order_status_transition


class WorkshopService:
    """Gestiona el flujo de producción de taller y métricas de insumos."""

    def __init__(
        self,
        repository: OrderRepository = order_repository,
        pricing: PricingService = pricing_service,
        order_svc: OrderService = order_service
    ):
        self.repository = repository
        self.pricing = pricing
        self.order_svc = order_svc

    async def update_order_status(
        self,
        session: AsyncSession,
        order_id: str,
        new_status: OrderProductionStatus,
        tracking_code: Optional[str] = None
    ) -> Optional[OrderResponse]:
        """Actualiza la etapa de confección/estampado en el Kanban de taller validando la máquina de estados."""
        order = await self.repository.find_by_identifier(session, order_id)
        if not order:
            return None

        # Validación formal de transición en máquina de estados de taller
        current_status_enum = OrderProductionStatus(order.status)
        validate_order_status_transition(current_status_enum, new_status)

        updated = await self.repository.update_status(
            session=session,
            order=order,
            new_status=new_status.value,
            tracking_code=tracking_code
        )
        return self.order_svc.to_response_dto(updated)

    async def get_metrics(self, session: AsyncSession) -> WorkshopMetrics:
        """Calcula métricas de facturación acumulada y metraje de bobina DTF consumido."""
        orders = await self.repository.list_orders(session)
        if not orders:
            await self._seed_showcase_if_empty(session)
            orders = await self.repository.list_orders(session)

        valid_orders = [o for o in orders if o.status != OrderProductionStatus.CANCELLED.value]
        total_revenue = sum(o.total_amount for o in valid_orders)

        # Consumo de metros lineales de film
        all_items = []
        for o in orders:
            all_items.extend(o.items)
        meters = self.pricing.estimate_consumed_film_meters(all_items)

        return WorkshopMetrics(
            total_orders=len(orders),
            pending_print_count=len([o for o in orders if o.status == OrderProductionStatus.PRINT_QUEUE.value]),
            heat_pressing_count=len([o for o in orders if o.status == OrderProductionStatus.HEAT_PRESSING.value]),
            ready_for_pickup_count=len([o for o in orders if o.status == OrderProductionStatus.READY_SHIPPING.value]),
            completed_today=len([o for o in orders if o.status == OrderProductionStatus.COMPLETED.value]),
            linear_meters_film_estimated=meters,
            total_revenue_clp=total_revenue
        )

    async def _seed_showcase_if_empty(self, session: AsyncSession) -> None:
        """Carga datos iniciales de demostración para el taller cuando la base está vacía."""
        now = datetime.now(timezone.utc)
        showcase_orders = [
            OrderModel(
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
            ),
            OrderModel(
                id=str(uuid.uuid4()),
                order_number="SNK-2026-0002",
                customer_name="Camila Morales",
                customer_email="camila.morales.dsgn@gmail.com",
                customer_phone="+56912345678",
                delivery_method="pickup",
                shipping_address=None,
                shipping_city=None,
                notes="Retira en taller Senkai Studio",
                total_amount=32890,
                shipping_cost=0,
                status=OrderProductionStatus.HEAT_PRESSING.value,
                created_at=now - timedelta(hours=5),
                updated_at=now - timedelta(minutes=45),
                estimated_delivery=(now + timedelta(days=1)).strftime("%d/%m/%Y"),
                tracking_code=None,
                items_payload=json.dumps([{
                    "garment_id": "garment-poleron-hoodie-320",
                    "garment_name": "Polerón Canguro Hoodie Heavy 320g",
                    "selected_color": {"name": "Cement Gray", "hex_code": "#7A7D84", "in_stock": True},
                    "selected_size": "M",
                    "prints": [
                        {
                            "id": "print-front-1",
                            "view": "front",
                            "print_size": "A6",
                            "design_name": "Senkai Chest Badge",
                            "design_image_url": "/static/assets/senkai_badge_clean.png",
                            "scale_factor": 0.85,
                            "offset_x_pct": 32.0,
                            "offset_y_pct": 32.0,
                            "calculated_dtf_cost": 2500
                        },
                        {
                            "id": "print-back-1",
                            "view": "back",
                            "print_size": "A3",
                            "design_name": "Cyber Kanji 2026 Maxi",
                            "design_image_url": "/static/assets/catalog_urbana.png",
                            "scale_factor": 1.0,
                            "offset_x_pct": 50.0,
                            "offset_y_pct": 42.0,
                            "calculated_dtf_cost": 8900
                        }
                    ],
                    "quantity": 1,
                    "unit_price": 32890,
                    "subtotal": 32890
                }], ensure_ascii=False)
            )
        ]
        await self.repository.add_all(session, showcase_orders)


workshop_service = WorkshopService()
