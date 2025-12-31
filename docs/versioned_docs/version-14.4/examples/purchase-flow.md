---
title: Purchase Flow Example
sidebar_label: Purchase Flow
sidebar_position: 1
---

import IapKitBanner from "@site/src/uis/IapKitBanner";
import IapKitLink from "@site/src/uis/IapKitLink";

# Purchase Flow

<IapKitBanner />

:::tip
The complete working example can be found at [example/screens/PurchaseFlow.tsx](https://github.com/hyochan/react-native-iap/blob/main/example/screens/PurchaseFlow.tsx).
:::

## Flow Overview

```txt
Connect → Fetch Products → Request Purchase → Server Validate → Finish Transaction
```

## Quick Start with useIAP

```tsx
const {connected, products, fetchProducts, requestPurchase, finishTransaction} =
  useIAP({
    onPurchaseSuccess: async (purchase) => {
      // Validate on your server, then finish
      await finishTransaction({purchase, isConsumable: true});
    },
    onPurchaseError: (error) => {
      if (error.code !== ErrorCode.UserCancelled) {
        Alert.alert('Error', error.message);
      }
    },
  });

// Load products
await fetchProducts({skus: ['product_id'], type: 'in-app'});

// Purchase
await requestPurchase({
  request: {
    ios: {sku: 'product_id'},
    android: {skus: ['product_id']},
  },
  type: 'in-app',
});
```

## Key Points

- **Connection**: `useIAP` automatically manages connection lifecycle
- **Platform differences**: iOS takes single `sku`, Android takes `skus` array
- **Validation**: Always validate receipts on your server before finishing
- **Finish transaction**: Call `finishTransaction()` after validation to prevent replay

## IAPKit Server Verification

<IapKitLink>IAPKit</IapKitLink> provides server-side receipt verification without your own infrastructure.

### Setup

1. Get your API key from <IapKitLink>IAPKit Dashboard</IapKitLink>
2. Add environment variable:
   ```
   EXPO_PUBLIC_IAPKIT_API_KEY=your_api_key_here
   ```

### Usage

```tsx
import {verifyPurchaseWithProvider} from 'react-native-iap';

const verifyPurchase = async (purchase: Purchase) => {
  const result = await verifyPurchaseWithProvider({
    provider: 'iapkit',
    iapkit: {
      apiKey: process.env.EXPO_PUBLIC_IAPKIT_API_KEY!,
      apple: {jws: purchase.purchaseToken!},
      google: {purchaseToken: purchase.purchaseToken!},
    },
  });

  if (result.iapkit.isValid) {
    // Grant entitlement to user
    await finishTransaction({purchase, isConsumable: true});
  }
};
```

### With useIAP Hook

```tsx
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
      await finishTransaction({purchase, isConsumable: true});
    }
  },
});
```

### Verification Response

IAPKit returns a standardized response:

```typescript
interface IapkitVerificationResult {
  isValid: boolean;
  state: IapkitPurchaseState;
  store: 'apple' | 'google';
}

type IapkitPurchaseState =
  | 'entitled'
  | 'pending-acknowledgment'
  | 'pending'
  | 'canceled'
  | 'expired'
  | 'ready-to-consume'
  | 'consumed'
  | 'unknown'
  | 'inauthentic';
```

### Verification Methods

| Method              | Description                          | Use Case               |
| ------------------- | ------------------------------------ | ---------------------- |
| **None (Skip)**     | Skip verification                    | Testing/Development    |
| **Local (Device)**  | Verify with Apple/Google directly    | Simple validation      |
| **IAPKit (Server)** | Server-side verification via IAPKit  | Production recommended |

### Testing

The [example app](https://github.com/hyochan/react-native-iap/blob/main/example/screens/PurchaseFlow.tsx) has built-in IAPKit support. Set your API key and use the "Purchase Verification" button to test.

For more information, visit <IapKitLink>IAPKit Documentation</IapKitLink>.

## Resources

- [Complete example](https://github.com/hyochan/react-native-iap/blob/main/example/screens/PurchaseFlow.tsx)
- [Core Methods API](../api/methods/core-methods)
- [Error Handling](../api/error-handling)
