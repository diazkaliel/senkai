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
    OrderResponse, OrderProductionStatus, WorkshopMetrics,
    WorkshopAnalyticsResponse, AnalyticsTimeSeriesPoint,
    GarmentPerformanceItem, LogisticsBreakdown
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

        today_utc = datetime.now(timezone.utc).date()
        completed_today_count = 0
        for o in orders:
            if o.status == OrderProductionStatus.COMPLETED.value:
                order_date = o.updated_at.date() if isinstance(o.updated_at, datetime) else None
                if order_date == today_utc:
                    completed_today_count += 1

        return WorkshopMetrics(
            total_orders=len(orders),
            pending_print_count=len([o for o in orders if o.status == OrderProductionStatus.PRINT_QUEUE.value]),
            heat_pressing_count=len([o for o in orders if o.status == OrderProductionStatus.HEAT_PRESSING.value]),
            ready_for_pickup_count=len([o for o in orders if o.status == OrderProductionStatus.READY_SHIPPING.value]),
            completed_today=completed_today_count,
            linear_meters_film_estimated=meters,
            total_revenue_clp=total_revenue
        )

    async def get_analytics(
        self,
        session: AsyncSession,
        days: int = 30
    ) -> WorkshopAnalyticsResponse:
        """
        Calcula la analítica de negocio completa para el período solicitado:
        - Serie temporal continua diaria de ingresos y volumen de pedidos.
        - Ticket promedio (AOV) y prendas procesadas.
        - Rendimiento y participación de prendas del catálogo (ranking bestsellers).
        - Desglose logístico (retiro en taller vs despacho express).
        """
        orders = await self.repository.list_orders(session)
        if not orders:
            await self._seed_showcase_if_empty(session)
            orders = await self.repository.list_orders(session)

        valid_orders = [o for o in orders if o.status != OrderProductionStatus.CANCELLED.value]
        historical_revenue = sum(o.total_amount for o in valid_orders)
        historical_orders_count = len(valid_orders)

        now = datetime.now(timezone.utc)
        cutoff_date = (now - timedelta(days=days)).date()

        # Filtrar pedidos pertenecientes al período solicitado
        period_orders = []
        for o in valid_orders:
            o_date = o.created_at.date() if isinstance(o.created_at, datetime) else now.date()
            if o_date >= cutoff_date:
                period_orders.append(o)

        total_revenue_period = sum(o.total_amount for o in period_orders)
        total_orders_period = len(period_orders)
        aov = int(total_revenue_period / total_orders_period) if total_orders_period > 0 else 0

        # Construir serie temporal continua (día por día, rellenando vacíos con 0)
        timeseries: List[AnalyticsTimeSeriesPoint] = []
        for i in range(days - 1, -1, -1):
            target_date = (now - timedelta(days=i)).date()
            date_str = target_date.strftime("%Y-%m-%d")
            label_str = target_date.strftime("%d/%m")

            day_orders = []
            for o in valid_orders:
                o_date = o.created_at.date() if isinstance(o.created_at, datetime) else None
                if o_date == target_date:
                    day_orders.append(o)

            day_rev = sum(o.total_amount for o in day_orders)
            day_count = len(day_orders)
            day_units = sum(sum(it.get("quantity", 1) for it in o.items) for o in day_orders)

            timeseries.append(
                AnalyticsTimeSeriesPoint(
                    date=date_str,
                    label=label_str,
                    revenue_clp=day_rev,
                    orders_count=day_count,
                    units_count=day_units
                )
            )

        # Rendimiento por prenda (bestsellers)
        # Si no hay pedidos en el período, tomamos el universo histórico para no mostrar gráficos vacíos
        orders_for_ranking = period_orders if period_orders else valid_orders
        garments_map = {}
        total_units = 0

        for o in orders_for_ranking:
            for it in o.items:
                g_id = it.get("garment_id", "desconocido")
                g_name = it.get("garment_name") or g_id
                qty = it.get("quantity", 1)
                subtotal = it.get("subtotal", 0)
                total_units += qty

                if g_id not in garments_map:
                    garments_map[g_id] = {
                        "name": g_name,
                        "units": 0,
                        "revenue": 0
                    }
                garments_map[g_id]["units"] += qty
                garments_map[g_id]["revenue"] += subtotal

        top_garments = []
        for g_id, data in sorted(garments_map.items(), key=lambda x: x[1]["units"], reverse=True):
            share = round((data["units"] / total_units * 100) if total_units > 0 else 0.0, 1)
            top_garments.append(
                GarmentPerformanceItem(
                    garment_id=g_id,
                    garment_name=data["name"],
                    units_sold=data["units"],
                    revenue_clp=data["revenue"],
                    share_percentage=share
                )
            )

        # Desglose logístico
        orders_for_logistics = period_orders if period_orders else valid_orders
        pickup_count = len([o for o in orders_for_logistics if o.delivery_method == "pickup"])
        shipping_count = len([o for o in orders_for_logistics if o.delivery_method != "pickup"])
        tot_log = pickup_count + shipping_count
        pickup_pct = round((pickup_count / tot_log * 100) if tot_log > 0 else 0.0, 1)
        shipping_pct = round((shipping_count / tot_log * 100) if tot_log > 0 else 0.0, 1)

        total_units_period = sum(sum(it.get("quantity", 1) for it in o.items) for o in period_orders)

        return WorkshopAnalyticsResponse(
            period_days=days,
            total_revenue_period=total_revenue_period,
            total_orders_period=total_orders_period,
            average_order_value_clp=aov,
            total_units_period=total_units_period,
            historical_revenue_clp=historical_revenue,
            historical_orders_count=historical_orders_count,
            timeseries=timeseries,
            top_garments=top_garments,
            logistics=LogisticsBreakdown(
                pickup_count=pickup_count,
                shipping_count=shipping_count,
                pickup_percentage=pickup_pct,
                shipping_percentage=shipping_pct
            )
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
