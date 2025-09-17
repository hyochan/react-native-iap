# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Breaking

- JS: `useIAP` no longer returns `currentPurchase`, `currentPurchaseError`, or the associated clear helpers; consumers should rely on the `onPurchaseSuccess` / `onPurchaseError` callbacks moving forward.

## [14.3.5]

### Changed

- Android: Upgrade the fallback/config plugin to [openiap-google 1.1.10](https://github.com/hyodotdev/openiap-google/releases/tag/1.1.10) to stay current with the latest Billing integration guidance.
- iOS: Bump the pod to [openiap 1.1.12](https://github.com/hyodotdev/openiap-apple/releases/tag/1.1.12) and adopt PascalCase error constants in the native layer for consistent casing across platforms.

### Fixed

- Android: Restore the explicit `Failed to initialize connection` error message when the billing client rejects `initConnection()` so logs stay actionable.
- Android: Preserve receipt validation context for unexpected failures and avoid leaking purchase tokens in acknowledge/consume error payloads.

## [14.3.3]

### Changed

- JS: Streamline `requestPurchase` parameter handling, emit development warnings when the wrong request shape is supplied, and remove the legacy `request` fallback.
- JS: Warn when the bridge encounters an unknown iOS product type to highlight schema mismatches sooner.
- Build: Adopt [openiap-gql 1.0.0](https://github.com/hyodotdev/openiap-gql/releases/tag/1.0.0) for the transport layer to stay aligned with the GraphQL contract shipped across the ecosystem.

### Fixed

- JS: Normalize native error codes (including US/UK spelling) so cancellation flows and init‑connection guards behave like earlier releases.
- Helpers: Align Active Subscription expiration fields with generated types (`null` instead of missing `Date`) to keep downstream consumers consistent.

## [14.3.2]

### Fixed

- JS: Guard Nitro HybridObject creation with try/catch and remove `isRuntimeAlive` import to stabilize CI/Jest and avoid "not a function" errors.

### Added

- Plugin (Expo): Optional iOS Podfile workaround to disable Folly coroutines via `"with-folly-no-couroutines": true`.

### Changed

- Docs: Restore installation note for the Folly workaround and remove a local Docusaurus type shim to avoid duplicate type declarations.

## [14.3.1]

### Added

- Examples: Add “Manage Subscriptions” buttons in SubscriptionFlow and AvailablePurchases (opens native subscription management via cross‑platform deeplink)
- Examples: Allow tapping purchased items to open a details modal

### Changed

- Docs: Clarify event‑driven request model and why `request*` APIs do not resolve with results; add FAQ about transient iOS success→error timing and suggested debounce
- Docs: Prefer `purchase.id` terminology in examples and guides; continue to recommend `purchaseToken` for server validation
- Examples: Redact sensitive fields in logs and modals (no `transactionReceipt`/full `purchaseToken` shown)

### Fixed

- iOS: Sanitize purchase error payload so `purchaseToken` does not carry product identifiers in error events; keep internal deduplication based on SKU
- Examples/Tests: Align transaction row with `purchase.id`; update tests accordingly
- iOS: Fix crash on startup by lazily initializing the IAP module (Nitro HybridObject created on demand)

- Remove any references to `purchase.transactionReceipt`, `purchase.transactionReceiptIOS`, and `purchase.purchaseTokenAndroid`

## [14.3.0]

### Added

- JS: `getStorefront()` and `deepLinkToSubscriptions()` helpers for unified storefront lookup and opening native subscription management.

### Changed

- Android: Bump to OpenIAP Google 1.1.0 and align init behavior/field mapping with the OpenIAP spec.
- Docs/Examples: Migrate guidance from `transactionReceipt` to the unified `purchaseToken`.
  - `purchase.purchaseToken` is now the recommended value for server validation on both platforms
  - iOS: `purchaseToken` contains the JWS (StoreKit 2). The App Receipt (`transactionReceipt`) remains available for legacy flows
  - Android: `transactionReceipt` is no longer populated; use `purchaseToken`

### Fixed

- Android: Address potential `init` race and improve error propagation for clearer failures.
- iOS: Add temporary stubs to keep Nitro/iOS in sync with the JS spec (no runtime behavior change).

## [14.2.3]

### Fixed

- Android: add `offerTags` and fix `pricingPhases` in `subscriptionOfferDetails` (#2998)

### Chore

- iOS: enforce iOS 15+ in podspec
- Lint: format files to sync with `.vscode` and Prettier
- ESLint: avoid `.` import in config

## [14.2.2]

### Changed

- iOS: Upgrade OpenIAP to `~> 1.1.9` (StoreKit 2 stability and error model improvements)
- iOS: Purchase flow is event‑only; add de‑duplication for error events to avoid double popups
- Examples: Guard `finishTransaction` until connected and add short delayed retry
- Examples: Normalize cancel handling with a single cancel popup

### Fixed

- iOS: Ensure synchronous errors during `requestPurchase` still surface via purchase error event (with lightweight de‑dup)
- iOS: Include original error message in receipt failures for better diagnostics

## [14.2.0]

### Changed

- iOS: Make `initConnection()` idempotent and non‑blocking; propagate failures via `E_INIT_CONNECTION`
- iOS: Bump OpenIAP to `~> 1.1.8`
- Android: Ship consumer R8 keep rules for Nitro classes
- CI: Use vendored Yarn to avoid Corepack issues
- Examples: Stabilize purchase/subscription flows and tests

## [14.1.1]

### Fixed

- iOS: Fetch missing products from StoreKit when not cached in ProductStore

## [14.1.0]

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
