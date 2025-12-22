---
title: Alternative Billing Example
sidebar_label: Alternative Billing
sidebar_position: 4.5
---

import IapKitBanner from "@site/src/uis/IapKitBanner";

# Alternative Billing

<IapKitBanner />

Use alternative billing to redirect users to external payment systems or offer payment choices alongside platform billing.

View the full example source:

- GitHub: [AlternativeBilling.tsx](https://github.com/hyochan/react-native-iap/blob/main/example/screens/AlternativeBilling.tsx)

## iOS - External Purchase URL

Redirect users to an external website for payment (iOS 16.0+):

```tsx
import {Platform, Button, Alert} from 'react-native';
import {requestPurchase, type Product} from 'react-native-iap';

function IosAlternativeBilling({product}: {product: Product}) {
  const handlePurchase = async () => {
    if (Platform.OS !== 'ios') return;

    try {
      await requestPurchase({
        request: {
          ios: {
            sku: product.productId,
            quantity: 1,
          },
        },
        type: 'in-app',
        useAlternativeBilling: true,
      });

      Alert.alert(
        'Redirected',
        'Complete purchase on the external website. You will be redirected back to the app.',
      );
    } catch (error: any) {
      if (error.code !== 'user-cancelled') {
        Alert.alert('Error', error.message);
      }
    }
  };

  return <Button title="Buy (External URL)" onPress={handlePurchase} />;
}
```

### Important Notes

- **iOS 16.0+ Required**: External URLs only work on iOS 16.0 and later
- **Configuration Required**: External URLs must be configured in your Expo config or React Native CLI project (see [Alternative Billing Guide](/docs/guides/alternative-billing))
- **No Callback**: `onPurchaseSuccess` will NOT fire when using external URLs
- **Deep Linking**: Implement deep linking to return users to your app

## Android - Alternative Billing Only

Manual 3-step flow for alternative billing only:

```tsx
import {Platform, Button, Alert} from 'react-native';
import {
  checkAlternativeBillingAvailabilityAndroid,
  showAlternativeBillingDialogAndroid,
  createAlternativeBillingTokenAndroid,
  type Product,
} from 'react-native-iap';

function AndroidAlternativeBillingOnly({product}: {product: Product}) {
  const handlePurchase = async () => {
    if (Platform.OS !== 'android') return;

    try {
      // Step 1: Check availability
      const isAvailable = await checkAlternativeBillingAvailabilityAndroid();
      if (!isAvailable) {
        Alert.alert('Error', 'Alternative billing not available');
        return;
      }

      // Step 2: Show information dialog
      const userAccepted = await showAlternativeBillingDialogAndroid();
      if (!userAccepted) {
        console.log('User declined');
        return;
      }

      // Step 2.5: Process payment with your payment system
      // ... your payment processing logic here ...
      console.log('Processing payment...');

      // Step 3: Create reporting token (after successful payment)
      const token = await createAlternativeBillingTokenAndroid(
        product.productId,
      );
      console.log('Token created:', token);

      // Step 4: Report token to Google Play backend within 24 hours
      // await reportToGoogleBackend(token);

      Alert.alert('Success', 'Alternative billing completed (DEMO)');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return <Button title="Buy (Alternative Only)" onPress={handlePurchase} />;
}
```

### Flow Steps

1. **Check availability** - Verify alternative billing is enabled
2. **Show info dialog** - Display Google's information dialog
3. **Process payment** - Handle payment with your system
4. **Create token** - Generate reporting token
5. **Report to Google** - Send token to Google within 24 hours

## Android - User Choice Billing

Let users choose between Google Play and alternative billing:

```tsx
import {Platform, Button} from 'react-native';
import {useIAP, requestPurchase, type Product} from 'react-native-iap';

function AndroidUserChoiceBilling({product}: {product: Product}) {
  // Initialize with user choice mode
  const {connected} = useIAP({
    alternativeBillingModeAndroid: 'user-choice',
    onPurchaseSuccess: (purchase) => {
      // Fires if user selects Google Play
      console.log('Google Play purchase:', purchase);
    },
  });

  const handlePurchase = async () => {
    if (Platform.OS !== 'android' || !connected) return;

    try {
      // Google will show selection dialog automatically
      await requestPurchase({
        request: {
          android: {
            skus: [product.productId],
          },
        },
        type: 'in-app',
        useAlternativeBilling: true,
      });

      // If user selects Google Play: onPurchaseSuccess fires
      // If user selects alternative: manual flow required
    } catch (error: any) {
      console.error('Purchase error:', error);
    }
  };

  return <Button title="Buy (User Choice)" onPress={handlePurchase} />;
}
```

### Selection Dialog

- Google shows automatic selection dialog
- User chooses: Google Play (30% fee) or Alternative (lower fee)
- Different callbacks based on user choice

## Complete Cross-Platform Example

For a fully working cross-platform implementation, see [AlternativeBilling.tsx](https://github.com/hyochan/react-native-iap/blob/main/example/screens/AlternativeBilling.tsx) in the example app.

The complete example includes:

- **iOS**: External purchase URL handling with notice sheets
- **Android Alternative Only**: 3-step manual flow with token generation
- **Android User Choice**: Automatic selection dialog handling
- **Mode Switching**: Toggle between alternative billing modes
- **Error Handling**: Comprehensive error handling for all platforms
- **UI Integration**: Product list with purchase buttons

## Configuration

### useIAP Hook

```tsx
const {connected} = useIAP({
  alternativeBillingModeAndroid: 'alternative-only', // or 'user-choice' or 'none'
});
```

### Root API

```tsx
import {initConnection} from 'react-native-iap';

await initConnection({
  alternativeBillingModeAndroid: 'alternative-only',
});
```

## Testing

### iOS

- Test on iOS 16.0+ devices
- Verify external URL opens in Safari
- Test deep link return flow

### Android

- Configure alternative billing in Google Play Console
- Test both modes separately
- Verify token generation

## Best Practices

1. **Backend Validation** - Always validate on server
2. **Clear UI** - Show users they're leaving the app
3. **Error Handling** - Handle all error cases
4. **Token Reporting** - Report within 24 hours (Android)
5. **Deep Linking** - Essential for iOS return flow

## See Also

- [Alternative Billing Guide](/docs/guides/alternative-billing)
- [Error Handling](/docs/guides/error-handling)
- [Purchase Flow](/docs/examples/purchase-flow)
