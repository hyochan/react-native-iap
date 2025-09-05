---
title: Offer Code Redemption
sidebar_label: Offer Code Redemption
---

# Offer Code Redemption

This guide explains how to implement offer code redemption functionality in your app using react-native-iap.

## Overview

Offer codes (also known as promo codes or redemption codes) allow users to redeem special offers for in-app purchases and subscriptions. The implementation differs between iOS and Android platforms.

## iOS Implementation

On iOS, react-native-iap provides a native method to present Apple's code redemption sheet directly within your app.

### Usage

```typescript
import { presentCodeRedemptionSheet } from 'react-native-iap'

// Present the code redemption sheet
try {
  const result = await presentCodeRedemptionSheet()
  if (result) {
    console.log('Code redemption sheet presented successfully')
    // The system will handle the redemption process
    // Listen for purchase updates via purchaseUpdatedListener
  }
} catch (error) {
  console.error('Failed to present code redemption sheet:', error)
}
```

### Important Notes

- This method only works on real iOS devices (not simulators)
- Not available on tvOS
- The redemption sheet is handled by the iOS system
- After successful redemption, purchase updates will be delivered through your existing `purchaseUpdatedListener`

## Android Implementation

Google Play does not provide a direct API to redeem codes within the app. Instead, users must redeem codes through the Google Play Store app or website.

### Usage

```typescript
import { openRedeemOfferCodeAndroid } from 'react-native-iap'

// Open Google Play Store redemption page
try {
  await openRedeemOfferCodeAndroid()
  // This will open the Play Store where users can enter their codes
} catch (error) {
  console.error('Failed to open Play Store:', error)
}
```

### Alternative Approach

You can also direct users to redeem codes via a custom deep link:

```typescript
import { Linking } from 'react-native'

const redeemCode = async (code: string) => {
  const url = `https://play.google.com/redeem?code=${code}`
  await Linking.openURL(url)
}
```

## Complete Example

Here's a complete example that handles both platforms:

```typescript
import { Platform } from 'react-native'
import {
  presentCodeRedemptionSheet,
  openRedeemOfferCodeAndroid,
  purchaseUpdatedListener,
} from 'react-native-iap'

const handleRedeemCode = async () => {
  try {
    if (Platform.OS === 'ios') {
      // Present native iOS redemption sheet
      const result = await presentCodeRedemptionSheet()
      if (result) {
        console.log('Redemption sheet presented')
      }
    } else if (Platform.OS === 'android') {
      // Open Play Store for Android
      await openRedeemOfferCodeAndroid()
    }
  } catch (error) {
    console.error('Error redeeming code:', error)
  }
}

// Set up listener for purchase updates after redemption
useEffect(() => {
  const subscription = purchaseUpdatedListener((purchase) => {
    console.log('Purchase updated after redemption:', purchase)
    // Handle the new purchase/subscription
  })

  return () => {
    subscription.remove()
  }
}, [])
```

## Best Practices

1. **User Experience**: Clearly communicate to users where they can find and how to use offer codes
2. **Error Handling**: Always wrap redemption calls in try-catch blocks
3. **Platform Detection**: Use platform-specific methods appropriately
4. **Purchase Validation**: Always validate purchases on your server after redemption

## Testing

### iOS Testing

- Offer codes can only be tested on real devices
- Use TestFlight or App Store Connect to generate test codes
- Sandbox environment supports offer code testing

### Android Testing

- Test with promo codes generated in Google Play Console
- Ensure your app is properly configured for in-app purchases

## Troubleshooting

### iOS Issues

- **"Not available on simulator"**: Use a real device for testing
- **Sheet doesn't appear**: Ensure StoreKit is properly configured
- **User cancellation**: This is normal behavior and doesn't throw an error

### Android Issues

- **Play Store doesn't open**: Check if Play Store is installed and updated
- **Invalid code**: Verify the code format and validity in Play Console
