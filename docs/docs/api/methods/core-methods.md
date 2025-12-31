---
title: Core Methods
sidebar_label: Core Methods
sidebar_position: 1
---

import IapKitBanner from "@site/src/uis/IapKitBanner";

# Core Methods

<IapKitBanner />

This section covers the core methods available in react-native-iap for managing in-app purchases.

Note: react-native-iap aligns with the OpenIAP API surface. For canonical cross-SDK API docs, see:

- [OpenIAP APIs](https://www.openiap.dev/docs/apis)

## API Categories

### [Unified APIs](./unified-apis)

Cross‑platform methods that work on both iOS and Android:

- `initConnection()` — Initialize the store connection
- `endConnection()` — End the store connection and cleanup
- `fetchProducts()` — Fetch product and subscription metadata
- `requestPurchase()` — Start a purchase for products or subscriptions
- `finishTransaction()` — Complete a transaction after validation
- `getAvailablePurchases()` — Restore non‑consumables and subscriptions
- `deepLinkToSubscriptions()` — Open native subscription management UI
- `getStorefront()` — Get current storefront country code
- `hasActiveSubscriptions()` — Check if user has active subscriptions
- `verifyPurchaseWithProvider()` — Verify purchase with external provider (e.g., IAPKit)

### [Listeners](./listeners)

Event listeners for purchase updates and errors:

- `purchaseUpdatedListener` — Listen for successful purchases
- `purchaseErrorListener` — Listen for purchase errors
- `promotedProductListener` — Listen for promoted products (iOS)

### [iOS Specific](./ios-specific)

StoreKit and App Store specific capabilities:

**Alternative Billing (iOS 16.0+):**

- `canPresentExternalPurchaseNoticeIOS()` — Check if notice sheet is available (iOS 18.2+)
- `presentExternalPurchaseNoticeSheetIOS()` — Present external purchase notice (iOS 18.2+)
- `presentExternalPurchaseLinkIOS()` — Open external purchase link (iOS 16.0+)

**Transaction Management:**

- `clearTransactionIOS()` — Clear pending transactions
- `getPromotedProductIOS()` — Get promoted product
- `getPendingTransactionsIOS()` — Get pending transactions
- `subscriptionStatusIOS()` — Get subscription status
- `currentEntitlementIOS()` — Get current entitlement
- `showManageSubscriptionsIOS()` — Show subscription management
- `beginRefundRequestIOS()` — Request refund
- And more...

### [Android Specific](./android-specific)

Google Play Billing specific capabilities:

**Alternative Billing:**

- `checkAlternativeBillingAvailabilityAndroid()` — Check if alternative billing is available
- `showAlternativeBillingDialogAndroid()` — Show required information dialog
- `createAlternativeBillingTokenAndroid()` — Generate reporting token

**Purchase Management:**

- `acknowledgePurchaseAndroid()` — Acknowledge non-consumable purchases
- `consumePurchaseAndroid()` — Consume consumable purchases

## Removed APIs

- `requestProducts()` — Removed in v3.0.0. Use `fetchProducts({ skus, type })` instead.
