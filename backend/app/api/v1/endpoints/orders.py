"""
Endpoints para creación y seguimiento de pedidos de clientes.
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Query, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.domain import OrderCreate, OrderResponse, OrderProductionStatus
from app.services.order_service import order_service, OrderService
from app.core.security import require_workshop_auth
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


@router.get("/{order_number}", response_model=OrderResponse, summary="Consultar estado de seguimiento de un pedido por código")
async def get_order_by_number(
    order_number: str,
    session: AsyncSession = Depends(get_db)
):
    order = await order_service.get_by_identifier(session, order_number)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pedido '{order_number}' no encontrado en el sistema."
        )
    return order
