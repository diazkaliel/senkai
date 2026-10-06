"""
Endpoints para catálogo de prendas textiles base.
"""

from typing import List
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.domain import GarmentBase
from app.services.catalog_service import catalog_service, CatalogService
from app.core.exceptions import EntityNotFoundException
from app.db.session import get_db

router = APIRouter(prefix="/garments", tags=["Catálogo Textil"])


@router.get("", response_model=List[GarmentBase], include_in_schema=False)
@router.get("/", response_model=List[GarmentBase], summary="Listar todas las prendas disponibles")
async def list_garments(
    session: AsyncSession = Depends(get_db)
):
    return await catalog_service.get_all_garments_async(session)


@router.get("/{garment_id}", response_model=GarmentBase, summary="Obtener detalle de una prenda base")
async def get_garment(
    garment_id: str,
    session: AsyncSession = Depends(get_db)
):
    try:
        return await catalog_service.require_garment_async(session, garment_id)
    except EntityNotFoundException as err:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(err)
        )
