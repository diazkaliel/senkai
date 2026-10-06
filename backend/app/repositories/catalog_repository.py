"""
Repositorio de persistencia para el catálogo textil e inventario físico (SQLAlchemy 2.0).
"""

from typing import List, Optional, Dict, Any
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import GarmentModel, GarmentVariantModel
from app.schemas.domain import (
    GarmentBase, GarmentCategory, GarmentSize, ColorVariant
)
from app.core.exceptions import InsufficientStockException


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
        size: str,
        color_hex: Optional[str] = None
    ) -> Optional[GarmentVariantModel]:
        """Recupera variante por prenda, talla y nombre de color o código hexadecimal."""
        color_filters = [func.lower(GarmentVariantModel.color_name) == color_name.strip().lower()]
        if color_hex:
            color_filters.append(func.lower(GarmentVariantModel.color_hex) == color_hex.strip().lower())

        stmt = select(GarmentVariantModel).where(
            (GarmentVariantModel.garment_id == garment_id) &
            (GarmentVariantModel.size == size) &
            (GarmentVariantModel.is_active == True) &
            or_(*color_filters)
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def verify_and_deduct_stock_atomic(
        self,
        session: AsyncSession,
        items_to_deduct: List[Dict[str, Any]]
    ) -> None:
        """
        Garantiza consistencia transaccional en dos fases:
        1. Pre-validación: Verifica que cada variante solicitada exista y cuente con existencias suficientes.
        2. Descuento atómico: Si todas cumplen, descuenta las unidades solicitadas.
        Si alguna variante no tiene stock suficiente, lanza InsufficientStockException sin modificar el estado.
        """
        variants_to_update = []
        for it in items_to_deduct:
            variant = await self.get_variant(
                session=session,
                garment_id=it["garment_id"],
                color_name=it["color_name"],
                size=it["size"],
                color_hex=it.get("color_hex")
            )
            g_name = it.get("garment_name") or it["garment_id"]
            if not variant:
                raise InsufficientStockException(
                    garment_name=g_name,
                    size=it["size"],
                    color=it["color_name"],
                    requested=it["quantity"],
                    available=0
                )
            if variant.stock_quantity < it["quantity"]:
                raise InsufficientStockException(
                    garment_name=g_name,
                    size=it["size"],
                    color=it["color_name"],
                    requested=it["quantity"],
                    available=variant.stock_quantity
                )
            variants_to_update.append((variant, it["quantity"]))

        for variant, qty in variants_to_update:
            variant.stock_quantity -= qty

    async def deduct_stock(
        self,
        session: AsyncSession,
        garment_id: str,
        color_name: str,
        size: str,
        quantity: int,
        color_hex: Optional[str] = None
    ) -> bool:
        """Descuenta stock disponible para una variante específica tras confirmación de compra."""
        variant = await self.get_variant(session, garment_id, color_name, size, color_hex=color_hex)
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
            photo_front=model.photo_front,
            photo_back=model.photo_back,
            is_active=model.is_active
        )

    async def update_garment(
        self,
        session: AsyncSession,
        garment_id: str,
        update_dict: dict
    ) -> Optional[GarmentModel]:
        """Actualiza campos específicos de una prenda y persiste atómicamente."""
        garment = await self.get_by_id(session, garment_id)
        if not garment:
            return None

        for key, value in update_dict.items():
            if value is not None and hasattr(garment, key):
                setattr(garment, key, value)

        await session.commit()
        await session.refresh(garment)
        return garment


catalog_repository = CatalogRepository()
