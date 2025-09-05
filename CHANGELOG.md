# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [14.1.0] - Unreleased

### Changed

- **BREAKING**: Renamed all platform-specific fields to include platform suffix for clarity
  - iOS fields now end with `IOS` (e.g., `isFamilyShareable` → `isFamilyShareableIOS`)
  - Android fields now end with `Android` (e.g., `originalPrice` → `originalPriceAndroid`)
  - **DEPRECATED**: `autoRenewingAndroid` field - use common `isAutoRenewing` field instead
- **BREAKING**: `showManageSubscriptionsIOS()` now returns `Promise<NitroPurchase[]>` instead of `Promise<boolean>`
- **BREAKING**: `validateReceipt()` method signature has changed:
  - Now takes a single `NitroReceiptValidationParams` object instead of separate parameters
  - Returns platform-specific validation result types (`NitroReceiptValidationResultIOS` or `NitroReceiptValidationResultAndroid`)
  - Example: `validateReceipt({ sku, androidOptions: {...} })`
- Added common purchase fields: `quantity`, `purchaseState`, `isAutoRenewing` for cross-platform consistency

### Added

- New `ProductTypeIOS` enum for detailed iOS product categorization
- New `PurchaseState` enum for unified purchase status handling
- `typeIOS` field for iOS-specific product type information

### Improved

- Type safety with clear platform-specific field naming
- Cross-platform consistency with common fields
- Better TypeScript intellisense and autocompletion
- iOS: `isAutoRenewing` now uses renewal info when available for more accurate status
- Android: Consistent use of `MICROS_PER_UNIT` constant for price calculations

## [14.0.1] - 2025-09-03

### Fixed

- Fixed npm publish to include required build files
- Fixed CI test execution and improved test stability
- Fixed example-expo Nitro module registration

## [14.0.0] - Previous Release

### Changed

- Migration to Nitro Modules for improved performance and type safety
- Complete rewrite of native iOS and Android implementations
- New TypeScript-first API design

---

For older versions, please refer to the releases page on GitHub.
