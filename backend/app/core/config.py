"""
Configuración centralizada de Senkai DTF Studio.
Carga dinámica de variables de entorno mediante Pydantic Settings,
parámetros industriales de estampado y orígenes autorizados para CORS.
"""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Identidad y versión del servicio
    PROJECT_NAME: str = "SENKAI // DTF Textile Studio"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    
    # Base de datos: SQLite asíncrono para desarrollo y persistencia sin dependencias pesadas
    DATABASE_URL: str = "sqlite+aiosqlite:///./senkai_studio.db"
    
    # Token de autenticación para panel administrativo y operaciones de taller
    WORKSHOP_SECRET_KEY: str = "senkai-taller-secret-key-2026"
    
    # Orígenes autorizados para CORS (desarrollo local y CDN en Cloudflare Pages)
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3000",
        "http://localhost:5173",
        "https://*.pages.dev",
        "https://*.cloudflare.com",
    ]
    
    # Matriz oficial de costos base DTF según superficie de estampa (CLP)
    DTF_PRINT_PRICING: dict = {
        "A6": 2500,           # Pecho bolsillo / logo chico (10x10 cm)
        "A5": 3900,           # Manga lateral / formato medio (15x20 cm)
        "A4": 5900,           # Pecho central estándar (20x30 cm)
        "A3": 8900,           # Espalda completa / Maxi print (30x40 cm)
        "DOUBLE_A4_A6": 7900, # Combinado económico: Pecho izquierdo A6 + Espalda A4
    }
    
    # Parámetros térmicos de taller para curado de poliamida elastomérica
    DTF_HEAT_PRESS_TEMP_C: int = 160
    DTF_HEAT_PRESS_SECONDS: int = 15
    DTF_PEEL_TYPE: str = "COLD_PEEL"
    
    # Carga automática de variables desde archivo .env local si existe
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
