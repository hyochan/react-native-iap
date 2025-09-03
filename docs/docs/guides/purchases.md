---
title: Purchases
sidebar_label: Purchases
sidebar_position: 2
---

import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# Purchases

<AdFitTopFixed />

> :warning: **Purchase Flow Redesign** :warning:
>
> The `purchase` flow has been updated as a result of the findings in issue [#307](https://github.com/hyochan/react-native-iap/issues/307). The resulting flow has been redesign to not rely on `Promise` or `Callback`.
>
> Below are some of the specific reasons for the redesign:
>
> 1. There may be more than one response when requesting a payment.
> 2. Purchases are inter-session `asynchronuous` meaning requests that are made may take several hours to complete and continue to exist even after the app has been closed or crashed.
> 3. The purchase may be pending and hard to track what has been done (for [example](https://github.com/hyochan/react-native-iap/issues/307)).
> 4. The Billing Flow is an `event` pattern rather than a `callback` pattern.

For a comprehensive understanding of the purchase lifecycle, see our [Purchase Lifecycle Guide](./lifecycle).

## Purchase Flow Overview

Once you have called `fetchProducts()`, and have a valid response, you can call `requestPurchase()`. Subscribable products can be purchased just like consumable products and users can cancel subscriptions by using the iOS System Settings.

Before you request any purchase, you should set `purchaseUpdatedListener` from `react-native-iap`. It is recommended that you start listening to updates as soon as your application launches. And don't forget that even at launch you may receive successful purchases that either completed while your app was closed or that failed to be finished, consumed or acknowledged due to network errors or bugs.

### Key Concepts

1. **Event-driven**: Purchases are handled through events rather than promises
2. **Asynchronous**: Purchases may complete after your app is closed or crashed
3. **Validation required**: Always validate receipts on your server
4. **State management**: Use the `useIAP` hook for automatic state management

## Basic Purchase Flow

### 1. Setup Purchase Listeners

```tsx
import {
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  type ProductPurchase,
  type PurchaseError,
  finishTransaction,
} from 'react-native-iap';

class App extends Component {
  purchaseUpdateSubscription = null;
  purchaseErrorSubscription = null;

  componentDidMount() {
    initConnection().then(() => {
      this.purchaseUpdateSubscription = purchaseUpdatedListener(
            (purchase: ProductPurchase) => {
              console.log('purchaseUpdatedListener', purchase);
              this.handlePurchaseUpdate(purchase);
            },
          );

          this.purchaseErrorSubscription = purchaseErrorListener(
            (error: PurchaseError) => {
              console.log('purchaseErrorListener', error);
              this.handlePurchaseError(error);
            },
          );
        });
    });
  }

  componentWillUnmount() {
    if (this.purchaseUpdateSubscription) {
      this.purchaseUpdateSubscription.remove();
      this.purchaseUpdateSubscription = null;
    }
    if (this.purchaseErrorSubscription) {
      this.purchaseErrorSubscription.remove();
      this.purchaseErrorSubscription = null;
    }
  }

  handlePurchaseUpdate = (purchase: ProductPurchase) => {
    const receipt = purchase.transactionReceipt;
    if (receipt) {
      yourAPI
        .deliverOrDownloadFancyInAppPurchase(purchase.transactionReceipt)
        .then(async (deliveryResult) => {
          if (isSuccess(deliveryResult)) {
            // Tell the store that you have delivered what has been paid for.
            // Failure to do this will result in the purchase being refunded on Android and
            // the purchase event will reappear on every relaunch of the app until you succeed
            // in doing the below. It will also be impossible for the user to purchase consumables
            // again until you do this.

            // IMPORTANT: Always validate receipts on your server for both platforms
            if (Platform.OS === 'ios') {
              const receiptData = await validateReceipt();
              // Send to your server for validation with Apple
              const isValid = await validateReceiptOnServer(receiptData);
              if (!isValid) {
                console.error('Invalid receipt');
                return;
              }
            } else if (Platform.OS === 'android') {
              // Android also requires server-side validation
              const purchaseToken = purchase.purchaseToken; // Unified field for both iOS and Android
              const packageName = purchase.packageNameAndroid;

              // Your server should:
              // 1. Get Google Play service account credentials
              // 2. Use Google Play Developer API to verify the purchase
              const isValid = await validateAndroidPurchaseOnServer({
                purchaseToken,
                packageName,
                productId: purchase.id,
              });

              if (!isValid) {
                console.error('Invalid Android purchase');
                return;
              }
            }

            // IMPORTANT: Always finish the transaction to prevent it from replaying
            // If consumable (can be purchased again)
            await finishTransaction({purchase, isConsumable: true});
            // If not consumable (default: isConsumable = false)
            await finishTransaction({purchase, isConsumable: false});
          } else {
            // Retry / conclude the purchase is fraudulent, etc.
          }
        });
    }
  };

  handlePurchaseError = (error: PurchaseError) => {
    console.warn('purchaseErrorListener', error);
  };
}
```

### 2. Using with Hooks (Recommended)

For a more modern approach using React hooks, here's a comprehensive implementation:

```tsx
import React, { useEffect, useState, useCallback } from 'react'
import { Platform, Alert, InteractionManager } from 'react-native'
import { useIAP } from 'react-native-iap'

// Define your product SKUs
const bulbPackSkus = ['dev.hyo.martie.10bulbs', 'dev.hyo.martie.30bulbs']
const subscriptionSkus = ['dev.hyo.martie.premium']

export default function PurchaseScreen() {
  const {
    connected,
    products,
    subscriptions,
    currentPurchase,
    currentPurchaseError,
    fetchProducts,
    requestPurchase,
    finishTransaction,
    validateReceipt,
  } = useIAP()

  const [isLoading, setIsLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)

  // Initialize products when IAP connection is established
  useEffect(() => {
    if (!connected) return

    const initializeIAP = async () => {
      try {
        // Get both products and subscriptions
        await fetchProducts({ skus: bulbPackSkus, type: 'inapp' })
        await fetchProducts({ skus: subscriptionSkus, type: 'subs' })
        setIsReady(true)
      } catch (error) {
        console.error('Error initializing IAP:', error)
      }
    }

    initializeIAP()
  }, [connected, fetchProducts])

  // Validate receipt helper
  const handleValidateReceipt = useCallback(
    async (sku: string, purchase: any) => {
      try {
        if (Platform.OS === 'ios') {
          return await validateReceipt(sku)
        } else if (Platform.OS === 'android') {
          const purchaseToken = purchase.purchaseToken // Unified field for both iOS and Android
          const packageName = purchase.packageNameAndroid || 'your.package.name'
          const isSub = subscriptionSkus.includes(sku)

          return await validateReceipt(sku, {
            packageName,
            productToken: purchaseToken,
            isSub,
          })
        }
        return { isValid: true } // Default for unsupported platforms
      } catch (error) {
        console.error('Receipt validation failed:', error)
        return { isValid: false }
      }
    },
    [validateReceipt]
  )

  // Handle successful purchases
  useEffect(() => {
    if (currentPurchase) {
      handlePurchaseUpdate(currentPurchase)
    }
  }, [currentPurchase])

  // Handle purchase errors
  useEffect(() => {
    if (currentPurchaseError) {
      setIsLoading(false)

      // Don't show error for user cancellation
      if (currentPurchaseError.code === 'E_USER_CANCELLED') {
        return
      }

      Alert.alert(
        'Purchase Error',
        'Failed to complete purchase. Please try again.'
      )
      console.error('Purchase error:', currentPurchaseError)
    }
  }, [currentPurchaseError])

  const handlePurchaseUpdate = async (purchase: any) => {
    try {
      setIsLoading(true)
      console.log('Processing purchase:', purchase)

      const productId = purchase.id

      // Validate receipt on your server
      const validationResult = await handleValidateReceipt(productId, purchase)

      if (validationResult.isValid) {
        // Determine if this is a consumable product
        const isConsumable = bulbPackSkus.includes(productId)

        // Finish the transaction
        await finishTransaction({
          purchase,
          isConsumable, // Set to true for consumable products
        })

        // Record purchase in your database
        await recordPurchaseInDatabase(purchase, productId)

        // Update local state (e.g., add bulbs, enable premium features)
        await updateLocalState(productId)

        // Show success message
        showSuccessMessage(productId)
      } else {
        Alert.alert(
          'Validation Error',
          'Purchase could not be validated. Please contact support.'
        )
      }
    } catch (error) {
      console.error('Error handling purchase:', error)
      Alert.alert('Error', 'Failed to process purchase.')
    } finally {
      setIsLoading(false)
    }
  }

  // Request purchase for products
  const handlePurchaseBulbs = async (productId: string) => {
    if (!connected) {
      Alert.alert(
        'Not Connected',
        'Store connection unavailable. Please try again later.'
      )
      return
    }

    try {
      setIsLoading(true)

      // Platform-specific purchase request (v2.7.0+)
      await requestPurchase({
        request: {
          ios: {
            sku: productId,
            andDangerouslyFinishTransactionAutomatically: false,
          },
          android: {
            skus: [productId],
          },
        },
      })
    } catch (error) {
      setIsLoading(false)
      console.error('Purchase request failed:', error)
    }
  }

  // Request purchase for subscriptions
  const handlePurchaseSubscription = async (subscriptionId: string) => {
    if (!connected) {
      Alert.alert(
        'Not Connected',
        'Store connection unavailable. Please try again later.'
      )
      return
    }

    try {
      setIsLoading(true)

      // Find subscription to get offer details
      const subscription = subscriptions.find((s) => s.id === subscriptionId)
      const subscriptionOffers = subscription?.subscriptionOfferDetails?.map(
        (offer) => ({
          sku: subscriptionId,
          offerToken: offer.offerToken,
        })
      ) || [{ sku: subscriptionId, offerToken: '' }]

      // Platform-specific subscription request (v2.7.0+)
      await requestPurchase({
        request: {
          ios: {
            sku: subscriptionId,
          },
          android: {
            skus: [subscriptionId],
            subscriptionOffers,
          },
        },
        type: 'subs',
      })
    } catch (error) {
      setIsLoading(false)
      console.error('Subscription request failed:', error)
    }
  }

  const recordPurchaseInDatabase = async (purchase: any, productId: string) => {
    // Implement your database recording logic here
    console.log('Recording purchase in database:', { purchase, productId })
  }

  const updateLocalState = async (productId: string) => {
    // Update your local app state based on the purchase
    if (bulbPackSkus.includes(productId)) {
      // Add bulbs to user's account
      const bulbCount = productId.includes('10bulbs') ? 10 : 30
      console.log(`Adding ${bulbCount} bulbs to user account`)
    } else if (subscriptionSkus.includes(productId)) {
      // Enable premium features
      console.log('Enabling premium features')
    }
  }

  const showSuccessMessage = (productId: string) => {
    InteractionManager.runAfterInteractions(() => {
      if (bulbPackSkus.includes(productId)) {
        const bulbCount = productId.includes('10bulbs') ? 10 : 30
        Alert.alert(
          'Thank You!',
          `${bulbCount} bulbs have been added to your account.`
        )
      } else if (subscriptionSkus.includes(productId)) {
        Alert.alert(
          'Thank You!',
          'Premium subscription activated successfully.'
        )
      }
    })
  }

  return (
    <View>
      {/* Your purchase UI components */}
      <Text>Connection Status: {connected ? 'Connected' : 'Disconnected'}</Text>
      <Text>Products Ready: {isReady ? 'Yes' : 'No'}</Text>
      {/* Add your purchase buttons and UI here */}
    </View>
  )
}
```

### 3. Request a Purchase

**Important Platform Difference:**

- **iOS**: Can only purchase one product at a time (single SKU)
- **Android**: Can purchase multiple products at once (array of SKUs)

This fundamental difference requires platform-specific handling. Starting from v2.7.0, we provide a cleaner API:

### New Platform-Specific API (v2.7.0+)

```tsx
import { requestPurchase } from 'react-native-iap'

// Cleaner approach with platform-specific parameters
const handleBuyProduct = async (productId: string) => {
  try {
    await requestPurchase({
      request: {
        ios: {
          sku: productId,
          appAccountToken: 'user-123', // Optional: for server-side validation
        },
        android: {
          skus: [productId],
          obfuscatedAccountIdAndroid: 'user-123', // Optional: user identifier
        },
      },
    })
  } catch (err) {
    console.warn(err.code, err.message)
  }
}
```

### Legacy API (Still Supported)

```tsx
import { requestPurchase, Platform } from 'react-native-iap'

// For regular products (consumables/non-consumables)
const handleBuyProduct = async (productId) => {
  try {
    if (Platform.OS === 'ios') {
      // iOS: single product purchase
      await requestPurchase({
        request: { sku: productId },
      })
    } else if (Platform.OS === 'android') {
      // Android: array of products (even for single purchase)
      await requestPurchase({
        request: { skus: [productId] },
      })
    }
  } catch (err) {
    console.warn(err.code, err.message)
  }
}
```

**For subscriptions, the platform differences are even more significant:**

### New Subscription API (v2.7.0+)

```tsx
const handleBuySubscription = async (subscriptionId: string) => {
  try {
    // Find the subscription product to get offer details (Android)
    const subscription = subscriptions.find((s) => s.id === subscriptionId)

    await requestPurchase({
      request: {
        ios: {
          sku: subscriptionId,
          appAccountToken: 'user-123', // Optional: for server-side validation
        },
        android: {
          skus: [subscriptionId],
          subscriptionOffers:
            subscription?.subscriptionOfferDetails?.map((offer) => ({
              sku: subscriptionId,
              offerToken: offer.offerToken,
            })) || [],
          obfuscatedAccountIdAndroid: 'user-123', // Optional: user identifier
        },
      },
      type: 'subs',
    })
  } catch (err) {
    console.warn(err.code, err.message)
  }
}
```

### Legacy Subscription API

```tsx
const handleBuySubscription = async (subscriptionId: string) => {
  try {
    if (Platform.OS === 'ios') {
      await requestPurchase({
        request: { sku: subscriptionId },
        type: 'subs',
      })
    } else if (Platform.OS === 'android') {
      // Find the subscription product to get its offer details
      const subscription = subscriptions.find((s) => s.id === subscriptionId)

      if (!subscription) {
        throw new Error(`Subscription with ID ${subscriptionId} not found`)
      }

      // Check if the subscription has offer details
      if (subscription.subscriptionOfferDetails?.length > 0) {
        // Android requires offerToken for each subscription SKU
        // Use the first available offer or let user choose
        const firstOffer = subscription.subscriptionOfferDetails[0]
        const subscriptionOffers = [
          {
            sku: subscriptionId,
            offerToken: firstOffer.offerToken,
          },
        ]

        await requestPurchase({
          request: {
            skus: [subscriptionId],
            subscriptionOffers, // Required: Must match number of SKUs
          },
          type: 'subs',
        })
      } else {
        // This should not happen with properly configured subscriptions
        throw new Error('No subscription offers available')
      }
    }
  } catch (err) {
    console.warn(err.code, err.message)
  }
}
```

## Important Notes

### Purchase Flow Best Practices

1. **Always set up listeners first**: Set up `purchaseUpdatedListener` and `purchaseErrorListener` before making any purchase requests.

2. **Handle pending purchases**: On app launch, check for pending purchases that may have completed while the app was closed.

3. **Never rely on promises**: The purchase flow is event-driven, not promise-based. Always use listeners to handle purchase results.

4. **Validate receipts server-side**: Never trust client-side validation. Always validate receipts on your secure server.

5. **Finish transactions**: Always call `finishTransaction` after successful validation to complete the purchase.

6. **Handle unfinished transactions on iOS**: iOS will replay unfinished transactions on app startup. Always call `finishTransaction` to prevent `onPurchaseSuccess` from triggering automatically on every app launch.

### Pending and Unfinished Purchases

#### iOS Unfinished Transactions

On iOS, if you don't call `finishTransaction` after a successful purchase, the transaction remains in an "unfinished" state. This causes:

- `onPurchaseSuccess` to trigger automatically on every app startup
- The same purchase to appear repeatedly until finished
- Users unable to make new purchases of consumable items

**Solution**: Always finish transactions after processing:

```tsx
const { finishTransaction, validateReceipt } = useIAP({
  onPurchaseSuccess: async (purchase) => {
    try {
      // 1. Validate the receipt (IMPORTANT: Server-side validation required for both platforms)
      if (Platform.OS === 'ios') {
        const receiptData = await validateReceipt()
        // Send to your server for validation with Apple
        const isValid = await validateReceiptOnServer(receiptData)
        if (!isValid) {
          console.error('Invalid receipt')
          return
        }
      } else if (Platform.OS === 'android') {
        // Android also requires server-side validation
        const purchaseToken = purchase.purchaseToken // Unified field for both iOS and Android
        const packageName = purchase.packageNameAndroid

        // Your server should:
        // 1. Get Google Play service account credentials
        // 2. Use Google Play Developer API to verify the purchase
        const isValid = await validateAndroidPurchaseOnServer({
          purchaseToken,
          packageName,
          productId: purchase.id,
        })

        if (!isValid) {
          console.error('Invalid Android purchase')
          return
        }
      }

      // 2. Process the purchase
      await processPurchase(purchase)

      // 3. IMPORTANT: Finish the transaction
      await finishTransaction({
        purchase,
        isConsumable: false, // defaults to false
      })
    } catch (error) {
      console.error('Purchase processing failed:', error)
    }
  },
})
```

**Handle unfinished transactions on startup**:

```tsx
// On app initialization
componentDidMount() {
  initConnection().then(async () => {
    // Check for unfinished transactions
    const purchases = await getAvailablePurchases();

    for (const purchase of purchases) {
      // If already processed, just finish the transaction
      if (await isAlreadyProcessed(purchase)) {
        await finishTransaction({ purchase });
      }
    }

    // Set up purchase listeners
    this.setupPurchaseListeners();
  });
}
```

## Getting Product Information

### Retrieving Product Prices

Here's how to get product prices across platforms:

```tsx
// Get product price by ID with proper platform checking
const getProductPrice = (productId: string): string => {
  if (!isReady || products.length === 0) {
    return Platform.OS === 'ios' ? '$0.99' : '₩1,200' // Default prices
  }

  const product = products.find((p) => p.id === productId)
  if (!product) return Platform.OS === 'ios' ? '$0.99' : '₩1,200'

  if (Platform.OS === 'ios') {
    return product.displayPrice || '$0.99'
  } else {
    // Android
    const androidProduct = product as ProductAndroid
    return (
      androidProduct.oneTimePurchaseOfferDetails?.formattedPrice || '₩1,200'
    )
  }
}

// Get subscription price by ID with proper platform checking
const getSubscriptionPrice = (subscriptionId: string): string => {
  if (!isReady || subscriptions.length === 0) {
    return Platform.OS === 'ios' ? '$9.99' : '₩11,000' // Default prices
  }

  const subscription = subscriptions.find((s) => s.id === subscriptionId)
  if (!subscription) return Platform.OS === 'ios' ? '$9.99' : '₩11,000'

  if (Platform.OS === 'ios') {
    return subscription.displayPrice || '$9.99'
  } else {
    // Android
    const androidSubscription = subscription as ProductAndroid
    if (androidSubscription.subscriptionOfferDetails?.length > 0) {
      const firstOffer = androidSubscription.subscriptionOfferDetails[0]
      if (firstOffer.pricingPhases.pricingPhaseList.length > 0) {
        return (
          firstOffer.pricingPhases.pricingPhaseList[0].formattedPrice ||
          '₩11,000'
        )
      }
    }
    return '₩11,000' // Default Android price
  }
}
```

## Platform Support

### Checking Platform Compatibility

```tsx
// Define supported platforms
const SUPPORTED_PLATFORMS = ['ios', 'android']

export default function PurchaseScreen() {
  const isPlatformSupported = SUPPORTED_PLATFORMS.includes(Platform.OS)

  if (!isPlatformSupported) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Platform Not Supported</Text>
        <Text>In-app purchases are only available on iOS and Android.</Text>
      </View>
    )
  }

  // Rest of your purchase implementation
}
```

## Product Types

### Consumable Products

Consumable products can be purchased multiple times (e.g., coins, gems):

```tsx
const buyConsumable = async (productId) => {
  await requestPurchase({ sku: productId })
  // After successful validation and finishing transaction,
  // the product can be purchased again
}
```

### Non-Consumable Products

Non-consumable products are purchased once and remain available (e.g., premium features):

```tsx
const buyNonConsumable = async (productId) => {
  await requestPurchase({ sku: productId })
  // After purchase, check availablePurchases to restore
}
```

### Subscriptions

Subscriptions require special handling on Android due to the offer token requirement:

```tsx
const buySubscription = async (subscriptionId: string) => {
  if (Platform.OS === 'ios') {
    // iOS: Simple SKU-based purchase
    await requestPurchase({
      request: { sku: subscriptionId },
      type: 'subs',
    })
  } else {
    // Android: Requires offerToken for each subscription
    const subscription = subscriptions.find((s) => s.id === subscriptionId)

    if (!subscription?.subscriptionOfferDetails?.length) {
      throw new Error('No subscription offers available')
    }

    // Use the first available offer (or let user choose)
    const firstOffer = subscription.subscriptionOfferDetails[0]

    await requestPurchase({
      request: {
        skus: [subscriptionId],
        subscriptionOffers: [
          {
            sku: subscriptionId,
            offerToken: firstOffer.offerToken, // Required!
          },
        ],
      },
      type: 'subs',
    })
  }
}
```

**Important Android Notes:**

- Each subscription SKU must have a corresponding offerToken
- The number of SKUs must match the number of offerTokens
- offerToken comes from `subscriptionOfferDetails` in the product details
- Without offerToken, you'll get: "The number of skus must match the number of offerTokens"

## Receipt Validation

### Server-Side Validation (Required for Production)

**Important**: Always validate receipts on your server in production. Client-side validation is NOT secure and should only be used for development/testing.

**Note**: The `validateReceipt()` function from the `useIAP` hook performs client-side validation which is vulnerable to tampering. For production apps, ALWAYS implement server-side validation.

#### iOS Receipt Validation

```typescript
// Development only (NOT SECURE):
// const { validateReceipt } = useIAP();
// const receiptData = await validateReceipt(productId);

// Production (RECOMMENDED):
// Send purchase info directly to your server
const response = await fetch('https://your-server.com/validate-ios-receipt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    transactionId: purchase.transactionId,
    productId: purchase.id,
    // Your server will fetch the receipt from Apple
  }),
})
```

Your server should:

1. Send the receipt to Apple's verification endpoint
2. Verify the receipt's authenticity
3. Check the bundle ID and product ID
4. Ensure the receipt hasn't been used before

#### Android Purchase Validation

```typescript
// Client-side: Get purchase details
const purchaseDetails = {
  purchaseToken: purchase.purchaseToken, // Unified field for both iOS and Android
  packageName: purchase.packageNameAndroid,
  productId: purchase.id,
}

// Send to your server
const response = await fetch(
  'https://your-server.com/validate-android-purchase',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(purchaseDetails),
  }
)
```

Your server should:

1. Use Google Play Developer API with service account credentials
2. Call `purchases.products.get()` or `purchases.subscriptions.get()`
3. Verify the purchase state and consumption state
4. Check that the purchase hasn't been refunded

**Never expose your Google Play service account credentials in client code!**

## Advanced Purchase Handling

### Purchase Restoration

For non-consumable products and subscriptions, implement purchase restoration:

```tsx
const { getAvailablePurchases } = useIAP()

const restorePurchases = async () => {
  try {
    const purchases = await getAvailablePurchases()

    for (const purchase of purchases) {
      // Validate and restore each purchase
      const isValid = await validateReceiptOnServer(purchase)
      if (isValid) {
        await grantPurchaseToUser(purchase)
      }
    }
  } catch (error) {
    console.error('Failed to restore purchases:', error)
  }
}
```

### Handling Pending Purchases

Some purchases may be in a pending state (e.g., awaiting parental approval):

```tsx
useEffect(() => {
  if (currentPurchase?.purchaseState === 'pending') {
    // Inform user that purchase is pending
    showPendingPurchaseMessage()
  }
}, [currentPurchase])
```

### Subscription Management

#### Checking Subscription Status

Platform-specific properties are available to check if a subscription is active:

```tsx
const isSubscriptionActive = (purchase: Purchase): boolean => {
  const currentTime = Date.now()

  if (Platform.OS === 'ios') {
    // iOS: Check expiration date
    if (purchase.expirationDateIos) {
      // expirationDateIos is in milliseconds
      return purchase.expirationDateIos > currentTime
    }

    // For Sandbox environment, consider recent purchases as active
    if (purchase.environmentIOS === 'Sandbox') {
      const dayInMs = 24 * 60 * 60 * 1000
      return (
        purchase.transactionDate &&
        currentTime - purchase.transactionDate < dayInMs
      )
    }
  } else if (Platform.OS === 'android') {
    // Android: Check auto-renewal status
    if (purchase.autoRenewingAndroid !== undefined) {
      return purchase.autoRenewingAndroid
    }

    // Check purchase state (0 = purchased, 1 = canceled)
    if (purchase.purchaseStateAndroid === 0) {
      return true
    }
  }

  return false
}
```

**Key Properties for Subscription Status:**

- **iOS**: `expirationDateIos` - Unix timestamp when subscription expires
- **Android**: `autoRenewingAndroid` - Boolean indicating if subscription will renew

### Receipt Validation

**Important Platform Differences for Receipt Validation:**

- **iOS**: Only requires the SKU for validation
- **Android**: Requires additional parameters including `packageName`, `productToken`, and optionally `accessToken`

**Always validate receipts on your server for security and fraud prevention.** Client-side validation is not sufficient for production apps.

```tsx
const handleValidateReceipt = useCallback(
  async (sku: string, purchase: any) => {
    try {
      if (Platform.OS === 'ios') {
        // iOS: Simple validation with just SKU
        return await validateReceipt(sku)
      } else if (Platform.OS === 'android') {
        // Android: Requires additional validation parameters
        const purchaseToken = purchase.purchaseToken // Unified field for both iOS and Android
        const packageName = purchase.packageNameAndroid || 'your.package.name'
        const isSub = subscriptionSkus.includes(sku)

        // Check required Android parameters before validation
        if (!purchaseToken || !packageName) {
          throw new Error(
            'Android validation requires packageName and productToken'
          )
        }

        return await validateReceipt(sku, {
          packageName,
          productToken: purchaseToken,
          isSub,
          // accessToken may be required for server-side validation
        })
      }
      return { isValid: true } // Default for unsupported platforms
    } catch (error) {
      console.error('Receipt validation failed:', error)
      return { isValid: false }
    }
  },
  [validateReceipt]
)

// Use in purchase handler
const handlePurchaseUpdate = async (purchase: any) => {
  try {
    const productId = purchase.id

    // Validate receipt on your server
    const validationResult = await handleValidateReceipt(productId, purchase)

    if (validationResult.isValid) {
      // Process the purchase
      await finishTransaction({
        purchase,
        isConsumable: bulbPackSkus.includes(productId),
      })

      // Update user's purchase state in your app
      updateUserPurchases(productId)
    } else {
      console.error('Receipt validation failed for:', productId)
      // Handle invalid receipt
    }
  } catch (error) {
    console.error('Purchase processing failed:', error)
  }
}
```

**Best Practices:**

- Always validate on your server, never trust client-side validation alone
- Store purchase receipts in your database for future reference
- Implement retry logic for failed validations due to network issues
- Log validation failures for fraud detection and analysis

## Error Handling

Implement comprehensive error handling for various scenarios:

```tsx
const handlePurchaseError = (error) => {
  switch (error.code) {
    case 'E_USER_CANCELLED':
      // User cancelled - no action needed
      break

    case 'E_NETWORK_ERROR':
      // Show retry option
      showRetryDialog()
      break

    case 'E_ITEM_UNAVAILABLE':
      // Product not available
      showProductUnavailableMessage()
      break

    case 'E_ALREADY_OWNED':
      // User already owns this product
      showAlreadyOwnedMessage()
      break

    default:
      // Generic error handling
      showGenericErrorMessage(error.message)
      break
  }
}
```

## Testing Purchases

### iOS Testing

1. Create sandbox accounts in App Store Connect
2. Sign out of App Store on device
3. Sign in with sandbox account when prompted during purchase
4. Test with TestFlight builds

### Android Testing

1. Create test accounts in Google Play Console
2. Upload signed APK to internal testing track
3. Add test accounts to the testing track
4. Test with signed builds (not debug builds)

## Next Steps

For comprehensive information about purchase lifecycle management, best practices, and common pitfalls, see our detailed [Purchase Lifecycle Guide](./lifecycle).

Other helpful resources:

- [Error Handling Guide](./troubleshooting) for debugging purchase issues
- [API Reference](../api/) for detailed method documentation
- [Complete Store Example](../examples/complete-impl) for production-ready implementation
