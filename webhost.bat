@echo off
setlocal EnableExtensions
chcp 65001 >nul

:: ===========================================================
:: 1. METADATA (Webhost Dashboard)
:: ===========================================================
:: WEBHOST_NAME=AI Talk 2026
:: WEBHOST_PORT=7450
:: WEBHOST_HOST=0.0.0.0
:: WEBHOST_AUTO_START=true

:: ===========================================================
:: 2. XU LY BIEN MOI TRUONG DONG & DUONG DAN
:: ===========================================================
if "%PORT%"=="" set PORT=7450
if "%HOST%"=="" set HOST=0.0.0.0

cd /d "%~dp0"

echo [INFO] Dang khoi chay AI Talk 2026 tren %HOST%:%PORT%...

:: ===========================================================
:: 3. KHOI DONG SERVER TINH VOI PYTHON HTTP.SERVER
:: ===========================================================
python -m http.server %PORT% --bind %HOST%
