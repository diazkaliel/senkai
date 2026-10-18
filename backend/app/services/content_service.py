"""
Servicio para gestión del contenido editorial y dinamismo visual de Senkai DTF Studio.
Orquesta validaciones atómicas por sección y provee fallbacks canónicos de resguardo.
"""

from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.content_repository import content_repository, ContentRepository
from app.schemas.domain import (
    AnnouncementPayload,
    HeroSectionPayload,
    MarqueeSectionPayload,
    SectionHeadersPayload,
    StatsSectionPayload,
    BrandStatementPayload,
    EditorialSectionPayload,
    ProtocolSectionPayload,
    ContactSectionPayload,
    LookbookSectionPayload,
    SiteContentConsolidated
)
from app.core.exceptions import SenkaiDomainException


class InvalidSectionKeyException(SenkaiDomainException):
    """Excepción lanzada al intentar operar sobre una sección inexistente."""
    pass


# Configuración canónica por defecto (idéntica a los textos base de la vitrina)
DEFAULT_SECTIONS_CONTENT: Dict[str, Dict[str, Any]] = {
    "announcement": {
        "text": "",
        "is_active": False
    },
    "hero": {
        "headline": "TU DISEÑO,\nNUESTRA TÉCNICA",
        "subtitle": "Estampado textil DTF de alta densidad sobre bases heavyweight seleccionadas. Sin mínimos de producción y con precisión artesanal.",
        "cta_text": "DISEÑAR AHORA",
        "cta_url": "#personalizador",
        "hero_main_image": "/static/assets/hero_main_tshirt.png",
        "hero_badge_text": "ALGODÓN PEINADO 240 GSM",
        "side_card_top_tag": "HEAVYWEIGHT 240G",
        "side_card_top_image": "/static/assets/hero_side_top.png",
        "side_card_bottom_tag": "FLEECE 320G",
        "side_card_bottom_image": "/static/assets/hero_side_bottom.png"
    },
    "marquee": {
        "items": [
            "CONFECCIÓN PESADA 240G", "DTF 300 DPI", "ALGODÓN PEINADO",
            "SIN PEDIDO MÍNIMO", "SENKAI ATELIER", "CURADO TÉRMICO 160°C"
        ],
        "is_active": True
    },
    "headers": {
        "catalog_tag": "LOOKBOOK 2026 // EDICIÓN LIMITADA",
        "catalog_title": "Streetwear Heavyweight Exclusivo",
        "catalog_desc": "Confección en algodón pesado de 240g a 320g con estampados DTF de alta resolución.",
        "customizer_title": "Mesa de Personalización DTF",
        "customizer_desc": "Selecciona tu silueta textil, personaliza las estampas DTF y calibra tu arte con cotización en tiempo real."
    },
    "stats": {
        "dpi": 300,
        "min_order": 0,
        "wash_cycles": 50,
        "curing_temp": 160
    },
    "statement": {
        "headline": "CALIDAD SIN CONCESIONES",
        "body": "CADA ESTAMPA ES UNA PIEZA ÚNICA. COMBINAMOS BASES TEXTILES DE ALTO GRAMAJE CON MICRO-INYECCIÓN DTF Y PIGMENTOS INDUSTRIALES, CONCEBIDAS PARA RESISTIR MÁS DE 50 LAVADOS."
    },
    "editorial": {
        "mission_tag": "",
        "mission_title": "Matriz de Inyección DTF 300 DPI",
        "mission_body": "Tolerancia milimétrica sin degradación. Fusionamos cortes estructurales heavyweight en algodón peinado (240g–320g) con micro-inyección de pigmento CMYK+White y polímeros elásticos de alta densidad.",
        "mission_image": "/static/assets/garments/hoodie_back.png",
        "vision_tag": "",
        "vision_title": "Curado Térmico a 160°C & +50 Lavados",
        "vision_body": "Cero desprendimiento, cero agrietamiento. Curado de película polimérica a 160°C con presión neumática controlada. Cada pieza soporta flexión continua y ciclos de lavado industrial.",
        "vision_image": "/static/assets/garments/tshirt_front.png"
    },
    "protocol": {
        "section_tag": "PLIEGO LEGAL & TÉCNICO // VIGENCIA 2026",
        "section_title": "Términos y Condiciones de Taller",
        "section_desc": "Normativa operativa de estampado DTF, garantías de fijación térmica, políticas de despacho y condiciones comerciales de Senkai Atelier.",
        "legal_footer": "Al confirmar una orden de producción en Senkai Studio, el cliente declara conocer y aceptar las presentes especificaciones técnicas y condiciones de confección bajo demanda.",
        "steps": [
            {
                "step_number": "01",
                "title": "Confección a Pedido y Tolerancias DTF",
                "description": "Toda prenda personalizada se produce bajo demanda según las coordenadas y archivos aprobados en la Mesa de Diseño. Se requieren matrices en PNG/SVG a 300 DPI sin fondo; el taller aplica una tolerancia de posicionamiento mecánico de ±8 mm."
            },
            {
                "step_number": "02",
                "title": "Garantía de Curado Térmico y Lavado",
                "description": "Nuestras estampas DTF son termofijadas a 160°C con prensa neumática (5 bar), garantizando más de 50 ciclos de lavado. Para mantener la garantía, lavar del revés con agua fría (máx. 30°C), sin cloro, sin secadora industrial y sin planchar sobre el polímero."
            },
            {
                "step_number": "03",
                "title": "Plazos de Producción, Despacho y Retiro",
                "description": "El tiempo de procesamiento en cola de taller es de 24 a 48 horas hábiles tras confirmar el pedido. Los envíos se despachan vía courier con código de seguimiento. Los pedidos con Retiro en Taller cuentan con 15 días corridos de custodia."
            },
            {
                "step_number": "04",
                "title": "Cambios, Devoluciones y Garantía Legal",
                "description": "Por tratarse de prendas confeccionadas bajo especificaciones exclusivas del cliente (Ley N° 19.496), no aplica derecho a retracto ni cambio por error de talla elegida. La garantía cubre fallas comprobables de costura, gramaje o desprendimiento prematuro."
            }
        ]
    },
    "contact": {
        "workshop_city": "Santiago, Chile",
        "address": "Av. Providencia 1240, Taller Local 4B",
        "email": "taller@senkai.cl",
        "phone": "+56 9 8765 4321",
        "instagram": "@senkai.dtf",
        "whatsapp_number": "+56 9 8765 4321",
        "business_hours": "Lunes a Viernes 09:00 - 18:30 hrs",
        "copyright_text": "Estudio de Estampado Textil de Precisión • Santiago, Chile"
    },
    "lookbook": {
        "categories": [
            {
                "id": "urbanas",
                "label": "Poleras Oversized (240G)",
                "subcategories": ["Drop Shoulder 240g", "Gráfica Cyberpunk", "Heavy Acid Wash"]
            },
            {
                "id": "hoodies",
                "label": "Polerones & Hoodies (320G)",
                "subcategories": ["Hoodie Canguro 320g", "Crewneck 300g", "Fleece Térmico"]
            },
            {
                "id": "minimalista",
                "label": "Línea Regular (180G)",
                "subcategories": ["Regular Fit 180g", "Esenciales Taller", "Monocromo"]
            },
            {
                "id": "propios",
                "label": "Colecciones de Taller",
                "subcategories": ["Stealth Edition", "Series Limitadas", "Archivo Senkai"]
            }
        ],
        "items": [
            {
                "id": "col-polera-cyber-kanji",
                "name": "Polera Oversized 'Cyber Kanji 2026'",
                "badge": "240g Peinado • Heavyweight",
                "category": "urbanas",
                "subcategory": "Gráfica Cyberpunk",
                "price": 22990,
                "garment_id": "garment-polera-heavyweight-240",
                "photo_front": "/static/assets/garments/tshirt_front.png",
                "photo_back": "/static/assets/garments/tshirt_back.png"
            },
            {
                "id": "col-hoodie-mecha-unit",
                "name": "Hoodie Canguro 'Mecha Unit Eva-01'",
                "badge": "320g Afelpado • Heavyweight",
                "category": "hoodies",
                "subcategory": "Hoodie Canguro 320g",
                "price": 34990,
                "garment_id": "garment-poleron-hoodie-320",
                "photo_front": "/static/assets/garments/hoodie_front.png",
                "photo_back": "/static/assets/garments/hoodie_back.png"
            },
            {
                "id": "col-polera-acid-street",
                "name": "Polera Heavy 'Acid Type Streetwear'",
                "badge": "240g Peinado • Drop Shoulder",
                "category": "urbanas",
                "subcategory": "Drop Shoulder 240g",
                "price": 21990,
                "garment_id": "garment-polera-heavyweight-240",
                "photo_front": "/static/assets/garments/tshirt_front.png",
                "photo_back": "/static/assets/garments/tshirt_back.png"
            },
            {
                "id": "col-crewneck-tokyo-minimal",
                "name": "Crewneck 'Tokyo Minimalist Studio'",
                "badge": "300g Peinado • Cuello Redondo",
                "category": "hoodies",
                "subcategory": "Crewneck 300g",
                "price": 29990,
                "garment_id": "garment-poleron-crewneck-300",
                "photo_front": "/static/assets/garments/crewneck_front.png",
                "photo_back": "/static/assets/garments/crewneck_back.png"
            },
            {
                "id": "col-polera-classic-regular",
                "name": "Polera Clásica Regular 'Senkai Original'",
                "badge": "180g Jersey • Regular Fit",
                "category": "minimalista",
                "subcategory": "Regular Fit 180g",
                "price": 16990,
                "garment_id": "garment-polera-classic-180",
                "photo_front": "/static/assets/garments/tshirt_front.png",
                "photo_back": "/static/assets/garments/tshirt_back.png"
            },
            {
                "id": "col-hoodie-cyberpunk-stealth",
                "name": "Hoodie Heavy 'Senkai Stealth Edition'",
                "badge": "320g Afelpado • Edición Taller",
                "category": "propios",
                "subcategory": "Stealth Edition",
                "price": 35990,
                "garment_id": "garment-poleron-hoodie-320",
                "photo_front": "/static/assets/garments/hoodie_front.png",
                "photo_back": "/static/assets/garments/hoodie_back.png"
            }
        ]
    }
}

