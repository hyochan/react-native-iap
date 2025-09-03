---
title: Core Methods
sidebar_label: Core Methods
sidebar_position: 1
---

import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# Core Methods

<AdFitTopFixed />

This section covers the core methods available in react-native-iap for managing in-app purchases.

## 🚨 Important Platform Differences

> **Critical for Cross-Platform Development:** iOS and Android have fundamental differences in their purchase APIs.

### Key Differences

- **iOS**: Can only purchase **one product at a time** (single SKU)
- **Android**: Can purchase **multiple products at once** (array of SKUs)

This difference exists because:

- iOS App Store processes purchases individually
- Google Play Store supports batch purchases

| Method              | iOS                | Android               | Cross-Platform Solution             |
| ------------------- | ------------------ | --------------------- | ----------------------------------- |
| `requestPurchase()` | Uses `sku: string` | Uses `skus: string[]` | Platform-specific handling required |

**💡 Best Practice:** Use the new platform-specific API (v14.0.0-rc+) to avoid platform checks:

```tsx
// New API - no Platform.OS checks needed!
await requestPurchase({
  request: {
    ios: { sku: productId },
    android: { skus: [productId] },
  },
  type: 'inapp',
})
```

**🎯 Recommended Approach:** For the best developer experience, use the [`useIAP` hook](/docs/api/use-iap) which handles platform differences automatically and provides a cleaner callback-based API.

## Core Connection Methods

### initConnection()

Initializes the connection to the store. This method must be called before any other store operations.

```tsx
import { initConnection } from 'react-native-iap'

const initialize = async () => {
  try {
    const result = await initConnection()
    console.log('Store connection initialized:', result)
  } catch (error) {
    console.error('Failed to initialize connection:', error)
  }
}
```

**Returns:** `Promise<boolean>`

**Note:** When using the `useIAP` hook, connection is automatically managed.

### endConnection()

Ends the connection to the store and cleans up resources.

```tsx
import { endConnection } from 'react-native-iap'

const cleanup = async () => {
  try {
    const result = await endConnection()
    console.log('Store connection ended:', result)
  } catch (error) {
    console.error('Failed to end connection:', error)
  }
}
```

**Returns:** `Promise<boolean>`

**Note:** When using the `useIAP` hook, connection cleanup is automatic.

## Product Management

### fetchProducts()

Fetches product or subscription information from the store.

```tsx
import { fetchProducts } from 'react-native-iap'

// Fetch in-app products
const loadProducts = async () => {
  try {
    const products = await fetchProducts({
      skus: ['com.example.product1', 'com.example.product2'],
      type: 'inapp',
    })

    console.log('Products:', products)
    return products
  } catch (error) {
    console.error('Failed to fetch products:', error)
  }
}

// Fetch subscriptions
const loadSubscriptions = async () => {
  try {
    const subscriptions = await fetchProducts({
      skus: ['com.example.premium_monthly', 'com.example.premium_yearly'],
      type: 'subs',
    })

    console.log('Subscriptions:', subscriptions)
    return subscriptions
  } catch (error) {
    console.error('Failed to fetch subscriptions:', error)
  }
}
```

**Parameters:**

- `params` (object):
  - `skus` (string[]): Array of product or subscription IDs to fetch
  - `type` ('inapp' | 'subs'): Product type - 'inapp' for products (default), 'subs' for subscriptions

**Returns:** `Promise<Product[]>`

## Purchase Methods

### requestPurchase()

Initiates a purchase request for products or subscriptions.

> **⚠️ Important:** This is an event-based operation. Listen for events through `purchaseUpdatedListener` or `purchaseErrorListener`.

> **⚠️ Platform Differences:**
>
> - **iOS**: Can only purchase one product at a time (uses `sku: string`)
> - **Android**: Can purchase multiple products at once (uses `skus: string[]`)

#### Platform-Specific API (v14.0.0-rc+) - Recommended

```tsx
import { requestPurchase } from 'react-native-iap'

// Product purchase
const buyProduct = async (productId: string) => {
  try {
    await requestPurchase({
      request: {
        ios: {
          sku: productId,
          quantity: 1,
        },
        android: {
          skus: [productId],
        },
      },
      type: 'inapp',
    })
  } catch (error) {
    console.error('Purchase failed:', error)
  }
}

// Subscription purchase
const buySubscription = async (subscriptionId: string, subscription?: any) => {
  try {
    await requestPurchase({
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
    })
  } catch (error) {
    console.error('Subscription failed:', error)
  }
}
```

