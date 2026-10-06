@echo off
title Senkai DTF Studio - Servidor de Desarrollo
echo ===================================================
echo   SENKAI // ESTUDIO TEXTIL DTF - SERVIDOR ACTIVO
echo ===================================================
echo.
echo Iniciando servidor en http://127.0.0.1:8000 ...
echo Presiona Ctrl+C para detener el servidor.
echo.

cd /d "%~dp0"
call "%~dp0venv\Scripts\activate.bat"
"%~dp0venv\Scripts\python.exe" -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
pause
