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
    Valida en tiempo constante (compare_digest) contra la variable de entorno configurada.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Acceso denegado: Se requiere un token de taller válido.",
            headers={"WWW-Authenticate": "ApiKey"}
        )

    clean_token = token.strip()
    expected_token = settings.WORKSHOP_SECRET_KEY.strip()

    if not secrets.compare_digest(clean_token, expected_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Acceso denegado: Token de taller inválido.",
            headers={"WWW-Authenticate": "ApiKey"}
        )
    return clean_token


def is_authenticated_workshop(
    token: Optional[str] = Security(workshop_api_key_header)
) -> bool:
    """
    Comprueba de forma no bloqueante si la petición proviene de un operario autenticado.
    Útil para endpoints mixtos que entregan vistas sanitizadas o completas según permisos.
    """
    if not token:
        return False
    return secrets.compare_digest(token.strip(), settings.WORKSHOP_SECRET_KEY.strip())

