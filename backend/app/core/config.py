"""
Configuración central de la aplicación Seiko.
Manejo de variables de entorno y constantes de dominio de estampado DTF.
"""

from typing import List
from pydantic import BaseModel


class Settings(BaseModel):
    PROJECT_NAME: str = "SEIKO // DTF Textile Studio"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    
    # Orígenes permitidos para CORS (Cloudflare Pages y entornos locales)
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3000",
        "http://localhost:5173",
        "https://*.pages.dev",
        "https://*.cloudflare.com",
    ]
    
    # Precios base de impresión DTF por tamaño de estampa (CLP)
    DTF_PRINT_PRICING: dict = {
        "A6": 2500,    # Pecho bolsillo (10x10 cm)
        "A5": 3900,    # Mediano / Manga (15x20 cm)
        "A4": 5900,    # Frontal estándar (20x30 cm)
        "A3": 8900,    # Espalda completa / Maxi (30x40 cm)
        "DOUBLE_A4_A6": 7900, # Pecho izquierdo + Espalda A4
    }
    
    # Tiempos y parámetros de termofijado de taller
    DTF_HEAT_PRESS_TEMP_C: int = 160
    DTF_HEAT_PRESS_SECONDS: int = 15
    DTF_PEEL_TYPE: str = "COLD_PEEL" # Despegue en frío para máxima durabilidad


settings = Settings()
