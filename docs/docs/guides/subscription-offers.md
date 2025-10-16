---
title: Subscription Offers
sidebar_label: Subscription Offers
sidebar_position: 3
---

import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# Subscription Offers

<AdFitTopFixed />

This guide explains how to handle subscription offers (pricing plans) when purchasing subscriptions on iOS and Android platforms.

For a complete implementation example, see the [Subscription Flow Example](../examples/subscription-flow.md).

## Overview

Subscription offers represent different pricing plans for the same subscription product:

- **Base Plan**: The standard pricing for a subscription
- **Introductory Offers**: Special pricing for new subscribers (free trial, discounted period)
- **Promotional Offers**: Limited-time discounts configured in the app stores

## Platform Differences

At a glance:

- Android: subscription offers are required when purchasing subscriptions. You must pass `subscriptionOffers` with one or more offer tokens from `fetchProducts()`.
- iOS: base plan is used by default. Promotional discounts are optional via `withOffer`.

Tip: Always fetch products first; offers only exist after `fetchProducts({ type: 'subs' })`.

### Android Subscription Offers

Android requires explicit specification of subscription offers when purchasing. Each offer is identified by an `offerToken` obtained from `fetchProducts()`.

#### Required for Android Subscriptions

Unlike iOS, Android subscriptions **must** include `subscriptionOffers` in the purchase request. Without it, the purchase will fail with:

```text
The number of skus (1) must match: the number of offerTokens (0)
```

#### Getting Offer Tokens

```tsx
import {useIAP} from 'react-native-iap';

const SubscriptionComponent = () => {
  const {connected, subscriptions, fetchProducts, requestPurchase} = useIAP();

  // 1) Fetch subscription products
  useEffect(() => {
    if (connected) {
      fetchProducts({skus: ['premium_monthly'], type: 'subs'});
    }
  }, [connected]);

  // 2) Access offer details from fetched subscriptions
  const subscription = subscriptions.find((s) => s.id === 'premium_monthly');

  if (subscription?.subscriptionOfferDetailsAndroid) {
    console.log(
      'Available offers:',
      subscription.subscriptionOfferDetailsAndroid,
    );
    // Each offer contains: basePlanId, offerId?, offerTags, offerToken, pricingPhases
  }
};
```

#### Purchase with Offers

```tsx
const purchaseSubscription = async (subscriptionId: string) => {
  const subscription = subscriptions.find((s) => s.id === subscriptionId);
  if (!subscription) return;

  // Build subscriptionOffers from fetched data
  const subscriptionOffers = (
    subscription.subscriptionOfferDetailsAndroid ?? []
  ).map((offer) => ({
    sku: subscriptionId,
    offerToken: offer.offerToken,
  }));

  // Only proceed if offers are available
  if (subscriptionOffers.length === 0) {
    console.error('No subscription offers available');
    return;
  }

  await requestPurchase({
    request: {
      ios: {sku: subscriptionId},
      android: {
        skus: [subscriptionId],
        // Required for Android: include only when offers are available
        ...(subscriptionOffers.length > 0 && {subscriptionOffers}),
      },
    },
    type: 'subs',
  });
};
```

#### Understanding Offer Details

Each `subscriptionOfferDetailsAndroid` item contains:

```tsx
interface ProductSubscriptionAndroidOfferDetails {
  basePlanId: string; // Base plan identifier
  offerId?: string | null; // Offer identifier (null for base plan)
  offerTags: string[]; // Tags associated with the offer
  offerToken: string; // Token required for purchase
  pricingPhases: PricingPhasesAndroid; // Pricing information
}
```

### iOS Subscription Offers

iOS handles subscription offers differently - the base plan is used by default, and promotional offers are optional.

#### Base Plan (Default)

For standard subscription purchases, no special offer specification is needed:

```tsx
await requestPurchase({
  request: {
    ios: {sku: 'premium_monthly'},
    android: {
      skus: [
        'premium_monthly',
      ] /* include subscriptionOffers only if available */,
    },
  },
  type: 'subs',
});
```

#### Promotional Offers (Optional)

iOS supports promotional offers through the `withOffer` parameter. These are configured in App Store Connect.

```tsx
interface DiscountOfferInputIOS {
  offerIdentifier: string;    // From App Store Connect
  keyIdentifier: string;      // From App Store Connect
  nonce: string;              // UUID v4 (lowercase)
  signature: string;          // Base64-encoded signature from your server
  timestamp: number;          // Unix timestamp in milliseconds
}

const purchaseWithPromotionalOffer = async (
  subscriptionId: string,
  promotionalOffer: DiscountOfferInputIOS
) => {
  await requestPurchase({
    request: {
      ios: {
        sku: subscriptionId,
        withOffer: promotionalOffer, // Apply promotional discount
      },
      android: {skus: [subscriptionId], subscriptionOffers: [...]},
    },
    type: 'subs',
  });
};
```

##### Server-Side Signature Generation

Promotional offer signatures must be generated on your server and **must be base64-encoded**. Here's a complete example:

