---
title: Subscriptions Flow Example
sidebar_label: Subscriptions Flow
sidebar_position: 2
---

import IapKitBanner from "@site/src/uis/IapKitBanner";

# Subscriptions Flow

<IapKitBanner />

:::tip
The complete working example can be found at [example/screens/SubscriptionFlow.tsx](https://github.com/hyochan/react-native-iap/blob/main/example/screens/SubscriptionFlow.tsx).
:::

## Flow Overview

```txt
Connect → Fetch Subscriptions → Request Purchase → Validate → Finish Transaction
```

## Quick Start with useIAP

```tsx
const {subscriptions, fetchProducts, requestPurchase, finishTransaction} =
  useIAP({
    onPurchaseSuccess: async (purchase) => {
      // Validate on your server, then finish
      await finishTransaction({purchase});
    },
    onPurchaseError: (error) => {
      if (error.code !== ErrorCode.UserCancelled) {
        Alert.alert('Error', error.message);
      }
    },
  });

// Load subscriptions
await fetchProducts({skus: ['premium_monthly'], type: 'subs'});

// Purchase (platform-specific)
const subscription = subscriptions[0];
await requestPurchase({
  request: {
    apple: {sku: 'premium_monthly'},
    google: {
      skus: ['premium_monthly'],
      subscriptionOffers:
        subscription.subscriptionOfferDetailsAndroid?.map((offer) => ({
          sku: subscription.id,
          offerToken: offer.offerToken,
        })) || [],
    },
  },
  type: 'subs',
});
```

## Checking Active Subscriptions

```tsx
const {getActiveSubscriptions, hasActiveSubscriptions} = useIAP();

// Quick check
const isActive = await hasActiveSubscriptions(['premium_monthly']);

// Get details
const activeList = await getActiveSubscriptions();
```

## Plan Changes (Upgrade/Downgrade)

### iOS

Subscriptions in the same group auto-replace each other. Just purchase the new plan.

### Android

Requires explicit replacement with the current purchase token:

```tsx
await requestPurchase({
  request: {
    google: {
      skus: ['premium_yearly'],
      subscriptionOffers: [...],
      purchaseTokenAndroid: currentPurchase.purchaseToken, // Required
      replacementModeAndroid: 1, // WITH_TIME_PRORATION
    },
  },
  type: 'subs',
});
```

## Android Replacement Modes

| Value | Mode                  | Description                    |
| ----- | --------------------- | ------------------------------ |
| `1`   | WITH_TIME_PRORATION   | Immediate with prorated credit |
| `2`   | CHARGE_PRORATED_PRICE | Immediate with prorated charge |
| `6`   | DEFERRED              | Change at next renewal         |

## IAPKit Server Verification

[IAPKit](https://iapkit.com) provides server-side subscription verification without your own infrastructure.

### Setup

1. Get your API key from [IAPKit Dashboard](https://iapkit.com)
2. Add environment variable:

   ```bash
   EXPO_PUBLIC_IAPKIT_API_KEY=your_api_key_here
   ```

### Usage

```tsx
import {verifyPurchaseWithProvider} from 'react-native-iap';

const {finishTransaction} = useIAP({
  onPurchaseSuccess: async (purchase) => {
    const result = await verifyPurchaseWithProvider({
      provider: 'iapkit',
      iapkit: {
        apiKey: process.env.EXPO_PUBLIC_IAPKIT_API_KEY!,
        apple: {jws: purchase.purchaseToken!},
        google: {purchaseToken: purchase.purchaseToken!},
      },
    });

    if (result.iapkit.isValid) {
      await finishTransaction({purchase});
    }
  },
});
```

### Testing

The [example app](https://github.com/hyochan/react-native-iap/blob/main/example/screens/SubscriptionFlow.tsx) has built-in IAPKit support. Set your API key and test subscription verification.

## Key Points

- **iOS**: Use subscription groups for automatic plan management
- **Android**: Must include `subscriptionOffers` and `purchaseTokenAndroid` for upgrades
- **Validation**: Always validate receipts on your server before granting access
- **Hook callbacks**: Use `onPurchaseSuccess` instead of promise chaining

## Resources

- [Complete example](https://github.com/hyochan/react-native-iap/blob/main/example/screens/SubscriptionFlow.tsx)
- [iOS Subscription Groups](https://developer.apple.com/app-store/subscriptions/)
- [Android Subscription Changes](https://developer.android.com/google/play/billing/subscriptions#upgrade-downgrade)
