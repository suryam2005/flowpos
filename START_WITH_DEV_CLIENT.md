# How to Run FlowPOS with Dev Client (Fixes Version Mismatch)

## Problem
Your Expo Go app is v54, but your project is v53. They're incompatible.

## Solution: Use Expo Dev Client

Your project already has `expo-dev-client` installed. This creates a custom development build that matches your project version exactly.

## Steps:

### 1. Build the Dev Client (One-time setup)

**For Android:**
```bash
cd flowpos
npx expo run:android
```

This will:
- Build a custom development app for your project
- Install it on your connected device/emulator
- Start the Metro bundler

**Note:** You need:
- Android Studio installed
- Android device connected via USB with USB debugging enabled, OR
- Android emulator running

### 2. Start Development Server

After the initial build, you can just run:
```bash
cd flowpos
npm start
```

Then press `a` to open on Android.

## Alternative: Downgrade Expo Go

If you don't want to build a dev client:

1. Uninstall Expo Go v54 from your device
2. Install Expo Go v53 (search for older version in Play Store or download APK)
3. Run `npm start` and scan QR code

## Why This Happened

Expo Go auto-updates to the latest version (v54), but your project is still on SDK 53. The dev client approach gives you full control and matches your project version exactly.

## Benefits of Dev Client

- ✅ No version mismatch issues
- ✅ Can use any native modules
- ✅ Faster reload times
- ✅ Better for production-ready apps
- ✅ Works with custom native code

## Current Status

Your code changes are ready and working. Once you run with the correct Expo version (either dev client or Expo Go v53), you'll see:

1. ✅ Tax settings disabled when GST number is blank
2. ✅ Business type shows selected value only
3. ✅ UPI fields hidden when QR Pay not selected
