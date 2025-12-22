---
id: subscription-validation
title: Subscription Validation
sidebar_label: Subscription Validation
description: Understand how React Native IAP surfaces StoreKit 2 subscription data, from getAvailablePurchases to the StoreKit status API.
---

import IapKitBanner from "@site/src/uis/IapKitBanner";

<IapKitBanner />

React Native IAP exposes modern StoreKit&nbsp;2 (iOS) and Google Play Billing (Android) pipelines. This guide walks through the data that is available on the JavaScript side, how it maps to the underlying native APIs, and practical strategies to answer common lifecycle questions such as _"is the user currently inside their free trial?"_

> iOS and Android share the same high-level API surface, but individual capabilities differ. Notes in each section call out platform-specific behaviour—for example, `subscriptionStatusIOS` only exists on Apple platforms, whereas Android relies on Purchase objects and the Play Developer API.

## Summary of key surfaces

| Capability | API | iOS | Android |
| --- | --- | --- | --- |
| Fetch latest entitlement records the store still considers active | [`getAvailablePurchases`](../api/methods/core-methods.md#getavailablepurchases) | Wraps StoreKit&nbsp;2 `Transaction.currentEntitlements`; optional flags control listener mirror & active-only filtering | Queries Play Billing twice (`inapp` + `subs`) and merges validated purchases, exposing `purchaseToken` for server use |
| Filter entitlements down to subscriptions only | [`getActiveSubscriptions`](../api/methods/core-methods.md#getactivesubscriptions) | Adds `expirationDateIOS`, `daysUntilExpirationIOS`, `environmentIOS` convenience fields | Re-shapes merged purchase list and surfaces `autoRenewingAndroid`, `purchaseToken`, and `willExpireSoon` placeholders |
| Inspect fine-grained subscription phase | [`subscriptionStatusIOS`](../api/methods/core-methods.md#subscriptionstatusios) | StoreKit&nbsp;2 status API (`inTrialPeriod`, `inGracePeriod`, etc.) | _Not available_; pair `getAvailablePurchases` with Play Developer API (`purchases.subscriptions`/`purchases.products`) for phase data |
| Retrieve receipts for validation | [`getReceiptDataIOS`](../api/methods/core-methods.md#getreceiptdataios), [`validateReceipt`](../api/methods/core-methods.md#validatereceiptios) | Provides App Store receipt / JWS for backend validation | `validateReceipt` forwards to OpenIAP’s Google Play validator and expects `purchaseToken` / `packageName` |

## Working with `getAvailablePurchases`

`getAvailablePurchases` returns every purchase that the native store still considers _active_ for the signed-in user.

- **iOS** — The library bridges directly to StoreKit 2’s `Transaction.currentEntitlements`, so each item is a fully validated `PurchaseIOS`. Optional flags (`onlyIncludeActiveItemsIOS`, `alsoPublishToEventListenerIOS`) are forwarded to StoreKit and mimic the native behaviour.
- **Android** — Google Play Billing keeps one list for in-app products and another for subscriptions. The React Native IAP wrapper automatically queries both (`type: 'inapp'` and `type: 'subs'`), merges the results, and validates them before returning control to JavaScript.

Because the data flows through the same validation pipeline as the purchase listeners, every element in the array has the same shape you receive when a new transaction comes in.

```tsx
import {useEffect} from 'react';
import {useIAP} from 'react-native-iap';

export function SubscriptionGate({subscriptionId}: {subscriptionId: string}) {
  const {getAvailablePurchases, availablePurchases} = useIAP();

  useEffect(() => {
    getAvailablePurchases([subscriptionId]);
  }, [getAvailablePurchases, subscriptionId]);

  const active = availablePurchases.some(
    (purchase) => purchase.productId === subscriptionId,
  );

  // ...render locked/unlocked UI...
}
```

### Data included

For each purchase you can inspect fields such as:

- `expirationDateIOS`: milliseconds since epoch when the current period expires
- `isAutoRenewing`: whether auto-renew is still enabled
- `offerIOS`: original offer metadata (`paymentMode`, `period`, etc.)
- `environmentIOS`: `Sandbox` or `Production`

### Limitations

StoreKit does **not** bake "current phase" indicators into these records—`offerIOS.paymentMode` tells you which introductory offer was used initially, but does not tell you whether the user is still inside that offer window. To answer questions like "is the user still in a free trial?" you need either the StoreKit status API or server-side receipt validation.

## Using `getActiveSubscriptions`

[`getActiveSubscriptions`](../api/methods/core-methods.md#getactivesubscriptions) is a thin helper that filters `getAvailablePurchases` down to subscription products. It returns an array of `ActiveSubscription` objects with convenience fields:

- `isActive`: always `true` as long as the subscription remains in the current entitlement set
- `expirationDateIOS` & `daysUntilExpirationIOS`: surfaced directly from StoreKit
- `transactionId` / `purchaseToken`: handy for reconciling with receipts or Play Billing
- `willExpireSoon`: flag set by the helper when the subscription is within its grace window
- `autoRenewingAndroid`: reflects the Google Play auto-renew status for subscriptions
- `environmentIOS`: tells you whether the entitlement came from `Sandbox` or `Production`

The helper does **not** fetch additional metadata beyond what `getAvailablePurchases` already provides. It exists to make stateful hooks easier to consume.

> **Platform note:** On iOS the helper simply re-shapes the StoreKit 2 entitlement objects. On Android it operates on the merged `inapp` + `subs` purchase list returned by Play Billing, so the output always contains both one-time products and subscriptions unless you pass specific product IDs.

```ts
import {getActiveSubscriptions} from 'react-native-iap';

const active = await getActiveSubscriptions(['your.yearly.subscription']);
if (active.length === 0) {
  // user has no valid subscription
}
```

### Deriving a lightweight phase without `subscriptionStatusIOS`

If you want a coarse subscription phase that works the same way on iOS and Android, you can compute it from the entitlement cache that backs `getActiveSubscriptions`.

```ts
import {getActiveSubscriptions} from 'react-native-iap';

const MS_IN_DAY = 1000 * 60 * 60 * 24;
const GRACE_WINDOW_DAYS = 3;

type DerivedPhase = 'subscribed' | 'expiringSoon' | 'expired';

export async function getCurrentPhase(sku: string): Promise<DerivedPhase> {
  const subscriptions = await getActiveSubscriptions([sku]);
  const entry = subscriptions.find((sub) => sub.productId === sku);

  if (!entry) {
    return 'expired';
  }

  const now = Date.now();
  const expiresAt = entry.expirationDateIOS ?? null;

  if (
    typeof entry.daysUntilExpirationIOS === 'number' &&
    entry.daysUntilExpirationIOS <= 0
  ) {
    return 'expired';
  }

  if (expiresAt && expiresAt <= now) {
    return 'expired';
  }

  const graceWindowMs = GRACE_WINDOW_DAYS * MS_IN_DAY;
  if (
    (expiresAt && expiresAt - now <= graceWindowMs) ||
    (typeof entry.daysUntilExpirationIOS === 'number' &&
      entry.daysUntilExpirationIOS * MS_IN_DAY <= graceWindowMs) ||
    entry.autoRenewingAndroid === false
  ) {
    return 'expiringSoon';
  }

  return 'subscribed';
}
```

> Tweak `GRACE_WINDOW_DAYS` (or add additional checks such as `willExpireSoon`) to match how your product defines "grace period". For Android plans you can also look at `autoRenewingAndroid` and the Play Developer API for richer state.

## StoreKit 2 status API (`subscriptionStatusIOS`)

When you need to know the exact lifecycle phase, call [`subscriptionStatusIOS`](../api/methods/core-methods.md#subscriptionstatusios). This maps to StoreKit&nbsp;2's `Product.SubscriptionInfo.Status` API and returns an array of status entries for the subscription group. Each `status.state` comes through as a string so you can forward unknown values to your analytics or logging when Apple adds new phases.

```ts
import {subscriptionStatusIOS} from 'react-native-iap';

const statuses = await subscriptionStatusIOS('your.yearly.subscription');
const latestState = statuses[0]?.state ?? 'unknown';
```

### Phase reference

| `state` value | Meaning |
| --- | --- |
| `subscribed` | Subscription is active and billing is up to date |
| `expired` | Subscription is no longer active |
| `inGracePeriod` | Auto-renewal failed but StoreKit granted a grace period before suspending access |
| `inBillingRetryPeriod` | Auto-renewal failed and StoreKit is retrying the payment method |
| `revoked` | Apple revoked the subscription (for example, due to customer support refunds) |
| `inIntroOfferPeriod` | User is currently inside a paid introductory offer (e.g., pay upfront or pay-as-you-go) |
| `inTrialPeriod` | User is currently in the free-trial window |
| `paused` | Subscription manually paused by the user (where supported) |

### Relationship with other APIs

- Use `getActiveSubscriptions` (or the helper shown above) to keep your UI in sync with entitlement data across both platforms, then enhance it with `subscriptionStatusIOS` when you need the StoreKit-specific phase strings.
- `latestTransactionIOS` returns the full `Purchase` object tied to the most recent status entry—useful when storing transaction IDs on your backend.
- `currentEntitlementIOS` shortcuts to the single entitlement for a SKU if you do not need the full array.

## Server-side validation and trials

If you already maintain a server, Apple’s `/verifyReceipt` endpoint exposes flags like `is_trial_period` and `is_in_intro_offer_period` for each transaction in the receipt (see Apple’s [Latest Receipt Info](https://developer.apple.com/documentation/appstorereceipts/responsebody/latest_receipt_info) documentation). React Native IAP’s `validateReceipt` API does **not** merge iOS and Android fields into a single structure; it returns platform-specific payloads:

- **iOS (`ReceiptValidationResultIOS`)** – Includes `isValid`, `receiptData`, `jwsRepresentation`, and an optional `latestTransaction` converted to the shared `Purchase` shape. You must parse the Base64 `receiptData` on your server (or call `/verifyReceipt`) to inspect `is_trial_period` and similar flags.
- **Android (`ReceiptValidationResultAndroid`)** – Mirrors Google Play’s server response with fields such as `autoRenewing`, `expiryTimeMillis`, `purchaseDate`, `productId`, and `raw receipt` metadata (`term`, `termSku`, etc.).

Because the library simply forwards the underlying store data, any additional aggregation (for example, emitting a unified object that contains both Apple transaction fields and the raw Play Billing response) must be performed in your own backend.

We recommend the following layering:

1. Use `subscriptionStatusIOS` for fast, on-device checks when UI needs to react immediately.
2. Periodically upload receipts (via [`getReceiptDataIOS`](../api/methods/core-methods.md#getreceiptdataios)) to your backend for authoritative validation and entitlement provisioning.
3. Recalculate client caches (`getAvailablePurchases`) after server reconciliation to ensure consistency across devices.

## Putting everything together

A typical subscription screen in React Native IAP might:

1. Call `initConnection` and `fetchProducts` when mounted.
2. Use `useIAP` to observe purchase updates and update local state.
3. Fetch `getAvailablePurchases` on launch to restore entitlements.
4. Query `subscriptionStatusIOS` to display whether the user is inside a trial or grace period.
5. Sync receipts to your server to unlock cross-device access.

By combining these surfaces you can offer a reliable experience that embraces StoreKit&nbsp;2’s richer metadata while preserving backwards compatibility with existing server flows.
