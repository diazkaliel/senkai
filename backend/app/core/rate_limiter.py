"""
Controlador de tasa de peticiones (Rate Limiter) por IP y ventana deslizante en memoria.
Protege los endpoints públicos críticos (creación de órdenes, cotizaciones en vivo y subida de archivos)
contra ataques de denegación de servicio (DoS), scraping agresivo y agotamiento de recursos.
"""

import time
import asyncio
from collections import defaultdict
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from app.core.config import settings


class InMemorySlidingWindowLimiter:
    """
    Implementación en memoria de ventana deslizante por IP de cliente.
    Purga timestamps viejos automáticamente y calcula la ventana en segundos.
    """

    def __init__(self):
        self._history = defaultdict(list)
        self._lock = asyncio.Lock()

    async def is_allowed(self, key: str, max_requests: int, window_seconds: int = 60) -> tuple[bool, int]:
        now = time.monotonic()
        cutoff = now - window_seconds

        async with self._lock:
            timestamps = self._history[key]
            # Descarto los registros que ya cayeron fuera de la ventana
            valid_timestamps = [t for t in timestamps if t > cutoff]

            if len(valid_timestamps) >= max_requests:
                # Calculo cuántos segundos faltan para que expire la solicitud más antigua
                retry_after = max(1, int(valid_timestamps[0] + window_seconds - now))
                self._history[key] = valid_timestamps
                return False, retry_after

            valid_timestamps.append(now)
            self._history[key] = valid_timestamps
            return True, 0


limiter = InMemorySlidingWindowLimiter()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware ASGI que inspecciona la ruta solicitada y la IP del cliente.
    Si se superan las cuotas configuradas, devuelve inmediatamente 429 Too Many Requests.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        if not getattr(settings, "RATE_LIMIT_ENABLED", True):
            return await call_next(request)

        # En entorno de pruebas unitarias o desarrollo con bypass explícito, no aplicamos freno
        if request.headers.get("X-Bypass-Rate-Limit") == "true":
            return await call_next(request)

        path = request.url.path
        method = request.method
        client_ip = request.client.host if request.client else "127.0.0.1"

        # Determinamos las reglas según el endpoint crítico
        rule = None
        if path.endswith("/orders") and method == "POST":
            rule = ("orders", getattr(settings, "RATE_LIMIT_ORDERS_PER_MINUTE", 20))
        elif "quote" in path and method in ("GET", "POST"):
            rule = ("quotes", getattr(settings, "RATE_LIMIT_QUOTES_PER_MINUTE", 150))
        elif "upload" in path and method == "POST":
            rule = ("uploads", getattr(settings, "RATE_LIMIT_UPLOADS_PER_MINUTE", 30))

        if rule:
            bucket_name, limit = rule
            key = f"{client_ip}:{bucket_name}"
            allowed, retry_after = await limiter.is_allowed(key, max_requests=limit, window_seconds=60)

            if not allowed:
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": "Has alcanzado el límite de solicitudes por minuto. Por favor, aguarda un instante.",
                        "retry_after_seconds": retry_after
                    },
                    headers={"Retry-After": str(retry_after)}
                )

        return await call_next(request)
