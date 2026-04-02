@echo off
setlocal enabledelayedexpansion

:: ─────────────────────────────────────────────────────────────────────────────
:: start.bat  –  Start pm2-admin.
::               If PM2 is available: starts as a PM2 daemon process.
::               Otherwise: starts in the foreground with Node.js.
::               Use install-pm2-prd.bat for a persistent Windows Service.
:: ─────────────────────────────────────────────────────────────────────────────

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

for /f %%a in ('echo prompt $E^| cmd /Q') do set "ESC=%%a"
set "CY=%ESC%[36m" & set "GN=%ESC%[32m" & set "YW=%ESC%[33m"
set "RD=%ESC%[31m" & set "BD=%ESC%[1m"  & set "RS=%ESC%[0m"

echo.
echo %BD%%CY%pm2-admin ^— Start%RS%
echo.

where node >nul 2>&1 || (echo %RD%[ERROR]%RS% Node.js not found. Run install.bat first. & pause & exit /b 1)

cd /d "%ROOT%"

if not exist ".env" (echo %RD%[ERROR]%RS% .env not found. Run install.bat first. & pause & exit /b 1)

if not exist "src\frontend\dist" (
    echo %YW%[WARN]%RS%  Frontend build not found at src\frontend\dist.
    set /p "BUILD_NOW=Build now? [y/N]: "
    if /i "!BUILD_NOW!"=="y" (
        call "%ROOT%\build.bat"
    ) else (
        echo %RD%[ERROR]%RS% Cannot start without a frontend build.
        pause & exit /b 1
    )
)

:: Read PORT and HOST from .env
:: (pipe through findstr so cmd strips \r from CRLF line endings)
set "APP_PORT=4343"
set "HOST=127.0.0.1"
for /f "tokens=1,* delims==" %%A in ('findstr /B /C:"PORT=" /C:"HOST=" "%ROOT%\.env"') do (
    if "%%A"=="PORT" set "APP_PORT=%%B"
    if "%%A"=="HOST" set "HOST=%%B"
)
set "APP_NAME=pm2-admin:%APP_PORT%"

:: ── PM2 branch ────────────────────────────────────────────────────────────────
where pm2 >nul 2>&1
if not errorlevel 1 (
    echo %CY%[INFO]%RS%  PM2 detected — starting as daemon.
    echo.

    pm2 describe "%APP_NAME%" >nul 2>&1
    if not errorlevel 1 (
        echo %YW%[WARN]%RS%  Existing PM2 process '%APP_NAME%' found ^— deleting...
        pm2 delete "%APP_NAME%"
    )

    pm2 start "%ROOT%\src\app.js" --name "%APP_NAME%" --log-date-format "YYYY-MM-DD HH:mm:ss" --restart-delay 3000 --max-restarts 10
    if errorlevel 1 (
        echo %RD%[ERROR]%RS% PM2 start failed. Check output above.
        pause & exit /b 1
    )

    pm2 save
    echo.
    echo %GN%[ OK ]%RS%  pm2-admin is running!
    echo   URL    : %BD%http://%HOST%:%APP_PORT%%RS%
    echo   Logs   : %BD%pm2 logs %APP_NAME%%RS%
    echo   Status : %BD%pm2 status%RS%
    echo   Stop   : %BD%pm2 stop %APP_NAME%%RS%
    echo.
    start "" "http://localhost:%APP_PORT%"
    pause
    exit /b 0
)

:: ── Node fallback ─────────────────────────────────────────────────────────────
echo %YW%[WARN]%RS%  PM2 not found — starting in foreground with Node.js.
echo %CY%[INFO]%RS%  Press Ctrl-C to stop.
echo.
node "%ROOT%\src\app.js"
