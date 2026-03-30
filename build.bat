@echo off
echo ========================================
echo   Building Frontend for PM2 Admin
echo ========================================
cd src/frontend
echo Running npm install...
call npm install
echo Running npm run build...
call npm run build
echo.
echo ========================================
echo   Build Completed Successfully!
echo ========================================
pause
