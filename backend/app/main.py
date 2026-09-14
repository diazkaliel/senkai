"""
Punto de entrada principal para el backend FastAPI de Seiko DTF Studio.
Soporta endpoints REST, documentación OpenAPI y entrega de la Single Page Application (SPA).
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi import Request, status

from app.core.config import settings
from app.core.exceptions import EntityNotFoundException, SenkaiDomainException, InvalidStateTransitionException
from app.core.middleware import CorrelationIdMiddleware
from app.api.v1.router import api_router
from app.db.session import init_db, async_session_factory
from app.db.seeds import seed_database_if_empty


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Garantiza la inicialización y sembrado de la base de datos relacional al arrancar el servidor."""
    await init_db()
    async with async_session_factory() as session:
        await seed_database_if_empty(session)
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API de alto rendimiento para Senkai: Catálogo textil, personalizador DTF y gestión de taller.",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    redoc_url=f"{settings.API_V1_PREFIX}/redoc",
    lifespan=lifespan
)

# Middleware de observabilidad y Correlation ID
app.add_middleware(CorrelationIdMiddleware)

# Configuración de CORS segura (específica para evitar rechazo de navegadores ante credentials)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$|^https://.*\.pages\.dev$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Manejadores globales para excepciones de dominio
@app.exception_handler(InvalidStateTransitionException)
async def invalid_transition_handler(request: Request, exc: InvalidStateTransitionException):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": exc.message}
    )


@app.exception_handler(EntityNotFoundException)
async def entity_not_found_handler(request: Request, exc: EntityNotFoundException):
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": exc.message}
    )


@app.exception_handler(SenkaiDomainException)
async def domain_exception_handler(request: Request, exc: SenkaiDomainException):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": exc.message}
    )


# Incluir Rutas API v1
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health", tags=["Healthcheck"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION
    }


# Ruta hacia el frontend
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend"))

if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        # Prevenir Path Traversal validando confinamiento estricto en FRONTEND_DIR
        requested_path = os.path.abspath(os.path.join(FRONTEND_DIR, full_path))

        try:
            is_inside_frontend = (os.path.commonpath([FRONTEND_DIR, requested_path]) == FRONTEND_DIR)
        except ValueError:
            is_inside_frontend = False

        if is_inside_frontend and full_path and os.path.isfile(requested_path):
            return FileResponse(requested_path)

        # Fallback a index.html para soportar client-side routing
        index_file = os.path.join(FRONTEND_DIR, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"message": "Frontend not found", "api_docs": f"{settings.API_V1_PREFIX}/docs"}