# Registro de mapeo de validadores Pydantic v2 por clave de sección
SECTION_VALIDATORS = {
    "announcement": AnnouncementPayload,
    "hero": HeroSectionPayload,
    "marquee": MarqueeSectionPayload,
    "headers": SectionHeadersPayload,
    "stats": StatsSectionPayload,
    "statement": BrandStatementPayload,
    "editorial": EditorialSectionPayload,
    "protocol": ProtocolSectionPayload,
    "contact": ContactSectionPayload,
    "lookbook": LookbookSectionPayload,
}


class ContentService:
    """Lógica de negocio y validación para el CMS de la vitrina pública."""

    def __init__(self, repository: ContentRepository = content_repository):
        self.repository = repository

    async def get_consolidated_content(self, session: AsyncSession) -> SiteContentConsolidated:
        """
        Recupera el estado editorial completo combinando la base de datos con los
        valores por defecto para tolerar inicializaciones en frío sin interrupciones de servicio.
        """
        records = await self.repository.list_all_sections(session)
        stored_dict: Dict[str, Any] = {r.section_key: r.payload for r in records}

        # Componer datos finales combinando defaults con registros persistidos
        consolidated: Dict[str, Any] = {}
        for key, default_val in DEFAULT_SECTIONS_CONTENT.items():
            raw_val = stored_dict.get(key, default_val)
            validator_cls = SECTION_VALIDATORS[key]
            # Validación preventiva para descartar posibles esquemas desactualizados en BD
            try:
                validated_obj = validator_cls(**raw_val)
                consolidated[key] = validated_obj.model_dump()
            except Exception:
                consolidated[key] = default_val

        return SiteContentConsolidated(**consolidated)

    async def update_section(
        self,
        session: AsyncSession,
        section_key: str,
        raw_payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Valida atómicamente la sección con su contrato Pydantic v2 y la persiste en base de datos.
        """
        if section_key not in SECTION_VALIDATORS:
            raise InvalidSectionKeyException(
                f"La sección '{section_key}' no es reconocida. Secciones permitidas: {list(SECTION_VALIDATORS.keys())}"
            )

        validator_cls = SECTION_VALIDATORS[section_key]
        # Pydantic v2 valida rangos, tipos y longitudes de caracteres
        validated_data = validator_cls(**raw_payload)
        dumped_dict = validated_data.model_dump()

        await self.repository.upsert_section(session, section_key, dumped_dict)
        return dumped_dict


content_service = ContentService()
