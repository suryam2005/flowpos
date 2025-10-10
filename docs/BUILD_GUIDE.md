# FlowPOS Production Build Guide

## 🚀 **Quick Start Production Build**

### **Prerequisites**
```bash
# Install EAS CLI globally
npm install -g @expo/eas-cli

# Login to your Expo account
eas login
```

### **One-Command Production Build**
```bash
# Build for both iOS and Android
eas build --platform all --profile production
```

## 📱 **Platform-Specific Builds**

### **iOS App Store Build**
```bash
# Build for iOS App Store
eas build --platform ios --profile production

# After build completes, submit to App Store
eas submit --platform ios
```

### **Android Play Store Build**
```bash
# Build for Android Play Store  
eas build --platform android --profile production

# After build completes, submit to Play Store
eas submit --platform android
```

## 🔧 **Build Configuration**

### **Current Configuration (eas.json)**
- **Bundle ID**: `com.flowpos.app`
- **Version**: 1.0.0
- **Build Type**: Production APK/IPA
- **Distribution**: App Store/Play Store ready

### **App Configuration (app.json)**
- **App Name**: FlowPOS
- **Version**: 1.0.0
- **Icons**: Updated with latest design
- **Permissions**: Camera, Biometric, SMS, Storage
- **Orientation**: Portrait + Landscape support

## 📊 **Build Status Tracking**

### **Monitor Build Progress**
```bash
# Check build status
eas build:list

# View specific build details
eas build:view [BUILD_ID]
```

### **Download Built Files**
```bash
# Download IPA/APK after build completes
eas build:download [BUILD_ID]
```

## 🏪 **Store Submission**

### **Automatic Submission**
```bash
# Submit iOS build to App Store Connect
eas submit --platform ios --latest

# Submit Android build to Play Console
eas submit --platform android --latest
```

### **Manual Submission**
1. Download the built IPA/APK
2. Upload manually to App Store Connect / Play Console
3. Fill in store metadata and screenshots
4. Submit for review

## 🎯 **Pre-Build Checklist**

- [x] **App Version**: Updated to 1.0.0
- [x] **Bundle ID**: Set to com.flowpos.app
- [x] **Icons**: Updated with latest design
- [x] **Permissions**: All required permissions declared
- [x] **Code Quality**: No console errors or warnings
- [x] **Testing**: App tested on both iOS and Android
- [x] **EAS Configuration**: eas.json properly configured

## 🔍 **Build Troubleshooting**

### **Common Issues**
```bash
# Clear Expo cache
expo r -c

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### **Build Logs**
```bash
# View detailed build logs
eas build:view [BUILD_ID] --logs
```

## 📈 **Post-Build Steps**

1. **Test the built app** on physical devices
2. **Create store screenshots** (5-10 per platform)
3. **Write app description** for store listings
4. **Set up app analytics** (optional)
5. **Prepare marketing materials** (optional)

## 🎉 **Production Ready!**

Your FlowPOS app is now ready for production deployment to both iOS App Store and Google Play Store!

**Estimated Build Time**: 10-15 minutes per platform
**Store Review Time**: 1-7 days (varies by platform)