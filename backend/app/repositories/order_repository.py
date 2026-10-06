"""
Repositorio de persistencia relacional para órdenes de taller (SQLAlchemy 2.0).
Aísla la construcción de consultas SQL del dominio y la lógica de negocio.
"""

from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import OrderModel, OrderItemModel, IdempotencyRecordModel


class OrderRepository:
    """Encapsula el acceso a datos para órdenes, ítems e idempotencia."""

    async def get_by_id(self, session: AsyncSession, order_id: str) -> Optional[OrderModel]:
        stmt = select(OrderModel).where(OrderModel.id == order_id)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_order_number(self, session: AsyncSession, order_number: str) -> Optional[OrderModel]:
        stmt = select(OrderModel).where(OrderModel.order_number == order_number)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def find_by_identifier(self, session: AsyncSession, identifier: str) -> Optional[OrderModel]:
        """Busca indistintamente por UUID interno o código legible de orden (ej: SNK-2026-0001)."""
        stmt = select(OrderModel).where(
            (OrderModel.order_number == identifier) | (OrderModel.id == identifier)
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_orders(
        self,
        session: AsyncSession,
        status: Optional[str] = None
    ) -> List[OrderModel]:
        """Recupera órdenes ordenadas por fecha de creación descendente, con filtro opcional de estado."""
        stmt = select(OrderModel).order_by(OrderModel.created_at.desc())
        if status:
            stmt = stmt.where(OrderModel.status == status)
        result = await session.execute(stmt)
        return list(result.scalars().all())

    async def count_orders(self, session: AsyncSession) -> int:
        """Retorna el número total de órdenes registradas para la secuencia numérica."""
        stmt = select(func.count()).select_from(OrderModel)
        result = await session.execute(stmt)
        return result.scalar() or 0

    async def get_next_order_number(self, session: AsyncSession, year: int = 2026) -> str:
        """
        Determina de manera robusta el siguiente número de orden para el año dado (ej: SNK-2026-0005).
        Busca el mayor sufijo numérico registrado que comience con el prefijo anual para evitar colisiones
        si se han borrado registros o si existen saltos en la numeración.
        """
        prefix = f"SNK-{year}-"
        stmt = select(OrderModel.order_number).where(
            OrderModel.order_number.like(f"{prefix}%")
        ).order_by(OrderModel.order_number.desc()).limit(100)
        result = await session.execute(stmt)
        numbers = result.scalars().all()

        max_seq = 0
        for num in numbers:
            try:
                seq_part = num.replace(prefix, "").split("-")[0]
                seq_int = int(seq_part)
                if seq_int > max_seq:
                    max_seq = seq_int
            except (ValueError, IndexError):
                continue

        next_seq = max_seq + 1
        return f"{prefix}{next_seq:04d}"

    async def create(
        self,
        session: AsyncSession,
        order: OrderModel,
        items: Optional[List[OrderItemModel]] = None
    ) -> OrderModel:
        """Persiste una orden y sus ítems relacionales de manera atómica."""
        session.add(order)
        if items:
            for item in items:
                item.order_id = order.id
                session.add(item)
        await session.commit()
        await session.refresh(order)
        return order

    async def update_status(
        self,
        session: AsyncSession,
        order: OrderModel,
        new_status: str,
        tracking_code: Optional[str] = None
    ) -> OrderModel:
        order.status = new_status
        order.updated_at = datetime.now(timezone.utc)
        if tracking_code is not None:
            order.tracking_code = tracking_code
        await session.commit()
        await session.refresh(order)
        return order

    async def add_all(self, session: AsyncSession, orders: List[OrderModel]) -> None:
        session.add_all(orders)
        await session.commit()

    # =========================================================================
    # GESTIÓN DE IDEMPOTENCIA
    # =========================================================================

    async def get_idempotency_record(
        self,
        session: AsyncSession,
        key: str
    ) -> Optional[IdempotencyRecordModel]:
        """Busca un registro previo para la llave de idempotencia suministrada."""
        stmt = select(IdempotencyRecordModel).where(IdempotencyRecordModel.key == key)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def save_idempotency_record(
        self,
        session: AsyncSession,
        record: IdempotencyRecordModel
    ) -> IdempotencyRecordModel:
        """Almacena el resultado de una operación idempotente exitosa."""
        session.add(record)
        await session.commit()
        return record


order_repository = OrderRepository()
