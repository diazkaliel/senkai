"""
Servicio de casos de uso para órdenes y ciclo de compra en Senkai DTF Studio.
Coordina validación de prendas, cálculo autoritativo de precios, descuento de inventario,
persistencia ACID y prevención de pedidos duplicados mediante llaves de idempotencia.
"""

import hashlib
import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.domain import (
    OrderCreate, OrderResponse, OrderItemResponse, OrderProductionStatus,
    DTFPrintItem, DTFPrintPosition
)
from app.db.models import OrderModel, OrderItemModel, IdempotencyRecordModel
from app.repositories.order_repository import order_repository, OrderRepository
from app.repositories.catalog_repository import catalog_repository, CatalogRepository
from app.services.catalog_service import catalog_service, CatalogService
from app.services.pricing_service import pricing_service, PricingService
from app.core.exceptions import EntityNotFoundException


class OrderService:
    """Caso de uso de creación, trazabilidad, control de stock y consulta de órdenes."""

    def __init__(
        self,
        repository: OrderRepository = order_repository,
        catalog: CatalogService = catalog_service,
        catalog_repo: CatalogRepository = catalog_repository,
        pricing: PricingService = pricing_service
    ):
        self.repository = repository
        self.catalog = catalog
        self.catalog_repo = catalog_repo
        self.pricing = pricing

    async def create_order(
        self,
        session: AsyncSession,
        payload: OrderCreate,
        idempotency_key: Optional[str] = None
    ) -> OrderResponse:
        """
        Crea y persiste un nuevo pedido tras recalcular todos los costos de forma autoritativa.
        Soporta Idempotency-Key para prevenir duplicación por doble clic.
        """
        # 1. Verificación de Idempotencia
        if idempotency_key:
            existing_record = await self.repository.get_idempotency_record(session, idempotency_key)
            if existing_record:
                # Retornar la orden original sin duplicar cobros ni descontar inventario
                return OrderResponse.model_validate_json(existing_record.response_payload)

        verified_items: List[OrderItemResponse] = []
        relational_items: List[OrderItemModel] = []
        subtotal_accumulated = 0

        for item in payload.items:
            garment = await self.catalog.require_garment_async(session, item.garment_id)

            # Normalizar estampas (soporte para formato multi-print y legado dtf_config)
            prints_to_process = list(item.prints)
            if not prints_to_process and item.dtf_config:
                view_side = "back" if item.dtf_config.position == DTFPrintPosition.BACK_FULL else "front"
                prints_to_process.append(
                    DTFPrintItem(
                        id=f"prn-{uuid.uuid4().hex[:6]}",
                        view=view_side,
                        print_size=item.dtf_config.print_size,
                        design_name=item.dtf_config.design_name or "Estampa Personalizada",
                        design_image_url=item.dtf_config.design_image_url,
                        design_preview_base64=item.dtf_config.design_preview_base64,
                        offset_x_pct=item.dtf_config.offset_x_pct,
                        offset_y_pct=item.dtf_config.offset_y_pct,
                        scale_factor=item.dtf_config.scale_factor
                    )
                )

            # Cálculo autoritativo de transfers DTF
            dtf_unit_cost = 0
            verified_prints: List[DTFPrintItem] = []
            if prints_to_process:
                quote = self.pricing.calculate_multi_prints_price(prints_to_process, quantity=item.quantity)
                dtf_unit_cost = quote["unit_dtf_total"]
                verified_prints = quote["prints"]

            # Valor final del ítem textil
            unit_price = garment.base_price + dtf_unit_cost
            item_subtotal = unit_price * item.quantity
            subtotal_accumulated += item_subtotal

            verified_items.append(
                OrderItemResponse(
                    garment_id=garment.id,
                    garment_name=garment.name,
                    selected_color=item.selected_color,
                    selected_size=item.selected_size,
                    prints=verified_prints,
                    dtf_config=item.dtf_config,
                    quantity=item.quantity,
                    unit_price=unit_price,
                    subtotal=item_subtotal
                )
            )

            # Preparar ítem relacional
            prints_data = [p.model_dump() for p in verified_prints]
            relational_items.append(
                OrderItemModel(
                    id=str(uuid.uuid4()),
                    garment_id=garment.id,
                    garment_name=garment.name,
                    selected_color_name=item.selected_color.name,
                    selected_color_hex=item.selected_color.hex_code,
                    selected_size=item.selected_size.value,
                    quantity=item.quantity,
                    unit_price=unit_price,
                    subtotal=item_subtotal,
                    prints_payload=json.dumps(prints_data, ensure_ascii=False)
                )
            )

            # Descuento atómico de stock físico si la variante existe en BD
            await self.catalog_repo.deduct_stock(
                session=session,
                garment_id=garment.id,
                color_name=item.selected_color.name,
                size=item.selected_size.value,
                quantity=item.quantity
            )

        # Cálculo autoritativo de despacho (0 retiro en taller, 3990 envío)
        shipping_cost = 0 if payload.customer.delivery_method == "pickup" else 3990
        total_authorized = subtotal_accumulated + shipping_cost

        # Generación de número de orden secuencial y fechas estimadas
        current_count = await self.repository.count_orders(session)
        order_seq = current_count + 1
        now = datetime.now(timezone.utc)
        estimated_date = (now + timedelta(days=2)).strftime("%d/%m/%Y")
        order_id = str(uuid.uuid4())

        db_order = OrderModel(
            id=order_id,
            order_number=f"SNK-2026-{order_seq:04d}",
            customer_name=payload.customer.full_name,
            customer_email=payload.customer.email,
            customer_phone=payload.customer.phone,
            delivery_method=payload.customer.delivery_method,
            shipping_address=payload.customer.shipping_address,
            shipping_city=payload.customer.shipping_city,
            notes=payload.customer.notes,
            total_amount=total_authorized,
            shipping_cost=shipping_cost,
            status=OrderProductionStatus.PRINT_QUEUE.value,
            created_at=now,
            updated_at=now,
            estimated_delivery=estimated_date,
            tracking_code=None,
            items_payload=json.dumps([i.model_dump() for i in verified_items], ensure_ascii=False)
        )

        saved_order = await self.repository.create(session, db_order, items=relational_items)
        response_dto = self.to_response_dto(saved_order)

        # 2. Registrar llave de idempotencia si fue suministrada
        if idempotency_key:
            req_hash = hashlib.sha256(payload.model_dump_json().encode()).hexdigest()
            idemp_record = IdempotencyRecordModel(
                key=idempotency_key,
                request_hash=req_hash,
                response_payload=response_dto.model_dump_json(),
                status_code=201,
                created_at=now
            )
            await self.repository.save_idempotency_record(session, idemp_record)

        return response_dto

    async def get_by_identifier(
        self,
        session: AsyncSession,
        identifier: str
    ) -> Optional[OrderResponse]:
        """Recupera una orden por ID o código de seguimiento para consulta del cliente."""
        order = await self.repository.find_by_identifier(session, identifier)
        return self.to_response_dto(order) if order else None

    async def list_orders(
        self,
        session: AsyncSession,
        status: Optional[OrderProductionStatus] = None
    ) -> List[OrderResponse]:
        """Listado de órdenes para el flujo operativo del taller."""
        status_filter = status.value if status else None
        orders = await self.repository.list_orders(session, status=status_filter)
        return [self.to_response_dto(o) for o in orders]

    @staticmethod
    def to_response_dto(o: OrderModel) -> OrderResponse:
        """Mapeo explícito desde entidad ORM a contrato de respuesta Pydantic."""
        created_str = o.created_at.isoformat() if isinstance(o.created_at, datetime) else str(o.created_at)
        updated_str = o.updated_at.isoformat() if isinstance(o.updated_at, datetime) else str(o.updated_at)
        return OrderResponse(
            id=o.id,
            order_number=o.order_number,
            customer={
                "full_name": o.customer_name,
                "email": o.customer_email,
                "phone": o.customer_phone,
                "delivery_method": o.delivery_method,
                "shipping_address": o.shipping_address,
                "shipping_city": o.shipping_city,
                "notes": o.notes
            },
            items=o.items,
            total_amount=o.total_amount,
            shipping_cost=o.shipping_cost,
            status=OrderProductionStatus(o.status),
            created_at=created_str,
            updated_at=updated_str,
            estimated_delivery=o.estimated_delivery,
            tracking_code=o.tracking_code
        )


order_service = OrderService()
