> **⚠️ This repository has moved to the [OpenIAP monorepo](https://github.com/hyodotdev/openiap/tree/main/libraries/react-native-iap).** This repository is deprecated and will be archived soon. All future development happens in the monorepo. Please see the [announcement](https://github.com/hyochan/react-native-iap/discussions/3188) for details.

# React Native IAP

<div align="center">
  <img src="https://hyochan.github.io/react-native-iap/img/icon.png" alt="React Native IAP Logo" width="150" />
  
[![Version](http://img.shields.io/npm/v/react-native-iap.svg?style=flat-square)](https://npmjs.org/package/react-native-iap)
[![Download](http://img.shields.io/npm/dm/react-native-iap.svg?style=flat-square)](https://npmjs.org/package/react-native-iap)
[![OpenIAP](https://img.shields.io/badge/OpenIAP-Compliant-green?style=flat-square)](https://openiap.dev)
[![Backers and Sponsors](https://img.shields.io/opencollective/all/react-native-iap.svg)](https://opencollective.com/react-native-iap)
[![CI - Test](https://github.com/hyochan/react-native-iap/actions/workflows/ci-test.yml/badge.svg)](https://github.com/hyochan/react-native-iap/actions/workflows/ci-test.yml)
[![codecov](https://codecov.io/gh/hyochan/react-native-iap/graph/badge.svg?token=KSYo4rC6cU)](https://codecov.io/gh/hyochan/react-native-iap)
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fhyochan%2Freact-native-iap.svg?type=shield&issueType=license)](https://app.fossa.com/projects/git%2Bgithub.com%2Fhyochan%2Freact-native-iap?ref=badge_shield&issueType=license)
  
  **React Native IAP** is a high-performance in-app purchase library using Nitro Modules that **conforms to the [Open IAP specification](https://openiap.dev)**. It provides a unified API for handling in-app purchases across iOS and Android platforms with comprehensive error handling and modern TypeScript support.
  
  <a href="https://openiap.dev"><img src="https://github.com/hyodotdev/openiap/blob/main/logo.png" alt="Open IAP" height="40" /></a>
</div>

## 🎨 Promotion

<div align="center">
  <a href="https://hyodotdev.github.io/kstyled">
    <img src="https://hyodotdev.github.io/kstyled/img/logo.png" alt="kstyled Logo" width="120" />
  </a>

**Compile-time CSS-in-JS for React Native**

✨ Banishing runtime overhead, one style at a time with **[kstyled](https://hyodotdev.github.io/kstyled)** - fully type-safe styling that compiles away.

🚀 **[Explore kstyled →](https://hyodotdev.github.io/kstyled)**

</div>

## 📚 Documentation

**[📖 Visit our comprehensive documentation site →](https://hyochan.github.io/react-native-iap)**

## ⚠️ Notice

**Starting from version 14.0.0**, this library uses [Nitro Modules](https://github.com/mrousavy/nitro) for high-performance native bridge implementation. You must install `react-native-nitro-modules` alongside `react-native-iap`.

### Compatibility (Nitro 14.x)

- `react-native-iap@14.x` (Nitro) requires **React Native 0.79+**.
- Stuck on **RN 0.75.x or lower**? Use the last pre‑Nitro version: `npm i react-native-iap@13.1.0`.
- Seeing Swift 6 C++ interop errors in Nitro (e.g., `AnyMap.swift` with `cppPart.pointee.*`)? Temporarily pin Swift to **5.10** for the `NitroModules` pod (see Installation docs) or upgrade RN and Nitro deps.
- Recommended: upgrade to RN 0.79+, update `react-native-nitro-modules`/`nitro-codegen`, then `pod install` and clean build.

More details and the Podfile snippet are in the docs: https://hyochan.github.io/react-native-iap/docs/installation#ios

## ✨ Features

- 🔄 **Cross-platform Support**: Works seamlessly on both iOS and Android
- ⚡ **Nitro Modules**: High-performance native bridge with minimal overhead
- 🎯 **TypeScript First**: Full TypeScript support with comprehensive type definitions
- 🛡️ **Centralized Error Handling**: Unified error management with platform-specific error code mapping
- 🎣 **React Hooks**: Modern React hooks API with `useIAP`
- 📱 **Expo Compatible**: Works with Expo development builds
- 🔍 **Receipt Validation**: Built-in receipt validation for both platforms
- 💎 **Products & Subscriptions**: Support for both one-time purchases and subscriptions
- 🚀 **Performance Optimized**: Efficient caching and minimal re-renders

## 🚀 Quick Start

```bash
npm install react-native-iap react-native-nitro-modules
# or
yarn add react-native-iap react-native-nitro-modules
```

**[📖 See the complete installation guide and quick start tutorial →](https://hyochan.github.io/react-native-iap/docs/installation)**

## 🏗️ Architecture

React Native IAP is built with a modern architecture that emphasizes:

- **Nitro Modules**: High-performance native bridge with C++ core and platform-specific implementations
- **Type Safety**: Comprehensive TypeScript definitions for all APIs
- **Error Resilience**: Centralized error handling with meaningful error codes
- **Platform Abstraction**: Unified API that handles platform differences internally
- **Performance**: Optimized for minimal bundle size and runtime performance

## 📱 Platform Support

| Platform          | Support | Notes                                   |
| ----------------- | ------- | --------------------------------------- |
| iOS               | ✅      | StoreKit 2 (requires iOS 15+)           |
| Android           | ✅      | Google Play Billing v8.0.0+             |
| Expo Go           | ❌      | Not supported (requires native modules) |
| Expo Dev Client   | ✅      | Full support                            |
| Bare React Native | ✅      | Full support                            |

## 📦 Installation & Configuration

### Prerequisites

Before installing React Native IAP, make sure you have:

- React Native 0.64 or later, or Expo SDK 45 or later
- Node.js 16 or later
- iOS 15+ for iOS apps (StoreKit 2 requirement)
- Android API level 21+ for Android apps

### Post Installation

#### Android Configuration

**Kotlin Version Requirement:** This library requires Kotlin 2.0+. Configure your project's Kotlin version:

In your root `android/build.gradle`:

```gradle
buildscript {
    ext {
        kotlinVersion = "2.1.20"
    }
    dependencies {
        classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion"
    }
}
```

#### iOS Configuration

1. **Install pods**:

   ```bash
   cd ios && pod install
   ```

2. **Add StoreKit capability** to your iOS app in Xcode:
   - Open your project in Xcode
   - Select your app target
   - Go to "Signing & Capabilities"
   - Click "+ Capability" and add "In-App Purchase"

#### Expo Configuration

For Expo projects, add the plugin to your `app.json` or `expo.json`:

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

**Note:** Expo projects require [development build (dev-client)](https://docs.expo.dev/develop/development-builds/introduction/) as this library contains native code.

### Store Configuration

React Native IAP is **OpenIAP compliant**. For detailed store configuration:

- **[iOS Setup →](https://www.openiap.dev/docs/ios-setup)** - App Store Connect configuration
- **[Android Setup →](https://www.openiap.dev/docs/android-setup)** - Google Play Console configuration

## 🤖 Using with AI Assistants

React Native IAP provides AI-friendly documentation for Cursor, GitHub Copilot, Claude, and ChatGPT.

**[📖 AI Assistants Guide →](https://hyochan.github.io/react-native-iap/docs/guides/ai-assistants)**

Quick links:

- [llms.txt](https://hyochan.github.io/react-native-iap/llms.txt) - Quick reference
- [llms-full.txt](https://hyochan.github.io/react-native-iap/llms-full.txt) - Full API reference

## 🎯 What's Next?

**[📖 Visit our comprehensive documentation site →](https://hyochan.github.io/react-native-iap)**

### Key Resources

- **[Installation & Quick Start](https://hyochan.github.io/react-native-iap/docs/installation)** - Get started in minutes
- **[API Reference](https://hyochan.github.io/react-native-iap/docs/api)** - Complete useIAP hook documentation
- **[Examples](https://hyochan.github.io/react-native-iap/docs/examples/basic-store)** - Production-ready implementations
- **[Error Handling](https://hyochan.github.io/react-native-iap/docs/api/error-codes)** - OpenIAP compliant error codes
- **[Troubleshooting](https://hyochan.github.io/react-native-iap/docs/guides/troubleshooting)** - Common issues and solutions

## Powered by OpenIAP

<a href="https://openiap.dev"><img src="https://github.com/hyodotdev/openiap/blob/main/logo.png" alt="OpenIAP" height="50" /></a>

React Native IAP conforms to the **[OpenIAP specification](https://openiap.dev)** — an open, vendor-neutral interoperability standard for in-app purchases. OpenIAP provides:

- **Shared specification** — Common types, error codes, and purchase flows across all platforms
- **Generated type-safe bindings** — Swift, Kotlin, Dart, and GDScript from a single GraphQL schema
- **Platform implementations** — [openiap-apple](https://github.com/hyodotdev/openiap/tree/main/packages/apple) (StoreKit 2) and [openiap-google](https://github.com/hyodotdev/openiap/tree/main/packages/google) (Play Billing 8.x)
- **Verification profiles** — Standardized receipt validation and purchase verification patterns

Other libraries built on OpenIAP: [expo-iap](https://github.com/hyochan/expo-iap) · [flutter_inapp_purchase](https://github.com/hyochan/flutter_inapp_purchase) · [kmp-iap](https://github.com/hyochan/kmp-iap) · [godot-iap](https://github.com/hyochan/godot-iap)

**[Learn more about the OpenIAP standard →](https://openiap.dev/docs/foundation/about)**

## Sponsors

💼 **[View Our Sponsors](https://openiap.dev/sponsors)**

### <p style="color: rgb(255, 182, 193);">Angel</p>

<a href="https://meta.com">
    <img width="600" alt="courier_dot_com" src="https://static.xx.fbcdn.net/rsrc.php/y3/r/y6QsbGgc866.svg" />
</a>

## Past Supporters

<div style="display: flex; align-items:center; gap: 10px;">
  <a href="https://namiml.com" style="opacity: 50%">
    <img src="https://github.com/hyochan/react-native-iap/assets/27461460/89d71f61-bb73-400a-83bd-fe0f96eb726e" alt="Nami ML" width="140"/>
  </a>
  <a href="https://www.courier.com/?utm_source=react-native-iap&utm_campaign=osssponsors" style="opacity: 50%;">
    <img width="80" alt="courier_dot_com" src="https://github.com/user-attachments/assets/319d8966-6839-498d-8ead-ce8cc72c3bca" />
  </a>
</div>

Support this project by becoming a sponsor. Your logo will show up here with a link to your website. [Buy me a coffee](https://www.buymeacoffee.com/hyochan).

---

### OpenCollective Sponsorship

We also manage sponsorships through OpenCollective, which operates separately from our main sponsor program.

**Sponsors:** <a href="https://opencollective.com/react-native-iap#sponsors" target="_blank"><img src="https://opencollective.com/react-native-iap/sponsors.svg?width=890" /></a>

**Backers:** <a href="https://opencollective.com/react-native-iap#backers" target="_blank"><img src="https://opencollective.com/react-native-iap/backers.svg?width=890" /></a>

[Become a sponsor](https://opencollective.com/react-native-iap#sponsor) | [Become a backer](https://opencollective.com/react-native-iap#backer)

## Contributing

<a href="graphs/contributors"><img src="https://opencollective.com/react-native-iap/contributors.svg?width=890" /></a>

See our [Contributing Guide](./CONTRIBUTING.md) for development setup and guidelines.
