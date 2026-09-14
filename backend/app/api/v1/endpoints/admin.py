"""
Endpoints para el panel administrativo y taller de producción DTF.
"""

from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.domain import OrderResponse, OrderProductionStatus, WorkshopMetrics
from app.services.workshop_service import workshop_service, WorkshopService
from app.core.security import require_workshop_auth
from app.db.session import get_db

router = APIRouter(
    prefix="/admin",
    tags=["Panel Administrativo & Taller"],
    dependencies=[Depends(require_workshop_auth)]
)


class StatusUpdatePayload(BaseModel):
    status: OrderProductionStatus
    tracking_code: Optional[str] = None


@router.get("/metrics", response_model=WorkshopMetrics, summary="Obtener métricas clave de taller y ventas")
async def get_metrics(
    session: AsyncSession = Depends(get_db)
):
    return await workshop_service.get_metrics(session)


@router.patch("/orders/{order_id}/status", response_model=OrderResponse, summary="Actualizar estado de producción de un pedido en el Kanban")
async def update_order_status(
    order_id: str,
    payload: StatusUpdatePayload,
    session: AsyncSession = Depends(get_db)
):
    updated = await workshop_service.update_order_status(
        session=session,
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
