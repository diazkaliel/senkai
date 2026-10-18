"""
Endpoints para el configurador interactivo y cotizador DTF.
"""

import os
import uuid
from fastapi import APIRouter, Query, UploadFile, File, HTTPException, status
from app.schemas.domain import (
    DTFPrintPosition, DTFPrintSize,
    MultiPrintQuoteRequest, MultiPrintQuoteResponse
)
from app.services.pricing_service import pricing_service

router = APIRouter(prefix="/customizer", tags=["Configurador y Cotizador DTF"])

ALLOWED_DTF_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".svg", ".pdf"}
MAX_DTF_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB
CHUNK_SIZE_BYTES = 64 * 1024


@router.post(
    "/upload",
    summary="Carga binaria de archivo de diseño DTF en alta resolución",
    status_code=status.HTTP_201_CREATED
)
async def upload_customizer_design(
    file: UploadFile = File(...)
):
    """
    Recibe un diseño del cliente para transfer DTF (PNG, SVG, JPG, WebP o PDF).
    Valida el archivo y lo almacena en disco para entregar una URL pública estática,
    eliminando la sobrecarga de transportar megabytes en Base64 en el payload de las órdenes.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nombre de archivo inválido."
        )

    _, ext = os.path.splitext(file.filename.lower())
    if ext not in ALLOWED_DTF_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Formato no permitido '{ext}'. Formatos admitidos: {', '.join(sorted(ALLOWED_DTF_EXTENSIONS))}"
        )

    safe_name = f"dtf_{uuid.uuid4().hex[:14]}{ext}"
    uploads_dir = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "..", "frontend", "assets", "uploads")
    )
    os.makedirs(uploads_dir, exist_ok=True)
    destination_path = os.path.join(uploads_dir, safe_name)

    total_bytes = 0
    try:
        with open(destination_path, "wb") as f:
            while True:
                chunk = await file.read(CHUNK_SIZE_BYTES)
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > MAX_DTF_FILE_SIZE_BYTES:
                    f.close()
                    if os.path.exists(destination_path):
                        os.remove(destination_path)
                    raise HTTPException(
                        status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                        detail="El archivo excede el límite permitido de 50 MB."
                    )
                f.write(chunk)
    except HTTPException:
        raise
    except Exception as exc:
        if os.path.exists(destination_path):
            os.remove(destination_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error durante el almacenamiento del archivo: {exc}"
        )

    return {
        "status": "success",
        "url": f"/static/assets/uploads/{safe_name}",
        "filename": safe_name,
        "original_name": file.filename,
        "size_bytes": total_bytes
    }



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
