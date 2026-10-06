"""
Endpoints para el panel administrativo y taller de producción DTF.
"""

from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, status, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.domain import (
    OrderResponse, OrderProductionStatus, WorkshopMetrics,
    WorkshopAnalyticsResponse, GarmentBase, GarmentUpdatePayload
)
from app.services.workshop_service import workshop_service, WorkshopService
from app.services.catalog_service import catalog_service, CatalogService
from app.core.exceptions import EntityNotFoundException
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


@router.get("/analytics", response_model=WorkshopAnalyticsResponse, summary="Obtener analítica de datos, series temporales y rendimiento textil")
async def get_analytics(
    days: int = Query(30, ge=1, le=90, description="Días a computar para serie temporal y métricas"),
    session: AsyncSession = Depends(get_db)
):
    return await workshop_service.get_analytics(session, days=days)


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


@router.patch(
    "/garments/{garment_id}",
    response_model=GarmentBase,
    summary="Actualizar precio base, fotos reales o metadatos de una prenda del catálogo"
)
async def update_garment(
    garment_id: str,
    payload: GarmentUpdatePayload,
    session: AsyncSession = Depends(get_db)
):
    """
    Permite modificar de forma persistente el precio base, fotos reales o descripción
    de una prenda del catálogo textil. Requiere autenticación de taller.
    """
    try:
        return await catalog_service.update_garment_async(session, garment_id, payload)
    except EntityNotFoundException as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc)
        )
