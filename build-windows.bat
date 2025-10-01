@echo off
echo ========================================
echo Football Database Windows Builder
echo ========================================
echo.

echo [1/5] Cleaning previous builds...
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist
echo ✅ Cleaned previous builds

echo.
echo [2/5] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo ✅ Dependencies installed

echo.
echo [3/5] Building React application...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ ERROR: Failed to build React app
    pause
    exit /b 1
)
echo ✅ React app built successfully

echo.
echo [4/5] Verifying build files...
if not exist build\index.html (
    echo ❌ ERROR: index.html not found in build folder
    pause
    exit /b 1
)
if not exist build\static (
    echo ❌ ERROR: static folder not found in build folder
    pause
    exit /b 1
)
echo ✅ Build files verified

echo.
echo [5/5] Creating Windows installer...
call npm run build-win
if %errorlevel% neq 0 (
    echo ❌ ERROR: Failed to create installer
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ BUILD COMPLETED SUCCESSFULLY!
echo ========================================
echo.
echo Generated files:
echo - dist\Football Database Setup.exe (NSIS Installer)
echo - dist\Football Database 1.0.0.exe (Portable)
echo.
echo You can now distribute the installer files.
echo.
pause
