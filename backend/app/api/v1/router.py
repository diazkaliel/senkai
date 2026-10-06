"""
Agregador de rutas API v1 para Seiko DTF Studio.
"""

from fastapi import APIRouter
from app.api.v1.endpoints.garments import router as garments_router
from app.api.v1.endpoints.customizer import router as customizer_router
from app.api.v1.endpoints.orders import router as orders_router
from app.api.v1.endpoints.admin import router as admin_router
from app.api.v1.endpoints.content import router as content_router

api_router = APIRouter()

api_router.include_router(garments_router)
api_router.include_router(customizer_router)
api_router.include_router(orders_router)
api_router.include_router(admin_router)
api_router.include_router(content_router)

