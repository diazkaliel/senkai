"""
Configuración centralizada de Senkai DTF Studio.
Carga dinámica de variables de entorno mediante Pydantic Settings,
parámetros industriales de estampado y orígenes autorizados para CORS.
"""

from typing import List
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Identidad y entorno de ejecución ('development', 'staging', 'production')
    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "SENKAI // DTF Textile Studio"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    
    # Base de datos: SQLite asíncrono para desarrollo y persistencia sin dependencias pesadas
    DATABASE_URL: str = "sqlite+aiosqlite:///./senkai_studio.db"
    
    # Token de autenticación para panel administrativo y operaciones de taller
    WORKSHOP_SECRET_KEY: str = "senkai-taller-secret-key-2026"
    
    # Orígenes autorizados para CORS (desarrollo local, dominio de producción y CDN)
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3000",
        "http://localhost:5173",
        "https://senkaistore.com",
        "https://www.senkaistore.com",
        "https://taller.senkaistore.com",
        "https://admin.senkaistore.com",
        "https://senkaistore.fly.dev",
        "https://*.pages.dev",
        "https://*.cloudflare.com",
    ]

    # Endurecimiento y Rate Limiting por IP (peticiones por minuto)
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_ORDERS_PER_MINUTE: int = 20
    RATE_LIMIT_QUOTES_PER_MINUTE: int = 150
    RATE_LIMIT_UPLOADS_PER_MINUTE: int = 30
    
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

    @model_validator(mode="after")
    def validate_production_security(self):
        """Valida que en producción no se utilicen credenciales por defecto o inseguras."""
        if self.ENVIRONMENT == "production":
            if self.WORKSHOP_SECRET_KEY == "senkai-taller-secret-key-2026":
                raise ValueError(
                    "RIESGO CRÍTICO DE SEGURIDAD: WORKSHOP_SECRET_KEY no puede usar la clave por defecto en producción. "
                    "Genera un secreto criptográfico seguro (ej: openssl rand -hex 32) en tu archivo .env."
                )
            if len(self.WORKSHOP_SECRET_KEY) < 8:
                raise ValueError("WORKSHOP_SECRET_KEY debe contener al menos 8 caracteres en producción.")
        return self
    
    # Carga automática de variables desde archivo .env local si existe
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
