@echo off
title Senkai DTF Studio - Servidor de Desarrollo
echo ===================================================
echo   SENKAI // ESTUDIO TEXTIL DTF - SERVIDOR ACTIVO
echo ===================================================
echo.
echo Iniciando servidor en http://127.0.0.1:8000 ...
echo Presiona Ctrl+C para detener el servidor.
echo.

cd /d "%~dp0backend"
call "..\venv\Scripts\activate.bat"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause
