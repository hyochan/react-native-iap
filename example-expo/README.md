# React Native IAP - Expo Example

This is an Expo example app for testing react-native-iap with the bundle identifier `dev.hyo.martie`.

## ⚠️ Important: Independent Project Setup

**This example app is NOT part of the yarn workspace and is managed independently.**

### Why Independent Setup?

After extensive testing, we discovered that Expo's autolinking system has fundamental conflicts with yarn workspaces when developing native modules:

1. **Plugin Conflict**: Expo autolinking attempts to apply both `com.android.library` and `com.android.application` plugins to the same project, causing build failures
2. **Workspace Detection**: Expo autolinking incorrectly detects the parent library in a workspace structure and processes it as a nested module
3. **Persistent Error**: The error consistently occurs at line 333 of `expo-modules-autolinking/scripts/android/autolinking_implementation.gradle`

These issues make it impossible to use Expo apps within yarn workspaces for native module development, hence this independent setup.

## 🔧 How It Works

### Package Management

- This project uses **bun** for faster package management (independent from the root yarn workspace)
- The `react-native-iap` library is linked via a custom postinstall script

### Postinstall Script

The `postinstall` script (`scripts/postinstall.sh`) automatically sets up the development environment:

1. **Creates Symlinks** for live development:
   - `src/` → TypeScript source code (editable in root)
   - `ios/` → iOS native code
   - `android/` → Android native code
   - `plugin/` → Expo plugin code

2. **Copies Essential Files**:
   - `package.json`, `README.md`, `tsconfig.json`

3. **Builds the Library**:
   - Runs `yarn prepare` in root directory
   - Copies compiled files (`lib/`, `nitrogen/`)

This allows you to:

- ✅ Edit TypeScript files directly in `../src/`
- ✅ See changes immediately reflected in the example app
- ✅ Test native code modifications without republishing

## Configuration

- **Bundle Identifier (iOS)**: `dev.hyo.martie`
- **Package Name (Android)**: `dev.hyo.martie`
- **App Name**: Martie IAP Example

## Prerequisites

1. **iOS**: The app must be configured in App Store Connect with the bundle ID `dev.hyo.martie`
2. **Android**: The app must be configured in Google Play Console with the package name `dev.hyo.martie`
3. **Products**: In-app purchase products must be created with IDs matching those in the app:
   - `dev.hyo.martie.1bulbs` (consumable product)
   - `dev.hyo.martie.premium` (subscription)

## 🚀 Getting Started

### Quick Setup (Automated) - RECOMMENDED

From the **root directory** of the main project:

```bash
# Complete automated setup
yarn setup:expo

# This single command will:
# ✅ Install all root dependencies
# ✅ Install example-expo dependencies
# ✅ Run postinstall script (linking, building, prebuild)
# ✅ Generate native iOS/Android code
# ✅ Everything ready to run!
```

After this, you can immediately run:

```bash
cd example-expo
bun ios --device  # or bun ios for simulator
bun android
```

### Manual Installation (if needed)

```bash
# Install dependencies (this will run postinstall automatically)
bun install

# If you need to manually run the setup:
./scripts/postinstall.sh
```

## Running the Example

### Prebuild (Required First Time)

```bash
# Generate native code
bunx expo prebuild
```

### iOS

```bash
# Run on iOS simulator
bun run ios

# Or for device
bun run ios --device
```

### Android

```bash
# Run on Android emulator/device
bun run android
```

### Development Server Only

```bash
# Start Metro bundler
bun start
```

## 🔄 Development Workflow

### For TypeScript Changes

1. **Edit TypeScript code** in the root `../src/` directory
2. **Rebuild the library**:

   ```bash
   cd ..
   yarn prepare
   ```

3. **Restart Metro** (or it should hot-reload automatically)

### For Native Code Changes

1. **iOS**: After modifying iOS native code

   ```bash
   cd ios
   pod install
   cd ..
   bun run ios
   ```

2. **Android**: After modifying Android native code

   ```bash
   bun run android
   ```

### Development Build (For Physical Testing)

For testing in-app purchases on real devices:

```bash
# iOS Device
npx eas build --profile preview --platform ios

# Android Device
npx eas build --profile preview --platform android

# Or build locally
npx eas build --profile development --platform ios --local
npx eas build --profile development --platform android --local
```

## Testing In-App Purchases

### iOS Testing

1. **Sandbox Testing**:
   - Create sandbox tester accounts in App Store Connect
   - Sign out of your personal Apple ID on the device
   - Sign in with sandbox account when prompted during purchase

2. **TestFlight**:
   - Upload build to TestFlight for more realistic testing
   - Real users can test without sandbox accounts

### Android Testing

1. **Testing Track**:
   - Upload APK/AAB to internal/closed/open testing track
   - Add test accounts in Google Play Console

2. **License Testing**:
   - Add test accounts in Play Console > Settings > License testing
   - Test accounts can make purchases without being charged

## Important Notes

- The bundle identifier `dev.hyo.martie` must match exactly in:
  - app.json configuration
  - App Store Connect (iOS)
  - Google Play Console (Android)
  - Product IDs in the store consoles

- Billing permissions are already configured in app.json:
  - iOS: SKAdNetwork items for attribution
  - Android: `com.android.vending.BILLING` permission

## Troubleshooting

### "Store not available"

- Ensure you're testing on a real device (not simulator for purchases)
- Check that the bundle ID matches store configuration
- Verify products are approved and available in store console

### "Product not found"

- Product IDs must match exactly (case-sensitive)
- Products must be approved in store console
- Wait 24 hours after creating new products

### Build Issues

- Clear Metro cache: `yarn expo:start --clear`
- Clean build folders: `cd ios && rm -rf build && cd ..`
- Rebuild with `--clear-cache` flag
