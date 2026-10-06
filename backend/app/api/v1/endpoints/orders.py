from typing import List, Optional, Union
from fastapi import APIRouter, HTTPException, status, Query, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.domain import OrderCreate, OrderResponse, OrderTrackingResponse, OrderProductionStatus
from app.services.order_service import order_service, OrderService
from app.core.security import require_workshop_auth, is_authenticated_workshop
from app.core.exceptions import EntityNotFoundException, SenkaiDomainException
from app.db.session import get_db

router = APIRouter(prefix="/orders", tags=["Pedidos y Checkout"])


@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED, summary="Crear un nuevo pedido con prendas y personalización DTF")
async def create_order(
    payload: OrderCreate,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key", description="Llave de idempotencia única para prevenir compras duplicadas"),
    session: AsyncSession = Depends(get_db)
):
    try:
        return await order_service.create_order(session, payload, idempotency_key=idempotency_key)
    except (EntityNotFoundException, ValueError) as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(err)
        )


@router.get(
    "/",
    response_model=List[OrderResponse],
    summary="Listar pedidos de taller (restringido a operarios autorizados)",
    dependencies=[Depends(require_workshop_auth)]
)
async def list_orders(
    status: Optional[OrderProductionStatus] = Query(None, description="Filtrar por estado de producción"),
    session: AsyncSession = Depends(get_db)
):
    """Acceso restringido para proteger datos personales (PII) de los clientes de Senkai."""
    return await order_service.list_orders(session, status=status)


@router.get(
    "/{order_number}",
    response_model=Union[OrderResponse, OrderTrackingResponse],
    summary="Consultar estado de seguimiento de un pedido por código"
)
async def get_order_by_number(
    order_number: str,
    is_admin: bool = Depends(is_authenticated_workshop),
    session: AsyncSession = Depends(get_db)
):
    """
    Entrega el estado del pedido y su trazabilidad.
    Si la consulta es pública, enmascara y sanitiza los datos personales (PII) del cliente.
    Si la consulta incluye token de taller autorizado, retorna los datos completos de contacto y despacho.
    """
    order = await order_service.repository.find_by_identifier(session, order_number)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pedido '{order_number}' no encontrado en el sistema."
        )
    if is_admin:
        return order_service.to_response_dto(order)
    return order_service.to_tracking_dto(order)
