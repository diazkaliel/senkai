"""
Esquemas Pydantic V2 para el dominio de Seiko DTF Studio.
Contratos estrictos para prendas base, configuración DTF, pedidos y métricas de taller.
"""

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class GarmentCategory(str, Enum):
    T_SHIRT = "polera"
    OVERSIZED_T_SHIRT = "polera_oversized"
    HOODIE = "poleron_hoodie"
    CREWNECK = "poleron_crewneck"


class GarmentSize(str, Enum):
    S = "S"
    M = "M"
    L = "L"
    XL = "XL"
    XXL = "XXL"


class DTFPrintPosition(str, Enum):
    CHEST_LEFT = "pecho_izquierdo"     # 10x10cm (A6)
    CHEST_CENTER = "pecho_centro"      # 20x30cm (A4)
    BACK_FULL = "espalda_completa"     # 30x40cm (A3)
    SLEEVE_LEFT = "manga_izquierda"    # 8x30cm (A5)
    CHEST_AND_BACK = "pecho_y_espalda" # Doble estampa


class DTFPrintSize(str, Enum):
    A6 = "A6"
    A5 = "A5"
    A4 = "A4"
    A3 = "A3"
    CUSTOM = "CUSTOM"


class OrderProductionStatus(str, Enum):
    PENDING_PAYMENT = "pendiente_pago"
    PRINT_QUEUE = "cola_impresion_dtf"       # RIP & Impresora DTF
    HEAT_PRESSING = "en_planchado_curado"    # Termofijado a 160°C
    QUALITY_CHECK = "control_calidad"        # Inspección y empaque
    READY_SHIPPING = "listo_despacho"        # En espera de retiro/courier
    COMPLETED = "entregado"
    CANCELLED = "cancelado"


class ColorVariant(BaseModel):
    name: str = Field(..., description="Nombre del color, ej: Negro Azabache")
    hex_code: str = Field(..., description="Código HEX para el renderizador visual")
    in_stock: bool = True


class GarmentBase(BaseModel):
    id: str
    name: str
    category: GarmentCategory
    description: str
    weight_gsm: int = Field(..., description="Gramaje de la tela en g/m² (ej: 180g, 240g, 320g)")
    composition: str = "100% Algodón Peinado"
    base_price: int = Field(..., description="Precio base de la prenda lisa en CLP")
    colors: List[ColorVariant]
    sizes: List[GarmentSize]
    image_front_template: str
    image_back_template: str
    is_active: bool = True


class DTFConfiguration(BaseModel):
    position: DTFPrintPosition
    print_size: DTFPrintSize
    design_name: Optional[str] = "Diseño Personalizado"
    design_image_url: Optional[str] = None
    design_preview_base64: Optional[str] = None
    scale_factor: float = Field(default=1.0, ge=0.5, le=2.0)
    offset_x_pct: float = Field(default=50.0, description="Posición X porcentual en la prenda")
    offset_y_pct: float = Field(default=40.0, description="Posición Y porcentual en la prenda")
    calculated_dtf_cost: Optional[int] = Field(default=0, description="Costo calculado por el servidor para el transfer DTF")


class DTFPrintItem(BaseModel):
    """
    Especificación de una estampa individual sobre la prenda.
    Permite posicionamiento libre porcentual en ambas caras textiles y formatos normalizados.
    """
    id: Optional[str] = None
    view: str = Field(default="front", description="'front' (frontal) o 'back' (trasera)")
    print_size: DTFPrintSize = Field(default=DTFPrintSize.A4, description="Formato industrial de transfer (A6, A5, A4, A3)")
    design_name: Optional[str] = "Estampa Personalizada"
    design_image_url: Optional[str] = None
    design_preview_base64: Optional[str] = None
    offset_x_pct: float = Field(default=50.0, ge=5.0, le=95.0, description="Posición X libre porcentual (5% a 95%)")
    offset_y_pct: float = Field(default=40.0, ge=5.0, le=95.0, description="Posición Y libre porcentual (5% a 95%)")
    scale_factor: float = Field(default=1.0, ge=0.4, le=2.5, description="Factor de escala visual")
    rotation_deg: float = Field(default=0.0, description="Ángulo de rotación en grados")
    calculated_dtf_cost: Optional[int] = Field(default=0, description="Costo unitario calculado por el servidor")


class MultiPrintQuoteRequest(BaseModel):
    prints: List[DTFPrintItem]
    quantity: int = Field(default=1, ge=1)


class MultiPrintQuoteResponse(BaseModel):
    prints: List[DTFPrintItem]
    quantity: int
    unit_dtf_total: int
    discount_percentage: int
    total_dtf_cost: int
    linear_meters_estimated: float


class OrderItemCreate(BaseModel):
    """Contrato de entrada para ítems de orden enviados por el cliente."""
    garment_id: str
    garment_name: Optional[str] = None
    selected_color: ColorVariant
    selected_size: GarmentSize
    prints: List[DTFPrintItem] = Field(default_factory=list, description="Lista de estampados personalizados sobre la prenda")
    dtf_config: Optional[DTFConfiguration] = Field(default=None, description="Compatibilidad hacia atrás con estampas únicas")
    quantity: int = Field(default=1, ge=1)
    # Campos opcionales del cliente: el servidor siempre recalcula los montos oficiales
    unit_price: Optional[int] = None
    subtotal: Optional[int] = None


class OrderItemResponse(BaseModel):
    """Snapshot inmutable y verificado de un ítem producido en taller."""
    garment_id: str
    garment_name: str
    selected_color: ColorVariant
    selected_size: GarmentSize
    prints: List[DTFPrintItem] = Field(default_factory=list)
    dtf_config: Optional[DTFConfiguration] = None
    quantity: int
    unit_price: int
    subtotal: int


class CustomerInfo(BaseModel):
    full_name: str
    email: str
    phone: str
    delivery_method: str = Field(..., description="'pickup' (Retiro en Taller) o 'shipping' (Envío a Domicilio)")
    shipping_address: Optional[str] = None
    shipping_city: Optional[str] = None
    notes: Optional[str] = None


class OrderCreate(BaseModel):
    """Payload de creación de orden. Los montos finales son determinados por el backend."""
    customer: CustomerInfo
    items: List[OrderItemCreate]
    total_amount: Optional[int] = None
    shipping_cost: Optional[int] = None


class OrderResponse(BaseModel):
    id: str
    order_number: str
    customer: CustomerInfo
    items: List[OrderItemResponse]
    total_amount: int
    shipping_cost: int
    status: OrderProductionStatus
    created_at: str
    updated_at: str
    estimated_delivery: str
    tracking_code: Optional[str] = None


class WorkshopMetrics(BaseModel):
    total_orders: int
    pending_print_count: int
    heat_pressing_count: int
    ready_for_pickup_count: int
    completed_today: int
    linear_meters_film_estimated: float
    total_revenue_clp: int
