"""
Endpoints para el panel administrativo y taller de producción DTF.
"""

import os
import uuid
from typing import Optional, List
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, status, Depends, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.domain import (
    OrderResponse, OrderProductionStatus, WorkshopMetrics,
    WorkshopAnalyticsResponse, GarmentBase, GarmentUpdatePayload,
    GarmentVariantDetail, VariantStockUpdatePayload
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


@router.get(
    "/garments/{garment_id}/variants",
    response_model=List[GarmentVariantDetail],
    summary="Listar inventario físico de todas las variantes (Talla x Color) de una prenda"
)
async def get_garment_variants(
    garment_id: str,
    session: AsyncSession = Depends(get_db)
):
    """
    Retorna la lista completa de variantes físicas con existencias en bodega
    para la matriz de supervisión de stock del taller.
    """
    return await catalog_service.get_garment_variants_async(session, garment_id)


@router.patch(
    "/garments/{garment_id}/variants/{variant_id}",
    response_model=GarmentVariantDetail,
    summary="Ajustar existencias físicas en bodega o habilitar/deshabilitar variante"
)
async def update_variant_stock(
    garment_id: str,
    variant_id: str,
    payload: VariantStockUpdatePayload,
    session: AsyncSession = Depends(get_db)
):
    """
    Permite modificar atómicamente el stock físico de una variante específica
    tras reabastecimiento o ajuste de mermas en taller.
    """
    try:
        return await catalog_service.update_variant_stock_async(
            session=session,
            garment_id=garment_id,
            variant_id=variant_id,
            payload=payload
        )
    except EntityNotFoundException as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc)
        )


ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
CHUNK_SIZE_BYTES = 64 * 1024  # 64 KB


@router.post(
    "/upload-image",
    summary="Subir imagen para catálogo, banners o vitrina pública",
    status_code=status.HTTP_201_CREATED
)
async def upload_admin_image(
    file: UploadFile = File(...)
):
    """
    Permite al administrador subir imágenes de productos, banners o editoriales
    directamente desde su equipo hacia el servidor de taller con lectura en streaming
    para evitar agotamiento de memoria.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se proporcionó un nombre de archivo válido."
        )

    _, ext = os.path.splitext(file.filename.lower())
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Extensión no permitida '{ext}'. Formatos ráster admitidos: {', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}"
        )

    safe_name = f"{uuid.uuid4().hex[:12]}{ext}"
    if os.path.isdir("/app/storage"):
        uploads_dir = "/app/storage/uploads"
    else:
        uploads_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "..", "frontend", "assets", "uploads")
        )
    os.makedirs(uploads_dir, exist_ok=True)
    destination_path = os.path.join(uploads_dir, safe_name)

    total_bytes = 0
    try:
        with open(destination_path, "wb") as f:
            while True:
                chunk = await file.read(CHUNK_SIZE_BYTES)
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > MAX_IMAGE_SIZE_BYTES:
                    f.close()
                    if os.path.exists(destination_path):
                        os.remove(destination_path)
                    raise HTTPException(
                        status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                        detail="La imagen excede el límite permitido de 10 MB."
                    )
                f.write(chunk)
    except HTTPException:
        raise
    except Exception as exc:
        if os.path.exists(destination_path):
            os.remove(destination_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error durante el almacenamiento del archivo: {exc}"
        )

    return {
        "status": "success",
        "url": f"/static/assets/uploads/{safe_name}",
        "filename": safe_name
    }


