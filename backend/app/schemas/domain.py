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
    photo_front: Optional[str] = None
    photo_back: Optional[str] = None
    is_active: bool = True


class GarmentUpdatePayload(BaseModel):
    """Payload administrativo para actualizar precios, fotos reales y metadatos de prendas."""
    name: Optional[str] = Field(None, min_length=3, max_length=120)
    description: Optional[str] = Field(None, max_length=1000)
    base_price: Optional[int] = Field(None, ge=1000, le=1000000, description="Precio base en CLP")
    photo_front: Optional[str] = Field(None, max_length=255, description="Ruta o URL de foto frontal de estudio")
    photo_back: Optional[str] = Field(None, max_length=255, description="Ruta o URL de foto trasera de estudio")
    is_active: Optional[bool] = None


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
    preview_front_summary: Optional[str] = Field(default=None, description="Resumen descriptivo de la cara frontal (ej. A4 Pecho o Cara Lisa)")
    preview_back_summary: Optional[str] = Field(default=None, description="Resumen descriptivo de la cara dorsal (ej. A3 Maxi o Cara Lisa)")
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
    preview_front_summary: Optional[str] = None
    preview_back_summary: Optional[str] = None
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


class CustomerTrackingInfo(BaseModel):
    """Información sanitizada del cliente para consulta pública de tracking (cero fuga de PII)."""
    full_name: str = Field(..., description="Nombre protegido/enmascarado para privacidad")
    delivery_method: str = Field(..., description="'pickup' o 'shipping'")
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


class OrderTrackingResponse(BaseModel):
    """
    Vista pública de seguimiento. Protege la información personal identificable (PII)
    del cliente (omite email, teléfono y dirección física exacta).
    """
    id: str
    order_number: str
    customer: CustomerTrackingInfo
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


class AnalyticsTimeSeriesPoint(BaseModel):
    """Punto diario de la serie temporal para gráficos continuos."""
    date: str = Field(..., description="Fecha en formato YYYY-MM-DD")
    label: str = Field(..., description="Etiqueta legible DD/MM")
    revenue_clp: int = Field(default=0, description="Facturación neta en CLP para ese día")
    orders_count: int = Field(default=0, description="Cantidad de pedidos confirmados")
    units_count: int = Field(default=0, description="Prendas totales procesadas")


class GarmentPerformanceItem(BaseModel):
    """Métrica de rendimiento por prenda base del catálogo."""
    garment_id: str
    garment_name: str
    units_sold: int
    revenue_clp: int
    share_percentage: float = Field(..., description="Participación porcentual sobre el total de unidades")


class LogisticsBreakdown(BaseModel):
    """Distribución de métodos de entrega para planificación operativa."""
    pickup_count: int
    shipping_count: int
    pickup_percentage: float
    shipping_percentage: float


class WorkshopAnalyticsResponse(BaseModel):
    """Resumen consolidado de inteligencia de negocio y métricas de producción."""
    period_days: int
    total_revenue_period: int
    total_orders_period: int
    average_order_value_clp: int
    total_units_period: int
    historical_revenue_clp: int
    historical_orders_count: int
    timeseries: List[AnalyticsTimeSeriesPoint]
    top_garments: List[GarmentPerformanceItem]
    logistics: LogisticsBreakdown


# =============================================================================
# CONTRATOS CMS: CONTENIDO EDITORIAL DE LA TIENDA PÚBLICA
# =============================================================================

class AnnouncementPayload(BaseModel):
    text: str = Field(..., max_length=160, description="Mensaje del cintillo superior de taller")
    is_active: bool = Field(default=True, description="Visibilidad del cintillo en la tienda")


class HeroSectionPayload(BaseModel):
    headline: str = Field(..., min_length=3, max_length=100, description="Titular de impacto del hero")
    subtitle: str = Field(..., min_length=10, max_length=300, description="Subtítulo descriptivo técnico")
    cta_text: str = Field(..., min_length=2, max_length=30, description="Texto del botón CTA principal")
    cta_url: str = Field(default="#personalizador", max_length=100, description="Destino del CTA")
    side_card_top_tag: str = Field(default="HEAVYWEIGHT 240G", max_length=50, description="Etiqueta tarjeta lateral superior")
    side_card_bottom_tag: str = Field(default="FLEECE 320G", max_length=50, description="Etiqueta tarjeta lateral inferior")


