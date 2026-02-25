@echo off
echo ========================================
echo FlowPOS APK Build Script
echo ========================================
echo.
echo Backend URL: https://flowposbackend-2.onrender.com
echo Environment: Production
echo.
echo Starting APK build...
echo.

cd /d "%~dp0"

echo Checking EAS CLI...
eas --version
if %errorlevel% neq 0 (
    echo EAS CLI not found. Installing...
    npm install -g @expo/eas-cli
)

echo.
echo Starting production build...
eas build --platform android --profile production

echo.
echo ========================================
echo Build initiated! 
echo Check your Expo dashboard for progress.
echo ========================================
pause