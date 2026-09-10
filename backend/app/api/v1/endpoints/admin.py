"""
Endpoints para el panel administrativo y taller de producción DTF.
"""

from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, status

from app.schemas.domain import OrderResponse, OrderProductionStatus, WorkshopMetrics
from app.services.store_service import store_service

router = APIRouter(prefix="/admin", tags=["Panel Administrativo & Taller"])


class StatusUpdatePayload(BaseModel):
    status: OrderProductionStatus
    tracking_code: Optional[str] = None


@router.get("/metrics", response_model=WorkshopMetrics, summary="Obtener métricas clave de taller y ventas")
def get_metrics():
    return store_service.get_workshop_metrics()


@router.patch("/orders/{order_id}/status", response_model=OrderResponse, summary="Actualizar estado de producción de un pedido en el Kanban")
def update_order_status(order_id: str, payload: StatusUpdatePayload):
    updated = store_service.update_order_status(
        order_id=order_id,
        new_status=payload.status,
        tracking_code=payload.tracking_code
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pedido '{order_id}' no encontrado para actualizar."
        )
    return updated
