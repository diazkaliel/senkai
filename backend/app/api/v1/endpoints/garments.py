"""
Endpoints para catálogo de prendas textiles base.
"""

from typing import List
from fastapi import APIRouter, HTTPException, status

from app.schemas.domain import GarmentBase
from app.services.store_service import store_service

router = APIRouter(prefix="/garments", tags=["Catálogo Textil"])


@router.get("/", response_model=List[GarmentBase], summary="Listar todas las prendas disponibles")
def list_garments():
    return store_service.get_all_garments()


@router.get("/{garment_id}", response_model=GarmentBase, summary="Obtener detalle de una prenda base")
def get_garment(garment_id: str):
    garment = store_service.get_garment_by_id(garment_id)
    if not garment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Prenda con ID '{garment_id}' no encontrada."
        )
    return garment