**Parameters:**

- `params` (object):
  - `request` (object): Purchase request configuration
    - **iOS**: `sku` (string) - Product ID to purchase
    - **Android**: `skus` (string[]) - Array of product IDs to purchase
    - Additional platform-specific options available
  - `type?` ('inapp' | 'subs'): Purchase type, defaults to 'inapp'

**Returns:** `Promise<void>` - Purchase result is delivered through listeners

### getAvailablePurchases()

Retrieves available purchases for restoration (non-consumable products and subscriptions).

```tsx
import { getAvailablePurchases } from 'react-native-iap'

const restorePurchases = async () => {
  try {
    const purchases = await getAvailablePurchases({
      onlyIncludeActiveItemsIOS: true,
    })

    for (const purchase of purchases) {
      // Validate and restore each purchase
      const isValid = await validateReceiptOnServer(purchase)
      if (isValid) {
        await grantPurchaseToUser(purchase)
      }
    }

    console.log('Purchases restored')
  } catch (error) {
    console.error('Failed to restore purchases:', error)
  }
}
```

**Parameters:**

- `options?` (object):
  - `alsoPublishToEventListenerIOS?` (boolean): Whether to also publish to event listener (iOS only)
  - `onlyIncludeActiveItemsIOS?` (boolean): Whether to only include active items (iOS only)

**Returns:** `Promise<Purchase[]>`

### finishTransaction()

Completes a purchase transaction. Must be called after successful receipt validation.

```tsx
import { finishTransaction } from 'react-native-iap'

const completePurchase = async (purchase) => {
  try {
    // Validate receipt on your server first
    const isValid = await validateReceiptOnServer(purchase)

    if (isValid) {
      // Grant purchase to user
      await grantPurchaseToUser(purchase)

      // Finish the transaction
      await finishTransaction({
        purchase,
        isConsumable: true, // Set to true for consumable products
      })

      console.log('Transaction completed')
    }
  } catch (error) {
    console.error('Failed to finish transaction:', error)
  }
}
```

**Parameters:**

- `params` (object):
  - `purchase` (Purchase): The purchase object to finish
  - `isConsumable?` (boolean): Whether the product is consumable (Android only)

**Returns:** `Promise<PurchaseResult | boolean>`

## Event Listeners

### purchaseUpdatedListener()

Fired when a purchase is successful or when a pending purchase is completed.

```tsx
import { purchaseUpdatedListener } from 'react-native-iap'

const subscription = purchaseUpdatedListener((purchase) => {
  console.log('Purchase successful:', purchase)
  // 1. Validate receipt with backend
  // 2. Deliver content to user
  // 3. Call finishTransaction to acknowledge
})

// Later, clean up
subscription.remove()
```

**Returns:** `EventSubscription` object with `remove()` method

### purchaseErrorListener()

Fired when a purchase fails or is cancelled by the user.

```tsx
import { purchaseErrorListener } from 'react-native-iap'

const subscription = purchaseErrorListener((error) => {
  switch (error.code) {
    case 'E_USER_CANCELLED':
      // User cancelled - no action needed
      break
    case 'E_ITEM_UNAVAILABLE':
      // Product not available
      break
    case 'E_NETWORK_ERROR':
      // Retry with backoff
      break
  }
})

// Later, clean up
subscription.remove()
```

**Returns:** `EventSubscription` object with `remove()` method

## Receipt Validation

### validateReceipt()

Validates receipt on both iOS and Android platforms.

```tsx
import { validateReceipt, Platform } from 'react-native-iap'

const validatePurchase = async (productId: string, purchase: any) => {
  try {
    if (Platform.OS === 'ios') {
      // iOS: Simple validation with just product ID
      const result = await validateReceipt(productId)
      return result
    } else if (Platform.OS === 'android') {
      // Android: Requires additional parameters
      const result = await validateReceipt(productId, {
        packageName: purchase.packageNameAndroid,
        productToken: purchase.purchaseToken,
        isSub: false, // Set to true for subscriptions
      })
      return result
    }
  } catch (error) {
    console.error('Validation failed:', error)
    throw error
  }
}
```

