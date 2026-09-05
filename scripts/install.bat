@echo off
setlocal enabledelayedexpansion

:: ─────────────────────────────────────────────────────────────────────────────
:: scripts\install.bat  –  Install all dependencies and create .env
:: ─────────────────────────────────────────────────────────────────────────────

:: ROOT = project root (parent of the scripts\ folder this file lives in)
for %%I in ("%~dp0..") do set "ROOT=%%~fI"

:: ANSI colours (Windows 10 1511+)
for /f %%a in ('echo prompt $E^| cmd /Q') do set "ESC=%%a"
set "CY=%ESC%[36m" & set "GN=%ESC%[32m" & set "YW=%ESC%[33m"
set "RD=%ESC%[31m" & set "BD=%ESC%[1m"  & set "RS=%ESC%[0m"

echo.
echo %BD%%CY%pm2-admin ^— Install%RS%
echo.

:: ── 1. Node.js ────────────────────────────────────────────────────────────────
where node >nul 2>&1 || (
    echo %RD%[ERROR]%RS% Node.js not found. Install v16+ from https://nodejs.org
    pause & exit /b 1
)
set "NODE_MAJOR=0"
for /f "tokens=*" %%V in ('node -e "process.stdout.write(process.versions.node.split('.')[0])" 2^>nul') do set "NODE_MAJOR=%%V"
if !NODE_MAJOR! LSS 16 (
    echo %RD%[ERROR]%RS% Node.js v16+ required. Found: & node -v
    pause & exit /b 1
)
echo %GN%[ OK ]%RS%  Node.js & node -v

:: ── 2. PM2 ────────────────────────────────────────────────────────────────────
where pm2 >nul 2>&1
if errorlevel 1 (
    echo %YW%[WARN]%RS%  PM2 not found. Installing globally...
    call npm install -g pm2 || ( echo %RD%[ERROR]%RS% PM2 install failed. & pause & exit /b 1 )
)
echo %GN%[ OK ]%RS%  PM2 & call pm2 -v

:: The config comes first: a failed npm install must not leave the project without a
:: .env, or start.bat refuses to run and the fix is not obvious.
:: ── 3. Environment file ───────────────────────────────────────────────────────
cd /d "%ROOT%"
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo %GN%[ OK ]%RS%  .env created from .env.example — edit it to configure HOST, PORT, and APP_SESSION_SECRET.
    ) else (
        echo %YW%[WARN]%RS%  .env.example not found. Create .env manually.
    )
) else (
    echo %CY%[INFO]%RS%  .env already exists — skipping.
)

:: ── 4. Backend dependencies ───────────────────────────────────────────────────
echo.
echo %CY%Installing backend dependencies...%RS%
cd /d "%ROOT%"
call npm install || ( echo %RD%[ERROR]%RS% Backend install failed. & pause & exit /b 1 )
echo %GN%[ OK ]%RS%  Backend dependencies installed.

:: ── 5. Frontend dependencies ──────────────────────────────────────────────────
echo.
echo %CY%Installing frontend dependencies...%RS%
cd /d "%ROOT%\src\frontend"
call npm install || ( echo %RD%[ERROR]%RS% Frontend install failed. & pause & exit /b 1 )
echo %GN%[ OK ]%RS%  Frontend dependencies installed.

echo.
echo %GN%Installation complete!%RS%
echo   Next steps:
echo   1. Edit %BD%.env%RS% if needed
echo   2. Run %BD%scripts\build.bat%RS% to build the frontend
echo   3. Run %BD%scripts\start.bat%RS% ^(dev^) or %BD%scripts\install-pm2-prd.bat%RS% ^(production^)
echo.
pause
