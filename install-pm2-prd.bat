@echo off
setlocal enabledelayedexpansion

:: ─────────────────────────────────────────────────────────────────────────────
:: install-pm2-prd.bat  –  Deploy pm2-admin as a persistent Windows service
::                         via PM2 + NSSM.  Must be run as Administrator.
::
:: NSSM makes the PM2 daemon itself a Windows service, so all PM2-managed
:: processes (including pm2-admin) survive reboots automatically.
::
:: To get NSSM: place nssm-2.24.zip (from https://nssm.cc/download) next to
:: this script, or pre-install nssm.exe to C:\nssm\nssm.exe.
:: ─────────────────────────────────────────────────────────────────────────────

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

for /f %%a in ('echo prompt $E^| cmd /Q') do set "ESC=%%a"
set "CY=%ESC%[36m" & set "GN=%ESC%[32m" & set "YW=%ESC%[33m"
set "RD=%ESC%[31m" & set "BD=%ESC%[1m"  & set "RS=%ESC%[0m"

echo.
echo %BD%%CY%pm2-admin ^— Production Deploy (PM2 + NSSM Windows Service)%RS%
echo.

:: ── Require Administrator ─────────────────────────────────────────────────────
net session >nul 2>&1 || (
    echo %RD%[ERROR]%RS% This script must be run as Administrator.
    echo        Right-click install-pm2-prd.bat ^→ "Run as administrator"
    pause & exit /b 1
)

:: ── Prerequisites ─────────────────────────────────────────────────────────────
where node >nul 2>&1 || (
    echo %RD%[ERROR]%RS% Node.js not found. Run install.bat first.
    pause & exit /b 1
)
echo %GN%[ OK ]%RS%  Node.js & node -v

where pm2 >nul 2>&1
if errorlevel 1 (
    echo %YW%[WARN]%RS%  PM2 not found. Installing...
    call npm install -g pm2 || ( echo %RD%[ERROR]%RS% PM2 install failed. & pause & exit /b 1 )
)
echo %GN%[ OK ]%RS%  PM2 & pm2 -v

cd /d "%ROOT%"

if not exist ".env" (
    echo %RD%[ERROR]%RS% .env not found. Run install.bat first.
    pause & exit /b 1
)

if not exist "src\frontend\dist" (
    echo %YW%[WARN]%RS%  Frontend build not found at src\frontend\dist.
    set /p "BUILD_NOW=Build now? [y/N]: "
    if /i "!BUILD_NOW!"=="y" (
        call "%ROOT%\build.bat"
    ) else (
        echo %RD%[ERROR]%RS% Cannot deploy without a frontend build. Run build.bat first.
        pause & exit /b 1
    )
)

:: Read PORT and HOST from .env
set "PORT=4343"
set "HOST=127.0.0.1"
for /f "usebackq tokens=1,* delims==" %%A in ("%ROOT%\.env") do (
    if "%%A"=="PORT" set "PORT=%%B"
    if "%%A"=="HOST" set "HOST=%%B"
)

set "APP_NAME=pm2-admin"

:: ── Register app with PM2 ─────────────────────────────────────────────────────
echo.
echo %CY%Registering '%APP_NAME%' with PM2...%RS%
pm2 describe %APP_NAME% >nul 2>&1 && (
    echo %YW%[WARN]%RS%  Existing PM2 process '%APP_NAME%' found — deleting...
    pm2 delete %APP_NAME%
)
pm2 start "%ROOT%\src\app.js" --name "%APP_NAME%" --log-date-format "YYYY-MM-DD HH:mm:ss" --restart-delay 3000 --max-restarts 10
if errorlevel 1 (
    echo %RD%[ERROR]%RS% PM2 start failed. Check output above.
    pause & exit /b 1
)
pm2 save
echo %GN%[ OK ]%RS%  PM2 process saved.

:: ── NSSM: make PM2 a Windows Service ─────────────────────────────────────────
echo.
echo %CY%Setting up NSSM Windows Service for PM2 auto-start on reboot...%RS%

set "NSSM_DIR=C:\nssm"
set "NSSM_EXE=%NSSM_DIR%\nssm.exe"
set "SERVICE_NAME=PM2"

if not exist "%NSSM_EXE%" (
    set "NSSM_ZIP=%ROOT%\nssm-2.24.zip"
    if not exist "!NSSM_ZIP!" (
        echo %YW%[WARN]%RS%  nssm-2.24.zip not found.
        echo        Download from https://nssm.cc/download, place nssm-2.24.zip
        echo        next to this script, then re-run.
        echo.
        echo %YW%[WARN]%RS%  Windows Service NOT configured — PM2 will not auto-start on reboot.
        goto :summary
    )
    if not exist "%NSSM_DIR%" mkdir "%NSSM_DIR%"
    echo %CY%[INFO]%RS%  Extracting NSSM...
    set "EXTRACT=%ROOT%\_nssm_tmp"
    powershell -Command "Expand-Archive -Path '!NSSM_ZIP!' -DestinationPath '!EXTRACT!' -Force" || (
        echo %RD%[ERROR]%RS% NSSM extraction failed. & goto :summary
    )
    copy "!EXTRACT!\nssm-2.24\win64\nssm.exe" "%NSSM_EXE%" /Y >nul
    rd /s /q "!EXTRACT!" 2>nul
)

:: Resolve node.exe and pm2 CLI from current environment
for /f "delims=" %%N in ('where node 2^>nul') do set "NODE_EXE=%%N" & goto :node_resolved
:node_resolved
for /f "delims=" %%G in ('npm root -g 2^>nul') do set "NPM_GLOBAL=%%G"
set "PM2_CLI=!NPM_GLOBAL!\pm2\bin\pm2"

if not exist "!PM2_CLI!" (
    echo %YW%[WARN]%RS%  PM2 CLI not found at !PM2_CLI!. Skipping Windows Service setup.
    goto :summary
)

:: Remove old service if it exists
"%NSSM_EXE%" stop %SERVICE_NAME% >nul 2>&1
"%NSSM_EXE%" remove %SERVICE_NAME% confirm >nul 2>&1

:: Install and start service
"%NSSM_EXE%" install %SERVICE_NAME% "!NODE_EXE!" "!PM2_CLI!" resurrect
"%NSSM_EXE%" set %SERVICE_NAME% AppDirectory "%ROOT%"
"%NSSM_EXE%" set %SERVICE_NAME% Start SERVICE_AUTO_START
"%NSSM_EXE%" set %SERVICE_NAME% AppRestartDelay 5000
"%NSSM_EXE%" set %SERVICE_NAME% AppThrottle 1500
net start %SERVICE_NAME%
if errorlevel 1 (
    echo %YW%[WARN]%RS%  Windows Service failed to start. PM2 is running but may not survive reboot.
) else (
    echo %GN%[ OK ]%RS%  Windows Service '%SERVICE_NAME%' installed and started.
)

:summary
echo.
echo %GN%[ OK ]%RS%  pm2-admin is running!
echo   URL    : %BD%http://!HOST!:!PORT!%RS%
echo   Logs   : %BD%pm2 logs %APP_NAME%%RS%
echo   Status : %BD%pm2 status%RS%
echo   Stop   : %BD%pm2 stop %APP_NAME%%RS%
echo   Remove : %BD%pm2 delete %APP_NAME%%RS%
echo.

start "" "http://localhost:!PORT!"
pause
