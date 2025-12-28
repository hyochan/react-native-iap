---
title: Migration Guide (v13 to v14.6)
sidebar_label: Migration v13 → v14.6
sidebar_position: 0
---

import IapKitBanner from "@site/src/uis/IapKitBanner";
import IapKitLink from "@site/src/uis/IapKitLink";

# Migration Guide: v13 to v14.6

<IapKitBanner />

This guide helps you migrate from `react-native-iap` v13 to v14.6. Version 14 introduces significant architectural changes including migration to **Nitro Modules** (JSI-based native bridge), **StoreKit 2** for iOS, and **Google Play Billing 7.0+** for Android.

## Breaking Changes Overview

### Architecture Changes

| Aspect | v13 | v14 |
|--------|-----|-----|
| Native Bridge | React Native Modules | Nitro Modules (JSI) |
| iOS Stack | StoreKit 1 | StoreKit 2 (iOS 15+) |
| Android Billing | Google Play Billing 6.x | Google Play Billing 7.0+ |
| Product Caching | Manual (`clearProductsIOS`) | Automatic (no caching) |
| Error Handling | Platform-specific | Unified `ErrorCode` enum |

### Minimum Requirements

- **iOS**: 15.0+ (required for StoreKit 2)
- **Android**: Google Play Billing 7.0+
- **React Native**: 0.71+

---

## Removed APIs

The following functions have been **completely removed** in v14:

### `getProducts()` → `fetchProducts()`

```tsx
// v13
import {getProducts} from 'react-native-iap';
const products = await getProducts({skus: ['product.id']});

// v14
import {fetchProducts} from 'react-native-iap';
const products = await fetchProducts({skus: ['product.id'], type: 'in-app'});
```

### `getSubscriptions()` → `fetchProducts()`

```tsx
// v13
import {getSubscriptions} from 'react-native-iap';
const subscriptions = await getSubscriptions({skus: ['subscription.id']});

// v14
import {fetchProducts} from 'react-native-iap';
const subscriptions = await fetchProducts({skus: ['subscription.id'], type: 'subs'});
```

### `clearProductsIOS()` → Removed

Products are no longer cached in v14. This function is not needed.

```tsx
// v13
import {clearProductsIOS} from 'react-native-iap';
await clearProductsIOS();

// v14
// Not needed - products are fetched dynamically each time
```

### `flushFailedPurchasesCachedAsPendingAndroid()` → Removed

This function has been completely removed in v14. The Google Play Billing library now handles failed purchases automatically with improved reconnection logic.

```tsx
// v13
import {flushFailedPurchasesCachedAsPendingAndroid} from 'react-native-iap';
if (Platform.OS === 'android') {
  await flushFailedPurchasesCachedAsPendingAndroid();
}

// v14
// Not needed - billing client handles this automatically
// Just use getAvailablePurchases() to restore pending purchases if needed
```

### `buyPromotedProductIOS()` → Use `requestPurchase()` with listener

```tsx
// v13
import {buyPromotedProductIOS} from 'react-native-iap';
await buyPromotedProductIOS();

// v14
import {promotedProductListenerIOS, requestPurchase} from 'react-native-iap';

// Set up listener for promoted products
const subscription = promotedProductListenerIOS((product) => {
  // Purchase the promoted product directly
  requestPurchase({
    request: {apple: {sku: product.id}},
    type: 'in-app',
  });
});

// Clean up when done
subscription.remove();
```

### `getPurchaseHistory()` → `getAvailablePurchases()`

```tsx
// v13
import {getPurchaseHistory} from 'react-native-iap';
const history = await getPurchaseHistory();

// v14
import {getAvailablePurchases} from 'react-native-iap';
const purchases = await getAvailablePurchases();
```

### `setup()` → Removed

The `setup()` function for configuring StoreKit mode is no longer needed. v14 uses StoreKit 2 by default.

```tsx
// v13
import {setup} from 'react-native-iap';
setup({storekitMode: 'STOREKIT2_MODE'});

// v14
// Not needed - StoreKit 2 is used by default
```

---

## Renamed/Changed APIs

### `requestPurchase()` Parameter Changes

The purchase request structure has changed to use `apple`/`google` instead of `ios`/`android`:

