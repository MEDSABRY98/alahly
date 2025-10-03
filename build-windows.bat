@echo off
echo ========================================
echo Football Database - Windows Build Script
echo ========================================
echo.

echo [1/4] Cleaning previous build...
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist
echo ✓ Cleaned build and dist directories
echo.

echo [2/4] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)
echo ✓ Dependencies installed successfully
echo.

echo [3/4] Building React application...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Failed to build React application
    pause
    exit /b 1
)
echo ✓ React application built successfully
echo.

echo [4/4] Building Electron application...
call npm run build-win
if %errorlevel% neq 0 (
    echo ❌ Failed to build Electron application
    pause
    exit /b 1
)
echo ✓ Electron application built successfully
echo.

echo ========================================
echo ✅ Build completed successfully!
echo ========================================
echo.
echo The application installer can be found in the 'dist' folder.
echo You can also run the application directly with: npm run electron
echo.
pause