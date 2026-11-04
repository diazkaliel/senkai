from typing import List, Optional, Union
from uuid import UUID
from fastapi import APIRouter, HTTPException, status, Query, Depends, Header, Request
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.domain import OrderCreate, OrderResponse, OrderTrackingResponse, OrderProductionStatus
from app.services.order_service import order_service, OrderService
from app.core.security import require_workshop_auth, is_authenticated_workshop
from app.core.exceptions import EntityNotFoundException, SenkaiDomainException, IdempotencyConflictException
from app.db.session import get_db

router = APIRouter(prefix="/orders", tags=["Pedidos y Checkout"])

MAX_CHECKOUT_BODY_BYTES = 6 * 1024 * 1024


async def parse_checkout_body(request: Request) -> OrderCreate:
    """Limitar bytes antes de parsear JSON para proteger la RAM de la máquina Fly."""
    received_bytes = 0
    chunks = []
    async for chunk in request.stream():
        received_bytes += len(chunk)
        if received_bytes > MAX_CHECKOUT_BODY_BYTES:
            raise HTTPException(status_code=413, detail="El pedido excede el tamaño máximo de 6 MiB.")
        chunks.append(chunk)

    try:
        return OrderCreate.model_validate_json(b"".join(chunks))
    except ValidationError as validation_error:
        # Conserva el contrato HTTP 422 de FastAPI para validaciones Pydantic.
        issues = validation_error.errors(include_context=False)
        for issue in issues:
            issue["loc"] = ("body", *issue["loc"])
        raise RequestValidationError(issues) from validation_error


@router.post(
    "/",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear un nuevo pedido con prendas y personalización DTF",
    openapi_extra={"requestBody": {
        "required": True,
        "content": {"application/json": {"schema": OrderCreate.model_json_schema()}}
    }}
)
async def create_order(
    payload: OrderCreate = Depends(parse_checkout_body),
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key", description="Llave de idempotencia única para prevenir compras duplicadas"),
    session: AsyncSession = Depends(get_db)
):
    try:
        return await order_service.create_order(session, payload, idempotency_key=idempotency_key)
    except IdempotencyConflictException as err:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(err)
        )
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
    if is_admin:
        order = await order_service.repository.find_by_identifier(session, order_number)
        if order is not None:
            return order_service.to_response_dto(order)
    else:
        # Los folios SNK son secuenciales y no sirven como credenciales públicas.
        # El UUID v4 entregado en checkout funciona como capacidad de seguimiento.
        try:
            tracking_id = UUID(order_number)
            if tracking_id.version != 4 or str(tracking_id) != order_number.lower():
                raise ValueError("Identificador no autorizado")
        except ValueError:
            raise HTTPException(status_code=404, detail="Pedido no encontrado.")
        order = await order_service.repository.get_by_id(session, str(tracking_id))
        if order is not None:
            return order_service.to_tracking_dto(order)
    raise HTTPException(status_code=404, detail="Pedido no encontrado.")