```tsx
// v13
import {requestPurchase} from 'react-native-iap';
await requestPurchase({
  sku: 'product.id',
  andDangerouslyFinishTransactionAutomaticallyIOS: false,
});

// v14
import {requestPurchase} from 'react-native-iap';
await requestPurchase({
  request: {
    apple: {sku: 'product.id'},
    google: {skus: ['product.id']},
  },
  type: 'in-app',
});
```

### `requestSubscription()` → `requestPurchase()` with `type: 'subs'`

```tsx
// v13
import {requestSubscription} from 'react-native-iap';
await requestSubscription({
  sku: 'subscription.id',
  subscriptionOffers: [{sku: 'subscription.id', offerToken: 'token'}],
});

// v14
import {requestPurchase} from 'react-native-iap';
await requestPurchase({
  request: {
    apple: {sku: 'subscription.id'},
    google: {
      skus: ['subscription.id'],
      subscriptionOffers: [{sku: 'subscription.id', offerToken: 'token'}],
    },
  },
  type: 'subs',
});
```

### `finishTransaction()` Changes

```tsx
// v13
import {finishTransaction} from 'react-native-iap';
await finishTransaction({
  purchase,
  isConsumable: true,
  developerPayloadAndroid: 'payload',
});

// v14
import {finishTransaction} from 'react-native-iap';
await finishTransaction({
  purchase,
  isConsumable: true,
});
```

### `validateReceiptIos()` → `verifyPurchase()`

```tsx
// v13
import {validateReceiptIos} from 'react-native-iap';
const result = await validateReceiptIos({
  receiptBody: {...},
  isTest: true,
});

// v14
import {verifyPurchase} from 'react-native-iap';
const result = await verifyPurchase({
  apple: {sku: 'product.id'},
  google: {
    sku: 'product.id',
    packageName: 'com.example.app',
    purchaseToken: 'token',
    accessToken: 'your-google-api-access-token',
  },
});
```

#### Recommended: Use `verifyPurchaseWithProvider()` with IAPKit

For production apps, we strongly recommend using `verifyPurchaseWithProvider()` with <IapKitLink>IAPKit</IapKitLink> for secure server-side validation. This provides enterprise-grade backend verification without requiring your own server setup.

> **Why IAPKit?** Client-only verification is vulnerable to receipt tampering and fraud. <IapKitLink>IAPKit</IapKitLink> provides secure server-side validation with a unified API for both Apple and Google purchases. See the [v14.5.0 release blog](/blog/release-14.5.0) for details.

```tsx
import {verifyPurchaseWithProvider} from 'react-native-iap';

const result = await verifyPurchaseWithProvider({
  provider: 'iapkit',
  iapkit: {
    apiKey: 'your-iapkit-api-key', // Get your key at https://iapkit.com
    apple: {jws: purchase.purchaseToken!},
    google: {purchaseToken: purchase.purchaseToken!},
  },
});

if (result.iapkit?.isValid) {
  // Purchase verified - grant entitlement
  console.log('Purchase state:', result.iapkit.state); // 'entitled', 'pending', 'expired', etc.
  console.log('Store:', result.iapkit.store); // 'apple' or 'google'
}
```

**Note**: IAPKit requires a POST request to their API for validation. Sign up at <IapKitLink>iapkit.com</IapKitLink> to get your API key.

---

## useIAP Hook Changes

### Method Returns

In v14, most `useIAP` methods return `Promise<void>` and update internal state instead of returning data:

```tsx
// v13
const {getProducts, products} = useIAP();
const fetchedProducts = await getProducts({skus: ['product.id']});
console.log(fetchedProducts); // Products returned directly

// v14
const {fetchProducts, products} = useIAP();
await fetchProducts({skus: ['product.id'], type: 'in-app'});
// Read from state after fetch
console.log(products); // Products from hook state
```

### Removed Hook Methods

- `getProducts()` → `fetchProducts()`
- `getSubscriptions()` → `fetchProducts()` with `type: 'subs'`
- `requestSubscription()` → `requestPurchase()` with `type: 'subs'`
- `getPurchaseHistory()` → `getAvailablePurchases()`

### New Hook Methods

```tsx
const {
  // New in v14
  fetchProducts,           // Unified product fetching
  getActiveSubscriptions,  // Get active subscriptions (returns data!)
  hasActiveSubscriptions,  // Check if user has active subscriptions
  activeSubscriptions,     // State for active subscriptions
} = useIAP();
```

---

## Complete Migration Example

### Before (v13)

