@echo off
echo ========================================
echo Football Database Installer Builder
echo ========================================
echo.

echo [1/4] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [2/4] Building React application...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Failed to build React app
    pause
    exit /b 1
)

echo.
echo [3/4] Creating installer files...
call npm run build-win
if %errorlevel% neq 0 (
    echo ERROR: Failed to create installer
    pause
    exit /b 1
)

echo.
echo [4/4] Build completed successfully!
echo.
echo Generated files:
echo - dist\Football Database Setup.exe (NSIS Installer)
echo - dist\Football Database 1.0.0.exe (Portable)
echo.
echo You can now distribute the installer files.
echo.
pause
