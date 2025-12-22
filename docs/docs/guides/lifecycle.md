---
title: Purchase Lifecycle
sidebar_label: Purchase Lifecycle
sidebar_position: 2
---

import IapKitBanner from "@site/src/uis/IapKitBanner";

# Purchase Lifecycle

<IapKitBanner />

Understanding the purchase lifecycle is crucial for building robust in-app purchase functionality. This guide covers the various stages of a purchase, from connection initialization to transaction completion.

## Overview

The typical purchase lifecycle involves these steps:

1. **Initialize Connection**: Establish communication with the app store.
2. **Fetch Products**: Retrieve product information (prices, descriptions).
3. **Request Purchase**: Initiate the purchase process.
4. **Handle Purchase Updates**: Process successful purchases or errors.
5. **Validate Receipt**: Verify the purchase on your server.
6. **Finish Transaction**: Complete the transaction with the app store.

## 1. Initialize Connection

Before any IAP operations, you must initialize the connection to the app store. The `useIAP` hook handles this automatically on component mount.

```tsx
import {useIAP} from 'react-native-iap';

function App() {
  const {connected} = useIAP();

  if (!connected) {
    return <Text>Connecting to store...</Text>;
  }
  return <MyStore />; // Render your store UI when connected
}
```

## 2. Fetch Products

Once connected, fetch product details from the store. This populates the `products` and `subscriptions` state in the `useIAP` hook.

```tsx
import {useIAP} from 'react-native-iap';

function MyStore() {
  const {connected, products, fetchProducts} = useIAP();

  useEffect(() => {
    if (connected) {
      fetchProducts({skus: ['com.example.product1'], type: 'in-app'});
    }
  }, [connected, fetchProducts]);

  return (
    <View>
      {products.map((product) => (
        <Text key={product.id}>{product.title}</Text>
      ))}
    </View>
  );
}
```

## 3. Request Purchase

Initiate a purchase when the user selects a product. The `requestPurchase` method handles platform-specific differences.

```tsx
import {useIAP} from 'react-native-iap';

function ProductItem({productId}: {productId: string}) {
  const {requestPurchase} = useIAP();

  const buyProduct = async () => {
    try {
      await requestPurchase({
        request: {
          ios: {sku: productId},
          android: {skus: [productId]},
        },
      });
    } catch (error) {
      console.error('Purchase request failed:', error);
    }
  };

  return <Button title="Buy" onPress={buyProduct} />;
}
```

## 4. Handle Purchase Updates

After `requestPurchase` is called, the app store processes the purchase. The `useIAP` hook provides `onPurchaseSuccess` and `onPurchaseError` callbacks to handle the outcome.

```tsx
import {useIAP} from 'react-native-iap';

function App() {
  const {connected} = useIAP({
    onPurchaseSuccess: (purchase) => {
      console.log('Purchase successful:', purchase);
      // Proceed to server validation and finish transaction
    },
    onPurchaseError: (error) => {
      console.error('Purchase failed:', error);
      // Handle error, e.g., show alert to user
    },
  });

  return <MyStore />;
}
```

## 5. Validate Receipt

**Crucial for security**: Always validate purchases on your secure backend server. This prevents fraud and ensures the integrity of your app's economy.

```tsx
const validateReceiptOnServer = async (purchase) => {
  const response = await fetch('https://your-server.com/validate-receipt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      productId: purchase.productId,
      purchaseToken: purchase.purchaseToken, // Unified token
      // Add other platform-specific data as needed
    }),
  });
  const result = await response.json();
  return result.isValid; // Your server should return if the receipt is valid
};
```

## 6. Finish Transaction

After successful server-side validation, you **must** call `finishTransaction` to complete the purchase with the app store. Failing to do so can lead to repeated purchase notifications and potential refunds.

```tsx
import {useIAP} from 'react-native-iap';

function App() {
  const {finishTransaction} = useIAP({
    onPurchaseSuccess: async (purchase) => {
      const isValid = await validateReceiptOnServer(purchase);
      if (isValid) {
        // Grant user access to content
        await grantContentToUser(purchase);
        await finishTransaction({purchase});
        console.log('Transaction finished');
      } else {
        console.error('Invalid receipt');
      }
    },
  });

  return <MyStore />;
}
```

## Important Considerations

### App State and Background Purchases

Purchases can complete even when your app is in the background or has been terminated. The `useIAP` hook is designed to handle these scenarios by processing pending transactions on app launch.

### Consumable vs. Non-Consumable Products

- **Consumable**: Items that can be purchased multiple times (e.g., coins, lives). You should set `isConsumable: true` in `finishTransaction`.
- **Non-Consumable**: Items purchased once (e.g., premium features, subscriptions). Set `isConsumable: false`.

### Restoring Purchases

Users should always have the option to restore non-consumable products and subscriptions. Use `getAvailablePurchases()` for this.

```tsx
import {useIAP} from 'react-native-iap';

function RestoreButton() {
  const {getAvailablePurchases, finishTransaction} = useIAP();

  const restore = async () => {
    try {
      const purchases = await getAvailablePurchases();
      for (const purchase of purchases) {
        const isValid = await validateReceiptOnServer(purchase);
        if (isValid) {
          await grantContentToUser(purchase);
          await finishTransaction({purchase});
        }
      }
      console.log('Purchases restored');
    } catch (error) {
      console.error('Restore failed:', error);
    }
  };

  return <Button title="Restore Purchases" onPress={restore} />;
}
```

## Next Steps

- [Explore the Purchase Flow Example](../examples/purchase-flow)
- Learn about [Error Handling](../api/error-handling)
- See [Best Practices for Purchases](../guides/purchases)
