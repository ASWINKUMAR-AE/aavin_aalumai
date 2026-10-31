@echo off
REM ==============================================================================
REM Aavin Smart Cattle Passport - Windows Quick Setup & Run Script
REM ==============================================================================

echo ========================================================================
echo   AAVIN SMART CATTLE PASSPORT - XAMPP SETUP & RUNNER
echo ========================================================================

REM 1. Check if backend/.env exists, if not copy from example
if not exist "backend\.env" (
    echo [1/3] Creating backend\.env from template...
    copy "backend\.env.example" "backend\.env" >nul
    echo   backend\.env created.
) else (
    echo [1/3] backend\.env already present.
)

REM 2. Run Database initialization
echo [2/3] Checking and initializing database (aavin_milkflow)...
node scripts\init-db.js
if %errorlevel% neq 0 (
    echo.
    echo WARNING: Database initialization failed or MySQL is not running.
    echo Please make sure Apache and MySQL are STARTED in XAMPP Control Panel.
    echo Press any key to continue to app startup anyway...
    pause >nul
)

REM 3. Run full development environment
echo.
echo [3/3] Starting Unified Dev Runner (Backend + Expo Mobile + QR Portal)...
npm start
