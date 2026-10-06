"""
Endpoints para la gestión de contenido editorial (CMS) de la vitrina pública y administración.
"""

from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import ValidationError

from app.schemas.domain import SiteContentConsolidated
from app.services.content_service import (
    content_service,
    InvalidSectionKeyException,
    SECTION_VALIDATORS
)
from app.core.security import require_workshop_auth
from app.db.session import get_db

router = APIRouter()


@router.get(
    "/content",
    response_model=SiteContentConsolidated,
    tags=["Contenido Público"],
    summary="Obtener contenido editorial consolidado para la vitrina"
)
async def get_public_content(
    session: AsyncSession = Depends(get_db)
):
    """
    Entrega el estado editorial completo (hero, anuncios, stats, manifiesto, etc.)
    para la hidratación reactiva del frontend público.
    """
    return await content_service.get_consolidated_content(session)


@router.put(
    "/admin/content/{section_key}",
    tags=["Panel Administrativo & Taller"],
    summary="Actualizar bloque de contenido editorial por sección",
    dependencies=[Depends(require_workshop_auth)]
)
async def update_section_content(
    section_key: str,
    payload: Dict[str, Any],
    session: AsyncSession = Depends(get_db)
):
    """
    Actualiza atómicamente una sección de la tienda validando su contrato con Pydantic v2.
    """
    try:
        updated = await content_service.update_section(session, section_key, payload)
        return {
            "status": "success",
            "section_key": section_key,
            "data": updated
        }
    except InvalidSectionKeyException as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc)
        )
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.errors()
        )
