---
title: Subscriptions Flow Example
sidebar_label: Subscriptions Flow
sidebar_position: 2
---

import IapKitBanner from "@site/src/uis/IapKitBanner";
import IapKitLink from "@site/src/uis/IapKitLink";

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
      purchaseToken: currentPurchase.purchaseToken, // Required
      replacementMode: 1, // WITH_TIME_PRORATION
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

<IapKitLink>IAPKit</IapKitLink> provides server-side subscription verification without your own infrastructure. Get started at **<IapKitLink>iapkit.com</IapKitLink>**.

### Setup

1. Get your API key from <IapKitLink>IAPKit Dashboard</IapKitLink>
2. Add environment variable:
   ```
   EXPO_PUBLIC_IAPKIT_API_KEY=your_api_key_here
   ```

### Complete Verification Flow

```tsx
import {useIAP, verifyPurchaseWithProvider, ErrorCode} from 'react-native-iap';
import {Platform, Alert} from 'react-native';

function SubscriptionScreen() {
  const {
    connected,
    subscriptions,
    fetchProducts,
    requestPurchase,
    finishTransaction,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      // Step 1: Verify purchase with IAPKit
      try {
        const result = await verifyPurchaseWithProvider({
          provider: 'iapkit',
          iapkit: {
            apiKey: process.env.EXPO_PUBLIC_IAPKIT_API_KEY!,
            apple:
              Platform.OS === 'ios'
                ? {jws: purchase.purchaseToken!}
                : undefined,
            google:
              Platform.OS === 'android'
                ? {purchaseToken: purchase.purchaseToken!}
                : undefined,
          },
        });

        // Step 2: Check verification result
        if (result.iapkit?.isValid && result.iapkit?.state === 'entitled') {
          // Step 3: Grant access to user
          await grantPremiumAccess(purchase.productId);

          // Step 4: Finish transaction
          await finishTransaction({purchase, isConsumable: false});

          Alert.alert('Success', 'Subscription activated!');
        } else {
          console.warn('Verification failed:', result.iapkit?.state);
          Alert.alert('Error', 'Could not verify purchase');
        }
      } catch (error) {
        console.error('Verification error:', error);
        // Still finish transaction to avoid stuck state
        await finishTransaction({purchase, isConsumable: false});
      }
    },
    onPurchaseError: (error) => {
      if (error.code !== ErrorCode.UserCancelled) {
        Alert.alert('Purchase Failed', error.message);
      }
    },
  });

  // ... rest of component
}
```

### IAPKit Purchase States

After verification, check the `state` field to determine the subscription status:

| State | Action |
|-------|--------|
| `entitled` | Grant access - subscription is active |
| `expired` | Revoke access - subscription has expired |
| `canceled` | User or store canceled the subscription |
| `pending` | Payment is pending |
| `pending-acknowledgment` | Needs acknowledgment (Android) |
| `inauthentic` | Verification failed - may be fraudulent |

### Checking Subscription Status on App Launch

```tsx
import {getAvailablePurchases, verifyPurchaseWithProvider} from 'react-native-iap';
import {Platform} from 'react-native';

async function checkSubscriptionOnLaunch(subscriptionId: string) {
  // Step 1: Get purchases from store
  const purchases = await getAvailablePurchases([subscriptionId]);
  const purchase = purchases.find(p => p.productId === subscriptionId);

  if (!purchase) {
    return {isActive: false, state: 'expired'};
  }

  // Step 2: Verify with IAPKit for authoritative status
  const result = await verifyPurchaseWithProvider({
    provider: 'iapkit',
    iapkit: {
      apiKey: process.env.EXPO_PUBLIC_IAPKIT_API_KEY!,
      apple: Platform.OS === 'ios' ? {jws: purchase.purchaseToken!} : undefined,
      google: Platform.OS === 'android' ? {purchaseToken: purchase.purchaseToken!} : undefined,
    },
  });

  return {
    isActive: result.iapkit?.state === 'entitled',
    state: result.iapkit?.state,
    isValid: result.iapkit?.isValid,
  };
}
```

### Testing

The [example app](https://github.com/hyochan/react-native-iap/blob/main/example/screens/SubscriptionFlow.tsx) has built-in IAPKit support. Set your API key and test subscription verification.

> For more details about IAPKit verification, see the [OpenIAP IAPKit documentation](https://www.openiap.dev/docs/apis#iapkit-purchase-states).

## Key Points

- **iOS**: Use subscription groups for automatic plan management
- **Android**: Must include `subscriptionOffers` and `purchaseToken` for upgrades
- **Validation**: Always validate receipts on your server before granting access
- **Hook callbacks**: Use `onPurchaseSuccess` instead of promise chaining

## Resources

- [Complete example](https://github.com/hyochan/react-native-iap/blob/main/example/screens/SubscriptionFlow.tsx)
- [iOS Subscription Groups](https://developer.apple.com/app-store/subscriptions/)
- [Android Subscription Changes](https://developer.android.com/google/play/billing/subscriptions#upgrade-downgrade)
