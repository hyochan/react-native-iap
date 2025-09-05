---
sidebar_position: 2
---

import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# Android Setup

<AdFitTopFixed />

For complete Android setup instructions including Google Play Console configuration, app setup, and testing guidelines, please visit:

👉 **[Android Setup Guide - openiap.dev](https://openiap.dev/docs/android-setup)**

The guide covers:

- Google Play Console configuration
- App bundle setup and signing
- Testing with internal testing tracks
- Common troubleshooting steps

## App Configuration

React Native IAP automatically handles most Android configuration. The required billing permissions and dependencies are included automatically.

## Code Integration

### Basic Setup

```tsx
import { useIAP, ErrorCode } from 'react-native-iap'

const androidProductIds = [
  'premium_upgrade',
  'coins_100',
  'monthly_subscription',
]

function App() {
  const { connected, products, subscriptions, fetchProducts, requestPurchase } =
    useIAP({
      onPurchaseSuccess: (purchase) => {
        console.log('Purchase successful:', purchase)
        handleSuccessfulPurchase(purchase)
      },
      onPurchaseError: (error) => {
        console.error('Purchase failed:', error)
        handlePurchaseError(error)
      },
    })

  React.useEffect(() => {
    if (connected) {
      // Fetch products and subscriptions
      fetchProducts({
        skus: androidProductIds.filter((id) => !id.includes('subscription')),
        type: 'inapp',
      })
      fetchProducts({
        skus: androidProductIds.filter((id) => id.includes('subscription')),
        type: 'subs',
      })
    }
  }, [connected])

  return (
    <View>
      {/* Render products */}
      {products.map((product) => (
        <AndroidProductItem key={product.id} product={product} />
      ))}

      {/* Render subscriptions */}
      {subscriptions.map((subscription) => (
        <AndroidSubscriptionItem
          key={subscription.id}
          subscription={subscription}
        />
      ))}
    </View>
  )
}
```

### Android-Specific Product Handling

```tsx
const AndroidProductItem = ({ product }: { product: Product }) => {
  const { requestPurchase } = useIAP()

  const handlePurchase = () => {
    if (product.platform === 'android') {
      requestPurchase({
        request: { skus: [product.id] },
        type: 'inapp',
      })
    }
  }

  if (product.platform !== 'android') return null

  return (
    <TouchableOpacity onPress={handlePurchase}>
      <Text>{product.title}</Text>
      <Text>{product.oneTimePurchaseOfferDetails?.formattedPrice}</Text>
    </TouchableOpacity>
  )
}
```

> **💡 Cross-Platform Note:** This example shows Android-specific usage with `skus`. For cross-platform compatibility, include both `sku` and `skus` in your request object. See the [Core Methods](/docs/api/methods/core-methods#requestpurchase) documentation for details.

### Android-Specific Subscription Handling

```tsx
const AndroidSubscriptionItem = ({
  subscription,
}: {
  subscription: SubscriptionProduct
}) => {
  const { requestPurchase } = useIAP()

  const handleSubscribe = (offer: any) => {
    if (subscription.platform === 'android') {
      requestPurchase({
        request: {
          skus: [subscription.id],
          subscriptionOffers: [
            {
              sku: subscription.id,
              offerToken: offer.offerToken,
            },
          ],
        },
        type: 'subs',
      })
    }
  }

  if (subscription.platform !== 'android') return null

  return (
    <View>
      <Text>{subscription.title}</Text>
      {subscription.subscriptionOfferDetails?.map((offer) => (
        <TouchableOpacity
          key={offer.offerId}
          onPress={() => handleSubscribe(offer)}
        >
          <Text>
            {offer.pricingPhases.pricingPhaseList
              .map((phase) => `${phase.formattedPrice}/${phase.billingPeriod}`)
              .join(' then ')}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}
```

### Error Handling for Android

```tsx
const handleAndroidError = (error: PurchaseError) => {
  switch (error.code) {
    case ErrorCode.E_USER_CANCELLED:
      // User cancelled - no action needed
      break
    case ErrorCode.E_ITEM_UNAVAILABLE:
      Alert.alert(
        'Product Unavailable',
        'This item is not available for purchase'
      )
      break
    case ErrorCode.E_SERVICE_ERROR:
      Alert.alert('Service Error', 'Google Play services are unavailable')
      break
    case ErrorCode.E_DEVELOPER_ERROR:
      Alert.alert('Configuration Error', 'Please contact support')
      break
    default:
      Alert.alert('Purchase Failed', error.message)
  }
}
```

## Common Issues

### Product IDs Not Found

**Problem**: Products return empty or show as unavailable **Solutions**:

- Verify product IDs match exactly between code and Play Console
- Ensure products are **Active** in Play Console
- Check that app is uploaded to at least Internal testing track
- Verify the app package name matches

### Testing Issues

**Problem**: "Item not found" or "Authentication required" errors **Solutions**:

- Use Gmail accounts added as test users
- Install app from testing track, not directly via ADB
- Ensure test user has a valid payment method
- Clear Google Play Store cache and data

### Purchase Flow Issues

**Problem**: Purchase dialog doesn't appear or fails immediately **Solutions**:

- Verify Google Play services are updated
- Check device has valid Google account
- Ensure app is properly signed
- Test on different devices

### Subscription Issues

**Problem**: Subscription offers not showing or failing **Solutions**:

- Verify base plans are properly configured
- Check offer eligibility rules
- Ensure proper offer token handling
- Test with different user accounts

## Best Practices

1. **Always test on real devices** - emulators may have issues with Google Play services
2. **Use proper product IDs** - follow reverse domain naming (com.yourapp.product)
3. **Handle all error cases** - especially network and service errors
4. **Test with multiple accounts** - verify behavior for new and existing users
5. **Implement proper retry logic** - for transient failures

## Android-Specific Features

### Proration for Subscription Changes

```tsx
const upgradeSubscription = async (
  newSkuId: string,
  oldPurchaseToken: string
) => {
  try {
    await requestPurchase({
      request: {
        skus: [newSkuId],
        subscriptionOffers: [
          {
            sku: newSkuId,
            offerToken: 'new_offer_token',
          },
        ],
        replacementMode: 'IMMEDIATE_WITH_TIME_PRORATION',
        oldPurchaseToken: oldPurchaseToken,
      },
      type: 'subs',
    })
  } catch (error) {
    console.error('Subscription upgrade failed:', error)
  }
}
```

### Pending Purchases

Handle purchases that require additional verification:

```tsx
const handlePendingPurchase = (purchase: Purchase) => {
  if (purchase.purchaseState === 'pending') {
    // Show pending message to user
    Alert.alert(
      'Purchase Pending',
      'Your purchase is being processed. You will receive access once payment is confirmed.'
    )

    // Store pending purchase for later verification
    storePendingPurchase(purchase)
  }
}
```

## Next Steps

- [Learn about getting started guide](../guides/getting-started)
- [Explore iOS setup](./setup-ios)
- [Understand error codes](../api/error-codes)
