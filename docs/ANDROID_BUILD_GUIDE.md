# FlowPOS Android Build Guide

## 🚀 **Quick Android Build Steps**

### **Step 1: Update EAS CLI**
```bash
# Update to latest EAS CLI
npm install -g @expo/eas-cli@latest

# Verify installation
eas --version
```

### **Step 2: Login to Expo**
```bash
# Login to your Expo account
eas login
```

### **Step 3: Build Android APK**
```bash
# Build production Android APK
eas build --platform android --profile production
```

## 📱 **Alternative: Local Android Build**

If EAS build fails, you can build locally:

### **Step 1: Install Android Studio**
1. Download Android Studio
2. Install Android SDK
3. Set up environment variables

### **Step 2: Generate APK Locally**
```bash
# Generate Android project
npx expo run:android --variant release

# Or use Expo CLI
expo build:android
```

## 🔧 **Build Configuration**

### **Current Android Settings**
- **Package Name**: `com.flowpos.app`
- **Version Code**: 1
- **Version Name**: 1.0.0
- **Build Type**: APK (for testing)
- **Target SDK**: Latest

### **APK vs AAB**
- **APK**: Direct install, good for testing
- **AAB**: Play Store preferred format

## 📊 **Build Process**

### **What Happens During Build**
1. Code compilation and optimization
2. Asset bundling and compression
3. Icon and splash screen generation
4. Signing with release keys
5. APK/AAB generation

### **Build Time**
- **Estimated**: 10-15 minutes
- **Depends on**: Code size, assets, network speed

## 📱 **Testing Your Build**

### **Install APK on Device**
```bash
# Enable Developer Options on Android device
# Enable USB Debugging
# Connect device via USB

# Install APK
adb install path/to/your-app.apk
```

### **Test Checklist**
- [ ] App launches successfully
- [ ] All screens navigate properly
- [ ] POS functionality works
- [ ] Invoice generation works
- [ ] Settings save properly
- [ ] App doesn't crash

## 🏪 **Play Store Preparation**

### **For Play Store Upload**
```bash
# Build AAB for Play Store
eas build --platform android --profile production
```

### **Play Store Requirements**
- [ ] App Bundle (AAB) format
- [ ] Signed with upload key
- [ ] Target API level 33+
- [ ] Privacy policy URL
- [ ] App screenshots
- [ ] Store description

## 🎯 **Quick Commands Summary**

```bash
# Update EAS CLI
npm install -g @expo/eas-cli@latest

# Login
eas login

# Build Android
eas build --platform android --profile production

# Check build status
eas build:list

# Download APK when ready
eas build:download [BUILD_ID]
```

## 🔍 **Troubleshooting**

### **Common Issues**
```bash
# Clear cache if build fails
expo r -c
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules
npm install

# Check EAS configuration
eas build:configure
```

### **Build Logs**
```bash
# View build logs for debugging
eas build:view [BUILD_ID] --logs
```

## 🎉 **Success!**

Once your build completes:
1. Download the APK
2. Test on Android devices
3. Upload to Play Store (if ready)
4. Share with beta testers

Your FlowPOS Android app is ready for production! 📱