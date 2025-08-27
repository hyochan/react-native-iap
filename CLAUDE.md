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

```
src/
├── index.tsx           # Main exports and API
├── Iap.nitro.ts       # Nitro interface definitions
├── IapTypes.nitro.ts  # TypeScript type definitions
├── useIap.ts          # React hook for IAP management
├── modules/
│   ├── ios.ts         # iOS-specific functions
│   └── android.ts     # Android-specific functions
└── utils/
    └── errorMapping.ts # Error handling utilities

ios/
└── Iap.swift          # iOS native implementation (StoreKit 2)

android/
└── src/main/java/com/margelo/nitro/iap/
    └── Iap.kt         # Android native implementation (Play Billing v8.0.0)
```

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

This library maintains 100% API compatibility with expo-iap, ensuring seamless migration.

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

## Important Notes

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
