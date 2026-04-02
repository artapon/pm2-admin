@echo off
setlocal enabledelayedexpansion

:: ─────────────────────────────────────────────────────────────────────────────
:: build.bat  –  Build the Vue 3 frontend into src\frontend\dist
:: ─────────────────────────────────────────────────────────────────────────────

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

for /f %%a in ('echo prompt $E^| cmd /Q') do set "ESC=%%a"
set "CY=%ESC%[36m" & set "GN=%ESC%[32m" & set "YW=%ESC%[33m"
set "RD=%ESC%[31m" & set "BD=%ESC%[1m"  & set "RS=%ESC%[0m"

echo.
echo %BD%%CY%pm2-admin ^— Build Frontend%RS%
echo.

where node >nul 2>&1 || (
    echo %RD%[ERROR]%RS% Node.js not found. Run install.bat first.
    pause & exit /b 1
)

if not exist "%ROOT%\src\frontend\node_modules" (
    echo %YW%[WARN]%RS%  Frontend node_modules not found. Running npm install first...
    cd /d "%ROOT%\src\frontend"
    call npm install || ( echo %RD%[ERROR]%RS% npm install failed. & pause & exit /b 1 )
)

echo %CY%[INFO]%RS%  Building frontend...
cd /d "%ROOT%\src\frontend"
call npm run build || ( echo %RD%[ERROR]%RS% Build failed. Check Vite output above. & pause & exit /b 1 )

if not exist "%ROOT%\src\frontend\dist" (
    echo %RD%[ERROR]%RS% Build finished but dist\ not found. Check Vite output above.
    pause & exit /b 1
)

echo.
echo %GN%[ OK ]%RS%  Frontend built ^→ %ROOT%\src\frontend\dist
echo.
pause
