---
title: Purchase Flow Example
sidebar_label: Purchase Flow
sidebar_position: 1
---

import GreatFrontEndTopFixed from "@site/src/uis/GreatFrontEndTopFixed";

# Purchase Flow

<GreatFrontEndTopFixed />

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

## IAPKit Verification

For server-side validation without your own infrastructure, use [IAPKit](https://iapkit.com):

```tsx
const result = await verifyPurchaseWithProvider({
  provider: 'iapkit',
  iapkit: {
    apiKey: IAPKIT_API_KEY,
    apple: {jws: purchase.purchaseToken!},
    google: {purchaseToken: purchase.purchaseToken!},
  },
});

if (result.iapkit.isValid) {
  await finishTransaction({purchase, isConsumable: true});
}
```

## Resources

- [Complete example](https://github.com/hyochan/react-native-iap/blob/main/example/screens/PurchaseFlow.tsx)
- [Core Methods API](../api/methods/core-methods)
- [Error Handling](../api/error-handling)
