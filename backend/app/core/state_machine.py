"""
Máquina de estados finitos (FSM) para el flujo de producción y confección de taller.
Garantiza el cumplimiento estricto de las etapas físicas:
Cola de Impresión -> Planchado Térmico (160°C) -> Control de Calidad -> Despacho -> Entregado.
"""

from typing import Dict, Set
from app.schemas.domain import OrderProductionStatus
from app.core.exceptions import InvalidStateTransitionException


# Grafo de transiciones autorizadas en taller
ALLOWED_TRANSITIONS: Dict[OrderProductionStatus, Set[OrderProductionStatus]] = {
    OrderProductionStatus.PENDING_PAYMENT: {
        OrderProductionStatus.PRINT_QUEUE,
        OrderProductionStatus.CANCELLED
    },
    OrderProductionStatus.PRINT_QUEUE: {
        OrderProductionStatus.HEAT_PRESSING,
        OrderProductionStatus.CANCELLED
    },
    OrderProductionStatus.HEAT_PRESSING: {
        OrderProductionStatus.QUALITY_CHECK,
        OrderProductionStatus.PRINT_QUEUE,  # Re-impresión si la poliamida falló
        OrderProductionStatus.CANCELLED
    },
    OrderProductionStatus.QUALITY_CHECK: {
        OrderProductionStatus.READY_SHIPPING,
        OrderProductionStatus.HEAT_PRESSING, # Re-planchado si el acabado requiere curado extra
        OrderProductionStatus.CANCELLED
    },
    OrderProductionStatus.READY_SHIPPING: {
        OrderProductionStatus.COMPLETED,
        OrderProductionStatus.CANCELLED
    },
    OrderProductionStatus.COMPLETED: set(),  # Estado terminal
    OrderProductionStatus.CANCELLED: set(),  # Estado terminal
}


def validate_order_status_transition(
    current_status: OrderProductionStatus,
    new_status: OrderProductionStatus
) -> None:
    """
    Verifica que la transición solicitada sea legal según las reglas operativas de taller.
    Permite actualizaciones idempotentes (mismo estado).
    """
    if current_status == new_status:
        return

    allowed = ALLOWED_TRANSITIONS.get(current_status, set())
    if new_status not in allowed:
        raise InvalidStateTransitionException(
            f"Transición no permitida: No se puede cambiar el pedido de '{current_status.value}' a '{new_status.value}' "
            f"sin completar las etapas intermedias de producción."
        )