class MarqueeSectionPayload(BaseModel):
    """Cinta dinámica de taller con textos deslizantes."""
    items: List[str] = Field(
        default_factory=lambda: [
            "LIMITED EDITION", "NEW ARRIVAL", "HEAVYWEIGHT 240G",
            "DTF 300 DPI", "FLEECE 320G", "SENKAI ATELIER"
        ],
        description="Lista de frases o palabras clave que circulan en la cinta"
    )
    is_active: bool = Field(default=True, description="Mostrar u ocultar la cinta en vitrina")


class SectionHeadersPayload(BaseModel):
    """Títulos y bajadas de las secciones de Colecciones y Personalizador."""
    catalog_tag: str = Field(default="LOOKBOOK 2026 // EDICIÓN LIMITADA", max_length=60)
    catalog_title: str = Field(default="Colección Textil Streetwear", max_length=100)
    catalog_desc: str = Field(default="Prendas de alta gama confeccionadas en algodón pesado de 240g a 320g con estampados DTF de alta resolución.", max_length=300)
    customizer_title: str = Field(default="Atelier de Personalización DTF", max_length=100)
    customizer_desc: str = Field(default="Selecciona la prenda base, modula el color y posiciona tu arte con cotización en tiempo real.", max_length=300)


class StatsSectionPayload(BaseModel):
    dpi: int = Field(default=300, ge=150, le=1200, description="Resolución industrial DTF (DPI)")
    min_order: int = Field(default=0, ge=0, le=100, description="Cantidad mínima de pedido")
    wash_cycles: int = Field(default=50, ge=10, le=200, description="Ciclos de lavado garantizados")
    curing_temp: int = Field(default=160, ge=120, le=220, description="Temperatura de termofijado (°C)")


class BrandStatementPayload(BaseModel):
    headline: str = Field(..., min_length=3, max_length=80, description="Declaración de marca")
    body: str = Field(..., min_length=20, max_length=500, description="Cuerpo del manifiesto")


class EditorialSectionPayload(BaseModel):
    mission_tag: str = Field(default="MANIFIESTO TÉCNICO", max_length=50)
    mission_title: str = Field(default="Our Mission", max_length=80)
    mission_body: str = Field(..., min_length=20, max_length=500)
    vision_tag: str = Field(default="ESTÁNDAR DE TALLER", max_length=50)
    vision_title: str = Field(default="Our Vision", max_length=80)
    vision_body: str = Field(..., min_length=20, max_length=500)


class ProtocolStepItem(BaseModel):
    step_number: str = Field(..., max_length=4)
    title: str = Field(..., max_length=80)
    description: str = Field(..., max_length=300)


class ProtocolSectionPayload(BaseModel):
    section_tag: str = Field(default="CÓMO TRABAJAMOS", max_length=50)
    section_title: str = Field(default="Proceso de Estampado", max_length=80)
    section_desc: str = Field(..., max_length=200)
    steps: List[ProtocolStepItem] = Field(..., min_length=3, max_length=3)


class ContactSectionPayload(BaseModel):
    workshop_city: str = Field(..., max_length=80)
    address: str = Field(..., max_length=150)
    email: str = Field(..., max_length=100)
    phone: str = Field(..., max_length=40)
    instagram: str = Field(..., max_length=60)
    whatsapp_number: str = Field(default="+56 9 8765 4321", max_length=40)
    business_hours: str = Field(default="Lunes a Viernes 09:00 - 18:30 hrs", max_length=100)
    copyright_text: str = Field(default="Estudio de Estampado Textil de Precisión • Santiago, Chile", max_length=150)


class SiteContentConsolidated(BaseModel):
    """Agregado con todas las secciones de contenido para consumo de la vitrina pública."""
    announcement: AnnouncementPayload
    hero: HeroSectionPayload
    marquee: MarqueeSectionPayload
    headers: SectionHeadersPayload
    stats: StatsSectionPayload
    statement: BrandStatementPayload
    editorial: EditorialSectionPayload
    protocol: ProtocolSectionPayload
    contact: ContactSectionPayload

