"""
Fachada de compatibilidad hacia atrás para Senkai DTF Studio.
DEPRECADO: Importar directamente los servicios especializados:
- app.services.pricing_service (PricingService)
- app.services.catalog_service (CatalogService)
- app.services.order_service (OrderService)
- app.services.workshop_service (WorkshopService)
"""

import warnings
from typing import List, Optional

from app.schemas.domain import (
    GarmentBase, DTFPrintPosition, DTFPrintSize, DTFPrintItem,
    OrderCreate, OrderResponse, OrderProductionStatus, WorkshopMetrics
)
from app.services.catalog_service import catalog_service
from app.services.pricing_service import pricing_service
from app.services.order_service import order_service
from app.services.workshop_service import workshop_service
from app.db.session import async_session_factory


class SenkaiStoreServiceFacade:
    """Delega las llamadas a los servicios de dominio de responsabilidad única."""

    def __init__(self):
        warnings.warn(
            "SenkaiStoreService está deprecado. Utilice los servicios de dominio específicos.",
            DeprecationWarning,
            stacklevel=2
        )

    def get_all_garments(self) -> List[GarmentBase]:
        return catalog_service.get_all_garments()

    def get_garment_by_id(self, garment_id: str) -> Optional[GarmentBase]:
        return catalog_service.get_garment_by_id(garment_id)

    def calculate_dtf_price(self, position: DTFPrintPosition, print_size: DTFPrintSize, quantity: int = 1):
        return pricing_service.calculate_single_print_price(position=position, print_size=print_size, quantity=quantity)

    def calculate_multi_prints_price(self, prints: List[DTFPrintItem], quantity: int = 1):
        return pricing_service.calculate_multi_prints_price(prints=prints, quantity=quantity)

    async def create_order(self, payload: OrderCreate) -> OrderResponse:
        async with async_session_factory() as session:
            return await order_service.create_order(session, payload)

    async def get_orders(self, status: Optional[OrderProductionStatus] = None) -> List[OrderResponse]:
        async with async_session_factory() as session:
            return await order_service.list_orders(session, status=status)

    async def get_order_by_number(self, identifier: str) -> Optional[OrderResponse]:
        async with async_session_factory() as session:
            return await order_service.get_by_identifier(session, identifier)

    async def update_order_status(
        self,
        order_id: str,
        new_status: OrderProductionStatus,
        tracking_code: Optional[str] = None
    ) -> Optional[OrderResponse]:
        async with async_session_factory() as session:
            return await workshop_service.update_order_status(session, order_id, new_status, tracking_code)

    async def get_workshop_metrics(self) -> WorkshopMetrics:
        async with async_session_factory() as session:
            return await workshop_service.get_metrics(session)


store_service = SenkaiStoreServiceFacade()
