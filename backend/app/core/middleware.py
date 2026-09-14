"""
Middlewares de observabilidad para Senkai DTF Studio.
Inyecta Correlation IDs (X-Request-ID) en cada ciclo de petición-respuesta y calcula latencias.
"""

import time
import uuid
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("senkai.access")


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """
    Asigna y propaga un identificador único por transacción HTTP para trazabilidad transversal (end-to-end).
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # Reutilizar correlation ID del cliente o generar uno nuevo
        correlation_id = request.headers.get("X-Request-ID") or request.headers.get("X-Correlation-ID")
        if not correlation_id:
            correlation_id = f"req-{uuid.uuid4().hex[:12]}"

        request.state.correlation_id = correlation_id
        start_time = time.perf_counter()

        response = await call_next(request)

        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        response.headers["X-Correlation-ID"] = correlation_id
        response.headers["X-Response-Time-Ms"] = str(duration_ms)

        # Log estructurado conciso para monitoreo
        logger.info(
            f"[{correlation_id}] {request.method} {request.url.path} "
            f"-> {response.status_code} ({duration_ms}ms)"
        )

        return response
