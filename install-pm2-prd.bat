@echo off

echo ========================================
echo   NVM + PM2 Production Service Setup
echo ========================================

:: ==============================
:: REQUIRE ADMIN
:: ==============================
net session >nul 2>&1
IF %errorLevel% NEQ 0 (
    echo ERROR: กรุณา Run as Administrator
    pause
    exit /b 1
)

:: ==============================
:: CONFIG
:: ==============================
SET SERVICE_NAME=PM2
SET NVM_ROOT=C:\nvm
SET NODE_VERSION=24.11.0

SET NSSM_DIR=C:\nssm
SET NSSM_PATH=C:\nssm\nssm.exe

SET SCRIPT_DIR=%~dp0
SET LOCAL_NSSM_ZIP=%SCRIPT_DIR%nssm-2.24.zip
SET EXTRACT_DIR=%SCRIPT_DIR%nssm_extract

SET NPM_GLOBAL=C:\npm-global
SET NPM_CACHE=C:\npm-cache
SET PM2_HOME=C:\pm2_home
:: ==============================

SET NODE_PATH=%NVM_ROOT%\v%NODE_VERSION%
SET NODE_EXE=%NODE_PATH%\node.exe
SET NPM_CLI=%NODE_PATH%\node_modules\npm\bin\npm-cli.js
SET PM2_CLI=%NPM_GLOBAL%\node_modules\pm2\bin\pm2

echo.
echo 1. Validate Node path...
IF NOT EXIST "%NODE_EXE%" (
    echo ERROR: Node not found at %NODE_EXE%
    pause
    exit /b 1
)
echo Node Found.

echo.
echo 2. Install NSSM (Offline mode)...

IF NOT EXIST "%NSSM_PATH%" (

    IF NOT EXIST "%LOCAL_NSSM_ZIP%" (
        echo ERROR: nssm-2.24.zip not found next to this .bat
        pause
        exit /b 1
    )

    IF NOT EXIST "%NSSM_DIR%" mkdir "%NSSM_DIR%"

    IF EXIST "%EXTRACT_DIR%" rd /s /q "%EXTRACT_DIR%"
    mkdir "%EXTRACT_DIR%"

    echo Extracting NSSM...
    powershell -Command "Expand-Archive -Path '%LOCAL_NSSM_ZIP%' -DestinationPath '%EXTRACT_DIR%' -Force"

    IF EXIST "%EXTRACT_DIR%\nssm-2.24\win64\nssm.exe" (
        copy "%EXTRACT_DIR%\nssm-2.24\win64\nssm.exe" "%NSSM_PATH%" /Y >nul
    ) ELSE (
        echo ERROR: nssm.exe not found in archive.
        pause
        exit /b 1
    )

    rd /s /q "%EXTRACT_DIR%"
)

IF NOT EXIST "%NSSM_PATH%" (
    echo ERROR: NSSM installation failed.
    pause
    exit /b 1
)

echo NSSM Ready.

echo.
echo 3. Create required directories...
IF NOT EXIST "%NPM_GLOBAL%" mkdir "%NPM_GLOBAL%"
IF NOT EXIST "%NPM_CACHE%" mkdir "%NPM_CACHE%"
IF NOT EXIST "%PM2_HOME%" mkdir "%PM2_HOME%"

echo.
echo 4. Configure npm prefix + cache...
"%NODE_EXE%" "%NPM_CLI%" config set prefix "%NPM_GLOBAL%" --global
"%NODE_EXE%" "%NPM_CLI%" config set cache "%NPM_CACHE%" --global

echo.
echo 5. Install PM2 globally...
"%NODE_EXE%" "%NPM_CLI%" install -g pm2

IF NOT EXIST "%PM2_CLI%" (
    echo ERROR: PM2 installation failed.
    pause
    exit /b 1
)

echo PM2 Installed.

echo.
echo 6. Remove old service if exists...
"%NSSM_PATH%" stop %SERVICE_NAME% >nul 2>&1
"%NSSM_PATH%" remove %SERVICE_NAME% confirm >nul 2>&1

echo.
echo 7. Install Windows service...
"%NSSM_PATH%" install %SERVICE_NAME% "%NODE_EXE%" "%PM2_CLI%" resurrect

echo.
echo 8. Configure service environment...
"%NSSM_PATH%" set %SERVICE_NAME% AppDirectory C:\

"%NSSM_PATH%" set %SERVICE_NAME% AppEnvironmentExtra PM2_HOME=%PM2_HOME%
"%NSSM_PATH%" set %SERVICE_NAME% AppEnvironmentExtra NODE_ENV=production
"%NSSM_PATH%" set %SERVICE_NAME% AppEnvironmentExtra PATH=%NODE_PATH%;%NPM_GLOBAL%

"%NSSM_PATH%" set %SERVICE_NAME% Start SERVICE_AUTO_START
"%NSSM_PATH%" set %SERVICE_NAME% AppRestartDelay 5000
"%NSSM_PATH%" set %SERVICE_NAME% AppThrottle 1500

echo.
echo 9. Start service...
net start %SERVICE_NAME%

IF %errorLevel% NEQ 0 (
    echo ERROR: Service failed to start.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   INSTALL COMPLETED SUCCESSFULLY
echo ========================================
echo.
echo Next step:
echo   set PM2_HOME=%PM2_HOME%
echo   pm2 start app.js
echo   pm2 save
echo.
pause