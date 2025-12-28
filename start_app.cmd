@echo off
cd /d "%~dp0"
title Divisas App Server

echo ==========================================
echo       INICIANDO DIVISAS APP
echo ==========================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado.
    echo Por favor instala Node.js desde https://nodejs.org/
    pause
    exit
)

:: Check if node_modules exists
if not exist "node_modules" (
    echo [INFO] Instalando dependencias (esto solo pasa la primera vez)...
    call npm install
)

echo [INFO] Iniciando servidor...
echo [INFO] Se abrira el navegador automaticamente en unos segundos.
echo.
echo NO CIERRES ESTA VENTANA MIENTRAS USES LA APP.
echo.

:: Start server and open browser (using Vite's --open flag is more reliable)
call npm run dev -- --open

pause
