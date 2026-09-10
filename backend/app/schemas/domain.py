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
    calculated_dtf_cost: int = Field(..., description="Costo agregado por la impresión DTF")


class OrderItemCreate(BaseModel):
    garment_id: str
    garment_name: str
    selected_color: ColorVariant
    selected_size: GarmentSize
    dtf_config: Optional[DTFConfiguration] = None
    quantity: int = Field(default=1, ge=1)
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
    customer: CustomerInfo
    items: List[OrderItemCreate]
    total_amount: int
    shipping_cost: int = 0


class OrderResponse(BaseModel):
    id: str
    order_number: str
    customer: CustomerInfo
    items: List[OrderItemCreate]
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