```tsx
import {
  initConnection,
  endConnection,
  getProducts,
  getSubscriptions,
  requestPurchase,
  requestSubscription,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  clearProductsIOS,
  flushFailedPurchasesCachedAsPendingAndroid,
} from 'react-native-iap';

const productSkus = ['com.app.product1'];
const subscriptionSkus = ['com.app.subscription1'];

export const useInitIAP = () => {
  useEffect(() => {
    const init = async () => {
      await initConnection();

      if (Platform.OS === 'android') {
        await flushFailedPurchasesCachedAsPendingAndroid();
      } else {
        await clearProductsIOS();
      }

      // Fetch products
      const products = await getProducts({skus: productSkus});
      const subscriptions = await getSubscriptions({skus: subscriptionSkus});
    };

    init();
    return () => endConnection();
  }, []);
};

// Purchase
const buyProduct = async (sku: string) => {
  await requestPurchase({sku});
};

const buySubscription = async (sku: string, offerToken?: string) => {
  await requestSubscription({
    sku,
    subscriptionOffers: offerToken ? [{sku, offerToken}] : undefined,
  });
};
```

### After (v14)

```tsx
import {
  useIAP,
  fetchProducts,
  requestPurchase,
  finishTransaction,
  ErrorCode,
} from 'react-native-iap';

const productSkus = ['com.app.product1'];
const subscriptionSkus = ['com.app.subscription1'];

export const MyStoreComponent = () => {
  const {
    connected,
    products,
    subscriptions,
    fetchProducts,
    requestPurchase,
    finishTransaction,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      console.log('Purchase successful:', purchase.productId);
      // Validate on your server, then finish
      await finishTransaction({purchase, isConsumable: false});
    },
    onPurchaseError: (error) => {
      if (error.code !== ErrorCode.UserCancelled) {
        console.error('Purchase failed:', error.message);
      }
    },
  });

  useEffect(() => {
    if (!connected) return;

    // Fetch products (unified API)
    fetchProducts({skus: productSkus, type: 'in-app'});
    fetchProducts({skus: subscriptionSkus, type: 'subs'});
  }, [connected, fetchProducts]);

  // Purchase product
  const buyProduct = async (productId: string) => {
    await requestPurchase({
      request: {
        apple: {sku: productId},
        google: {skus: [productId]},
      },
      type: 'in-app',
    });
  };

  // Purchase subscription
  const buySubscription = async (subscriptionId: string) => {
    const subscription = subscriptions.find((s) => s.id === subscriptionId);
    const offers = subscription?.subscriptionOfferDetailsAndroid ?? [];

    await requestPurchase({
      request: {
        apple: {sku: subscriptionId},
        google: {
          skus: [subscriptionId],
          ...(offers.length > 0 && {
            subscriptionOffers: offers.map((o) => ({
              sku: subscriptionId,
              offerToken: o.offerToken,
            })),
          }),
        },
      },
      type: 'subs',
    });
  };

  return (
    <View>
      {products.map((product) => (
        <Button
          key={product.id}
          title={`${product.title} - ${product.displayPrice}`}
          onPress={() => buyProduct(product.id)}
        />
      ))}
      {subscriptions.map((sub) => (
        <Button
          key={sub.id}
          title={`${sub.title} - ${sub.displayPrice}`}
          onPress={() => buySubscription(sub.id)}
        />
      ))}
    </View>
  );
};
```

---

## Error Handling Changes

### v13 Error Handling

```tsx
// v13
purchaseErrorListener((error) => {
  console.error('Error code:', error.code);
  console.error('Error message:', error.message);
});
```

### v14 Error Handling

```tsx
// v14 - Using unified ErrorCode enum
import {purchaseErrorListener, ErrorCode, isUserCancelledError} from 'react-native-iap';

purchaseErrorListener((error) => {
  // Helper function
  if (isUserCancelledError(error)) {
    return; // User cancelled, no action needed
  }

  // Or use ErrorCode enum directly
  switch (error.code) {
    case ErrorCode.UserCancelled:
      // User cancelled
      break;
    case ErrorCode.ItemUnavailable:
      Alert.alert('Product not available');
      break;
    case ErrorCode.NetworkError:
      Alert.alert('Network error, please try again');
      break;
    default:
      Alert.alert('Purchase failed', error.message);
  }
});
```

---

## Product Type Changes

### Product Structure

