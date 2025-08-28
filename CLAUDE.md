# CLAUDE.md

## Project Overview

React Native Nitro IAP - A high-performance in-app purchase library using Nitro Modules

## Key Technologies

- React Native
- Nitro Modules (Native bridge)
- TypeScript
- Swift (iOS with StoreKit 2)
- Kotlin (Android with Google Play Billing v8.0.0)

## Project Structure

```sh
src/
├── index.tsx           # Main exports and API
├── Iap.nitro.ts       # Nitro interface definitions (native bridge)
├── IapTypes.nitro.ts  # TypeScript type definitions
├── useIap.ts          # React hook for IAP management
├── modules/
│   ├── ios.ts         # iOS-specific functions and exports
│   └── android.ts     # Android-specific functions and exports
└── utils/
    └── errorMapping.ts # Error handling utilities

ios/
└── Iap.swift          # iOS native implementation (StoreKit 2)

android/
└── src/main/java/com/margelo/nitro/iap/
    └── Iap.kt         # Android native implementation (Play Billing v8.0.0)
```

## Architecture Guidelines

### Module Organization

1. **Iap.nitro.ts** - Native Bridge Interface
   - Contains the Nitro interface definition that bridges to native code
   - Includes ALL native method declarations (both common and platform-specific)
   - This is the contract between TypeScript and native implementations
   - Platform-specific methods must be declared here for native access

2. **modules/ios.ts** - iOS TypeScript Exports
   - Contains iOS-specific TypeScript wrapper functions
   - Exports iOS-only functionality with proper Platform.OS checks
   - Provides iOS-suffixed function names (e.g., `getStorefrontIOS`)
   - Includes deprecated aliases for backward compatibility

3. **modules/android.ts** - Android TypeScript Exports
   - Contains Android-specific TypeScript wrapper functions
   - Exports Android-only functionality with proper Platform.OS checks
   - Provides Android-suffixed function names (e.g., `consumeProductAndroid`)

4. **index.tsx** - Main API Surface
   - Re-exports all public APIs from platform modules
   - Provides common functionality that works on both platforms
   - Manages event listeners and module initialization
   - Should NOT contain duplicate implementations of platform-specific functions

### Important Notes

- Platform-specific native methods MUST be declared in `Iap.nitro.ts` for the native bridge to work
- TypeScript wrappers for platform-specific methods should be in their respective platform files
- Always use Platform.OS checks in platform-specific functions
- Maintain API compatibility with expo-iap for seamless migration

## Coding Standards

### Commit Message Convention

- **With tag**: Use lowercase after tag (e.g., `feat: add new feature`, `fix: resolve bug`)
- **Without tag**: Start with uppercase (e.g., `Add new feature`, `Fix critical bug`)
- Common tags: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`

### Code Style

- ESLint configuration from expo-iap
- Prettier for code formatting
- TypeScript with strict mode
- Use type-only imports when importing types (`import type`)

### Testing Commands

- `yarn typecheck` - Run TypeScript type checking
- `yarn lint` - Run ESLint
- `yarn lint --fix` - Auto-fix linting issues

## CI Checks (Run Before Committing)

**IMPORTANT**: Always run these checks locally before committing to avoid CI failures:

1. **Install Dependencies**

   ```bash
   yarn install
   ```

2. **TypeScript Check**

   ```bash
   yarn typecheck
   # or
   yarn tsc --noEmit
   ```

3. **Linting**

   ```bash
   yarn lint --fix
   ```

4. **Run All Checks**

   ```bash
   # Run all checks in sequence
   yarn install && yarn tsc --noEmit && yarn lint --fix
   ```

### Common CI Fixes

- TypeScript errors: Ensure all types are properly imported and match expo-iap API
- Linting errors: Use `yarn lint --fix` to auto-fix formatting issues
- Unused imports: Remove unused React imports (React 17+ doesn't need explicit import)
- Type mismatches: Use type assertions when needed for platform-specific code

## API Compatibility

This library maintains 100% API compatibility with expo-iap, ensuring seamless migration. All functions available in expo-iap are also available in react-native-iap with identical signatures and behavior.

## Platform-Specific Features

### iOS (StoreKit 2)

- Subscription management
- Promotional offers
- Family sharing
- Refund requests
- Transaction verification
- Receipt validation

### Android (Play Billing v8.0.0)

- Multiple SKU purchases
- Subscription offers
- Obfuscated account/profile IDs
- Purchase acknowledgment
- Product consumption

## Development Guidelines

- Always run `yarn typecheck` and `yarn lint` before committing
- Maintain API compatibility with expo-iap
- Use Platform.OS checks for platform-specific code
- Handle errors gracefully with proper error codes

## Development Setup

### Package Manager

- **MUST use Yarn** for all dependency management (this is a Yarn workspace project)
- Never use npm or other package managers
- Yarn workspace configuration in root package.json

### Example App

- Located in `/example` folder
- Uses Expo Router for navigation
- Yarn workspace name: `IapExample`
- Run example: `yarn workspace IapExample start` from root

### Installation Commands

```bash
# Install all dependencies (root + example)
yarn install

# Run example app
yarn example start

# Clean install
rm -rf node_modules example/node_modules yarn.lock && yarn install
```

### Bundle Identifiers

- Android package: `dev.hyo.martie`
- iOS bundle identifier: `dev.hyo.martie`
