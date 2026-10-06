"""
Servicio del catálogo textil para Senkai DTF Studio.
Gestiona prendas base de alta gama, gramajes de confección y variantes disponibles desde la base de datos.
"""

from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.domain import (
    GarmentBase, GarmentCategory, GarmentSize, ColorVariant, GarmentUpdatePayload
)
from app.repositories.catalog_repository import catalog_repository, CatalogRepository
from app.core.exceptions import EntityNotFoundException


class CatalogService:
    """Gestiona la consulta y especificaciones del catálogo textil."""

    def __init__(self, repository: CatalogRepository = catalog_repository):
        self.repository = repository
        self._fallback_catalog = self._build_fallback()

    def _build_fallback(self) -> List[GarmentBase]:
        """Catálogo de resguardo en caso de inicialización en frío."""
        return [
            GarmentBase(
                id="garment-polera-heavyweight-240",
                name="Polera Oversized Heavyweight 240g",
                category=GarmentCategory.OVERSIZED_T_SHIRT,
                description="Algodón peinado premium de 240g/m². Corte relajado drop-shoulder con cuello reforzado de 3cm.",
                weight_gsm=240,
                composition="100% Algodón Peinado Ringspun",
                base_price=12990,
                colors=[
                    ColorVariant(name="Negro", hex_code="#121212", in_stock=True),
                    ColorVariant(name="Gris", hex_code="#61646B", in_stock=True),
                    ColorVariant(name="Azul", hex_code="#142036", in_stock=True),
                    ColorVariant(name="Rojo", hex_code="#B21B24", in_stock=True),
                    ColorVariant(name="Blanco", hex_code="#FFFFFF", in_stock=True),
                ],
                sizes=[GarmentSize.S, GarmentSize.M, GarmentSize.L, GarmentSize.XL, GarmentSize.XXL],
                image_front_template="/assets/templates/tshirt_front.svg",
                image_back_template="/assets/templates/tshirt_back.svg",
                is_active=True
            ),
            GarmentBase(
                id="garment-polera-classic-180",
                name="Polera Clásica Regular Fit 180g",
                category=GarmentCategory.T_SHIRT,
                description="Algodón 180g/m² suave y transpirable. Costuras laterales reforzadas.",
                weight_gsm=180,
                composition="100% Algodón Jersey",
                base_price=8990,
                colors=[
                    ColorVariant(name="Negro", hex_code="#121212", in_stock=True),
                    ColorVariant(name="Gris", hex_code="#61646B", in_stock=True),
                    ColorVariant(name="Azul", hex_code="#142036", in_stock=True),
                    ColorVariant(name="Rojo", hex_code="#B21B24", in_stock=True),
                    ColorVariant(name="Blanco", hex_code="#FFFFFF", in_stock=True),
                ],
                sizes=[GarmentSize.S, GarmentSize.M, GarmentSize.L, GarmentSize.XL],
                image_front_template="/assets/templates/tshirt_front.svg",
                image_back_template="/assets/templates/tshirt_back.svg",
                is_active=True
            ),
            GarmentBase(
                id="garment-poleron-hoodie-320",
                name="Polerón Canguro Hoodie Heavy 320g",
                category=GarmentCategory.HOODIE,
                description="Polerón premium con interior afelpado (fleece) de 320g/m².",
                weight_gsm=320,
                composition="80% Algodón / 20% Poliéster Antipilling",
                base_price=24990,
                colors=[
                    ColorVariant(name="Negro", hex_code="#121212", in_stock=True),
                    ColorVariant(name="Gris", hex_code="#61646B", in_stock=True),
                    ColorVariant(name="Azul", hex_code="#142036", in_stock=True),
                    ColorVariant(name="Rojo", hex_code="#B21B24", in_stock=True),
                    ColorVariant(name="Blanco", hex_code="#FFFFFF", in_stock=True),
                ],
                sizes=[GarmentSize.S, GarmentSize.M, GarmentSize.L, GarmentSize.XL, GarmentSize.XXL],
                image_front_template="/assets/templates/hoodie_front.svg",
                image_back_template="/assets/templates/hoodie_back.svg",
                is_active=True
            ),
            GarmentBase(
                id="garment-poleron-crewneck-300",
                name="Polerón Crewneck Cuello Redondo 300g",
                category=GarmentCategory.CREWNECK,
                description="Corte minimalista sin capucha con puños y pretina en rib 1x1 con elastano.",
                weight_gsm=300,
                composition="80% Algodón / 20% Poliéster",
                base_price=21990,
                colors=[
                    ColorVariant(name="Negro", hex_code="#121212", in_stock=True),
                    ColorVariant(name="Gris", hex_code="#61646B", in_stock=True),
                    ColorVariant(name="Azul", hex_code="#142036", in_stock=True),
                    ColorVariant(name="Rojo", hex_code="#B21B24", in_stock=True),
                    ColorVariant(name="Blanco", hex_code="#FFFFFF", in_stock=True),
                ],
                sizes=[GarmentSize.S, GarmentSize.M, GarmentSize.L, GarmentSize.XL],
                image_front_template="/assets/templates/crewneck_front.svg",
                image_back_template="/assets/templates/crewneck_back.svg",
                is_active=True
            )
        ]

    async def get_all_garments_async(self, session: AsyncSession) -> List[GarmentBase]:
        """Consulta el catálogo relacional desde la base de datos."""
        models = await self.repository.list_active_garments(session)
        if models:
            return [self.repository.to_schema(m) for m in models]
        return self._fallback_catalog

    async def get_garment_by_id_async(self, session: AsyncSession, garment_id: str) -> Optional[GarmentBase]:
        model = await self.repository.get_by_id(session, garment_id)
        if model:
            return self.repository.to_schema(model)
        return next((g for g in self._fallback_catalog if g.id == garment_id), None)

    async def require_garment_async(self, session: AsyncSession, garment_id: str) -> GarmentBase:
        garment = await self.get_garment_by_id_async(session, garment_id)
        if not garment:
            raise EntityNotFoundException(f"Prenda con ID '{garment_id}' no existe en el catálogo.")
        return garment

    async def update_garment_async(
        self,
        session: AsyncSession,
        garment_id: str,
        payload: GarmentUpdatePayload
    ) -> GarmentBase:
        """Actualiza el precio, fotos o metadatos de una prenda en la base de datos."""
        update_dict = payload.model_dump(exclude_unset=True)
        updated_model = await self.repository.update_garment(session, garment_id, update_dict)
        if not updated_model:
            raise EntityNotFoundException(f"Prenda con ID '{garment_id}' no encontrada para actualizar.")
        return self.repository.to_schema(updated_model)

    # Métodos sincrónicos compatibles
    def get_all_garments(self) -> List[GarmentBase]:
        return self._fallback_catalog

    def get_garment_by_id(self, garment_id: str) -> Optional[GarmentBase]:
        return next((g for g in self._fallback_catalog if g.id == garment_id), None)

    def require_garment(self, garment_id: str) -> GarmentBase:
        garment = self.get_garment_by_id(garment_id)
        if not garment:
            raise EntityNotFoundException(f"Prenda con ID '{garment_id}' no existe en el catálogo.")
        return garment


catalog_service = CatalogService()
