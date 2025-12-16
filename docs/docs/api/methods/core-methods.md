---
title: Core Methods
sidebar_label: Core Methods
sidebar_position: 1
---

import GreatFrontEndTopFixed from "@site/src/uis/GreatFrontEndTopFixed";

# Core Methods

<GreatFrontEndTopFixed />

This section covers the core methods available in react-native-iap for managing in-app purchases.

Note: react-native-iap aligns with the OpenIAP API surface. For canonical cross-SDK API docs, see:

- [OpenIAP APIs](https://www.openiap.dev/docs/apis)

## Unified APIs

These cross‑platform methods work on both iOS and Android. For StoreKit/Play‑specific helpers, see the Platform‑specific APIs section below.

- [`initConnection()`](#initconnection) — Initialize the store connection
- [`endConnection()`](#endconnection) — End the store connection and cleanup
- [`fetchProducts()`](#fetchproducts) — Fetch product and subscription metadata
- [`requestPurchase()`](#requestpurchase) — Start a purchase for products or subscriptions
- [`finishTransaction()`](#finishtransaction) — Complete a transaction after validation
- [`getAvailablePurchases()`](#getavailablepurchases) — Restore non‑consumables and subscriptions
- [`deepLinkToSubscriptions()`](#deeplinktosubscriptions) — Open native subscription management UI
- [`getStorefront()`](#getstorefront) — Get current storefront country code
- [`hasActiveSubscriptions()`](#hasactivesubscriptions) — Check if user has active subscriptions
- [`verifyPurchaseWithProvider()`](#verifypurchasewithprovider) — Verify purchases with external providers (e.g., IAPKit)

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

> **📖 Reference:** [OpenIAP Request APIs](https://www.openiap.dev/docs/apis#request-apis) **⚠️ Platform Differences:**
>
> - **iOS**: Can only purchase one product at a time (uses `sku: string`)
> - **Android**: Can purchase multiple products at once (uses `skus: string[]`)
>
> This exists because the iOS App Store processes purchases individually, while Google Play supports batch purchases.
>
> **📝 Note:** Both consumable and non-consumable in-app products use the same `requestPurchase()` API with `type: 'in-app'`. The platform handles the consumable/non-consumable behavior automatically based on your store configuration.

### Recommended usage with useIAP hook (Recommended)

```tsx
import {useIAP} from 'react-native-iap';

const ProductPurchaseComponent = () => {
  const {requestPurchase, products} = useIAP({
    onPurchaseSuccess: (purchase) => {
      console.log('Purchase successful:', purchase);
      // Grant user access to purchased content
      unlockProduct(purchase.productId);
    },
    onPurchaseError: (error) => {
      console.error('Purchase failed:', error);
      // Handle purchase error (user cancelled, network error, etc.)
    },
  });

  const buyProduct = (productId: string) => {
    requestPurchase({
      request: {
        ios: {
          sku: productId,
          quantity: 1,
        },
        android: {
          skus: [productId],
        },
      },
      type: 'in-app',
    });
    // No need to await - result handled through callbacks above
  };

  return (
    // Your component JSX
  );
};
```

### Direct API usage (Advanced)

```tsx
import {requestPurchase} from 'react-native-iap';

// Product purchase (consumable and non-consumable)
const buyProduct = (productId: string) => {
  requestPurchase({
    request: {
      ios: {
        sku: productId,
        quantity: 1,
      },
      android: {
        skus: [productId],
      },
    },
    type: 'in-app',
  });
  // Purchase result is handled via purchaseUpdatedListener/purchaseErrorListener or useIAP hook callbacks (onPurchaseSuccess, onPurchaseError)
  // See: docs/api/methods/listeners#purchaseupdatedlistener and https://hyochan.github.io/expo-iap/docs/api/methods/listeners#purchaseerrorlistener
};

// Subscription purchase
const buySubscription = (subscriptionId: string, subscription?: any) => {
  requestPurchase({
    request: {
      ios: {
        sku: subscriptionId,
        appAccountToken: 'user-123',
      },
      android: {
        skus: [subscriptionId],
        subscriptionOffers:
          subscription?.subscriptionOfferDetails?.map((offer) => ({
            sku: subscriptionId,
            offerToken: offer.offerToken,
          })) || [],
      },
    },
    type: 'subs',
  });
  // Purchase result is handled via purchaseUpdatedListener/purchaseErrorListener or useIAP hook callbacks (onPurchaseSuccess, onPurchaseError)
  // See: docs/api/methods/listeners#purchaseupdatedlistener and https://hyochan.github.io/expo-iap/docs/api/methods/listeners#purchaseerrorlistener
};
```

### Detailed Platform Examples

#### iOS Only

```tsx
await requestPurchase({
  request: {
    sku: productId,
    quantity: 1,
    appAccountToken: 'user-account-token',
  },
  type: 'in-app',
});
```

#### Android Only

```tsx
await requestPurchase({
  request: {
    skus: [productId],
    obfuscatedAccountIdAndroid: 'user-account-id',
    obfuscatedProfileIdAndroid: 'user-profile-id',
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
    - `appAccountToken?` (string, iOS only): User identifier for receipt validation
    - `obfuscatedAccountIdAndroid?` (string, Android only): Obfuscated account ID
    - `obfuscatedProfileIdAndroid?` (string, Android only): Obfuscated profile ID
    - `isOfferPersonalized?` (boolean, Android only): Whether offer is personalized
  - `type?` ('in-app' | 'subs'): Purchase type, defaults to 'in-app'

**Returns:** `Promise<Purchase | Purchase[] | void>`

**Note:** The actual purchase result is delivered through purchase listeners or the `useIAP` hook callbacks, not as a return value.

#### Important Subscription Properties

For subscription status checks after a purchase or when listing entitlements:

- iOS: Check `expirationDateIOS` to determine if the subscription is still active
- Android: Check `autoRenewingAndroid` to see if auto‑renewal has been canceled

## finishTransaction()

Completes a purchase transaction. Must be called after successful receipt validation.

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

**Platform behaviour:**

- **iOS** – the library forwards the optional flags through StoreKit 2. `onlyIncludeActiveItemsIOS` defaults to `true`, so the result only contains entitlements that are still active. Setting `alsoPublishToEventListenerIOS` mirrors the data through the purchase event listeners for apps that subscribe directly to those callbacks.
- **Android** – Google Play separates `inapp` (one‑time) and `subs` purchases. The library internally calls the billing client twice—once for each type—and merges the results before running validation. No additional options are required; both product classes are returned together.

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

Return the storefront in ISO 3166-1 alpha-2 or ISO 3166-1 alpha-3 format. Works on both iOS and Android—on other platforms it returns an empty string.

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
  transactionDate: number; // epoch milliseconds
  expirationDateIOS?: number | null; // epoch milliseconds
  daysUntilExpirationIOS?: number | null;
  willExpireSoon?: boolean | null;
  environmentIOS?: string | null; // "Sandbox" | "Production"
  autoRenewingAndroid?: boolean | null;
  purchaseToken?: string | null; // JWS (iOS) or purchaseToken (Android)
}
```

> Optional properties may be `undefined` or `null` when the store does not provide the value (for example, `expirationDateIOS` is only present for auto-renewing products).

**Platform Behavior:**

- **iOS**: Derived from StoreKit 2 entitlements. `expirationDateIOS`, `daysUntilExpirationIOS`, and `environmentIOS` come directly from the latest validated transaction.
- **Android**: Derived from Google Play Billing purchases. `autoRenewingAndroid` mirrors the Play auto-renew flag and `purchaseToken` forwards the token you need for server-side validation.
- **Shared**: `transactionId` and `transactionDate` correspond to the most recent entitlement event on either platform.

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
import {Platform} from 'react-native';

// iOS verification (simple - just needs SKU)
const verifyIOS = async (sku: string) => {
  try {
    const result = await verifyPurchase({
      apple: {sku},
    });
    console.log('iOS Verification result:', result);
  } catch (error) {
    console.error('Verification failed:', error);
  }
};

// Android verification (requires additional parameters)
const verifyAndroid = async (purchase: Purchase) => {
  try {
    const result = await verifyPurchase({
      google: {
        sku: purchase.productId,
        packageName: purchase.packageNameAndroid!,
        purchaseToken: purchase.purchaseToken!,
        accessToken: 'your-google-api-access-token',
        isSub: false, // Set to true for subscriptions
      },
    });
    console.log('Android Verification result:', result);
  } catch (error) {
    console.error('Verification failed:', error);
  }
};

// Cross-platform verification
const verifyPurchaseCrossPlatform = async (purchase: Purchase) => {
  try {
    const result = await verifyPurchase({
      apple: {sku: purchase.productId},
      google: {
        sku: purchase.productId,
        packageName: purchase.packageNameAndroid ?? '',
        purchaseToken: purchase.purchaseToken ?? '',
        accessToken: 'your-google-api-access-token',
        isSub: false,
      },
    });
    console.log('Verification result:', result);
  } catch (error) {
    console.error('Verification failed:', error);
  }
};
```

**Parameters:**

- `options` (object): Platform-specific verification parameters
  - `apple?` (object): Apple App Store verification options
    - `sku` (string): Product SKU to validate
  - `google?` (object): Google Play Store verification options
    - `sku` (string): Product SKU to validate
    - `accessToken` (string): Google OAuth2 access token for API authentication
    - `packageName` (string): Android package name (e.g., `com.example.app`)
    - `purchaseToken` (string): Purchase token from the purchase response
    - `isSub?` (boolean): Whether this is a subscription purchase
  - `horizon?` (object): Meta Horizon (Quest) verification options
    - `sku` (string): SKU for the add-on item
    - `accessToken` (string): Meta API access token
    - `userId` (string): User ID to verify purchase for

**Returns:** `Promise<VerifyPurchaseResult>` - Platform-specific verification result

**Important Notes:**

- **iOS**: Only requires `apple.sku` - verification uses StoreKit 2's built-in verification
- **Android**: Requires all `google` parameters - verification calls Google Play Developer API
- **Horizon**: Requires all `horizon` parameters - verification calls Meta's S2S verify_entitlement API

For external verification services with additional security, use [`verifyPurchaseWithProvider()`](#verifypurchasewithprovider) instead.

## verifyPurchaseWithProvider()

Verifies purchases using external verification services like IAPKit. This provides additional validation and security beyond local device verification.

```tsx
import {verifyPurchaseWithProvider, finishTransaction} from 'react-native-iap';

try {
  const result = await verifyPurchaseWithProvider({
    provider: 'iapkit',
    iapkit: {
      apiKey: 'your-api-key',
      apple: {jws: purchase.purchaseToken},
      google: {purchaseToken: purchase.purchaseToken},
    },
  });

  if (result.iapkit?.isValid) {
    // Verification succeeded - grant access
    await finishTransaction(purchase);
    grantAccess();
  } else {
    // Verification failed (isValid: false) - actually invalid purchase
    // Don't call finishTransaction - allow retry
    denyAccess();
  }
} catch (error) {
  // Verification itself failed (network, server error, etc.)
  // This doesn't mean the purchase is invalid - don't penalize the customer
  console.error('Verification failed:', error);
  await finishTransaction(purchase); // Complete the transaction
  grantAccess(); // Grant access (fail-open approach)
}
```

**Parameters:**

- `params` (object):
  - `provider` ('iapkit'): The verification provider to use
  - `iapkit?` (object): IAPKit-specific configuration
    - `apiKey?` (string): Your IAPKit API key. **Optional since v14.6.1 if configured via [Expo config plugin](/docs/guides/expo-plugin#iapkit-api-key)** - will be automatically read from native config (Info.plist on iOS, AndroidManifest.xml on Android). If provided, takes priority over config plugin.
    - `apple?` (object): iOS verification data
      - `jws` (string): The JWS token from the purchase
    - `google?` (object): Android verification data
      - `purchaseToken` (string): The purchase token

**Returns:** `Promise<VerifyPurchaseWithProviderResult>`

```typescript
interface VerifyPurchaseWithProviderResult {
  provider: 'iapkit';
  iapkit?: {
    isValid: boolean;
    state: IapkitPurchaseState;
    store: IapStore;
  } | null;
  errors?: VerifyPurchaseWithProviderError[] | null;
}

interface VerifyPurchaseWithProviderError {
  code?: string | null;
  message: string;
}

type IapkitPurchaseState =
  | 'pending'
  | 'unknown'
  | 'entitled'
  | 'pending-acknowledgment'
  | 'canceled'
  | 'expired'
  | 'ready-to-consume'
  | 'consumed'
  | 'inauthentic';

type IapStore = 'unknown' | 'apple' | 'google' | 'horizon';
```

> For detailed descriptions of each `IapkitPurchaseState`, see the [OpenIAP IAPKit Purchase States documentation](https://www.openiap.dev/docs/apis#iapkit-purchase-states).

**Platform Behavior:**

- **iOS**: Sends the JWS (JSON Web Signature) token to IAPKit for server-side verification
- **Android**: Sends the purchase token along with package name and product ID for verification
- **Both**: Returns the verification state and validity from IAPKit's servers

**Use Cases:**

- Server-side receipt validation without maintaining your own validation infrastructure
- Cross-platform purchase verification with a unified API
- Enhanced security through external verification services

> **Note:** You need an IAPKit API key to use this feature. Visit [iapkit.com](https://iapkit.com) to get started.

### Error Handling & Purchase Identifiers

For detailed guidance on error handling best practices and purchase identifier usage, see the [OpenIAP Verification Error Handling documentation](https://www.openiap.dev/docs/apis#verification-error-handling).

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
  purchaseStateAndroid?: number;
  isAcknowledgedAndroid?: boolean;
  packageNameAndroid?: string;
  developerPayloadAndroid?: string;
  obfuscatedAccountIdAndroid?: string;
  obfuscatedProfileIdAndroid?: string;
  autoRenewingAndroid?: boolean;
}
```

## Platform-specific APIs

### iOS Specific

The following iOS‑only helpers expose StoreKit and App Store specific capabilities. Most day‑to‑day flows are covered by the cross‑platform Core Methods above; use these only when you need iOS features.

### clearTransactionIOS()

Clears all pending transactions from the iOS payment queue. Useful if your app previously crashed or missed finishing transactions.

```ts
import {clearTransactionIOS, getPendingTransactionsIOS} from 'react-native-iap';

// Inspect then clear
const pending = await getPendingTransactionsIOS();
if (pending.length) {
  await clearTransactionIOS();
}
```

Returns: `Promise<void>`

### getStorefrontIOS()

Returns the current App Store storefront country code (for example, "US", "GB").

```ts
import {getStorefrontIOS} from 'react-native-iap';

const storefront = await getStorefrontIOS();
```

Returns: `Promise<string>`

### getPromotedProductIOS()

Gets the currently promoted product, if any. Requires iOS 11+.

```ts
import {getPromotedProductIOS} from 'react-native-iap';

const promoted = await getPromotedProductIOS();
if (promoted) {
  // Show your purchase UI for the promoted product
}
```

Returns: `Promise<Product | null>`

### requestPurchaseOnPromotedProductIOS()

Initiates the purchase flow for the currently promoted product. Requires iOS 11+.

```ts
import {requestPurchaseOnPromotedProductIOS} from 'react-native-iap';

await requestPurchaseOnPromotedProductIOS();
// Purchase result is delivered via purchase listeners/useIAP callbacks
```

Returns: `Promise<void>`

### getPendingTransactionsIOS()

Returns all transactions that are pending completion in the StoreKit payment queue.

```ts
import {getPendingTransactionsIOS} from 'react-native-iap';

const pending = await getPendingTransactionsIOS();
```

Returns: `Promise<Purchase[]>`

### isEligibleForIntroOfferIOS()

Checks if the user is eligible for an introductory offer for a subscription group. Requires iOS 12.2+.

```ts
import {isEligibleForIntroOfferIOS, fetchProducts} from 'react-native-iap';

// Example: derive group ID from a fetched subscription product
const [sub] = await fetchProducts({skus: ['your_sub_sku'], type: 'subs'});
const groupId = sub?.subscriptionInfoIOS?.subscriptionGroupId ?? '';
const eligible = groupId ? await isEligibleForIntroOfferIOS(groupId) : false;
```

Returns: `Promise<boolean>`

### subscriptionStatusIOS()

Returns detailed subscription status information using StoreKit 2. Requires iOS 15+.

```ts
import {subscriptionStatusIOS} from 'react-native-iap';

const statuses = await subscriptionStatusIOS('your_sub_sku');
```

Returns: `Promise<SubscriptionStatusIOS[]>`

### currentEntitlementIOS()

Returns the current entitlement for a given SKU using StoreKit 2. Requires iOS 15+.

```ts
import {currentEntitlementIOS} from 'react-native-iap';

const entitlement = await currentEntitlementIOS('your_sub_or_product_sku');
```

Returns: `Promise<Purchase | null>`

### latestTransactionIOS()

Returns the most recent transaction for a given SKU using StoreKit 2. Requires iOS 15+.

```ts
import {latestTransactionIOS} from 'react-native-iap';

const last = await latestTransactionIOS('your_sku');
```

Returns: `Promise<Purchase | null>`

### showManageSubscriptionsIOS()

Opens the native subscription management interface and returns purchases for subscriptions whose auto‑renewal status changed while the sheet was open. Requires iOS 15+.

```ts
import {showManageSubscriptionsIOS} from 'react-native-iap';

const changed = await showManageSubscriptionsIOS();
if (changed.length > 0) {
  // Update your UI / server using returned purchases
}
```

Returns: `Promise<Purchase[]>`

### beginRefundRequestIOS()

Presents the refund request sheet for a specific SKU. Requires iOS 15+.

```ts
import {beginRefundRequestIOS} from 'react-native-iap';

const status = await beginRefundRequestIOS('your_sku');
// status: 'success' | 'userCancelled'
```

Returns: `Promise<'success' | 'userCancelled'>`

### isTransactionVerifiedIOS()

Verifies the latest transaction for a given SKU using StoreKit 2. Requires iOS 15+.

```ts
import {isTransactionVerifiedIOS} from 'react-native-iap';

const ok = await isTransactionVerifiedIOS('your_sku');
```

Returns: `Promise<boolean>`

### getTransactionJwsIOS()

Returns the JSON Web Signature (JWS) for a transaction derived from a given SKU. Use this for server‑side validation. Requires iOS 15+.

```ts
import {getTransactionJwsIOS} from 'react-native-iap';

const jws = await getTransactionJwsIOS('your_sku');
```

Returns: `Promise<string>`

### getReceiptDataIOS()

Returns the base64‑encoded receipt data for server validation.

```ts
import {getReceiptDataIOS} from 'react-native-iap';

const receipt = await getReceiptDataIOS();
```

Returns: `Promise<string>`

### syncIOS()

Forces a sync with StoreKit to ensure all transactions are up to date. Requires iOS 15+.

```ts
import {syncIOS} from 'react-native-iap';

await syncIOS();
```

Returns: `Promise<void>`

### presentCodeRedemptionSheetIOS()

Presents the system sheet for redeeming App Store promo/offer codes.

```ts
import {presentCodeRedemptionSheetIOS} from 'react-native-iap';

await presentCodeRedemptionSheetIOS();
```

Returns: `Promise<boolean>`

### getAppTransactionIOS()

Gets app transaction information for iOS apps (iOS 16.0+). AppTransaction represents the initial purchase that unlocked the app, useful for premium apps or apps that were previously paid.

> Runtime: iOS 16.0+; Build: Xcode 15.0+ with iOS 16.0 SDK. Older SDKs will throw.

```tsx
import {getAppTransactionIOS} from 'react-native-iap';

const fetchAppTransaction = async () => {
  try {
    const appTransaction = await getAppTransactionIOS();
    if (appTransaction) {
      console.log('App Transaction ID:', appTransaction.appTransactionId);
      console.log(
        'Original Purchase Date:',
        new Date(appTransaction.originalPurchaseDate),
      );
      console.log('Device Verification:', appTransaction.deviceVerification);
    }
  } catch (error) {
    console.error('Failed to get app transaction:', error);
  }
};
```

**Returns:** `Promise<AppTransaction | null>`

```ts
interface AppTransaction {
  appTransactionId?: string; // iOS 18.4+
  originalPlatform?: string; // iOS 18.4+
  bundleId: string;
  appVersion: string;
  originalAppVersion: string;
  originalPurchaseDate: number; // ms since epoch
  deviceVerification: string;
  deviceVerificationNonce: string;
  environment: string;
  signedDate: number;
  appId?: number;
  appVersionId?: number;
  preorderDate?: number;
}
```

### Android Specific

#### acknowledgePurchaseAndroid

Acknowledge a non‑consumable purchase or subscription on Android.

```ts
import {acknowledgePurchaseAndroid} from 'react-native-iap';

await acknowledgePurchaseAndroid({token: purchase.purchaseToken!});
```

Notes:

- finishTransaction() calls this automatically when `isConsumable` is false. You typically do not need to call it directly.

#### consumePurchaseAndroid

Consume a purchase (consumables only). This marks an item as consumed so it can be purchased again.

Notes:

- finishTransaction() calls Android consumption automatically when `isConsumable` is true.
- A direct JS helper is not exposed; consumption is handled internally via the native module.

#### flushFailedPurchasesCachedAsPendingAndroid (Removed)

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

This ensures pending transactions are surfaced and properly resolved without a separate “flush” API.

## Alternative Billing APIs

Alternative billing enables developers to offer payment options outside of the platform's standard billing systems. Both platforms require special approval.

### Billing Programs API (Android 8.2.0+) - Recommended

:::tip New in 14.6.0
The Billing Programs API is the recommended approach for apps using Google Play Billing Library 8.2.0+. It replaces the deprecated alternative billing APIs.
:::

#### enableBillingProgramAndroid()

Enable a billing program before calling `initConnection()`.

```tsx
import {enableBillingProgramAndroid, initConnection} from 'react-native-iap';

// Enable before initConnection
enableBillingProgramAndroid('external-offer');
await initConnection();
```

**Parameters:**

- `program`: `BillingProgramAndroid` - `'unspecified'` | `'external-content-link'` | `'external-offer'`

**Returns:** `void`

**Platform:** Android only

#### isBillingProgramAvailableAndroid() {#isbillingprogramavailableandroid}

Check if a billing program is available for the current user.

```tsx
import {isBillingProgramAvailableAndroid} from 'react-native-iap';

const result = await isBillingProgramAvailableAndroid('external-offer');
if (result.isAvailable) {
  // Program is available for this user
}
```

**Parameters:**

- `program`: `BillingProgramAndroid` - The billing program to check

**Returns:** `Promise<BillingProgramAvailabilityResultAndroid>`

```tsx
interface BillingProgramAvailabilityResultAndroid {
  billingProgram: BillingProgramAndroid;
  isAvailable: boolean;
}
```

**Platform:** Android only

#### createBillingProgramReportingDetailsAndroid() {#createbillingprogramreportingdetailsandroid}

Create reporting details with an external transaction token for Google Play reporting.

```tsx
import {createBillingProgramReportingDetailsAndroid} from 'react-native-iap';

const details = await createBillingProgramReportingDetailsAndroid('external-offer');
// Send details.externalTransactionToken to your backend for Google Play reporting
```

**Parameters:**

- `program`: `BillingProgramAndroid` - The billing program

**Returns:** `Promise<BillingProgramReportingDetailsAndroid>`

```tsx
interface BillingProgramReportingDetailsAndroid {
  billingProgram: BillingProgramAndroid;
  externalTransactionToken: string;
}
```

**Platform:** Android only

#### launchExternalLinkAndroid() {#launchexternallinkandroid}

Launch an external link for billing programs.

```tsx
import {launchExternalLinkAndroid} from 'react-native-iap';

const success = await launchExternalLinkAndroid({
  billingProgram: 'external-offer',
  launchMode: 'launch-in-external-browser-or-app',
  linkType: 'link-to-digital-content-offer',
  linkUri: 'https://your-website.com/purchase',
});
```

**Parameters:**

- `params`: `LaunchExternalLinkParamsAndroid`
  - `billingProgram`: `BillingProgramAndroid` - The billing program
  - `launchMode`: `ExternalLinkLaunchModeAndroid` - How to launch the link
  - `linkType`: `ExternalLinkTypeAndroid` - Type of external link
  - `linkUri`: `string` - The URL to open

**Returns:** `Promise<boolean>` - `true` if launch was successful

**Platform:** Android only

#### Complete Billing Programs Flow

```tsx
import {
  enableBillingProgramAndroid,
  isBillingProgramAvailableAndroid,
  createBillingProgramReportingDetailsAndroid,
  launchExternalLinkAndroid,
  initConnection,
} from 'react-native-iap';

// Step 1: Enable billing program BEFORE initConnection
enableBillingProgramAndroid('external-offer');

// Step 2: Initialize connection
await initConnection();

// Step 3: Check if program is available
const {isAvailable} = await isBillingProgramAvailableAndroid('external-offer');
if (!isAvailable) {
  console.log('External offers not available for this user');
  return;
}

// Step 4: Launch external link
const success = await launchExternalLinkAndroid({
  billingProgram: 'external-offer',
  launchMode: 'launch-in-external-browser-or-app',
  linkType: 'link-to-digital-content-offer',
  linkUri: 'https://your-website.com/purchase',
});

if (success) {
  // Step 5: Get reporting token after external purchase
  const details = await createBillingProgramReportingDetailsAndroid('external-offer');

  // Step 6: Report to Google Play backend
  await reportExternalTransaction(details.externalTransactionToken);
}
```

### Legacy Alternative Billing APIs (Pre-8.2.0)

For apps using older Billing Library versions, the legacy APIs are still supported but deprecated.

### Android Alternative Billing (Legacy)

Android supports two modes:

- **Alternative Billing Only**: Only your payment system is available
- **User Choice Billing**: Users choose between Google Play and your payment system

#### Initialize with Alternative Billing

```tsx
import {initConnection} from 'react-native-iap';

// Alternative Billing Only mode
await initConnection({
  alternativeBillingModeAndroid: 'alternative-only',
});

// User Choice Billing mode
await initConnection({
  alternativeBillingModeAndroid: 'user-choice',
});
```

**Parameters:**

- `alternativeBillingModeAndroid`: `'none'` | `'alternative-only'` | `'user-choice'`

#### checkAlternativeBillingAvailabilityAndroid()

Check if alternative billing is available for the current user/device.

```tsx
import {checkAlternativeBillingAvailabilityAndroid} from 'react-native-iap';

const isAvailable = await checkAlternativeBillingAvailabilityAndroid();
if (isAvailable) {
  // Proceed with alternative billing flow
}
```

**Returns:** `Promise<boolean>`

**Platform:** Android only

#### showAlternativeBillingDialogAndroid()

Show the alternative billing information dialog to the user. Must be called **before** processing payment in your payment system.

```tsx
import {showAlternativeBillingDialogAndroid} from 'react-native-iap';

const userAccepted = await showAlternativeBillingDialogAndroid();
if (userAccepted) {
  // User accepted - process payment in your system
  const success = await processCustomPayment();

  if (success) {
    // Create token for Google Play reporting
    const token = await createAlternativeBillingTokenAndroid();
  }
}
```

**Returns:** `Promise<boolean>` - `true` if user accepted, `false` if cancelled

**Platform:** Android only

#### createAlternativeBillingTokenAndroid()

Create an external transaction token for Google Play reporting. Must be called **after** successful payment in your payment system. Token must be reported to Google Play backend within 24 hours.

```tsx
import {createAlternativeBillingTokenAndroid} from 'react-native-iap';

// After successful payment in your system
const token = await createAlternativeBillingTokenAndroid(
  'premium_subscription',
);

if (token) {
  // Send token to your backend for Google Play reporting
  await fetch('/api/report-transaction', {
    method: 'POST',
    body: JSON.stringify({token, productId: 'premium_subscription'}),
  });
}
```

**Parameters:**

- `sku?: string` - Optional product SKU that was purchased

**Returns:** `Promise<string | null>` - Token string or null if creation failed

**Platform:** Android only

#### Complete Alternative Billing Flow (Android)

```tsx
// Step 1: Check availability
const isAvailable = await checkAlternativeBillingAvailabilityAndroid();
if (!isAvailable) {
  console.log('Alternative billing not available');
  return;
}

// Step 2: Show information dialog
const userAccepted = await showAlternativeBillingDialogAndroid();
if (!userAccepted) {
  console.log('User cancelled');
  return;
}

// Step 3: Process payment in your payment system
const paymentSuccess = await yourPaymentSystem.processPayment({
  productId: 'premium_subscription',
  amount: 9.99,
});

if (!paymentSuccess) {
  console.log('Payment failed');
  return;
}

// Step 4: Create token for Google Play reporting
const token = await createAlternativeBillingTokenAndroid(
  'premium_subscription',
);

if (token) {
  // Step 5: Report to Google Play backend (within 24 hours)
  await yourBackend.reportToGooglePlay({
    token,
    productId: 'premium_subscription',
    userId: currentUser.id,
  });

  console.log('Alternative billing completed successfully');
}
```

### iOS External Purchase

iOS alternative billing works by redirecting users to an external website where they complete the purchase.

#### canPresentExternalPurchaseNoticeIOS()

Check if the device can present an external purchase notice sheet.

```tsx
import {canPresentExternalPurchaseNoticeIOS} from 'react-native-iap';

const canPresent = await canPresentExternalPurchaseNoticeIOS();
if (canPresent) {
  // Present notice before external purchase
}
```

**Returns:** `Promise<boolean>`

**Platform:** iOS 18.2+ only

**Requires:** `com.apple.developer.storekit.external-purchase` entitlement

#### presentExternalPurchaseNoticeSheetIOS()

Present an external purchase notice sheet to inform users about external purchases. This must be called before opening an external purchase link.

```tsx
import {presentExternalPurchaseNoticeSheetIOS} from 'react-native-iap';

const result = await presentExternalPurchaseNoticeSheetIOS();

if (result.result === 'continue') {
  // User chose to continue, open external purchase link
  await presentExternalPurchaseLinkIOS('https://your-website.com/purchase');
} else if (result.result === 'cancel') {
  console.log('User cancelled');
}
```

**Returns:** `Promise<ExternalPurchaseNoticeResultIOS>`

```tsx
interface ExternalPurchaseNoticeResultIOS {
  result: 'continue' | 'cancel';
  error?: string;
}
```

**Platform:** iOS 18.2+ only

**Requires:** `com.apple.developer.storekit.external-purchase` entitlement

#### presentExternalPurchaseLinkIOS()

Present an external purchase link to redirect users to your website.

```tsx
import {presentExternalPurchaseLinkIOS} from 'react-native-iap';

const result = await presentExternalPurchaseLinkIOS(
  'https://your-website.com/purchase',
);

if (result.success) {
  console.log('User was redirected to external website');
  // Complete purchase on your website
  // Implement deep link to return to app
} else if (result.error) {
  console.error('Error:', result.error);
}
```

**Parameters:**

- `url: string` - The external purchase URL to open

**Returns:** `Promise<ExternalPurchaseLinkResultIOS>`

```tsx
interface ExternalPurchaseLinkResultIOS {
  success: boolean;
  error?: string;
}
```

**Platform:** iOS 16.0+ only

**Requires:**

- `com.apple.developer.storekit.external-purchase` entitlement
- URL must be configured in Info.plist

#### iOS Configuration

For iOS alternative billing, you need to configure your app with the Expo config plugin:

```tsx
// app.config.ts
export default {
  plugins: [
    [
      'react-native-iap',
      {
        iosAlternativeBilling: {
          // Required: Countries where external purchases are supported
          countries: ['kr', 'nl', 'de', 'fr'], // ISO 3166-1 alpha-2

          // Optional: External purchase URLs per country (iOS 15.4+)
          links: {
            kr: 'https://your-site.com/kr/checkout',
            nl: 'https://your-site.com/nl/checkout',
          },

          // Optional: Multiple URLs per country (iOS 17.5+, up to 5)
          multiLinks: {
            de: [
              'https://your-site.com/de/checkout',
              'https://your-site.com/de/special-offer',
            ],
          },

          // Optional: Custom link regions (iOS 18.1+)
          customLinkRegions: ['de', 'fr', 'nl'],

          // Optional: Streaming regions for music apps (iOS 18.2+)
          streamingLinkRegions: ['at', 'de', 'fr', 'nl'],

          // Enable external purchase link entitlement
          enableExternalPurchaseLink: true,

          // Enable streaming entitlement (music apps only)
          enableExternalPurchaseLinkStreaming: false,
        },
      },
    ],
  ],
};
```

This automatically adds the required entitlements and Info.plist configuration.

:::warning Requirements

- **Approval Required**: You must obtain approval from Apple/Google to use alternative billing
- **iOS URL Format**: URLs must use HTTPS, have no query parameters, and be 1,000 characters or fewer
- **Android Reporting**: External transaction tokens must be reported to Google Play within 24 hours
- **Service Fees**: Reduced fees apply when using alternative billing (varies by platform and region) :::

For complete guides, see:

- [Alternative Billing Guide](/docs/guides/alternative-billing) (coming soon)
- [OpenIAP Alternative Billing](https://www.openiap.dev/docs/alternative-billing)
- [Apple External Purchase](https://developer.apple.com/documentation/storekit/external-purchase)
- [Google Alternative Billing](https://developer.android.com/google/play/billing/alternative)

## Removed APIs

- `requestProducts()` — Removed in v3.0.0. Use `fetchProducts({ skus, type })` instead.
