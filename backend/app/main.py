"""
Punto de entrada principal para el backend FastAPI de Seiko DTF Studio.
Soporta endpoints REST, documentación OpenAPI y entrega de la Single Page Application (SPA).
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.core.config import settings
from app.api.v1.router import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API de alto rendimiento para Seiko: Catálogo textil, personalizador DTF y gestión de taller.",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    redoc_url=f"{settings.API_V1_PREFIX}/redoc"
)

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En desarrollo; en producción se parametriza con settings.ALLOWED_ORIGINS
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend")

if os.path.exists(FRONTEND_DIR):
    # Montar archivos estáticos si existen
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        # Si la petición apunta a un archivo estático específico que existe, servirlo
        target_path = os.path.join(FRONTEND_DIR, full_path)
        if full_path and os.path.isfile(target_path):
            return FileResponse(target_path)
        # De lo contrario, devolver index.html para soportar client-side routing
        index_file = os.path.join(FRONTEND_DIR, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"message": "Frontend not found", "api_docs": f"{settings.API_V1_PREFIX}/docs"}
