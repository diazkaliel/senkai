"""
Modelos ORM relacionales para Senkai DTF Studio (SQLAlchemy 2.0).
Garantiza persistencia ACID en base de datos SQLite/PostgreSQL, integridad referencial
para prendas, variantes de stock, ítems de órdenes y registros de idempotencia.
"""

from datetime import datetime, timezone
import json
import uuid
from typing import Optional, List, Dict, Any

from sqlalchemy import String, Integer, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def utc_now() -> datetime:
    """Provee timestamp UTC consciente de zona horaria para compatibilidad moderna."""
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class GarmentModel(Base):
    """
    Entidad de catálogo textil. Define la prenda base, gramaje y especificaciones de tela.
    """
    __tablename__ = "garments"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    category: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    weight_gsm: Mapped[int] = mapped_column(Integer, nullable=False)
    composition: Mapped[str] = mapped_column(String(120), default="100% Algodón Peinado")
    base_price: Mapped[int] = mapped_column(Integer, nullable=False)
    image_front_template: Mapped[str] = mapped_column(String(255), nullable=False)
    image_back_template: Mapped[str] = mapped_column(String(255), nullable=False)
    photo_front: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    photo_back: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    size_prices_json: Mapped[Optional[str]] = mapped_column(Text, default="{}", nullable=True)
    observation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)

    # Relación con variantes de color, talla y stock físico
    variants: Mapped[List["GarmentVariantModel"]] = relationship(
        back_populates="garment",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

    @property
    def size_prices(self) -> Dict[str, int]:
        if not self.size_prices_json:
            return {}
        try:
            data = json.loads(self.size_prices_json)
            if isinstance(data, dict):
                return {str(k): int(v) for k, v in data.items() if v is not None and int(v) > 0}
            return {}
        except (ValueError, TypeError):
            return {}

    @size_prices.setter
    def size_prices(self, value: Optional[Dict[str, Any]]):
        if not value or not isinstance(value, dict):
            self.size_prices_json = "{}"
            return
        cleaned = {}
        for k, v in value.items():
            if v is not None:
                try:
                    iv = int(v)
                    if iv > 0:
                        cleaned[str(k)] = iv
                except (ValueError, TypeError):
                    pass
        self.size_prices_json = json.dumps(cleaned, ensure_ascii=False)


class GarmentVariantModel(Base):
    """
    Variante individual de una prenda (combinación Color + Talla) con control de existencias.
    """
    __tablename__ = "garment_variants"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    garment_id: Mapped[str] = mapped_column(ForeignKey("garments.id", ondelete="CASCADE"), index=True, nullable=False)
    color_name: Mapped[str] = mapped_column(String(60), nullable=False)
    color_hex: Mapped[str] = mapped_column(String(10), nullable=False)
    size: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    stock_quantity: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
    custom_price: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    garment: Mapped["GarmentModel"] = relationship(back_populates="variants")


class OrderItemModel(Base):
    """
    Ítem textil relacional producido en taller con su configuración de estampas DTF.
    """
    __tablename__ = "order_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id: Mapped[str] = mapped_column(ForeignKey("workshop_orders.id", ondelete="CASCADE"), index=True, nullable=False)
    garment_id: Mapped[str] = mapped_column(String(64), nullable=False)
    garment_name: Mapped[str] = mapped_column(String(120), nullable=False)
    selected_color_name: Mapped[str] = mapped_column(String(60), nullable=False)
    selected_color_hex: Mapped[str] = mapped_column(String(10), nullable=False)
    selected_size: Mapped[str] = mapped_column(String(10), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    unit_price: Mapped[int] = mapped_column(Integer, nullable=False)
    subtotal: Mapped[int] = mapped_column(Integer, nullable=False)
    prints_payload: Mapped[str] = mapped_column(Text, default="[]", nullable=False)

    order: Mapped["OrderModel"] = relationship(back_populates="relational_items")

    @property
    def prints(self) -> List[Dict[str, Any]]:
        try:
            return json.loads(self.prints_payload)
        except (ValueError, TypeError):
            return []

    @prints.setter
    def prints(self, value: List[Dict[str, Any]]):
        self.prints_payload = json.dumps(value, ensure_ascii=False)


class OrderModel(Base):
    """
    Representa una orden de producción y despacho en el taller Senkai.
    Almacena datos del cliente, estado en el flujo Kanban y el snapshot
    inmutable de los ítems cotizados.
    """
    __tablename__ = "workshop_orders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, index=True)
    order_number: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    
    # Datos de contacto y entrega del cliente
    customer_name: Mapped[str] = mapped_column(String(120), nullable=False)
    customer_email: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    customer_phone: Mapped[str] = mapped_column(String(40), nullable=False)
    delivery_method: Mapped[str] = mapped_column(String(20), nullable=False)
    shipping_address: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    shipping_city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Importes monetarios calculados de forma autoritativa en el servidor (CLP)
    total_amount: Mapped[int] = mapped_column(Integer, nullable=False)
    shipping_cost: Mapped[int] = mapped_column(Integer, default=0)
    
    # Estado en el Kanban de producción de taller
    status: Mapped[str] = mapped_column(String(40), default="cola_impresion_dtf", index=True)
    
    # Trazabilidad temporal
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)
    estimated_delivery: Mapped[str] = mapped_column(String(20), nullable=False)
    tracking_code: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    
    # Serialización JSON del snapshot de ítems (compatibilidad hacia atrás y resguardo)
    items_payload: Mapped[str] = mapped_column(Text, nullable=False)

    # Relación 1-a-Muchos con ítems normalizados
    relational_items: Mapped[List[OrderItemModel]] = relationship(
        back_populates="order",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

    @property
    def items(self) -> List[Dict[str, Any]]:
        """Deserializa el snapshot de ítems para compatibilidad con esquemas Pydantic."""
        try:
            return json.loads(self.items_payload)
        except (ValueError, TypeError):
            return []

    @items.setter
    def items(self, value: List[Dict[str, Any]]):
        self.items_payload = json.dumps(value, ensure_ascii=False)


class IdempotencyRecordModel(Base):
    """
    Registro para prevención de compras duplicadas por doble clic o reintentos de red.
    """
    __tablename__ = "idempotency_records"

    key: Mapped[str] = mapped_column(String(128), primary_key=True, index=True)
    request_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    response_payload: Mapped[str] = mapped_column(Text, nullable=False)
    status_code: Mapped[int] = mapped_column(Integer, default=201)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)


class SiteSectionContentModel(Base):
    """
    Entidad para contenido editorial y textos dinámicos de la vitrina pública.
    Diseñado bajo un esquema seccional (section_key) que desacopla cada bloque (hero, stats, banner)
    para permitir validaciones independientes en runtime sin requerir migraciones DDL por cada texto nuevo.
    """
    __tablename__ = "site_sections_content"

    section_key: Mapped[str] = mapped_column(String(50), primary_key=True, index=True)
    payload_json: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

    @property
    def payload(self) -> Dict[str, Any]:
        try:
            return json.loads(self.payload_json)
        except (ValueError, TypeError):
            return {}

    @payload.setter
    def payload(self, data: Dict[str, Any]):
        self.payload_json = json.dumps(data, ensure_ascii=False)