```javascript
// Node.js server example
const crypto = require('crypto');
const {v4: uuidv4} = require('uuid');

function generatePromotionalOfferSignature(
  bundleId, // Your app's bundle identifier (e.g., "com.example.app")
  productId, // Product identifier (e.g., "premium_monthly")
  offerId, // Offer identifier from App Store Connect
  applicationUsername, // User identifier (appAccountToken)
  privateKey, // PKCS#8 PEM-formatted private key from App Store Connect
  keyId, // Key ID from App Store Connect
) {
  // Generate nonce and timestamp
  const nonce = uuidv4().toLowerCase(); // MUST be lowercase UUID
  const timestamp = Date.now(); // Milliseconds since Unix epoch

  // ⭐ CRITICAL: Data must be joined in this exact order
  const dataToSign = [
    bundleId, // 1. App Bundle ID
    keyId, // 2. Key Identifier
    productId, // 3. Product Identifier
    offerId, // 4. Offer Identifier
    applicationUsername, // 5. Application Username (appAccountToken)
    nonce, // 6. Nonce (lowercase UUID)
    timestamp.toString(), // 7. Timestamp (milliseconds)
  ].join('\u2063'); // Join with invisible separator (U+2063)

  // Sign the data with SHA-256
  const sign = crypto.createSign('sha256');
  sign.update(dataToSign);
  const signatureBuffer = sign.sign({
    key: privateKey,
    format: 'pem',
    type: 'pkcs8',
  });

  // ⭐ CRITICAL: Signature MUST be base64-encoded
  const base64Signature = signatureBuffer.toString('base64');

  return {
    identifier: offerId,
    keyIdentifier: keyId,
    nonce: nonce, // Lowercase UUID
    signature: base64Signature, // Base64-encoded signature
    timestamp: timestamp, // Milliseconds
  };
}

// Usage example
app.post('/generate-offer-signature', (req, res) => {
  const {productId, offerId, applicationUsername} = req.body;

  const signature = generatePromotionalOfferSignature(
    process.env.APP_BUNDLE_ID, // From environment
    productId,
    offerId,
    applicationUsername,
    process.env.APPLE_PRIVATE_KEY, // PKCS#8 PEM private key
    process.env.APPLE_KEY_ID, // From App Store Connect
  );

  res.json(signature);
});
```

**Important Notes:**

1. **Data Order**: The 7 fields MUST be joined in the exact order shown above (as per [Apple's documentation](https://developer.apple.com/documentation/storekit/original_api_for_in-app_purchase/subscriptions_and_offers/generating_a_signature_for_promotional_offers))
2. **Nonce**: Must be a lowercase UUID v4 string
3. **Timestamp**: Must be in milliseconds (not seconds)
4. **Signature**: Must be base64-encoded (not hex or raw)
5. **Private Key**: Must be PKCS#8 PEM format from App Store Connect
6. **Separator**: Use Unicode character U+2063 (invisible separator)

**Common Errors:**

- "The data couldn't be read because it isn't in the correct format" → Signature is not base64-encoded
- "Invalid signature" → Incorrect data order or wrong separator
- "Signature verification failed" → Wrong private key or key ID

## Common Patterns

### Selecting Specific Offers

```tsx
const selectOffer = (
  subscription: ProductSubscription,
  offerType: 'base' | 'introductory',
) => {
  if (Platform.OS === 'ios') {
    // iOS doesn't need explicit offer selection for base plan
    return null;
  }

  // Android: Select offer based on type
  const offers = subscription.subscriptionOfferDetailsAndroid ?? [];

  if (offerType === 'base') {
    // Find base plan (no offerId)
    return offers.find((offer) => !offer.offerId);
  } else {
    // Find introductory offer
    return offers.find((offer) => offer.offerId?.includes('introductory'));
  }
};

const purchaseWithSelectedOffer = async (
  subscriptionId: string,
  offerType: 'base' | 'introductory' = 'base',
) => {
  const subscription = subscriptions.find((s) => s.id === subscriptionId);
  if (!subscription) return;

  const selectedOffer = selectOffer(subscription, offerType);

  if (Platform.OS === 'android') {
    const subscriptionOffers = selectedOffer
      ? [
          {
            sku: subscriptionId,
            offerToken: selectedOffer.offerToken,
          },
        ]
      : [];

    if (subscriptionOffers.length === 0) {
      console.error('No suitable offer found');
      return;
    }

    await requestPurchase({
      request: {
        ios: {sku: subscriptionId},
        android: {
          skus: [subscriptionId],
          // Required for Android: include only when you found a valid offer
          ...(subscriptionOffers.length > 0 && {subscriptionOffers}),
        },
      },
      type: 'subs',
    });
  } else {
    // iOS: Could add promotional offer logic here
    await requestPurchase({
      request: {
        ios: {sku: subscriptionId},
        android: {
          skus: [
            subscriptionId,
          ] /* include subscriptionOffers only if available */,
        },
      },
      type: 'subs',
    });
  }
};
```

## Error Handling

### Android Errors

```tsx
import {useIAP, ErrorCode} from 'react-native-iap';

const {requestPurchase} = useIAP({
  onPurchaseError: (error) => {
    // Check for specific error code
    if (error.code === ErrorCode.SkuOfferMismatch) {
      console.error('SKU and offer mismatch');
      // Ensure subscriptionOffers is included and valid
    }
  },
});
```

### iOS Errors

```tsx
import {useIAP, ErrorCode} from 'react-native-iap';

const {requestPurchase} = useIAP({
  onPurchaseError: (error) => {
    // Check for generic errors that may indicate offer issues
    if (error.code === ErrorCode.Unknown) {
      console.error('Invalid promotional offer for iOS');
      // Check offerIdentifier, signature, etc.
    }
  },
});
```

## Best Practices

1. **Always fetch products first**: Subscription offers are only available after `fetchProducts()`.

2. **Handle platform differences**: Android requires offers, iOS makes them optional.

3. **Validate offers**: Check that offers exist before attempting purchase.

4. **User selection**: Allow users to choose between different pricing plans when multiple offers are available.

5. **Error recovery**: Provide fallback to base plan if selected offer fails.

## See Also

- [useIAP Hook](../api/use-iap) - Main API documentation
- [Subscription Flow Example](../examples/subscription-flow) - Complete implementation
- [Error Codes](../api/error-codes) - Purchase error handling
