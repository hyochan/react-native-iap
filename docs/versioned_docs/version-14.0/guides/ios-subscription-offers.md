---
title: iOS Subscription Offers
sidebar_label: iOS Subscription Offers
sidebar_position: 3
---

import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# iOS Subscription Offers

<AdFitTopFixed />

This guide explains how to implement and manage subscription offers (introductory and promotional) for iOS in react-native-iap.

## Overview

iOS supports several types of subscription offers to help you attract and retain subscribers:

1. **Introductory Offers** - Special pricing for new subscribers (free trial, pay as you go, pay up front)
2. **Promotional Offers** - Discounted pricing for existing or lapsed subscribers
3. **Offer Codes** - Redeemable codes for special pricing

Starting from react-native-iap v2.6.0, all offer information is properly included in the subscription data structure.

## Understanding Offer Types

### Introductory Offers

Available only to new subscribers who haven't previously subscribed to any product in the subscription group.

```typescript
type SubscriptionOffer = {
  displayPrice: string // Localized price string
  id: string // Offer identifier
  paymentMode: PaymentMode // 'FREETRIAL' | 'PAYASYOUGO' | 'PAYUPFRONT'
  period: {
    unit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'
    value: number
  }
  periodCount: number // Number of periods
  price: number // Price in decimal
  type: 'introductory'
}
```

### Payment Modes Explained

- **FREETRIAL**: Free access for a specified duration
- **PAYASYOUGO**: Discounted price for each billing period
- **PAYUPFRONT**: One-time discounted payment for multiple periods

## Accessing Offer Information

### With react-native-iap v2.6.0+

```typescript
import { fetchProducts } from 'react-native-iap'

const subscriptions = await fetchProducts({
  skus: ['com.example.premium'],
  type: 'subs',
})
const subscription = subscriptions[0]

// Access introductory offer
if (subscription.subscription?.introductoryOffer) {
  const offer = subscription.subscription.introductoryOffer
  console.log(
    `Offer: ${offer.displayPrice} for ${offer.periodCount} ${offer.period.unit}(s)`
  )
  console.log(`Payment mode: ${offer.paymentMode}`)
}

// Access promotional offers
const promotionalOffers = subscription.subscription?.promotionalOffers || []
promotionalOffers.forEach((offer) => {
  console.log(`Promo: ${offer.id} - ${offer.displayPrice}`)
})
```

### For Earlier Versions (< v2.6.0)

If you're using an earlier version, you can parse the `jsonRepresentation`:

```typescript
const subscription = subscriptions[0]
const jsonData = JSON.parse(subscription.jsonRepresentation)

// Access offers through discounts array
const discounts = jsonData.discounts || []
discounts.forEach((discount) => {
  console.log(`Offer ID: ${discount.id}`)
  console.log(`Price: ${discount.price}`)
  console.log(`Period: ${discount.subscriptionPeriod}`)
})
```

## Checking Eligibility

### For Introductory Offers

Use the `isEligibleForIntroOffer` property to check if a user can redeem an introductory offer:

```typescript
const checkEligibility = async () => {
  const subscriptions = await fetchProducts({
    skus: ['com.example.premium'],
    type: 'subs',
  })
  const subscription = subscriptions[0]

  // This property indicates if the user is eligible for intro offer
  if (subscription.isEligibleForIntroOffer) {
    // Show introductory offer UI
    displayIntroductoryOffer(subscription.subscription?.introductoryOffer)
  } else {
    // Show regular pricing
    displayRegularPrice(subscription)
  }
}
```

## Implementing Purchase Flow

### With Introductory Offer

When a user is eligible for an introductory offer, the purchase flow remains the same:

```typescript
import { requestPurchase } from 'react-native-iap'
import { Platform } from 'react-native'

const purchaseWithOffer = async (subscription: any) => {
  try {
    // Check if eligible for intro offer
    if (subscription.isEligibleForIntroOffer) {
      console.log('User is eligible for introductory offer')
    }

    // Purchase request (offers are automatically applied)
    await requestPurchase({
      request: {
        sku: subscription.id,
      },
      type: 'subs',
    })

    // Handle success in purchase listener
  } catch (error) {
    console.error('Purchase failed:', error)
  }
}
```

### With Promotional Offer

For promotional offers, you need to prepare the offer signature on your server:

