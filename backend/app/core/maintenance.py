"""Puerta de mantenimiento de escrituras para ventanas de publicación con SQLite."""

import logging
from pathlib import Path

from starlette.responses import JSONResponse

logger = logging.getLogger("senkai.maintenance")

# El marcador reside en el volumen persistente para sobrevivir a un cambio de imagen.
# No se expone ningún endpoint HTTP para activarlo o desactivarlo.
MAINTENANCE_FLAG_PATH = Path("/app/storage/.senkai-maintenance")
SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})


def maintenance_is_active() -> bool:
    """Consultar el marcador en cada escritura permite cambiar el estado sin reiniciar."""
    try:
        MAINTENANCE_FLAG_PATH.stat()
    except FileNotFoundError:
        return False
    except OSError:
        # Si no podemos consultar el volumen, nunca asumimos que es seguro escribir.
        logger.exception("No se pudo consultar el marcador de mantenimiento")
        return True
    return True


class MaintenanceModeMiddleware:
    """Rechaza escrituras API antes de leer cuerpos o ejecutar dependencias FastAPI."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        request_path = scope.get("path", "")
        request_method = scope.get("method", "GET").upper()
        is_api_request = request_path == "/api/v1" or request_path.startswith("/api/v1/")

        if not is_api_request or request_method in SAFE_METHODS or not maintenance_is_active():
            return await self.app(scope, receive, send)

        blocked_response = JSONResponse(
            status_code=503,
            content={
                "code": "MAINTENANCE_MODE",
                "detail": "La tienda está temporalmente en mantenimiento. Intenta nuevamente más tarde.",
            },
            headers={
                "Retry-After": "120",
                "Cache-Control": "no-store",
            },
        )
        await blocked_response(scope, receive, send)
