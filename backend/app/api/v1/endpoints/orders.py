"""
Endpoints para creación y seguimiento de pedidos de clientes.
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Query

from app.schemas.domain import OrderCreate, OrderResponse, OrderProductionStatus
from app.services.store_service import store_service

router = APIRouter(prefix="/orders", tags=["Pedidos y Checkout"])


@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED, summary="Crear un nuevo pedido con prendas y personalización DTF")
def create_order(payload: OrderCreate):
    return store_service.create_order(payload)


@router.get("/", response_model=List[OrderResponse], summary="Listar pedidos (filtrable por estado)")
def list_orders(status: Optional[OrderProductionStatus] = Query(None, description="Filtrar por estado de producción")):
    return store_service.get_orders(status=status)


@router.get("/{order_number}", response_model=OrderResponse, summary="Consultar estado de seguimiento de un pedido por código")
def get_order_by_number(order_number: str):
    orders = store_service.get_orders()
    order = next((o for o in orders if o.order_number == order_number or o.id == order_number), None)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pedido '{order_number}' no encontrado en el sistema."
        )
    return order