**Parameters:**

- `sku` (string): Product SKU
- `androidOptions?` (object): Android-specific validation options (required for Android)
  - `packageName` (string): Package name of your app
  - `productToken` (string): Purchase token from the purchase
  - `accessToken` (string): Optional access token for server validation
  - `isSub?` (boolean): Whether this is a subscription

**Returns:** `Promise<ReceiptValidationResultIOS | ReceiptValidationResultAndroid>`

## Subscription Helpers

### getActiveSubscriptions()

Retrieves all active subscriptions with detailed status information.

```tsx
import { getActiveSubscriptions } from 'react-native-iap'

const checkSubscriptions = async () => {
  try {
    // Get all active subscriptions
    const allActiveSubscriptions = await getActiveSubscriptions()

    // Or filter by specific subscription IDs
    const specificSubscriptions = await getActiveSubscriptions([
      'premium_monthly',
      'premium_yearly',
    ])

    for (const subscription of allActiveSubscriptions) {
      console.log('Product ID:', subscription.productId)
      console.log('Is Active:', subscription.isActive)
      console.log('Will expire soon:', subscription.willExpireSoon)
    }
  } catch (error) {
    console.error('Failed to get active subscriptions:', error)
  }
}
```

**Returns:** `Promise<ActiveSubscription[]>`

### hasActiveSubscriptions()

Checks if the user has any active subscriptions.

```tsx
import { hasActiveSubscriptions } from 'react-native-iap'

const checkIfUserHasSubscription = async () => {
  try {
    // Check if user has any active subscriptions
    const hasAny = await hasActiveSubscriptions()

    // Or check for specific subscriptions
    const hasPremium = await hasActiveSubscriptions([
      'premium_monthly',
      'premium_yearly',
    ])

    if (hasPremium) {
      console.log('User has premium subscription')
    }
  } catch (error) {
    console.error('Failed to check subscription status:', error)
  }
}
```

**Returns:** `Promise<boolean>`

## Android-Specific Methods

### acknowledgePurchaseAndroid()

Acknowledges a purchase on Android (required for non-consumable products).

