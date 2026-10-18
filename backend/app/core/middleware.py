"""
Middlewares de observabilidad para Senkai DTF Studio.
Inyecta Correlation IDs (X-Request-ID) en cada ciclo de petición-respuesta y calcula latencias.
"""

import time
import uuid
import json
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import settings

logger = logging.getLogger("senkai.access")


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """
    Asigna y propaga un identificador único por transacción HTTP para trazabilidad transversal (end-to-end).
    En producción emito logs en formato JSON estructurado para ingesta directa en agregadores (Datadog/Loki).
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # Reutilizo el correlation ID que envíe el proxy o creo uno nuevo con prefijo legible
        correlation_id = request.headers.get("X-Request-ID") or request.headers.get("X-Correlation-ID")
        if not correlation_id:
            correlation_id = f"req-{uuid.uuid4().hex[:12]}"

        request.state.correlation_id = correlation_id
        start_time = time.perf_counter()

        response = await call_next(request)

        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        response.headers["X-Correlation-ID"] = correlation_id
        response.headers["X-Response-Time-Ms"] = str(duration_ms)

        # Si estamos en producción, serializo como JSON para observabilidad industrial
        if settings.ENVIRONMENT == "production":
            client_ip = request.client.host if request.client else "unknown"
            log_record = {
                "timestamp": time.time(),
                "level": "INFO",
                "correlation_id": correlation_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
                "client_ip": client_ip
            }
            logger.info(json.dumps(log_record))
        else:
            # En desarrollo local mantengo una traza visual limpia y concisa
            logger.info(
                f"[{correlation_id}] {request.method} {request.url.path} "
                f"-> {response.status_code} ({duration_ms}ms)"
            )

        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Inyecta cabeceras de endurecimiento HTTP estándar de la industria (OWASP Secure Headers).
    Protege contra clickjacking, MIME-sniffing, XSS y fugas de información de origen.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        return response


class CacheControlMiddleware(BaseHTTPMiddleware):
    """
    Control granular de caché HTTP para CDN y navegadores:
    - Rutas dinámicas de API (/api/*) y healthchecks: sin caché (no-store, no-cache, must-revalidate).
    - Raíz de la SPA (index.html): sin caché para que despliegues de nuevos bundles se carguen al instante.
    - Assets estáticos versionados (/static/* con CSS, JS, fuentes, imágenes):
      * En producción: public, max-age=31536000, immutable (aprovecha los query strings ?v=...).
      * En desarrollo: no-cache para recarga inmediata al editar archivos de taller.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        # Si el endpoint ya definió una política explícita, la respeto
        if "cache-control" in response.headers:
            return response

        path = request.url.path

        if path.startswith("/api/") or path == "/health":
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
            response.headers["Pragma"] = "no-cache"
        elif path == "/" or path.endswith("index.html"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
            response.headers["Pragma"] = "no-cache"
        elif path.startswith("/static/"):
            if settings.ENVIRONMENT == "production":
                if path.endswith(".js") or path.endswith(".css"):
                    response.headers["Cache-Control"] = "no-cache, must-revalidate"
                else:
                    response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
            else:
                response.headers["Cache-Control"] = "no-cache"

        return response
