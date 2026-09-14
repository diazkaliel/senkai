"""
Módulo de seguridad y autorización para Senkai DTF Studio.
Provee validación en tiempo constante para proteger las operaciones del taller.
"""

import secrets
from typing import Optional
from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader

from app.core.config import settings

# Cabecera autoritativa para terminales y operarios del taller
workshop_api_key_header = APIKeyHeader(
    name="X-Workshop-Token",
    auto_error=False,
    description="Token de seguridad para operarios de taller y consulta de métricas de producción."
)


def require_workshop_auth(
    token: Optional[str] = Security(workshop_api_key_header)
) -> str:
    """
    Verifica que la petición incluya el token de taller autorizado.
    
    Decisiones de seguridad:
    - Se rechaza explícitamente token nulo o vacío para prevenir el bypass por omisión de cabecera.
    - Se utiliza compare_digest para mitigar ataques de canal lateral basados en análisis de tiempos (timing attacks).
    """
    if not token or not secrets.compare_digest(token.strip(), settings.WORKSHOP_SECRET_KEY):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Acceso denegado: Se requiere un token de taller válido.",
            headers={"WWW-Authenticate": "ApiKey"}
        )
    return token
