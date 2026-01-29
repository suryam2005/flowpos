@echo off
echo ========================================
echo NUCLEAR CACHE CLEAR - Removing ALL caches
echo ========================================
echo.

echo [1/6] Clearing .expo cache...
if exist .expo (
    rmdir /s /q .expo
    echo     ✓ .expo cleared
)

echo [2/6] Clearing node_modules cache...
if exist node_modules\.cache (
    rmdir /s /q node_modules\.cache
    echo     ✓ node_modules\.cache cleared
)

echo [3/6] Clearing Metro bundler cache...
rmdir /s /q %TEMP%\metro-* 2>nul
echo     ✓ Metro cache cleared

echo [4/6] Clearing haste map cache...
rmdir /s /q %TEMP%\haste-map-* 2>nul
echo     ✓ Haste map cleared

echo [5/6] Clearing React Native cache...
rmdir /s /q %TEMP%\react-* 2>nul
echo     ✓ React Native cache cleared

echo [6/6] Starting Expo with full cache reset...
echo.
npx expo start -c --reset-cache --clear

pause
