@echo off
echo ========================================
echo Clearing Expo Cache and Restarting
echo ========================================
echo.

echo [1/3] Clearing .expo cache...
if exist .expo (
    rmdir /s /q .expo
    echo     ✓ .expo cleared
) else (
    echo     ✓ .expo already clean
)

echo [2/3] Clearing node_modules cache...
if exist node_modules\.cache (
    rmdir /s /q node_modules\.cache
    echo     ✓ node_modules\.cache cleared
) else (
    echo     ✓ node_modules\.cache already clean
)

echo [3/3] Starting Expo with clear cache...
echo.
npx expo start -c

pause
