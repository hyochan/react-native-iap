---
title: Subscription Management
sidebar_label: Subscriptions
sidebar_position: 2
---

import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# Subscription Management Example

<AdFitTopFixed />

This guide demonstrates how to implement subscription management with React Native IAP, including subscription status checking, renewal handling, and subscription management UI.

## Complete Example

For a production-ready subscription implementation, please refer to our complete example:

**📱 [SubscriptionFlow.tsx](https://github.com/hyochan/react-native-iap/tree/main/example/screens/SubscriptionFlow.tsx)**

This example demonstrates:

- ✅ Subscription product loading and display
- ✅ Active subscription detection
- ✅ Platform-specific subscription handling
- ✅ Auto-renewal status management
- ✅ Grace period handling
- ✅ Purchase restoration
- ✅ Error handling with retry logic
- ✅ Subscription status UI

## Key Implementation Points

### Platform-Specific Subscription Properties

When checking subscription status, different platforms provide different properties:

#### iOS Subscription Properties

- **`expirationDateIOS`**: Unix timestamp (milliseconds) when subscription expires
- **`originalTransactionDateIOS`**: Original purchase date
- **`environmentIOS`**: 'Production' or 'Sandbox'

#### Android Subscription Properties

- **`autoRenewingAndroid`**: Boolean indicating if subscription will auto-renew
- **`purchaseStateAndroid`**: Purchase state (0 = purchased, 1 = canceled)

### Key Differences

- **iOS**: Check `expirationDateIOS` against current time to determine if active
- **Android**: Check `autoRenewingAndroid` - if false, the user has canceled

⚠️ **Important**: Always validate subscription status on your server for production apps.

## Basic Implementation Pattern

### 1. Load Subscriptions

```tsx
import { useIAP } from 'react-native-iap'

const SUBSCRIPTION_IDS = ['com.app.monthly', 'com.app.yearly']

const {
  connected,
  subscriptions,
  activeSubscriptions,
  fetchProducts,
  getActiveSubscriptions,
} = useIAP()

useEffect(() => {
  if (connected) {
    fetchProducts({ skus: SUBSCRIPTION_IDS, type: 'subs' })
    getActiveSubscriptions()
  }
}, [connected])
```

### 2. Check Active Subscription Status

```tsx
const checkSubscriptionStatus = async () => {
  const subs = await getActiveSubscriptions()

  // Check if user has specific subscription
  const hasActiveSubscription = subs.some(
    (sub) => sub.productId === 'com.app.monthly' && sub.isActive
  )

  return hasActiveSubscription
}
```

### 3. Handle Subscription Purchase

```tsx
const handleSubscription = async (productId: string) => {
  try {
    await requestPurchase({
      request: {
        ios: {
          sku: productId,
          appAccountToken: 'user-123',
        },
        android: {
          skus: [productId],
          subscriptionOffers:
            subscription?.subscriptionOfferDetails?.map((offer) => ({
              sku: productId,
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

### 4. Process Successful Purchase

```tsx
const { finishTransaction } = useIAP({
  onPurchaseSuccess: async (purchase) => {
    // Validate receipt on your server
    const isValid = await validateReceiptOnServer(purchase)

    if (isValid) {
      // Grant subscription benefits
      await grantSubscriptionAccess(purchase)

      // Finish the transaction
      await finishTransaction({
        purchase,
        isConsumable: false, // Subscriptions are non-consumable
      })
    }
  },
})
```

## Server-Side Validation

### Example Validation Endpoint

```javascript
app.post('/validate-subscription', async (req, res) => {
  const { receipt, productId, purchaseToken } = req.body

  try {
    let validationResult

    if (purchaseToken) {
      // Android: Validate with Google Play
      validationResult = await validateGooglePlaySubscription(
        productId,
        purchaseToken
      )
    } else {
      // iOS: Validate with App Store
      validationResult = await validateAppStoreReceipt(receipt)
    }

    res.json({
      isActive: validationResult.isActive,
      expirationDate: validationResult.expirationDate,
      autoRenewing: validationResult.autoRenewing,
    })
  } catch (error) {
    res.status(500).json({ error: 'Validation failed' })
  }
})
```

## Platform-Specific Features

### iOS Subscription Features

- Introductory offers
- Promotional offers
- Family sharing
- Subscription status API (iOS 15.0+)

### Android Subscription Features

- Multiple subscription offers
- Base plans and offers
- Grace period handling
- Upgrade/downgrade proration

## Best Practices

1. **Always validate receipts server-side** - Never trust client-side validation alone
2. **Handle grace periods** - Continue providing access during payment retry periods
3. **Implement restore purchases** - Essential for users switching devices
4. **Check subscription status on app launch** - Ensure access is current
5. **Use activeSubscriptions helper** - Simplifies status checking across platforms
6. **Test thoroughly** - Use sandbox/test accounts on both platforms

## Common Subscription Scenarios

### Check if User Has Any Active Subscription

```tsx
const hasAnyActiveSubscription = activeSubscriptions.length > 0
```

### Check for Specific Subscription Tier

```tsx
const hasPremium = activeSubscriptions.some(
  (sub) => sub.productId === 'com.app.premium_yearly' && sub.isActive
)
```

### Display Subscription Expiration

```tsx
{
  activeSubscriptions.map((sub) => (
    <View key={sub.productId}>
      <Text>Subscription: {sub.productId}</Text>
      {sub.expirationDateIOS && (
        <Text>
          Expires: {new Date(sub.expirationDateIOS).toLocaleDateString()}
        </Text>
      )}
      {Platform.OS === 'android' && (
        <Text>Auto-renewing: {sub.autoRenewingAndroid ? 'Yes' : 'No'}</Text>
      )}
    </View>
  ))
}
```

## Troubleshooting

### Common Issues

1. **Subscription not showing as active**
   - Check if `finishTransaction` was called
   - Verify server-side validation is working
   - Ensure subscription IDs match store configuration

2. **Can't purchase subscription**
   - Verify subscription is approved in store console
   - Check if user already has active subscription
   - Ensure test accounts are properly configured

3. **Restoration not working**
   - Call `getAvailablePurchases()` for restoration
   - Validate restored purchases server-side
   - Handle platform-specific restoration flows

## See Also

- [SubscriptionFlow.tsx](https://github.com/hyochan/react-native-iap/tree/main/example/screens/SubscriptionFlow.tsx) - Complete working example
- [Purchase Lifecycle](../guides/lifecycle) - Understanding the purchase flow
- [iOS Setup](../getting-started/setup-ios) - App Store subscription configuration
- [Android Setup](../getting-started/setup-android) - Google Play subscription configuration