```typescript
const purchasePromotionalOffer = async (subscription: any, offerId: string) => {
  try {
    // 1. Get offer details from your server
    const offerDetails = await fetchOfferDetailsFromServer(
      offerId,
      subscription.id
    )

    // 2. Purchase with promotional offer
    await requestPurchase({
      request: {
        sku: subscription.id,
        appAccountToken: offerDetails.appAccountToken,
        // Additional offer parameters may be required
      },
      type: 'subs',
    })
  } catch (error) {
    console.error('Promotional purchase failed:', error)
  }
}
```

## Displaying Offers in UI

### Example: Intro Offer Banner

```typescript
const IntroOfferBanner = ({ subscription }) => {
  const offer = subscription.subscription?.introductoryOffer;

  if (!offer || !subscription.isEligibleForIntroOffer) {
    return null;
  }

  const getOfferText = () => {
    switch (offer.paymentMode) {
      case 'FREETRIAL':
        return `Try ${offer.periodCount} ${offer.period.unit.toLowerCase()}(s) FREE`;
      case 'PAYASYOUGO':
        return `${offer.displayPrice} for ${offer.periodCount} ${offer.period.unit.toLowerCase()}(s)`;
      case 'PAYUPFRONT':
        return `${offer.displayPrice} for first ${offer.periodCount} ${offer.period.unit.toLowerCase()}(s)`;
      default:
        return offer.displayPrice;
    }
  };

  return (
    <View style={styles.offerBanner}>
      <Text style={styles.offerText}>{getOfferText()}</Text>
      <Text style={styles.regularPrice}>Then {subscription.displayPrice}</Text>
    </View>
  );
};
```

## Best Practices

1. **Always Check Eligibility**: Don't assume users are eligible for offers
2. **Clear Communication**: Display offer terms clearly (duration, price after offer)
3. **Server Validation**: Validate offer eligibility server-side for security
4. **Handle Edge Cases**: Users might lose eligibility between checking and purchasing
5. **Test Thoroughly**: Use sandbox accounts to test different offer scenarios

## Common Issues

### Offer Not Showing

1. Ensure the offer is properly configured in App Store Connect
2. Check that the sandbox account hasn't previously used the offer
3. Verify the subscription group configuration

### Eligibility Always False

- Clear purchase history in sandbox account settings
- Create a new sandbox tester
- Check if the account has any active/expired subscriptions in the group

## Server-Side Considerations

For promotional offers, you'll need server-side implementation:

1. Generate offer signatures using Apple's APIs
2. Validate user eligibility
3. Return signed offer details to your app

Example server endpoint:

```javascript
// Node.js example
app.post('/generate-offer-signature', async (req, res) => {
  const { userId, productId, offerId } = req.body

  // 1. Verify user eligibility
  const isEligible = await checkUserEligibility(userId, productId)

  if (!isEligible) {
    return res.status(403).json({ error: 'User not eligible' })
  }

  // 2. Generate signature using Apple's StoreKit API
  const signature = await generateOfferSignature(productId, offerId)

  res.json({
    signature,
    nonce: generateNonce(),
    timestamp: Date.now(),
    keyIdentifier: process.env.APPLE_KEY_ID,
  })
})
```

## Migration from react-native-iap

If you're migrating from react-native-iap, note these differences:

1. **Data Structure**: react-native-iap provides properly typed offer data in v2.6.0+
2. **No Manual Parsing**: No need to parse `jsonRepresentation` for basic offer info
3. **Simplified API**: Offer information is directly accessible through the subscription object

## Additional Resources

- [Apple's Subscription Offers Documentation](https://developer.apple.com/documentation/storekit/in-app_purchase/original_api_for_in-app_purchase/subscriptions_and_offers)
- [App Store Connect Offer Configuration](https://help.apple.com/app-store-connect/#/dee3e2d29c6c)
- [StoreKit Testing Guide](https://developer.apple.com/documentation/storekit/in-app_purchase/testing_in-app_purchases_with_sandbox)

## Need Help?

If you encounter issues with subscription offers:

1. Check the [FAQ](./faq.md) for common questions
2. Review the [Troubleshooting Guide](./troubleshooting.md)
3. [Open an issue](https://github.com/hyochan/react-native-iap/issues) with detailed information
