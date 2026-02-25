#!/bin/bash

echo "========================================"
echo "FlowPOS APK Build Script"
echo "========================================"
echo ""
echo "Backend URL: https://flowposbackend-2.onrender.com"
echo "Environment: Production"
echo ""
echo "Starting APK build..."
echo ""

# Navigate to script directory
cd "$(dirname "$0")"

echo "Checking EAS CLI..."
if ! command -v eas &> /dev/null; then
    echo "EAS CLI not found. Installing..."
    npm install -g @expo/eas-cli
fi

echo ""
echo "Starting production build..."
eas build --platform android --profile production

echo ""
echo "========================================"
echo "Build initiated!"
echo "Check your Expo dashboard for progress."
echo "========================================"