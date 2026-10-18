#!/usr/bin/env python3
"""
SENKAI // BACKUP & RESTORE EN CALIENTE (SQLITE ONLINE BACKUP)
Herramienta de grado producción para generar snapshots consistentes de la base
de datos sin detener el servidor ASGI ni bloquear lecturas/escrituras.

Características:
1. Conexión segura con API nativa sqlite3.backup (cero bloqueo en modo WAL).
2. Verificación estricta de integridad (PRAGMA integrity_check).
3. Compresión GZip automática (ahorro del ~85% en espacio en disco).
4. Rotación automática de respaldos antiguos (retención configurable).
5. Procedimiento seguro de restauración con copia preventiva ante desastres.
"""

import os
import sys
import time
import gzip
import shutil
import sqlite3
import argparse
from datetime import datetime, timedelta

# Aseguro que el directorio raíz del proyecto esté en sys.path para importar config
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

try:
    from backend.app.core.config import settings
except ImportError:
    # Fallback si se ejecuta con otro CWD
    try:
        from app.core.config import settings
    except ImportError:
        settings = None


def resolve_db_path(explicit_path=None) -> str:
    """Extrae la ruta al archivo SQLite desde la configuración o usa el valor por defecto."""
    if explicit_path:
        return os.path.abspath(explicit_path)

    if settings and hasattr(settings, "DATABASE_URL"):
        url = settings.DATABASE_URL
        # Formatos comunes: sqlite+aiosqlite:///./senkai_studio.db o sqlite:///./senkai_studio.db
        if "sqlite" in url:
            clean_path = url.split(":///")[-1]
            if clean_path.startswith("./"):
                clean_path = os.path.join(ROOT_DIR, clean_path[2:])
            return os.path.abspath(clean_path)

    # Fallback directo al archivo estándar del proyecto
    return os.path.abspath(os.path.join(ROOT_DIR, "senkai_studio.db"))


def format_bytes(num_bytes: int) -> str:
    """Devuelve un formato legible en KB o MB."""
    if num_bytes < 1024:
        return f"{num_bytes} B"
    elif num_bytes < 1024 * 1024:
        return f"{num_bytes / 1024:.2f} KB"
    return f"{num_bytes / (1024 * 1024):.2f} MB"