> **Note:** This is called automatically by [`finishTransaction()`](#finishtransaction) when `isConsumable` is `false`. You typically don't need to call this directly.

```tsx
import { acknowledgePurchaseAndroid } from 'react-native-iap'

const acknowledgePurchase = async (purchaseToken: string) => {
  try {
    const result = await acknowledgePurchaseAndroid(purchaseToken)
    console.log('Purchase acknowledged:', result)
  } catch (error) {
    console.error('Failed to acknowledge purchase:', error)
  }
}
```

**Platform:** Android only

**Returns:** `Promise<PurchaseResult>`

**See Also:** [`finishTransaction()`](#finishtransaction) - Recommended way to complete purchases

### consumePurchaseAndroid()

Consumes a purchase on Android (required for consumable products).

> **Note:** This is called automatically by [`finishTransaction()`](#finishtransaction) when `isConsumable` is `true`. You typically don't need to call this directly.

```tsx
import { consumePurchaseAndroid } from 'react-native-iap'

const consumePurchase = async (purchaseToken: string) => {
  try {
    const result = await consumePurchaseAndroid(purchaseToken)
    console.log('Purchase consumed:', result)
  } catch (error) {
    console.error('Failed to consume purchase:', error)
  }
}
```

**Platform:** Android only

**Returns:** `Promise<PurchaseResult>`

**See Also:** [`finishTransaction()`](#finishtransaction) - Recommended way to complete purchases

## iOS-Specific Methods

### promotedProductListenerIOS()

Listener for App Store promoted product events.

```tsx
import { promotedProductListenerIOS } from 'react-native-iap'

const subscription = promotedProductListenerIOS((product) => {
  console.log('Promoted product:', product)
  // Trigger purchase flow for the promoted product
})

// Later, clean up
subscription.remove()
```

**Platform:** iOS only

**Returns:** `EventSubscription` object with `remove()` method

### syncIOS()

Syncs iOS purchases with App Store.

```tsx
import { syncIOS } from 'react-native-iap'

const syncPurchases = async () => {
  try {
    const result = await syncIOS()
    console.log('Sync successful:', result)
  } catch (error) {
    console.error('Failed to sync:', error)
  }
}
```

**Platform:** iOS only

**Returns:** `Promise<boolean>`

### requestPromotedProductIOS()

Requests the promoted product from the App Store.

```tsx
import { requestPromotedProductIOS } from 'react-native-iap'

const getPromotedProduct = async () => {
  try {
    const product = await requestPromotedProductIOS()
    if (product) {
      console.log('Promoted product:', product)
    }
  } catch (error) {
    console.error('Failed to get promoted product:', error)
  }
}
```

**Platform:** iOS only

**Returns:** `Promise<Product | null>`

### presentCodeRedemptionSheetIOS()

Presents the code redemption sheet for offer codes.

```tsx
import { presentCodeRedemptionSheetIOS } from 'react-native-iap'

const showRedemptionSheet = async () => {
  try {
    const result = await presentCodeRedemptionSheetIOS()
    console.log('Sheet presented:', result)
  } catch (error) {
    console.error('Failed to present sheet:', error)
  }
}
```

**Platform:** iOS only

**Returns:** `Promise<boolean>`

### buyPromotedProductIOS()

Completes the purchase of a promoted product.

```tsx
import { buyPromotedProductIOS } from 'react-native-iap'

const purchasePromotedProduct = async () => {
  try {
    await buyPromotedProductIOS()
    console.log('Promoted product purchased')
  } catch (error) {
    console.error('Failed to purchase promoted product:', error)
  }
}
```

**Platform:** iOS only

**Returns:** `Promise<void>`

### clearTransactionIOS()

Clears unfinished transactions.

```tsx
import { clearTransactionIOS } from 'react-native-iap'

const clearTransactions = async () => {
  try {
    await clearTransactionIOS()
    console.log('Transactions cleared')
  } catch (error) {
    console.error('Failed to clear transactions:', error)
  }
}
```

**Platform:** iOS only

**Returns:** `Promise<void>`

### beginRefundRequestIOS()

Begins a refund request for a product (iOS 15+).

```tsx
import { beginRefundRequestIOS } from 'react-native-iap'

const requestRefund = async (sku: string) => {
  try {
    const status = await beginRefundRequestIOS(sku)
    console.log('Refund status:', status)
  } catch (error) {
    console.error('Failed to begin refund:', error)
  }
}
```

**Platform:** iOS 15+ only

**Returns:** `Promise<string | null>`

### subscriptionStatusIOS()

Gets subscription status for a product.

```tsx
import { subscriptionStatusIOS } from 'react-native-iap'

const getSubscriptionStatus = async (sku: string) => {
  try {
    const statuses = await subscriptionStatusIOS(sku)
    console.log('Subscription statuses:', statuses)
  } catch (error) {
    console.error('Failed to get status:', error)
  }
}
```

**Platform:** iOS only

**Returns:** `Promise<any[]>`

### currentEntitlementIOS()

Gets current entitlement for a product.

```tsx
import { currentEntitlementIOS } from 'react-native-iap'

const getEntitlement = async (sku: string) => {
  try {
    const entitlement = await currentEntitlementIOS(sku)
    if (entitlement) {
      console.log('Current entitlement:', entitlement)
    }
  } catch (error) {
    console.error('Failed to get entitlement:', error)
  }
}
```

**Platform:** iOS only

**Returns:** `Promise<Purchase | null>`

### latestTransactionIOS()

Gets latest transaction for a product.

```tsx
import { latestTransactionIOS } from 'react-native-iap'

const getLatestTransaction = async (sku: string) => {
  try {
    const transaction = await latestTransactionIOS(sku)
    if (transaction) {
      console.log('Latest transaction:', transaction)
    }
  } catch (error) {
    console.error('Failed to get transaction:', error)
  }
}
```

**Platform:** iOS only

**Returns:** `Promise<Purchase | null>`

### getPendingTransactionsIOS()

Gets all pending transactions.

```tsx
import { getPendingTransactionsIOS } from 'react-native-iap'

const getPendingTransactions = async () => {
  try {
    const transactions = await getPendingTransactionsIOS()
    console.log('Pending transactions:', transactions)
  } catch (error) {
    console.error('Failed to get pending transactions:', error)
  }
}
```

**Platform:** iOS only

**Returns:** `Promise<Purchase[]>`

### showManageSubscriptionsIOS()

Shows the manage subscriptions screen.

```tsx
import { showManageSubscriptionsIOS } from 'react-native-iap'

const showManageSubscriptions = async () => {
  try {
    const result = await showManageSubscriptionsIOS()
    console.log('Manage subscriptions shown:', result)
  } catch (error) {
    console.error('Failed to show manage subscriptions:', error)
  }
}
```

**Platform:** iOS only

**Returns:** `Promise<boolean>`

### isEligibleForIntroOfferIOS()

Checks if user is eligible for intro offer.

```tsx
import { isEligibleForIntroOfferIOS } from 'react-native-iap'

const checkEligibility = async (groupID: string) => {
  try {
    const isEligible = await isEligibleForIntroOfferIOS(groupID)
    console.log('Eligible for intro offer:', isEligible)
  } catch (error) {
    console.error('Failed to check eligibility:', error)
  }
}
```

**Platform:** iOS only

**Returns:** `Promise<boolean>`

### getReceiptDataIOS()

Gets receipt data.

```tsx
import { getReceiptDataIOS } from 'react-native-iap'

const getReceiptData = async () => {
  try {
    const receiptData = await getReceiptDataIOS()
    console.log('Receipt data:', receiptData)
  } catch (error) {
    console.error('Failed to get receipt data:', error)
  }
}
```

**Platform:** iOS only

**Returns:** `Promise<string>` - Base64 encoded receipt data

### isTransactionVerifiedIOS()

Checks if a transaction is verified.

```tsx
import { isTransactionVerifiedIOS } from 'react-native-iap'

const checkVerification = async (sku: string) => {
  try {
    const isVerified = await isTransactionVerifiedIOS(sku)
    console.log('Transaction verified:', isVerified)
  } catch (error) {
    console.error('Failed to check verification:', error)
  }
}
```

**Platform:** iOS only

**Returns:** `Promise<boolean>`

### getTransactionJwsIOS()

Gets transaction JWS representation.

```tsx
import { getTransactionJwsIOS } from 'react-native-iap'

const getTransactionJws = async (sku: string) => {
  try {
    const jws = await getTransactionJwsIOS(sku)
    if (jws) {
      console.log('Transaction JWS:', jws)
    }
  } catch (error) {
    console.error('Failed to get JWS:', error)
  }
}
```

**Platform:** iOS only

**Returns:** `Promise<string | null>`

### getStorefrontIOS()

Gets the storefront identifier for the user's App Store account.

```tsx
import { getStorefrontIOS } from 'react-native-iap'

const getStorefront = async () => {
  try {
    const storefront = await getStorefrontIOS()
    console.log('User storefront:', storefront) // e.g., 'USA', 'GBR', 'KOR'
  } catch (error) {
    console.error('Failed to get storefront:', error)
  }
}
```

**Platform:** iOS only

**Returns:** `Promise<string>` - The storefront identifier

### getAppTransactionIOS()

Gets the original app transaction ID if the app was purchased from the App Store.

```tsx
import { getAppTransactionIOS } from 'react-native-iap'

const getAppTransaction = async () => {
  try {
    const appTransaction = await getAppTransactionIOS()
    if (appTransaction) {
      console.log('App was purchased, transaction ID:', appTransaction)
    } else {
      console.log('App was not purchased from App Store')
    }
  } catch (error) {
    console.error('Failed to get app transaction:', error)
  }
}
```

**Platform:** iOS only

**Returns:** `Promise<string | null>` - The original app transaction ID or null

## Error Handling

All methods can throw errors that should be handled appropriately:

```tsx
import { PurchaseError } from 'react-native-iap'

try {
  await requestPurchase({
    request: {
      ios: { sku: 'product_id' },
      android: { skus: ['product_id'] },
    },
  })
} catch (error) {
  if (error instanceof PurchaseError) {
    switch (error.code) {
      case 'E_USER_CANCELLED':
        console.log('User cancelled purchase')
        break
      case 'E_NETWORK_ERROR':
        console.log('Network error, please try again')
        break
      default:
        console.error('Purchase failed:', error.message)
    }
  }
}
```

For a complete list of error codes, see the [Error Codes](../error-codes) documentation.

## See Also

- [useIAP Hook](../use-iap) - Recommended for React components
- [Types Reference](../types) - Complete type definitions
- [Error Codes](../error-codes) - Error handling reference
