"""
Excepciones de dominio de Senkai DTF Studio.
Permite que los servicios de negocio expresen anomalías de lógica sin acoplarse
a códigos de estado HTTP ni al framework web.
"""


class SenkaiDomainException(Exception):
    """Clase base para todas las excepciones del dominio Senkai."""
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class EntityNotFoundException(SenkaiDomainException):
    """Se lanza cuando un recurso consultado (prenda, orden) no existe."""
    pass


class InvalidStateTransitionException(SenkaiDomainException):
    """
    Se lanza cuando se intenta cambiar una orden a un estado no admitido
    por el flujo de trabajo del taller (violación de la máquina de estados).
    """
    pass


class PricingCalculationException(SenkaiDomainException):
    """Se lanza cuando los parámetros de cotización violan restricciones de confección/estampado."""
    pass


class InsufficientStockException(SenkaiDomainException):
    """Se lanza cuando no hay existencias suficientes para satisfacer la orden."""
    def __init__(self, garment_name: str, size: str, color: str, requested: int, available: int):
        message = (
            f"Stock insuficiente para '{garment_name}' ({color}, Talla {size}): "
            f"solicitadas {requested} un., disponibles {available} un."
        )
        super().__init__(message)
        self.garment_name = garment_name
        self.size = size
        self.color = color
        self.requested = requested
        self.available = available