def perform_backup(db_path: str, backup_dir: str) -> str:
    """
    Ejecuta el snapshot en caliente, verifica integridad y comprime el resultado.
    Devuelve la ruta absoluta del archivo comprimido generado (.db.gz).
    """
    if not os.path.exists(db_path):
        raise FileNotFoundError(f"La base de datos de origen no existe en: {db_path}")

    os.makedirs(backup_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
    temp_db_name = f"senkai_snapshot_{timestamp}.db"
    temp_db_path = os.path.join(backup_dir, temp_db_name)
    gz_path = f"{temp_db_path}.gz"

    start_time = time.perf_counter()
    print(f"[*] Iniciando backup en caliente desde: {db_path}")
    print(f"[*] Destino temporal: {temp_db_path}")

    # 1. Snapshot atómico usando Online Backup API
    source_conn = sqlite3.connect(db_path)
    dest_conn = sqlite3.connect(temp_db_path)

    try:
        source_conn.backup(dest_conn)
    finally:
        dest_conn.close()
        source_conn.close()

    raw_size = os.path.getsize(temp_db_path)
    print(f"[+] Snapshot copiado exitosamente ({format_bytes(raw_size)})")

    # 2. Prueba estricta de integridad sobre la copia generada
    print("[*] Ejecutando PRAGMA integrity_check sobre la copia...")
    check_conn = sqlite3.connect(temp_db_path)
    try:
        cursor = check_conn.cursor()
        cursor.execute("PRAGMA integrity_check;")
        result = cursor.fetchall()
        if not result or result[0][0].lower() != "ok":
            raise RuntimeError(f"Fallo de integridad en el respaldo: {result}")
        print("[+] Integridad verificada al 100%: Base de datos consistente.")
    finally:
        check_conn.close()

    # 3. Compresión GZip al vuelo
    print("[*] Comprimiendo archivo de respaldo con GZip...")
    with open(temp_db_path, "rb") as f_in:
        with gzip.open(gz_path, "wb", compresslevel=9) as f_out:
            shutil.copyfileobj(f_in, f_out)

    # Elimino la copia intermedia sin comprimir para ahorrar disco
    os.remove(temp_db_path)

    gz_size = os.path.getsize(gz_path)
    elapsed = round(time.perf_counter() - start_time, 2)
    ratio = (1 - (gz_size / raw_size)) * 100 if raw_size > 0 else 0

    print(f"[OK] Respaldo final completado en {elapsed}s:")
    print(f"     Archivo: {os.path.basename(gz_path)}")
    print(f"     Tamaño comprimido: {format_bytes(gz_size)} (Ahorro: {ratio:.1f}%)")

    return gz_path


def prune_old_backups(backup_dir: str, keep_days: int = 7) -> int:
    """Elimina respaldos con más de N días de antigüedad para proteger el espacio en disco."""
    if keep_days <= 0:
        return 0

    cutoff_date = datetime.now() - timedelta(days=keep_days)
    pruned_count = 0

    print(f"[*] Aplicando política de retención (mantener últimos {keep_days} días)...")

    for fname in os.listdir(backup_dir):
        if fname.startswith("senkai_snapshot_") and fname.endswith(".db.gz"):
            full_path = os.path.join(backup_dir, fname)
            mtime = datetime.fromtimestamp(os.path.getmtime(full_path))
            if mtime < cutoff_date:
                os.remove(full_path)
                pruned_count += 1
                print(f"[-] Depurado backup antiguo: {fname} (creado el {mtime.strftime('%Y-%m-%d')})")

    if pruned_count == 0:
        print("[+] Todos los respaldos existentes están dentro de la ventana de retención.")
    else:
        print(f"[+] Se eliminaron {pruned_count} archivo(s) antiguo(s).")

    return pruned_count


def restore_backup(archive_gz_path: str, target_db_path: str) -> None:
    """
    Restaura de forma segura un respaldo comprimido (.db.gz) sobre la base de datos destino.
    Genera una copia de seguridad previa de emergencia antes de sobreescribir.
    """
    if not os.path.exists(archive_gz_path):
        raise FileNotFoundError(f"No se encontró el archivo de respaldo: {archive_gz_path}")

    print(f"[!] INICIANDO PROCEDIMIENTO DE RESTAURACIÓN")
    print(f"    Archivo de origen: {archive_gz_path}")
    print(f"    Base de datos destino: {target_db_path}")

    # 1. Copia de seguridad preventiva si la base actual existe
    if os.path.exists(target_db_path):
        emergency_bak = f"{target_db_path}.pre_restore_{datetime.now().strftime('%Y%m%d_%H%M%S')}.bak"
        print(f"[*] Creando copia de seguridad preventiva antes de restaurar: {emergency_bak}")
        shutil.copy2(target_db_path, emergency_bak)

    # 2. Descompresión y verificación en archivo temporal
    temp_restored = f"{target_db_path}.restoring_tmp"
    try:
        with gzip.open(archive_gz_path, "rb") as f_in:
            with open(temp_restored, "wb") as f_out:
                shutil.copyfileobj(f_in, f_out)

        # 3. Verificación de integridad sobre el archivo restaurado
        check_conn = sqlite3.connect(temp_restored)
        try:
            cursor = check_conn.cursor()
            cursor.execute("PRAGMA integrity_check;")
            res = cursor.fetchall()
            if not res or res[0][0].lower() != "ok":
                raise RuntimeError(f"El respaldo a restaurar está corrupto: {res}")
        finally:
            check_conn.close()

        # 4. Reemplazo atómico
        # Limpiamos también archivos WAL o SHM residuales que pudiesen desfasar la base restaurada
        for extra in [f"{target_db_path}-wal", f"{target_db_path}-shm"]:
            if os.path.exists(extra):
                os.remove(extra)

        shutil.move(temp_restored, target_db_path)
    except Exception:
        if os.path.exists(temp_restored):
            os.remove(temp_restored)
        raise

    print(f"[OK] ¡Base de datos restaurada exitosamente con integridad verificada!")


def main():
    parser = argparse.ArgumentParser(
        description="SENKAI DTF Studio // Automatización de Respaldos en Caliente y Recuperación ante Desastres"
    )
    parser.add_argument("--db", type=str, default=None, help="Ruta personalizada al archivo SQLite (por defecto lee config)")
    parser.add_argument("--dir", type=str, default=os.path.join(ROOT_DIR, "backups"), help="Directorio para almacenar los respaldos")
    parser.add_argument("--keep-days", type=int, default=7, help="Días de retención de respaldos antes de depurar (default: 7)")
    parser.add_argument("--restore", type=str, default=None, help="Ruta a un archivo .db.gz para ejecutar una restauración segura")

    args = parser.parse_args()

    db_path = resolve_db_path(args.db)

    if args.restore:
        restore_backup(args.restore, db_path)
    else:
        perform_backup(db_path, args.dir)
        prune_old_backups(args.dir, keep_days=args.keep_days)


if __name__ == "__main__":
    main()
