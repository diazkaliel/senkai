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
    DTFPrintItem, DTFPrintPosition, OrderTrackingResponse, CustomerTrackingInfo
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
        items_to_deduct: List[Dict[str, Any]] = []
        subtotal_accumulated = 0

        # Consultar precios oficiales de vitrina (Lookbook) por si el ítem proviene directamente del catálogo
        lookbook_prices_by_name: Dict[str, int] = {}
        try:
            from app.services.content_service import content_service
            consolidated = await content_service.get_consolidated_content(session)
            if consolidated and consolidated.lookbook and consolidated.lookbook.items:
                for lb_it in consolidated.lookbook.items:
                    if lb_it.name and lb_it.price:
                        lookbook_prices_by_name[lb_it.name.strip()] = int(lb_it.price)
        except Exception:
            pass

        for item in payload.items:
            garment = await self.catalog.require_garment_async(session, item.garment_id)
            if not garment.is_active:
                raise ValueError(
                    f"El tipo de prenda '{garment.name}' no se encuentra disponible temporalmente para pedidos."
                )

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

            # Registro técnico de transfers DTF (el valor de la prenda o talla ya incluye el estampado)
            verified_prints: List[DTFPrintItem] = []
            if prints_to_process:
                quote = self.pricing.calculate_multi_prints_price(prints_to_process, quantity=item.quantity)
                verified_prints = [
                    p.model_copy(update={"calculated_dtf_cost": 0})
                    for p in quote["prints"]
                ]

            # Valor final del ítem textil (considerando precio diferenciado por talla si fue asignado)
            size_key = item.selected_size.value if hasattr(item.selected_size, "value") else str(item.selected_size)
            size_prices_map = getattr(garment, "size_prices", None) or {}
            effective_garment_price = size_prices_map.get(size_key, garment.base_price)

            # Si la prenda fue agregada directamente desde el Catálogo Lookbook, usar su precio oficial
            raw_item_name = (item.garment_name or "").strip()
            resolved_garment_name = garment.name
            if raw_item_name and raw_item_name in lookbook_prices_by_name:
                lb_base_price = lookbook_prices_by_name[raw_item_name]
                size_delta = (size_prices_map[size_key] - garment.base_price) if size_key in size_prices_map else 0
                effective_garment_price = max(1000, lb_base_price + size_delta)
                resolved_garment_name = raw_item_name

            unit_price = effective_garment_price
            item_subtotal = unit_price * item.quantity
            subtotal_accumulated += item_subtotal

            verified_items.append(
                OrderItemResponse(
                    garment_id=garment.id,
                    garment_name=resolved_garment_name,
                    selected_color=item.selected_color,
                    selected_size=item.selected_size,
                    prints=verified_prints,
                    dtf_config=item.dtf_config,
                    preview_front_summary=item.preview_front_summary,
                    preview_back_summary=item.preview_back_summary,
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
                    garment_name=resolved_garment_name,
                    selected_color_name=item.selected_color.name,
                    selected_color_hex=item.selected_color.hex_code,
                    selected_size=item.selected_size.value,
                    quantity=item.quantity,
                    unit_price=unit_price,
                    subtotal=item_subtotal,
                    prints_payload=json.dumps(prints_data, ensure_ascii=False)
                )
            )

            # Acumular ítem para validación y reserva atómica de inventario
            items_to_deduct.append({
                "garment_id": garment.id,
                "garment_name": garment.name,
                "color_name": item.selected_color.name,
                "color_hex": item.selected_color.hex_code,
                "size": item.selected_size.value,
                "quantity": item.quantity
            })

        # Verificación y reserva atómica de existencias físicas (falla rápido sin inconsistencias)
        await self.catalog_repo.verify_and_deduct_stock_atomic(session, items_to_deduct)

        # Cálculo autoritativo de despacho (0 retiro en taller, 3990 envío)
        shipping_cost = 0 if payload.customer.delivery_method == "pickup" else 3990
        total_authorized = subtotal_accumulated + shipping_cost

        # Generación de número de orden secuencial resistente a condiciones de carrera
        now = datetime.now(timezone.utc)
        order_number = await self.repository.get_next_order_number(session, year=now.year)
        estimated_date = (now + timedelta(days=2)).strftime("%d/%m/%Y")
        order_id = str(uuid.uuid4())

        db_order = OrderModel(
            id=order_id,
            order_number=order_number,
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

    @staticmethod
    def _mask_name(name: str) -> str:
        parts = name.strip().split()
        if not parts:
            return "Cliente Senkai"
        if len(parts) == 1:
            return parts[0]
        return f"{parts[0]} {parts[1][0]}."

    @classmethod
    def to_tracking_dto(cls, o: OrderModel) -> OrderTrackingResponse:
        """Mapeo a contrato de tracking público sanitizado sin datos de contacto directos."""
        created_str = o.created_at.isoformat() if isinstance(o.created_at, datetime) else str(o.created_at)
        updated_str = o.updated_at.isoformat() if isinstance(o.updated_at, datetime) else str(o.updated_at)
        return OrderTrackingResponse(
            id=o.id,
            order_number=o.order_number,
            customer=CustomerTrackingInfo(
                full_name=cls._mask_name(o.customer_name),
                delivery_method=o.delivery_method,
                shipping_city=o.shipping_city,
                notes=o.notes
            ),
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
