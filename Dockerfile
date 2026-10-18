# =============================================================================
# SENKAI DTF STUDIO - PRODUCTION MULTI-STAGE DOCKERFILE
# Optimizado con usuario sin privilegios (non-root) y compilación limpia de dependencias.
# =============================================================================

# --- Stage 1: Build & Dependencies ---
FROM python:3.12-slim AS builder

WORKDIR /build

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# --- Stage 2: Final Runtime ---
FROM python:3.12-slim AS runner

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/home/appuser/.local/bin:$PATH"

# Seguridad: Usuario sin privilegios root
RUN groupadd -g 1001 senkai && \
    useradd -u 1001 -g senkai -m -s /bin/bash appuser

# Copiar dependencias compiladas desde el builder
COPY --from=builder /root/.local /home/appuser/.local

# Copiar código del backend, frontend y configuración de migraciones
COPY --chown=appuser:senkai backend /app/backend
COPY --chown=appuser:senkai frontend /app/frontend
COPY --chown=appuser:senkai alembic /app/alembic
COPY --chown=appuser:senkai alembic.ini /app/alembic.ini

# Crear directorios para persistencia (uploads, backups, SQLite WAL) con permisos adecuados para appuser
RUN mkdir -p /app/backups /app/frontend/assets/uploads && \
    chown -R appuser:senkai /app

USER appuser

EXPOSE 8000

# Verificación de salud periódica en contenedor
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')" || exit 1

CMD ["python", "-m", "uvicorn", "app.main:app", "--app-dir", "backend", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips=*", "--no-server-header"]
