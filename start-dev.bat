@echo off
echo 🚀 Starting FlowPOS Development Environment...
echo.

echo 📡 Starting backend server...
start "FlowPOS Backend" cmd /k "cd /d %~dp0\..\flowpos-backend && node server-final.js"

echo ⏳ Waiting for backend to start...
timeout /t 3 /nobreak >nul

echo 📱 Starting Expo development server...
start "FlowPOS Frontend" cmd /k "cd /d %~dp0 && npx expo start --clear"

echo.
echo ✅ Both servers are starting!
echo 📡 Backend: http://192.168.1.4:3000
echo 📱 Frontend: Check the Expo QR code
echo.
echo Press any key to close this window...
pause >nul