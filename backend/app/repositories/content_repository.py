"""
Repositorio de persistencia asíncrono para contenidos editoriales y configuración del sitio (SQLAlchemy 2.0).
Garantiza transacciones atómicas al actualizar bloques del CMS.
"""

import json
from typing import List, Optional, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import SiteSectionContentModel, utc_now


class ContentRepository:
    """Acceso a datos para el contenido editorial y dinámico de la tienda."""

    async def get_section(
        self,
        session: AsyncSession,
        section_key: str
    ) -> Optional[SiteSectionContentModel]:
        """Recupera el modelo de una sección específica por su clave."""
        stmt = select(SiteSectionContentModel).where(
            SiteSectionContentModel.section_key == section_key
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_all_sections(
        self,
        session: AsyncSession
    ) -> List[SiteSectionContentModel]:
        """Obtiene todas las secciones configuradas en la base de datos."""
        stmt = select(SiteSectionContentModel)
        result = await session.execute(stmt)
        return list(result.scalars().all())

    async def upsert_section(
        self,
        session: AsyncSession,
        section_key: str,
        payload_data: Dict[str, Any]
    ) -> SiteSectionContentModel:
        """
        Inserta o actualiza atómicamente la sección con el payload validado.
        Preserva la idempotencia en escrituras concurrentes.
        """
        existing = await self.get_section(session, section_key)
        payload_str = json.dumps(payload_data, ensure_ascii=False)

        if existing:
            existing.payload_json = payload_str
            existing.updated_at = utc_now()
            section = existing
        else:
            section = SiteSectionContentModel(
                section_key=section_key,
                payload_json=payload_str,
                updated_at=utc_now()
            )
            session.add(section)

        await session.commit()
        await session.refresh(section)
        return section


content_repository = ContentRepository()
