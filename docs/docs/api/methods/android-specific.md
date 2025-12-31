---
title: Android Specific
sidebar_label: Android Specific
sidebar_position: 5
---

import IapKitBanner from "@site/src/uis/IapKitBanner";

# Android Specific APIs

<IapKitBanner />

The following Android‑only helpers expose Google Play Billing specific capabilities. Most day‑to‑day flows are covered by the cross‑platform [Unified APIs](./unified-apis); use these only when you need Android-specific features.

## Billing Programs API (8.2.0+)

New in Google Play Billing Library 8.2.0, the Billing Programs API provides a unified way to handle external billing programs:

- [`isBillingProgramAvailableAndroid()`](#isbillingprogramavailableandroid) — Check if a billing program is available
- [`launchExternalLinkAndroid()`](#launchexternallinkandroid) — Launch external link for billing programs
- [`createBillingProgramReportingDetailsAndroid()`](#createbillingprogramreportingdetailsandroid) — Get reporting token

### isBillingProgramAvailableAndroid()

Check if a specific billing program is available for the current user.

```ts
import {isBillingProgramAvailableAndroid} from 'react-native-iap';

const result = await isBillingProgramAvailableAndroid('external-offer');
if (result.isAvailable) {
  console.log('External offer program is available');
} else {
  console.log('External offer program not available for this user');
}
```

**Parameters:**

- `program` (`BillingProgramAndroid`): The billing program to check
  - `'external-offer'` - External offer programs
  - `'external-content-link'` - External content link programs
  - `'external-payments'` - External payments program (Japan only, 8.3.0+)

**Returns:** `Promise<BillingProgramAvailabilityResultAndroid>`

```ts
interface BillingProgramAvailabilityResultAndroid {
  billingProgram: BillingProgramAndroid;
  isAvailable: boolean;
}
```

**Platform:** Android 8.2.0+

### launchExternalLinkAndroid()

Launch an external link for the specified billing program. This opens the external purchase flow.

```ts
import {launchExternalLinkAndroid} from 'react-native-iap';

await launchExternalLinkAndroid({
  billingProgram: 'external-offer',
  launchMode: 'launch-in-external-browser-or-app',
  linkType: 'link-to-digital-content-offer',
  linkUri: 'https://your-payment-site.com/offer',
});
```

**Parameters:**

- `params` (`LaunchExternalLinkParamsAndroid`):
  - `billingProgram`: The billing program type
  - `launchMode`: How to launch the external link
    - `'launch-in-external-browser-or-app'` - Launch in external browser
    - `'caller-will-launch-link'` - App will handle launching
  - `linkType`: The type of external link
    - `'link-to-digital-content-offer'` - Digital content offer
    - `'link-to-app-download'` - App download link
  - `linkUri`: The URI to launch

**Returns:** `Promise<void>`

**Platform:** Android 8.2.0+

### createBillingProgramReportingDetailsAndroid()

Get the external transaction token for reporting transactions made outside of Google Play.

```ts
import {createBillingProgramReportingDetailsAndroid} from 'react-native-iap';

const details = await createBillingProgramReportingDetailsAndroid('external-offer');
console.log('Token:', details.externalTransactionToken);

// Report this token to Google Play within 24 hours
await reportToGooglePlayBackend(details.externalTransactionToken);
```

**Parameters:**

- `program` (`BillingProgramAndroid`): The billing program type

**Returns:** `Promise<BillingProgramReportingDetailsAndroid>`

```ts
interface BillingProgramReportingDetailsAndroid {
  billingProgram: BillingProgramAndroid;
  externalTransactionToken: string;
}
```

**Platform:** Android 8.2.0+

**Important:**

- Token must be reported to Google Play backend within 24 hours
- Requires server-side integration with Google Play Developer API
- Failure to report will result in refund and possible account suspension

### Complete Billing Programs Flow Example

```ts
import {
  isBillingProgramAvailableAndroid,
  launchExternalLinkAndroid,
  createBillingProgramReportingDetailsAndroid,
} from 'react-native-iap';

async function purchaseWithBillingProgram(productId: string) {
  // Step 1: Check availability
  const availability = await isBillingProgramAvailableAndroid('external-offer');
  if (!availability.isAvailable) {
    throw new Error('External offer program not available');
  }

  // Step 2: Launch external link
  await launchExternalLinkAndroid({
    billingProgram: 'external-offer',
    launchMode: 'launch-in-external-browser-or-app',
    linkType: 'link-to-digital-content-offer',
    linkUri: `https://your-payment-site.com/purchase/${productId}`,
  });

  // Step 3: After payment completes, get reporting token
  const details = await createBillingProgramReportingDetailsAndroid('external-offer');

  // Step 4: Report to Google (must be done within 24 hours)
  await reportToGooglePlayBackend(details.externalTransactionToken, productId);

  return {success: true, token: details.externalTransactionToken};
}
```

**See also:**

- [Google Play Billing Programs](https://developer.android.com/google/play/billing/billing-programs)
- [Alternative Billing Example](/docs/examples/alternative-billing)

---

## Alternative Billing (Legacy)

:::warning Deprecated
The following methods are deprecated in favor of the [Billing Programs API](#billing-programs-api-820). They will continue to work but you should migrate to the new API.
:::

- [`checkAlternativeBillingAvailabilityAndroid()`](#checkalternativebillingavailabilityandroid) — Check if alternative billing is available
- [`showAlternativeBillingDialogAndroid()`](#showalternativebillingdialogandroid) — Show required information dialog
- [`createAlternativeBillingTokenAndroid()`](#createalternativebillingtokenandroid) — Generate reporting token

## Purchase Management

### checkAlternativeBillingAvailabilityAndroid()

:::warning Deprecated
Use [`isBillingProgramAvailableAndroid()`](#isbillingprogramavailableandroid) instead.
:::

Check if alternative billing is available for the current user. This must be called before showing the alternative billing dialog.

```ts
import {checkAlternativeBillingAvailabilityAndroid} from 'react-native-iap';

