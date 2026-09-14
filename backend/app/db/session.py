"""
Gestión de sesión asíncrona y ciclo de vida de base de datos para Senkai DTF Studio.
Soporta SQLite asíncrono con aiosqlite y permite migración transparente a PostgreSQL.
"""

from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.config import settings
from app.db.models import Base

# Motor asíncrono con pool adaptativo
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True
)

# Fábrica de sesiones asíncronas
async_session_factory = async_sessionmaker(
    bind=engine,
    autoflush=False,
    expire_on_commit=False,
    class_=AsyncSession
)


async def init_db():
    """
    Inicializa las tablas de la base de datos si no existen al arrancar la aplicación.
    Garantiza idempotencia en ambientes de desarrollo y pruebas.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Generador de dependencia FastAPI para inyección de sesión de base de datos.
    Asegura el cierre y rollback automático en caso de excepción.
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
