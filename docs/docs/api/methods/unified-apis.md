---
title: Unified APIs
sidebar_label: Unified APIs
sidebar_position: 2
---

import IapKitLink from "@site/src/uis/IapKitLink";

# Unified APIs

These cross‑platform methods work on both iOS and Android. For StoreKit/Play‑specific helpers, see the [iOS Specific](./ios-specific) and [Android Specific](./android-specific) sections.

- [`initConnection()`](#initconnection) — Initialize the store connection
- [`endConnection()`](#endconnection) — End the store connection and cleanup
- [`fetchProducts()`](#fetchproducts) — Fetch product and subscription metadata
- [`requestPurchase()`](#requestpurchase) — Start a purchase for products or subscriptions
- [`finishTransaction()`](#finishtransaction) — Complete a transaction after validation
- [`getAvailablePurchases()`](#getavailablepurchases) — Restore non‑consumables and subscriptions
- [`deepLinkToSubscriptions()`](#deeplinktosubscriptions) — Open native subscription management UI
- [`getStorefront()`](#getstorefront) — Get current storefront country code
- [`hasActiveSubscriptions()`](#hasactivesubscriptions) — Check if user has active subscriptions
- [`verifyPurchase()`](#verifypurchase) — Verify purchase with native OpenIAP implementation
- [`verifyPurchaseWithProvider()`](#verifypurchasewithprovider) — Verify purchase with external provider (e.g., IAPKit)

## initConnection()

Initializes the connection to the store. This method must be called before any other store operations.

```tsx
import {initConnection} from 'react-native-iap';

const initialize = async () => {
  try {
    await initConnection();
    console.log('Store connection initialized');
  } catch (error) {
    console.error('Failed to initialize connection:', error);
  }
};
```

**Returns:** `Promise<boolean>`

**Note:** When using the `useIAP` hook, connection is automatically managed.

## endConnection()

Ends the connection to the store and cleans up resources.

```tsx
import {endConnection} from 'react-native-iap';

const cleanup = async () => {
  try {
    await endConnection();
    console.log('Store connection ended');
  } catch (error) {
    console.error('Failed to end connection:', error);
  }
};
```

**Returns:** `Promise<void>`

**Note:** When using the `useIAP` hook, connection cleanup is automatic.

## fetchProducts()

Fetches product or subscription information from the store.

```tsx
import {fetchProducts} from 'react-native-iap';

// Fetch in-app products
const loadProducts = async () => {
  try {
    const products = await fetchProducts({
      skus: ['com.example.product1', 'com.example.product2'],
      type: 'in-app',
    });

    console.log('Products:', products);
    return products;
  } catch (error) {
    console.error('Failed to fetch products:', error);
  }
};

// Fetch subscriptions
const loadSubscriptions = async () => {
  try {
    const subscriptions = await fetchProducts({
      skus: ['com.example.premium_monthly', 'com.example.premium_yearly'],
      type: 'subs',
    });

    console.log('Subscriptions:', subscriptions);
    return subscriptions;
  } catch (error) {
    console.error('Failed to fetch subscriptions:', error);
  }
};
```

**Parameters:**

- `params` (object):
  - `skus` (string[]): Array of product or subscription IDs to fetch
  - `type` ('in-app' | 'subs'): Product type - 'in-app' for products, 'subs' for subscriptions

**Returns:** `Promise<Product[]>`

[**Product Type Overview**](../types.md#product-types)

## requestPurchase()

Initiates a purchase request for products or subscriptions.

> **⚠️ Platform Differences:**
>
> - **iOS**: Can only purchase one product at a time (uses `sku: string`)
> - **Android**: Can purchase multiple products at once (uses `skus: string[]`)
>
> This exists because the iOS App Store processes purchases individually, while Google Play supports batch purchases.

### Recommended usage (no Platform checks)

```tsx
import {requestPurchase} from 'react-native-iap';

// Product purchase
const buyProduct = (productId: string) => {
  requestPurchase({
    request: {
      apple: {
        sku: productId,
        quantity: 1,
      },
      google: {
        skus: [productId],
      },
    },
    type: 'in-app',
  });
  // Purchase result is handled via purchaseUpdatedListener/purchaseErrorListener or useIAP hook's onPurchaseSuccess/onPurchaseError callbacks
};

// Subscription purchase
const buySubscription = (subscriptionId: string, subscription?: any) => {
  requestPurchase({
    request: {
      apple: {
        sku: subscriptionId,
        appAccountToken: 'user-123',
      },
      google: {
        skus: [subscriptionId],
        subscriptionOffers:
          subscription?.subscriptionOfferDetailsAndroid?.map((offer) => ({
            sku: subscriptionId,
            offerToken: offer.offerToken,
          })) || [],
      },
    },
    type: 'subs',
  });
  // Purchase result is handled via purchaseUpdatedListener/purchaseErrorListener or useIAP hook's onPurchaseSuccess/onPurchaseError callbacks
};
```

**Note:** `requestPurchase` initiates the purchase flow but does not return the purchase result directly. Instead, handle purchase outcomes through [`purchaseUpdatedListener`](listeners.md#purchaseupdatedlistener) and [`purchaseErrorListener`](listeners.md#purchaseerrorlistener) event listeners or the `useIAP` hook's `onPurchaseSuccess` and `onPurchaseError` callbacks.

### Detailed Platform Examples

#### Cross-Platform (Recommended)

```tsx
await requestPurchase({
  request: {
    apple: {
      sku: productId,
      quantity: 1,
      appAccountToken: 'user-account-token',
    },
    google: {
      skus: [productId],
      obfuscatedAccountId: 'user-account-id',
    },
  },
  type: 'in-app',
});
```

#### With Advanced Commerce Data (iOS 15+)

Use `advancedCommerceData` to pass attribution data (campaign tokens, affiliate IDs) during purchase:

```tsx
await requestPurchase({
  request: {
    apple: {
      sku: productId,
      advancedCommerceData: 'campaign_summer_2025',
    },
    google: {
      skus: [productId],
    },
  },
  type: 'in-app',
});
```

#### With One-Time Purchase Discount (Android 7.0+)

```tsx
await requestPurchase({
  request: {
    apple: {
      sku: productId,
    },
    google: {
      skus: [productId],
      offerToken: discountOffer.offerTokenAndroid, // From product.discountOffers
    },
  },
  type: 'in-app',
});
```

**Parameters:**

- `params` (object):
  - `request` (object): Purchase request configuration
    - **iOS**: `sku` (string) - Product ID to purchase
    - **Android**: `skus` (string[]) - Array of product IDs to purchase
    - **Cross-platform**: Include both `sku` and `skus` for compatibility
    - `quantity?` (number, iOS only): Purchase quantity
    - `appAccountToken?` (string, iOS only): User identifier for purchase verification
    - `advancedCommerceData?` (string, iOS only): Campaign token or attribution data for StoreKit 2's `Product.PurchaseOption.custom` API (iOS 15+)
    - `obfuscatedAccountId?` (string, Android only): Obfuscated account ID
    - `obfuscatedProfileId?` (string, Android only): Obfuscated profile ID
    - `isOfferPersonalized?` (boolean, Android only): Whether offer is personalized
    - `offerToken?` (string, Android 7.0+ only): Offer token for one-time purchase discounts
  - `type?` ('in-app' | 'subs'): Purchase type, defaults to 'in-app'

**Returns:** `Promise<Purchase | Purchase[] | void>`

**Note:** The actual purchase result is delivered through purchase listeners or the `useIAP` hook callbacks, not as a return value.

**Note on Consumable Products:** `requestPurchase` is called the same way for both consumable and non-consumable products using `type: 'in-app'`. The consumable behavior is determined later in `finishTransaction()` by setting `isConsumable: true` for consumable products.

#### Important Subscription Properties

For subscription status checks after a purchase or when listing entitlements:

- iOS: Check `expirationDateIOS` to determine if the subscription is still active
- Android: Check `autoRenewingAndroid` to see if auto‑renewal has been canceled

## finishTransaction()

Completes a purchase transaction. Must be called after successful purchase verification.

```tsx
import {finishTransaction} from 'react-native-iap';

const completePurchase = async (purchase) => {
  try {
    // Validate receipt on your server first
    const isValid = await validateReceiptOnServer(purchase);

    if (isValid) {
      // Grant purchase to user
      await grantPurchaseToUser(purchase);

      // Finish the transaction
      await finishTransaction({
        purchase,
        isConsumable: true, // Set to true for consumable products
      });

      console.log('Transaction completed');
    }
  } catch (error) {
    console.error('Failed to finish transaction:', error);
  }
};
```

**Parameters:**

- `params` (object):
  - `purchase` (Purchase): The purchase object to finish
  - `isConsumable?` (boolean): Whether the product is consumable (Android)

**Returns:** `Promise<VoidResult | boolean>`

## getAvailablePurchases()

Retrieves available purchases for restoration (non-consumable products and subscriptions).

```tsx
import {getAvailablePurchases} from 'react-native-iap';

const restorePurchases = async () => {
  try {
    const purchases = await getAvailablePurchases();

    for (const purchase of purchases) {
      // Validate and restore each purchase
      const isValid = await validateReceiptOnServer(purchase);
      if (isValid) {
        await grantPurchaseToUser(purchase);
      }
    }

    console.log('Purchases restored');
  } catch (error) {
    console.error('Failed to restore purchases:', error);
  }
};
```

**Parameters:**

- `options?` (iOS only):
  - `alsoPublishToEventListenerIOS?`: boolean
  - `onlyIncludeActiveItemsIOS?`: boolean

**Returns:** `Promise<Purchase[]>`

**Platform behavior:**

- **iOS** – The optional flags are forwarded to StoreKit 2. `onlyIncludeActiveItemsIOS` defaults to `true`, so results only include active entitlements unless you explicitly pass `false`. Setting `alsoPublishToEventListenerIOS` mirrors the restored purchases through [`purchaseUpdatedListener`](listeners.md#purchaseupdatedlistener) and [`purchaseErrorListener`](listeners.md#purchaseerrorlistener) for apps that consume those callbacks directly.
- **Android** – Google Play separates `inapp` (one-time) and `subs` purchases. The library queries both internally, merges the results, and then runs the unified validation flow, so no additional options are required and both product classes are returned together.

## deepLinkToSubscriptions()

Opens the platform-specific subscription management UI.

```tsx
import {deepLinkToSubscriptions} from 'react-native-iap';

const openSubscriptionSettings = () => {
  try {
    deepLinkToSubscriptions({skuAndroid: 'your_subscription_sku'});
  } catch (error) {
    console.error('Failed to open subscription settings:', error);
  }
};
```

**Returns:** `Promise<void>`

## getStorefront()

Returns the current storefront in ISO 3166-1 alpha-2 or ISO 3166-1 alpha-3 format. Works on iOS and Android; on other platforms it resolves to an empty string.

```tsx
import {getStorefront} from 'react-native-iap';

const storeFront = await getStorefront();
```

**Returns:** `Promise<string>`

## getActiveSubscriptions()

Retrieves all active subscriptions with detailed status information. This method follows the OpenIAP specification for cross-platform subscription management.

```tsx
import {getActiveSubscriptions} from 'react-native-iap';

const checkSubscriptions = async () => {
  try {
    // Get all active subscriptions
    const allActiveSubscriptions = await getActiveSubscriptions();

    // Or filter by specific subscription IDs
    const specificSubscriptions = await getActiveSubscriptions([
      'premium_monthly',
      'premium_yearly',
    ]);

    for (const subscription of allActiveSubscriptions) {
      console.log('Product ID:', subscription.productId);
      console.log('Is Active:', subscription.isActive);

      if (Platform.OS === 'ios') {
        console.log('Expiration Date:', subscription.expirationDateIOS);
        console.log(
          'Days until expiration:',
          subscription.daysUntilExpirationIOS,
        );
        console.log('Environment:', subscription.environmentIOS);
      } else if (Platform.OS === 'android') {
        console.log('Auto Renewing:', subscription.autoRenewingAndroid);
      }

      console.log('Will expire soon:', subscription.willExpireSoon);
    }
  } catch (error) {
    console.error('Failed to get active subscriptions:', error);
  }
};
```

**Parameters:**

- `subscriptionIds?` (string[]): Optional array of subscription product IDs to filter. If not provided, returns all active subscriptions.

**Returns:** `Promise<ActiveSubscription[]>`

**ActiveSubscription Interface:**

```typescript
interface ActiveSubscription {
  productId: string;
  isActive: boolean;
  transactionId: string;
  transactionDate: number; // Epoch milliseconds
  expirationDateIOS?: number | null; // Epoch milliseconds
  daysUntilExpirationIOS?: number | null;
  willExpireSoon?: boolean | null;
  environmentIOS?: string | null; // "Sandbox" | "Production"
  autoRenewingAndroid?: boolean | null;
  purchaseToken?: string | null; // JWS (iOS) or purchaseToken (Android)
}
```

> Optional properties may be `undefined` or `null` when the store does not provide the value (for example, `expirationDateIOS` is only present for auto-renewing products).

**Platform Behavior:**

- **iOS** – Derives status from the latest StoreKit transaction, populating `expirationDateIOS`, `daysUntilExpirationIOS`, and `willExpireSoon` when available.
- **Android** – Aggregates billing client purchases across base plans and auto-renewing states; `autoRenewingAndroid` reflects the current renewal preference.

## hasActiveSubscriptions()

Checks if the user has any active subscriptions. This is a convenience method that returns a boolean result.

```tsx
import {hasActiveSubscriptions} from 'react-native-iap';

const checkIfUserHasSubscription = async () => {
  try {
    // Check if user has any active subscriptions
    const hasAny = await hasActiveSubscriptions();

    // Or check for specific subscriptions
    const hasPremium = await hasActiveSubscriptions([
      'premium_monthly',
      'premium_yearly',
    ]);

    if (hasAny) {
      console.log('User has active subscriptions');
    }

    if (hasPremium) {
      console.log('User has premium subscription');
    }
  } catch (error) {
    console.error('Failed to check subscription status:', error);
  }
};
```

**Parameters:**

- `subscriptionIds?` (string[]): Optional array of subscription product IDs to check. If not provided, checks all subscriptions.

**Returns:** `Promise<boolean>` - Returns true if user has at least one active subscription

## verifyPurchase()

Verifies a purchase using the native OpenIAP implementation. This validates purchases using platform-specific methods.

```tsx
import {verifyPurchase} from 'react-native-iap';

const verify = async (productId: string, purchase: Purchase) => {
  try {
    // All platform options can be provided - the library handles platform detection internally
    const result = await verifyPurchase({
      // iOS App Store verification
      apple: {sku: productId},
      // Google Play Store verification
      google: {
        sku: productId,
        packageName: 'com.example.app',
        purchaseToken: purchase.purchaseToken!, // Required - throws if missing
        accessToken: await getAccessTokenFromServer(), // ⚠️ Must be fetched from your backend
        isSub: true, // Set to true for subscriptions
      },
      // Meta Horizon (Quest) verification
      // horizon: { sku: productId, userId: 'user-id', accessToken: 'token' }
    });

    console.log('Verification result:', result);
  } catch (error) {
    console.error('Verification failed:', error);
  }
};
```

**Parameters:**

- `options` (object):
  - `apple?` (object): Apple App Store verification parameters
    - `sku` (string): Product SKU to validate
  - `google?` (object): Google Play Store verification parameters
    - `sku` (string): Product SKU to validate
    - `packageName` (string): Android package name (e.g., com.example.app)
    - `purchaseToken` (string): Purchase token from the purchase response
    - `accessToken` (string): OAuth2 access token for Google Play API
    - `isSub?` (boolean): Whether the product is a subscription
  - `horizon?` (object): Meta Horizon (Quest) verification parameters
    - `sku` (string): Product SKU to validate
    - `userId` (string): Meta user ID
    - `accessToken` (string): Access token for Meta S2S API

**Returns:** `Promise<VerifyPurchaseResult>` - Platform-specific verification result

For external verification services with additional security, use [`verifyPurchaseWithProvider()`](#verifypurchasewithprovider) instead.

## verifyPurchaseWithProvider()

Verifies a purchase using an external verification provider. Currently supports <IapKitLink>IAPKit</IapKitLink> for server-side purchase validation.

### Verification Basic Usage {#verification-basic-usage}

```tsx
import {verifyPurchaseWithProvider} from 'react-native-iap';

// Note: apiKey is automatically injected from config plugin (iapkitApiKey)
// No need to manually pass it - react-native-iap reads it from Constants.expoConfig.extra.iapkitApiKey

const verifyWithIAPKit = async (purchase: Purchase) => {
  try {
    const result = await verifyPurchaseWithProvider({
      provider: 'iapkit',
      iapkit: {
        // apiKey is auto-filled from config plugin
        apple: {
          jws: purchase.purchaseToken, // JWS from iOS purchase
        },
        google: {
          purchaseToken: purchase.purchaseToken, // Token from Android purchase
        },
      },
    });

    if (result.iapkit) {
      const verification = result.iapkit;
      console.log('Is Valid:', verification.isValid);
      console.log('State:', verification.state);
      console.log('Store:', verification.store);
    }
  } catch (error) {
    console.error('Verification failed:', error);
  }
};
```

### Verification with useIAP Hook {#verification-with-useiap}

First, configure your IAPKit API key in the react-native-iap config plugin:

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-iap",
        {
          "iapkitApiKey": "your_iapkit_api_key_here"
        }
      ]
    ]
  }
}
```

Then use it in your code. The `apiKey` is automatically injected from the config plugin:

```tsx
import {useIAP, verifyPurchaseWithProvider} from 'react-native-iap';
import type {VerifyPurchaseWithProviderProps} from 'react-native-iap';

function PurchaseScreen() {
  const {requestPurchase, finishTransaction} = useIAP({
    onPurchaseSuccess: async (purchase) => {
      // Ensure purchaseToken exists before verification
      if (!purchase.purchaseToken) {
        console.error('No purchase token available for verification');
        // Still finish transaction to avoid stuck state
        await finishTransaction({purchase, isConsumable: false});
        return;
      }

      // Verify with IAPKit before granting entitlement
      // apiKey is auto-filled from config plugin - no need to specify it
      const verifyRequest: VerifyPurchaseWithProviderProps = {
        provider: 'iapkit',
        iapkit: {
          apple: {
            jws: purchase.purchaseToken,
          },
          google: {
            purchaseToken: purchase.purchaseToken,
          },
        },
      };

      try {
        const result = await verifyPurchaseWithProvider(verifyRequest);
        const verification = result.iapkit;

        if (verification?.isValid) {
          // Grant entitlement to user
          await grantPurchaseToUser(purchase);
        } else {
          console.warn('Purchase verification failed:', verification?.state);
        }
      } catch (error) {
        console.error('Verification error:', error);
      }

      // Always finish the transaction
      await finishTransaction({
        purchase,
        isConsumable: false,
      });
    },
  });

  // ... rest of component
}
```

**Parameters:**

- `options` (object):
  - `provider` ('iapkit'): The verification provider to use
  - `iapkit` (object): IAPKit-specific configuration
    - `apiKey` (string, optional): Your IAPKit API key. Auto-filled from config plugin if `iapkitApiKey` is configured.
    - `apple` (object): iOS verification data
      - `jws` (string): The JWS token from the purchase (available as `purchase.purchaseToken` on iOS)
    - `google` (object): Android verification data
      - `purchaseToken` (string): The purchase token from the purchase (available as `purchase.purchaseToken` on Android)

**Returns:** `Promise<VerifyPurchaseWithProviderResult>`

```typescript
interface VerifyPurchaseWithProviderResult {
  provider: 'iapkit';
  iapkit?: IapkitPurchaseResult[];
}

interface IapkitPurchaseResult {
  isValid: boolean;
  state: IapkitPurchaseState;
  store: 'apple' | 'google';
  // Additional fields may be present based on IAPKit response
}

type IapkitPurchaseState =
  | 'entitled' // User is entitled to the product
  | 'pending-acknowledgment' // Purchase pending acknowledgment (Android)
  | 'pending' // Purchase is pending
  | 'canceled' // Purchase was canceled
  | 'expired' // Subscription has expired
  | 'ready-to-consume' // Consumable ready to be consumed
  | 'consumed' // Consumable has been consumed
  | 'unknown' // Unknown state
  | 'inauthentic'; // Purchase could not be verified
```

**Platform Support:**

- **iOS**: Uses the JWS (JSON Web Signature) from StoreKit 2 transactions
- **Android**: Uses the purchase token from Google Play Billing

### Verification Error Handling {#verification-error-handling}

For error handling patterns, purchase states, and best practices when using `verifyPurchaseWithProvider()`, see the [OpenIAP Verification Error Handling](https://www.openiap.dev/docs/apis#verification-error-handling) documentation.

**See also:**

- <IapKitLink>IAPKit</IapKitLink>
- [IAPKit Purchase States](https://www.openiap.dev/docs/apis#iapkit-purchase-states)
- [Error Codes Reference](../error-codes)

## Purchase Interface

```tsx
interface Purchase {
  id: string; // Transaction identifier
  productId: string;
  transactionDate: number;
  purchaseToken?: string; // Unified token (iOS JWS or Android token)

  // iOS-specific properties
  originalTransactionDateIOS?: number;
  originalTransactionIdentifierIOS?: string;
  expirationDateIOS?: number;
  environmentIOS?: 'Production' | 'Sandbox';

  // Android-specific properties
  dataAndroid?: string;
  signatureAndroid?: string;
  purchaseState?: 'pending' | 'purchased' | 'unknown';
  isAcknowledgedAndroid?: boolean;
  packageNameAndroid?: string;
  developerPayloadAndroid?: string;
  obfuscatedAccountIdAndroid?: string;
  obfuscatedProfileIdAndroid?: string;
  autoRenewingAndroid?: boolean;
}
```
