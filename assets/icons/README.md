# FlowPOS Icons Directory

This directory contains all the app icons organized by platform and usage.

**Last Updated:** New icons replaced - Version 1.0.2

## Directory Structure

```
assets/icons/
├── android/          # Android platform icons
│   ├── mipmap-hdpi/
│   ├── mipmap-mdpi/
│   ├── mipmap-xhdpi/
│   ├── mipmap-xxhdpi/
│   └── mipmap-xxxhdpi/
├── ios/              # iOS platform icons (all sizes)
│   ├── 16.png        # 16x16 (macOS)
│   ├── 20.png        # 20x20 (iPhone notification)
│   ├── 29.png        # 29x29 (iPhone settings)
│   ├── 40.png        # 40x40 (iPhone spotlight)
│   ├── 58.png        # 58x58 (iPhone settings @2x)
│   ├── 60.png        # 60x60 (iPhone app)
│   ├── 76.png        # 76x76 (iPad app)
│   ├── 80.png        # 80x80 (iPhone spotlight @2x)
│   ├── 87.png        # 87x87 (iPhone settings @3x)
│   ├── 120.png       # 120x120 (iPhone app @2x)
│   ├── 152.png       # 152x152 (iPad app @2x)
│   ├── 167.png       # 167x167 (iPad Pro app @2x)
│   ├── 180.png       # 180x180 (iPhone app @3x)
│   ├── 1024.png      # 1024x1024 (App Store)
│   └── Contents.json # iOS icon configuration
└── store/            # App store icons
    ├── appstore.png  # Apple App Store icon
    └── playstore.png # Google Play Store icon
```

## Usage

### Main App Icons
- `assets/icon.png` - Main app icon (1024x1024)
- `assets/adaptive-icon.png` - Android adaptive icon

### Platform-Specific Icons
- **iOS**: Use icons from `ios/` directory with appropriate sizes
- **Android**: Use icons from `android/` directory with density-specific folders
- **Store**: Use `store/` icons for app store submissions

### Expo Configuration
These icons are automatically used by Expo when building the app. The main `icon.png` and `adaptive-icon.png` in the root assets folder are the primary icons used by Expo's build system.

## Icon Specifications

### iOS Icons
- Format: PNG
- Background: Opaque (no transparency)
- Corners: Square (iOS adds rounded corners automatically)
- Content: Should not include iOS interface elements

### Android Icons
- Format: PNG
- Background: Can be transparent for adaptive icons
- Densities: mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi
- Adaptive: Supports foreground and background layers

### Store Icons
- **App Store**: 1024x1024 PNG, no transparency, no rounded corners
- **Play Store**: 512x512 PNG, can have transparency

## Notes
- All icons have been moved from the original `ICONS/` directory
- Icons are organized for easy maintenance and platform-specific usage
- The structure follows React Native and Expo best practices



okay in posscreen the images should be properly cropped to fit the space alloted for image and it should have subtle shadow or an outline please