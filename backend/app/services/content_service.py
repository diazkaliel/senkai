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
        "side_card_top_tag": "HEAVYWEIGHT 240G",
        "side_card_bottom_tag": "FLEECE 320G"
    },
    "marquee": {
        "items": [
            "CONFECCIÓN PESADA 240G", "DTF 300 DPI", "ALGODÓN PEINADO",
            "SIN PEDIDO MÍNIMO", "SENKAI ATELIER", "CURADO TÉRMICO 160°C"
        ],
        "is_active": True
    },
    "headers": {
        "catalog_tag": "",
        "catalog_title": "Bases y Prendas de Taller",
        "catalog_desc": "Confección en algodón pesado de 240g a 320g con estampados DTF de alta resolución.",
        "customizer_title": "Mesa de Personalización DTF",
        "customizer_desc": "Selecciona la prenda base, modula el color y calibra tu arte con cotización en tiempo real."
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
        "vision_tag": "",
        "vision_title": "Curado Térmico a 160°C & +50 Lavados",
        "vision_body": "Cero desprendimiento, cero agrietamiento. Curado de película polimérica a 160°C con presión neumática controlada. Cada pieza soporta flexión continua y ciclos de lavado industrial.",
    },
    "protocol": {
        "section_tag": "",
        "section_title": "Secuencia Operativa DTF",
        "section_desc": "Flujo técnico desde rasterizado a 300 DPI hasta termofijación a 160°C y despacho.",
        "steps": [
            {
                "step_number": "01",
                "title": "1. Elige Prenda y Diseño",
                "description": "Selecciona tu polera o polerón, color y talla. Sube tu arte en alta resolución o utiliza nuestras plantillas disponibles."
            },
            {
                "step_number": "02",
                "title": "2. Impresión y Fijación",
                "description": "Impresión directa sobre film con tintas textiles CMYK+Blanco y termofijado a 160°C para una alta resistencia al lavado."
            },
            {
                "step_number": "03",
                "title": "3. Control y Despacho",
                "description": "Inspección de acabado y elasticidad. Empaque seguro listo para retiro directo en taller o despacho express a todo Chile."
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
