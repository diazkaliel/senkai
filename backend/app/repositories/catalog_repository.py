"""
Repositorio de persistencia para el catálogo textil e inventario físico (SQLAlchemy 2.0).
"""

import re
import uuid
from typing import List, Optional, Dict, Any
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import GarmentModel, GarmentVariantModel
from app.schemas.domain import (
    GarmentBase, GarmentCategory, GarmentSize, ColorVariant, GarmentCreatePayload
)
from app.core.exceptions import InsufficientStockException


class CatalogRepository:
    """Acceso a datos para prendas base y variantes de inventario."""

    async def list_active_garments(self, session: AsyncSession) -> List[GarmentModel]:
        stmt = select(GarmentModel)
        result = await session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id(self, session: AsyncSession, garment_id: str) -> Optional[GarmentModel]:
        stmt = select(GarmentModel).where(GarmentModel.id == garment_id)
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
        raw_size_prices = dict(model.size_prices or {})

        for v in model.variants:
            if v.is_active:
                sizes_set.add(v.size)
                if v.custom_price is not None and v.custom_price >= 1000:
                    raw_size_prices[v.size] = int(v.custom_price)
                if v.color_name not in colors_map:
                    colors_map[v.color_name] = {
                        "name": v.color_name,
                        "hex_code": v.color_hex,
                        "in_stock": v.stock_quantity > 0
                    }
                elif v.stock_quantity > 0:
                    colors_map[v.color_name]["in_stock"] = True

        # Senkai Atelier: Confección y catálogo exclusivo en Negro Industrial (#121212)
        black_colors = [
            ColorVariant(**c) for c in colors_map.values()
            if c["hex_code"].lower() == "#121212" or c["name"].lower() == "negro"
        ]
        colors = black_colors if black_colors else [
            ColorVariant(name="Negro", hex_code="#121212", in_stock=True)
        ]
        
        # Orden canónico de tallas
        size_order = ["S", "M", "L", "XL", "XXL"]
        canonical_sizes = [s for s in size_order if s in sizes_set]
        other_sizes = sorted([s for s in sizes_set if s not in size_order])
        all_size_keys = canonical_sizes + other_sizes
        sizes = []
        for s in all_size_keys:
            try:
                sizes.append(GarmentSize(s))
            except ValueError:
                sizes.append(str(s))

        size_prices = {
            str(sz): int(price)
            for sz, price in raw_size_prices.items()
            if price is not None and int(price) >= 1000
        }

        try:
            category_val = GarmentCategory(model.category)
        except ValueError:
            category_val = str(model.category)

        return GarmentBase(
            id=model.id,
            name=model.name,
            category=category_val,
            description=model.description,
            weight_gsm=model.weight_gsm,
            composition=model.composition,
            base_price=model.base_price,
            size_prices=size_prices,
            colors=colors,
            sizes=sizes,
            image_front_template=model.image_front_template,
            image_back_template=model.image_back_template,
            photo_front=model.photo_front,
            photo_back=model.photo_back,
            observation=model.observation,
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

        has_size_prices_key = "size_prices" in update_dict
        raw_size_prices = update_dict.pop("size_prices", None)

        for key, value in update_dict.items():
            if value is not None and hasattr(garment, key):
                setattr(garment, key, value)

        if has_size_prices_key:
            cleaned_sp: Dict[str, int] = {}
            if isinstance(raw_size_prices, dict):
                for sz, val in raw_size_prices.items():
                    if val is not None:
                        try:
                            iv = int(val)
                            if iv >= 1000:
                                cleaned_sp[str(sz).strip().upper()] = iv
                        except (ValueError, TypeError):
                            pass
            garment.size_prices = cleaned_sp
            for v in garment.variants:
                v.custom_price = cleaned_sp.get(v.size, None)

        await session.commit()
        await session.refresh(garment)
        return garment

    async def get_variants_by_garment(
        self,
        session: AsyncSession,
        garment_id: str
    ) -> List[GarmentVariantModel]:
        """Obtiene todas las variantes de una prenda para supervisión de bodega."""
        stmt = (
            select(GarmentVariantModel)
            .where(GarmentVariantModel.garment_id == garment_id)
            .order_by(GarmentVariantModel.color_name, GarmentVariantModel.size)
        )
        result = await session.execute(stmt)
        return list(result.scalars().all())

    async def update_variant_stock(
        self,
        session: AsyncSession,
        garment_id: str,
        variant_id: str,
        stock_quantity: Optional[int] = None,
        is_active: Optional[bool] = None,
        custom_price: Optional[int] = None,
        clear_custom_price: bool = False
    ) -> Optional[GarmentVariantModel]:
        """Actualiza el stock físico y/o el valor diferenciado por talla de una variante de forma atómica."""
        stmt = select(GarmentVariantModel).where(
            (GarmentVariantModel.id == variant_id) &
            (GarmentVariantModel.garment_id == garment_id)
        )
        result = await session.execute(stmt)
        variant = result.scalar_one_or_none()
        if not variant:
            return None

        if stock_quantity is not None:
            variant.stock_quantity = stock_quantity
        if is_active is not None:
            variant.is_active = is_active

        if clear_custom_price or custom_price is not None:
            garment = await self.get_by_id(session, garment_id)
            current_sp = dict(garment.size_prices or {}) if garment else {}
            base_val = garment.base_price if garment else 0

            if clear_custom_price or (custom_price is not None and custom_price == base_val):
                variant.custom_price = None
                current_sp.pop(variant.size, None)
            elif custom_price is not None and custom_price >= 1000:
                variant.custom_price = int(custom_price)
                current_sp[variant.size] = int(custom_price)

            if garment:
                garment.size_prices = current_sp
                for v in garment.variants:
                    if v.size == variant.size:
                        v.custom_price = variant.custom_price

        await session.commit()
        await session.refresh(variant)
        return variant


    async def create_garment(
        self,
        session: AsyncSession,
        payload: GarmentCreatePayload
    ) -> GarmentModel:
        """Crea una nueva prenda o producto en el catálogo e inicializa sus variantes de stock."""
        garment_id = payload.id
        if not garment_id:
            slug = re.sub(r'[^a-zA-Z0-9]+', '-', payload.name.lower()).strip('-')
            garment_id = f"garment-{slug}" if slug else f"garment-{uuid.uuid4().hex[:8]}"

        existing = await self.get_by_id(session, garment_id)
        if existing:
            garment_id = f"{garment_id}-{uuid.uuid4().hex[:4]}"

        cleaned_sp: Dict[str, int] = {}
        if payload.size_prices:
            for sz, val in payload.size_prices.items():
                if val is not None and int(val) >= 1000:
                    cleaned_sp[str(sz).strip().upper()] = int(val)

        garment = GarmentModel(
            id=garment_id,
            name=payload.name,
            category=payload.category,
            description=payload.description,
            weight_gsm=payload.weight_gsm,
            composition=payload.composition,
            base_price=payload.base_price,
            image_front_template=payload.image_front_template or "/static/assets/garments/tshirt_front.png",
            image_back_template=payload.image_back_template or "/static/assets/garments/tshirt_back.png",
            photo_front=payload.photo_front,
            photo_back=payload.photo_back,
            observation=payload.observation,
            is_active=True
        )
        garment.size_prices = cleaned_sp

        colors = payload.colors or [ColorVariant(name="Negro", hex_code="#121212", in_stock=True)]
        raw_sizes = payload.sizes if payload.sizes else ["S", "M", "L", "XL"]

        for color in colors:
            for sz in raw_sizes:
                sz_str = str(sz).strip().upper()
                slug_sz = re.sub(r'[^a-z0-9]+', '', sz_str.lower()) or "std"
                v_id = f"{garment_id}-{color.name.lower()[:3]}-{slug_sz}"
                custom_p = cleaned_sp.get(sz_str)
                variant = GarmentVariantModel(
                    id=v_id,
                    garment_id=garment_id,
                    color_name=color.name,
                    color_hex=color.hex_code,
                    size=sz_str,
                    stock_quantity=payload.initial_stock_per_variant,
                    custom_price=custom_p,
                    is_active=True
                )
                garment.variants.append(variant)

        session.add(garment)
        await session.commit()
        await session.refresh(garment)
        return garment

    async def delete_garment(
        self,
        session: AsyncSession,
        garment_id: str
    ) -> bool:
        """Elimina una prenda y todas sus variantes físicas en cascada."""
        garment = await self.get_by_id(session, garment_id)
        if not garment:
            return False
        await session.delete(garment)
        await session.commit()
        return True


catalog_repository = CatalogRepository()
