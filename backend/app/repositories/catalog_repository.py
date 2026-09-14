"""
Repositorio de persistencia para el catálogo textil e inventario físico (SQLAlchemy 2.0).
"""

from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import GarmentModel, GarmentVariantModel
from app.schemas.domain import (
    GarmentBase, GarmentCategory, GarmentSize, ColorVariant
)


class CatalogRepository:
    """Acceso a datos para prendas base y variantes de inventario."""

    async def list_active_garments(self, session: AsyncSession) -> List[GarmentModel]:
        stmt = select(GarmentModel).where(GarmentModel.is_active == True)
        result = await session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id(self, session: AsyncSession, garment_id: str) -> Optional[GarmentModel]:
        stmt = select(GarmentModel).where(
            (GarmentModel.id == garment_id) & (GarmentModel.is_active == True)
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_variant(
        self,
        session: AsyncSession,
        garment_id: str,
        color_name: str,
        size: str
    ) -> Optional[GarmentVariantModel]:
        stmt = select(GarmentVariantModel).where(
            (GarmentVariantModel.garment_id == garment_id) &
            (GarmentVariantModel.color_name == color_name) &
            (GarmentVariantModel.size == size) &
            (GarmentVariantModel.is_active == True)
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def deduct_stock(
        self,
        session: AsyncSession,
        garment_id: str,
        color_name: str,
        size: str,
        quantity: int
    ) -> bool:
        """Descuenta stock disponible para una variante específica tras confirmación de compra."""
        variant = await self.get_variant(session, garment_id, color_name, size)
        if variant and variant.stock_quantity >= quantity:
            variant.stock_quantity -= quantity
            return True
        return False

    @staticmethod
    def to_schema(model: GarmentModel) -> GarmentBase:
        """Mapeo explícito desde entidad ORM relacional a contrato Pydantic del catálogo."""
        # Agrupar colores únicos con estado de stock agregado
        colors_map = {}
        sizes_set = set()

        for v in model.variants:
            if v.is_active:
                sizes_set.add(v.size)
                if v.color_name not in colors_map:
                    colors_map[v.color_name] = {
                        "name": v.color_name,
                        "hex_code": v.color_hex,
                        "in_stock": v.stock_quantity > 0
                    }
                elif v.stock_quantity > 0:
                    colors_map[v.color_name]["in_stock"] = True

        colors = [ColorVariant(**c) for c in colors_map.values()]
        
        # Orden canónico de tallas
        size_order = ["S", "M", "L", "XL", "XXL"]
        sizes = [GarmentSize(s) for s in size_order if s in sizes_set]

        return GarmentBase(
            id=model.id,
            name=model.name,
            category=GarmentCategory(model.category),
            description=model.description,
            weight_gsm=model.weight_gsm,
            composition=model.composition,
            base_price=model.base_price,
            colors=colors,
            sizes=sizes,
            image_front_template=model.image_front_template,
            image_back_template=model.image_back_template,
            is_active=model.is_active
        )


catalog_repository = CatalogRepository()
