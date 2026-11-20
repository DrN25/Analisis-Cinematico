@echo off
title GEMA-Cinemático - Compartir con Cloudflare Tunnel
color 0B

echo =======================================================================
echo             GEMA-CINEMÁTICO - COMPARTIR PROYECTO EN VIVO
echo =======================================================================
echo.
echo Se iniciara el Backend (:8002), Frontend (:5175) y un tunel temporal
echo seguro de Cloudflare (https://...trycloudflare.com).
echo.

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Python no esta instalado o no esta en el PATH.
    pause
    exit /b
)
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js no esta instalado o no esta en el PATH.
    pause
    exit /b
)

if not exist frontend\node_modules (
    echo Instalando dependencias de frontend...
    cd frontend
    call npm install
    cd ..
)

if exist backend\venv\Scripts\python.exe (
    backend\venv\Scripts\python.exe compartir.py
) else (
    python compartir.py
)

exit
