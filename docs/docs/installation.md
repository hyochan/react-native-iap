---
sidebar_position: 2
---

import GreatFrontEndTopFixed from "@site/src/uis/GreatFrontEndTopFixed";

# Installation

<GreatFrontEndTopFixed />

This guide will help you install and configure React Native IAP in your React Native or Expo project.

:::warning Compatibility (Nitro 14.x)
`react-native-iap@14.x` is Nitro-based and requires **React Native 0.79+**.

If you must stay on **RN 0.75.x or lower**, install the last pre‑Nitro version: `npm i react-native-iap@13.1.0`.

Hitting Swift 6 C++ interop errors in Nitro (e.g. `AnyMap.swift` using `cppPart.pointee.*`)? Pin Swift 5.10 for the `NitroModules` pod (see snippet below) as a temporary workaround.

Recommended path: Upgrade to RN 0.79+, update `react-native-nitro-modules` and `nitro-codegen` to latest, then `pod install` and do a clean build.

If you're using React Native version 0.78 or using Expo, consider using [expo-iap](https://expo-iap.hyo.dev/docs/installation) instead (easier configuration by installing `expo-modules-core` first).

If issues persist after upgrading or applying the Swift pin, please share a minimal repro (fresh app + `package.json` + `Podfile`).
:::

## Prerequisites

Before installing React Native IAP, make sure you have:

- For `react-native-iap@14.x` (Nitro): **React Native 0.79+** (Expo SDK aligned with RN 0.79)
- For older RN (0.75.x or lower): use `react-native-iap@13.1.0` (pre‑Nitro)
- Node.js 16 or later
- iOS 15+ for iOS apps (StoreKit 2 requirement)
- Android API level 21+ for Android apps

## Package Installation

Install the package using your favorite package manager:

```bash
npm install react-native-iap react-native-nitro-modules
```

### For React Native CLI Projects

If you're using React Native CLI (not Expo), you need to install iOS dependencies after installing the package:

```bash
cd ios && pod install
```

The native modules will be automatically linked during your app's build process.

## Expo Configuration

### Important for Expo Managed Workflow

If you're using the Expo managed workflow, you **must** use a [custom development client](https://docs.expo.dev/versions/latest/sdk/dev-client/) since in-app purchases require native modules that aren't available in Expo Go.

After installing the package, you need to:

1. **Configure expo-build-properties for Android** (required for Kotlin 2.2+ support):

   Starting from version 14.6.0, react-native-iap supports Google Play Billing Library v8.2.0, which requires Kotlin 2.2+. Since `expo-modules-core` doesn't support Kotlin 2.2 yet, you need to manually configure the Kotlin version.

   Add the following to your `app.json`:

   ```json
   {
     "expo": {
       "plugins": [
         "react-native-iap",
         [
           "expo-build-properties",
           {
             "android": {
               "kotlinVersion": "2.2.0"
             }
           }
         ]
       ]
     }
   }
   ```

2. **Install expo-dev-client**

   Since in-app purchases require native modules that aren't available in Expo Go, you need to install expo-dev-client to create a custom development client. Learn more about [expo-dev-client](https://docs.expo.dev/versions/latest/sdk/dev-client/).

   ```bash
   npx expo install expo-dev-client
   ```

3. **Install the plugin and run prebuild**:

   ```bash
   npx expo prebuild --clean
   ```

   This will generate the native iOS and Android directories with the necessary configurations. Learn more about [adopting prebuild](https://docs.expo.dev/guides/adopting-prebuild/).

4. Optional: Fix iOS Folly coroutine include error

   If your iOS build fails with errors such as `'folly/coro/Coroutine.h' file not found` from `RCT-Folly/folly/Expected.h`, you can opt‑in to a workaround that disables Folly coroutine support during CocoaPods install.

   Add this flag to the `react-native-iap` plugin options in your Expo config:

   ```json
   {
     "expo": {
       "plugins": [
         [
           "react-native-iap",
           {
             "ios": {
               "with-folly-no-coroutines": true
             }
           }
         ]
       ]
     }
   }
   ```

   Note migration:
   - This option key was renamed from `with-folly-no-couroutines` to `with-folly-no-coroutines`. Update your Expo config accordingly. For compatibility, the plugin temporarily accepts the old key and logs a deprecation warning.

   What this does:
   - Injects `FOLLY_NO_CONFIG=1`, `FOLLY_CFG_NO_COROUTINES=1`, and `FOLLY_HAS_COROUTINES=0` into the Podfile `post_install` block for all Pods targets, preventing `RCT-Folly` from including non‑vendored `<folly/coro/*>` headers.
   - Idempotent: skips if you already set these defines yourself.

   After enabling the flag, re-run prebuild:

   ```bash
   npx expo prebuild
   ```

## Store Configuration

For detailed platform-specific configuration:

- [iOS Setup](./getting-started/setup-ios.md) - iOS StoreKit configuration
- [Android Setup](./getting-started/setup-android.md) - Android Google Play Billing configuration

## Real world examples

For detailed platform-specific setup instructions, check out our real examples:

- [Purchase Flow](./examples/purchase-flow.md) - Complete purchase implementation
- [Subscription Flow](./examples/subscription-flow.md) - Subscription management
- [Available Purchases](./examples/available-purchases.md) - Restore purchases
- [Offer Code](./examples/offer-code.md) - Promotional offers and codes