const isAvailable = await checkAlternativeBillingAvailabilityAndroid();
if (isAvailable) {
  console.log('Alternative billing is available');
} else {
  console.log('Alternative billing not available for this user');
}
```

**Returns:** `Promise<boolean>`

**Platform:** Android

**Requirements:**

- Must initialize connection with alternative billing mode
- User must be eligible for alternative billing (determined by Google)

**See also:** [Google Play Alternative Billing documentation](https://developer.android.com/google/play/billing/alternative)

### showAlternativeBillingDialogAndroid()

:::warning Deprecated
Use [`launchExternalLinkAndroid()`](#launchexternallinkandroid) instead.
:::

Show Google's required information dialog to inform users about alternative billing. This must be called after checking availability and before processing payment.

```ts
import {showAlternativeBillingDialogAndroid} from 'react-native-iap';

const userAccepted = await showAlternativeBillingDialogAndroid();
if (userAccepted) {
  console.log('User accepted alternative billing');
  // Proceed with your payment flow
} else {
  console.log('User declined alternative billing');
}
```

**Returns:** `Promise<boolean>`

**Platform:** Android

**Note:** This dialog is required by Google Play's alternative billing policy. You must show this before redirecting users to your payment system.

### createAlternativeBillingTokenAndroid()

:::warning Deprecated
Use [`createBillingProgramReportingDetailsAndroid()`](#createbillingprogramreportingdetailsandroid) instead.
:::

Generate a reporting token after successfully processing payment through your payment system. This token must be reported to Google Play within 24 hours.

```ts
import {createAlternativeBillingTokenAndroid} from 'react-native-iap';

// After successfully processing payment in your system
const token = await createAlternativeBillingTokenAndroid('com.example.product');

if (token) {
  console.log('Token created:', token);
  // Send this token to your backend to report to Google
  await reportTokenToGooglePlay(token);
} else {
  console.error('Failed to create token');
}
```

**Parameters:**

- `sku` (string, optional): The product SKU that was purchased

**Returns:** `Promise<string | null>`

**Platform:** Android

**Important:**

- Token must be reported to Google Play backend within 24 hours
- Requires server-side integration with Google Play Developer API
- Failure to report will result in refund and possible account suspension

### Alternative Billing Configuration

```ts
import {initConnection, endConnection} from 'react-native-iap';

// Initialize with billing program
await initConnection({
  enableBillingProgramAndroid: 'user-choice-billing', // or 'external-offer', 'external-payments'
});

// To change program, reinitialize
await endConnection();
await initConnection({
  enableBillingProgramAndroid: 'external-offer',
});
```

**Billing Programs:**

- `user-choice-billing` - Users choose between Google Play billing or your payment system
- `external-offer` - External offer programs
- `external-payments` - External payments program (Japan only, 8.3.0+)
- `external-content-link` - External content link programs

### Complete Flow Example (Legacy)

```ts
import {
  checkAlternativeBillingAvailabilityAndroid,
  showAlternativeBillingDialogAndroid,
  createAlternativeBillingTokenAndroid,
} from 'react-native-iap';

async function purchaseWithAlternativeBilling(productId: string) {
  // Step 1: Check availability
  const isAvailable = await checkAlternativeBillingAvailabilityAndroid();
  if (!isAvailable) {
    throw new Error('Alternative billing not available');
  }

  // Step 2: Show required dialog
  const userAccepted = await showAlternativeBillingDialogAndroid();
  if (!userAccepted) {
    throw new Error('User declined alternative billing');
  }

  // Step 3: Process payment in your system
  const paymentResult = await processPaymentInYourSystem(productId);
  if (!paymentResult.success) {
    throw new Error('Payment failed');
  }

  // Step 4: Create reporting token
  const token = await createAlternativeBillingTokenAndroid(productId);
  if (!token) {
    throw new Error('Failed to create token');
  }

  // Step 5: Report to Google (must be done within 24 hours)
  await reportToGooglePlayBackend(token, productId, paymentResult);

  return {success: true, token};
}
```

**See also:**

- [Google Play Alternative Billing documentation](https://developer.android.com/google/play/billing/alternative)
- [Alternative Billing Example](/docs/guides/alternative-billing)

---

## Purchase Acknowledgment & Consumption

### acknowledgePurchaseAndroid()

Acknowledge a non‑consumable purchase or subscription on Android.

```ts
import {acknowledgePurchaseAndroid} from 'react-native-iap';

await acknowledgePurchaseAndroid({token: purchase.purchaseToken!});
```

Notes:

- finishTransaction() calls this automatically when `isConsumable` is false. You typically do not need to call it directly.

### consumePurchaseAndroid()

Consume a purchase (consumables only). This marks an item as consumed so it can be purchased again.

Notes:

- finishTransaction() calls Android consumption automatically when `isConsumable` is true.
- A direct JS helper is not exposed; consumption is handled internally via the native module.

### flushFailedPurchasesCachedAsPendingAndroid (Removed)

This legacy helper from older libraries has been removed. The modern flow is:

```ts
// On app startup (Android)
const purchases = await getAvailablePurchases();

for (const p of purchases) {
  if (/* consumable */) {
    // finishTransaction will consume on Android when isConsumable is true
    await finishTransaction({ purchase: p, isConsumable: true });
  } else {
    // finishTransaction will acknowledge on Android when isConsumable is false
    await finishTransaction({ purchase: p, isConsumable: false });
  }
}
```

This ensures pending transactions are surfaced and properly resolved without a separate "flush" API.
