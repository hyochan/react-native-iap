---
title: Purchases
sidebar_label: Purchases
sidebar_position: 2
---

import IapKitBanner from "@site/src/uis/IapKitBanner";

# Purchases

<IapKitBanner />

:::tip
For complete working examples, see [Purchase Flow](../examples/purchase-flow) and [Subscription Flow](../examples/subscription-flow).
:::

## Key Concepts

1. **Event-driven**: Purchases are handled through callbacks, not promises
2. **Asynchronous**: Purchases may complete after your app is closed
3. **Validation required**: Always validate receipts on your server
4. **Finish transactions**: Always call `finishTransaction()` after validation

## Recommended: useIAP Hook

```tsx
const {products, requestPurchase, finishTransaction} = useIAP({
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
```

## Direct Listeners

```tsx
useEffect(() => {
  initConnection().then(() => {
    const purchaseUpdate = purchaseUpdatedListener((purchase) => {
      handlePurchaseUpdate(purchase);
    });

    const purchaseError = purchaseErrorListener((error) => {
      console.log('purchaseErrorListener', error);
    });

    return () => {
      purchaseUpdate.remove();
      purchaseError.remove();
    };
  });
}, []);
```

## Request Purchase

### Products (In-App)

```tsx
await requestPurchase({
  request: {
    apple: {sku: 'product_id'},
    google: {skus: ['product_id']},
  },
  type: 'in-app',
});
```

:::note Platform Field Names
The recommended field names are `apple` and `google`. The older `ios` and `android` fields are still supported for backward compatibility but are deprecated.
:::

### Subscriptions

```tsx
const subscription = subscriptions.find((s) => s.id === 'sub_id');

await requestPurchase({
  request: {
    apple: {sku: 'sub_id'},
    google: {
      skus: ['sub_id'],
      subscriptionOffers:
        subscription?.subscriptionOfferDetailsAndroid?.map((offer) => ({
          sku: 'sub_id',
          offerToken: offer.offerToken,
        })) || [],
    },
  },
  type: 'subs',
});
```

### Advanced Commerce Data (iOS)

For attribution tracking (campaign tokens, affiliate IDs), use `advancedCommerceData`:

```tsx
await requestPurchase({
  request: {
    apple: {
      sku: 'premium_sub',
      advancedCommerceData: 'campaign_summer_2025',
    },
  },
  type: 'in-app',
});
```

## Platform Differences

| Feature           | iOS                 | Android                       |
| ----------------- | ------------------- | ----------------------------- |
| **SKU format**    | Single `sku`        | Array `skus`                  |
| **Subscriptions** | Simple SKU          | Requires `subscriptionOffers` |
| **Expiration**    | `expirationDateIOS` | `autoRenewingAndroid`         |

## Finish Transaction

```tsx
// Consumable (can be purchased again)
await finishTransaction({purchase, isConsumable: true});

// Non-consumable or subscription
await finishTransaction({purchase, isConsumable: false});
```

## Error Handling

```tsx
import {ErrorCode} from 'react-native-iap';

if (error.code === ErrorCode.UserCancelled) return;
if (error.code === ErrorCode.NetworkError) showRetry();
if (error.code === ErrorCode.ItemUnavailable) showUnavailable();
```

## Purchase Verification

Always validate on your server:

```tsx
// Send to your server for validation
const isValid = await yourAPI.validateReceipt({
  purchaseToken: purchase.purchaseToken,
  productId: purchase.productId,
});

if (isValid) {
  await finishTransaction({purchase});
}
```

## Resources

- [Purchase Flow Example](../examples/purchase-flow)
- [Subscription Flow Example](../examples/subscription-flow)
- [Error Handling](../api/error-handling)
- [Purchase Lifecycle Guide](./lifecycle)