```tsx
// v13 - Product type
interface Product {
  productId: string;
  price: string;
  localizedPrice: string;
  title: string;
  description: string;
  // ...
}

// v14 - Product type
interface Product {
  id: string;              // Changed from productId
  displayPrice: string;    // Changed from localizedPrice
  price: number;           // Now a number
  title: string;
  description: string;
  platform: 'ios' | 'android';
  // ...
}
```

### Subscription Structure

```tsx
// v14 - Subscription has additional fields
interface ProductSubscription extends Product {
  subscriptionOfferDetailsAndroid?: SubscriptionOfferAndroid[];
  subscriptionPeriodIOS?: string;
  // ... additional subscription-specific fields
}
```

---

## Android-Specific Changes

### Subscription Offers (Required for Android)

Android subscriptions now **require** `subscriptionOffers` from the fetched product:

```tsx
// v14 - Android subscriptions
const subscription = subscriptions.find((s) => s.id === 'sub.id');
const offers = subscription?.subscriptionOfferDetailsAndroid ?? [];

await requestPurchase({
  request: {
    google: {
      skus: ['sub.id'],
      subscriptionOffers: offers.map((offer) => ({
        sku: 'sub.id',
        offerToken: offer.offerToken,
      })),
    },
  },
  type: 'subs',
});
```

---

## iOS-Specific Changes

### StoreKit 2 Migration

v14 uses StoreKit 2 exclusively, which means:

1. **iOS 15+ required**: Your app must target iOS 15.0 or later
2. **JWS format**: Receipts are now in JWS (JSON Web Signature) format instead of base64
3. **No more receipt refresh**: `requestReceiptRefresh` behavior has changed

### Receipt Changes

```tsx
// v13 - Binary receipt
const receipt = await getReceiptIOS({forceRefresh: true});
// Returns base64-encoded ASN.1 receipt

// v14 - JWS format
const receipt = await getReceiptIOS();
// Returns JWS (JSON Web Signature) string for StoreKit 2
```

### Promoted Products

```tsx
// v13
await buyPromotedProductIOS();

// v14 - Use listener + standard purchase flow
promotedProductListenerIOS((product) => {
  requestPurchase({
    request: {apple: {sku: product.id}},
    type: 'in-app',
  });
});
```

---

## Quick Reference Table

| v13 API | v14 API | Notes |
|---------|---------|-------|
| `getProducts({skus})` | `fetchProducts({skus, type: 'in-app'})` | Returns products directly or updates state |
| `getSubscriptions({skus})` | `fetchProducts({skus, type: 'subs'})` | Unified with fetchProducts |
| `clearProductsIOS()` | *Removed* | Not needed, no caching |
| `requestPurchase({sku})` | `requestPurchase({request: {apple, google}, type})` | New structure |
| `requestSubscription({sku})` | `requestPurchase({..., type: 'subs'})` | Unified with requestPurchase |
| `buyPromotedProductIOS()` | `promotedProductListenerIOS()` + `requestPurchase()` | Use listener pattern |
| `getPurchaseHistory()` | `getAvailablePurchases()` | Different name |
| `setup({storekitMode})` | *Removed* | StoreKit 2 by default |
| `validateReceiptIos()` | `verifyPurchase()` | Unified validation |
| `product.productId` | `product.id` | Property renamed |
| `product.localizedPrice` | `product.displayPrice` | Property renamed |

---

## Troubleshooting

### "Cannot find module" errors

Make sure you've updated all imports:

```tsx
// Check for old imports
import {getProducts, getSubscriptions} from 'react-native-iap'; // Will fail

// Update to new imports
import {fetchProducts} from 'react-native-iap'; // Correct
```

### iOS build errors

1. Clean your build folder: `cd ios && rm -rf build && pod install`
2. Ensure minimum deployment target is iOS 15.0
3. Update your Podfile if needed

### Android build errors

1. Clean gradle: `cd android && ./gradlew clean`
2. Ensure you're using Google Play Billing 7.0+
3. Check your `build.gradle` for correct dependencies

### Products not loading

1. Verify product IDs match exactly with store configuration
2. Check App Store Connect / Google Play Console agreements are signed
3. For iOS, ensure you're testing on a real device with StoreKit Configuration or sandbox account

---

## Need Help?

- [GitHub Issues](https://github.com/hyochan/react-native-iap/issues)
- [GitHub Discussions](https://github.com/hyochan/react-native-iap/discussions)
- [API Reference](../api/index)
- [Error Handling Guide](./error-handling)
