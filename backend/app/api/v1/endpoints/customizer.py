"""
Endpoints para el configurador interactivo y cotizador DTF.
"""

from fastapi import APIRouter, Query
from app.schemas.domain import (
    DTFPrintPosition, DTFPrintSize,
    MultiPrintQuoteRequest, MultiPrintQuoteResponse
)
from app.services.pricing_service import pricing_service

router = APIRouter(prefix="/customizer", tags=["Configurador y Cotizador DTF"])


@router.post("/quote-multi", response_model=MultiPrintQuoteResponse, summary="Cotización autoritativa multi-estampa libre por volumen")
def get_multi_prints_quote(payload: MultiPrintQuoteRequest):
    """Calcula el costo total para N estampas simultáneas en la prenda aplicando descuentos por volumen."""
    return pricing_service.calculate_multi_prints_price(
        prints=payload.prints,
        quantity=payload.quantity
    )


@router.get("/quote", summary="Cotización en tiempo real de estampa DTF por tamaño y volumen (legado)")
def get_dtf_quote(
    position: DTFPrintPosition = Query(..., description="Ubicación de la estampa en la prenda"),
    print_size: DTFPrintSize = Query(..., description="Dimensión del transfer DTF (A6, A5, A4, A3)"),
    quantity: int = Query(1, ge=1, description="Cantidad de unidades a estampar")
):
    return pricing_service.calculate_single_print_price(position=position, print_size=print_size, quantity=quantity)


@router.get("/presets", summary="Presets y especificaciones de impresión DTF")
def get_dtf_presets():
    return {
        "resolutions_dpi": [300, 600, 1200],
        "color_profile": "CMYK + White Layer (85% Underbase)",
        "max_film_width_cm": 60,
        "positions": [
            {"id": "pecho_izquierdo", "label": "Pecho Izquierdo (Bolsillo)", "max_cm": "10x10", "suggested_size": "A6"},
            {"id": "pecho_centro", "label": "Pecho Central Estándar", "max_cm": "20x30", "suggested_size": "A4"},
            {"id": "espalda_completa", "label": "Espalda Completa / Maxi", "max_cm": "30x40", "suggested_size": "A3"},
            {"id": "manga_izquierda", "label": "Manga Lateral", "max_cm": "8x30", "suggested_size": "A5"},
            {"id": "pecho_y_espalda", "label": "Doble Estampa (Pecho A6 + Espalda A4)", "max_cm": "Combinado", "suggested_size": "A4"}
        ],
        "file_requirements": {
            "formats": ["PNG (Transparente)", "SVG", "PDF Vectorial", "AI", "PSD"],
            "min_dpi": 300,
            "max_file_size_mb": 50
        }
    }
