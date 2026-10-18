"""
Gestión de sesión asíncrona y ciclo de vida de base de datos para Senkai DTF Studio.
Soporta SQLite asíncrono con aiosqlite y permite migración transparente a PostgreSQL.
"""

from typing import AsyncGenerator
from sqlalchemy import event
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.config import settings
from app.db.models import Base

# Motor asíncrono con pool adaptativo
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True
)

# Concurrencia y resiliencia para SQLite (WAL mode, timeouts y llaves foráneas)
if "sqlite" in settings.DATABASE_URL:
    @event.listens_for(engine.sync_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode = WAL")
        cursor.execute("PRAGMA busy_timeout = 5000")
        cursor.execute("PRAGMA synchronous = NORMAL")
        cursor.execute("PRAGMA foreign_keys = ON")
        cursor.close()

# Fábrica de sesiones asíncronas
async_session_factory = async_sessionmaker(
    bind=engine,
    autoflush=False,
    expire_on_commit=False,
    class_=AsyncSession
)


def _ensure_schema_columns(sync_conn) -> None:
    """
    Asegura migración suave e idempotente de columnas nuevas en bases SQLite existentes.
    """
    if "sqlite" not in settings.DATABASE_URL:
        return
    try:
        garment_cols = [
            row[1] for row in sync_conn.exec_driver_sql("PRAGMA table_info(garments)").fetchall()
        ]
        if garment_cols:
            if "photo_front" not in garment_cols:
                sync_conn.exec_driver_sql("ALTER TABLE garments ADD COLUMN photo_front VARCHAR(255)")
            if "photo_back" not in garment_cols:
                sync_conn.exec_driver_sql("ALTER TABLE garments ADD COLUMN photo_back VARCHAR(255)")
            if "size_prices_json" not in garment_cols:
                sync_conn.exec_driver_sql("ALTER TABLE garments ADD COLUMN size_prices_json TEXT DEFAULT '{}'")
            if "is_active" not in garment_cols:
                sync_conn.exec_driver_sql("ALTER TABLE garments ADD COLUMN is_active BOOLEAN DEFAULT 1")

        variant_cols = [
            row[1] for row in sync_conn.exec_driver_sql("PRAGMA table_info(garment_variants)").fetchall()
        ]
        if variant_cols and "custom_price" not in variant_cols:
            sync_conn.exec_driver_sql("ALTER TABLE garment_variants ADD COLUMN custom_price INTEGER")
    except Exception:
        pass


async def init_db():
    """
    Inicializa las tablas de la base de datos si no existen al arrancar la aplicación.
    Garantiza idempotencia en ambientes de desarrollo y pruebas.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_ensure_schema_columns)


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
