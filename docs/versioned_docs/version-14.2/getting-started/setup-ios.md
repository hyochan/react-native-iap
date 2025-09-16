---
sidebar_position: 1
---

import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# iOS Setup

<AdFitTopFixed />

For complete iOS setup instructions including App Store Connect configuration, Xcode setup, and testing guidelines, please visit:

👉 **[iOS Setup Guide - openiap.dev](https://openiap.dev/docs/ios-setup)**

The guide covers:

- App Store Connect configuration
- Xcode project setup
- Sandbox testing
- Common troubleshooting steps

## Code Implementation

### Basic Setup

```tsx
import {useIAP, ErrorCode} from 'react-native-iap';

const productIds = [
  'com.yourapp.premium',
  'com.yourapp.coins_100',
  'com.yourapp.subscription_monthly',
];

function App() {
  const {connected, products, fetchProducts, requestPurchase, validateReceipt} =
    useIAP({
      onPurchaseSuccess: (purchase) => {
        console.log('Purchase successful:', purchase);
        // Handle successful purchase
        validatePurchase(purchase);
      },
      onPurchaseError: (error) => {
        console.error('Purchase failed:', error);
        // Handle purchase error
      },
    });

  React.useEffect(() => {
    if (connected) {
      fetchProducts({skus: productIds, type: 'in-app'});
    }
  }, [connected]);

  const validatePurchase = async (purchase) => {
    try {
      const result = await validateReceipt(purchase.id);
      if (result.isValid) {
        // Grant user the purchased content
        console.log('Receipt is valid');
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  return (
    <View>
      {products.map((product) => (
        <TouchableOpacity
          key={product.id}
          onPress={() => requestPurchase({request: {sku: product.id}})}
        >
          <Text>
            {product.title} - {product.displayPrice}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
```

> **💡 Cross-Platform Note:** This example shows iOS-specific usage with `sku`. For cross-platform compatibility, include both `sku` and `skus` in your request object. See the [Core Methods](/docs/api/methods/core-methods#requestpurchase) documentation for details.

### iOS-Specific Features

#### Receipt Validation

```tsx
const validateReceipt = async (productId: string) => {
  try {
    const result = await validateReceipt(productId);

    console.log('Receipt validation result:', {
      isValid: result.isValid,
      receiptData: result.receiptData,
      jwsRepresentation: result.jwsRepresentation, // iOS 15+
    });

    return result.isValid;
  } catch (error) {
    console.error('Receipt validation failed:', error);
    return false;
  }
};
```

#### Handling StoreKit Errors

```tsx
const handlePurchaseError = (error: any) => {
  switch (error.code) {
    case ErrorCode.UserCancelled:
      // User cancelled - don't show error
      break;
    case ErrorCode.E_PAYMENT_NOT_ALLOWED:
      Alert.alert('Purchases are not allowed on this device');
      break;
    case ErrorCode.E_PAYMENT_INVALID:
      Alert.alert('Invalid payment information');
      break;
    default:
      Alert.alert('Purchase failed', error.message);
  }
};
```

## Common Issues

### Product IDs Not Found

**Problem**: Products return empty or undefined

**Solutions**:

1. **Check Prerequisites** (Most common cause):
   - Verify ALL agreements are signed in App Store Connect > Business
   - Ensure ALL banking, legal, and tax information is completed AND approved by Apple
   - These are the most commonly overlooked requirements

2. **Verify Product Configuration**:
   - Product IDs match exactly between code and App Store Connect
   - Products are in "Ready to Submit" or "Approved" state
   - Bundle identifier matches

3. **Use Proper Sandbox Testing**:
   - Sign in via Settings > Developer > Sandbox Apple Account
   - NOT through the App Store app

### Sandbox Testing Issues

**Problem**: "Cannot connect to iTunes Store" error **Solution**:

- Use a dedicated sandbox test user
- Sign out of regular App Store account
- Verify internet connection
- Try on a real device (simulator may have issues)

### Receipt Validation Failures

**Problem**: Receipt validation returns invalid **Solution**:

- Check if app is properly signed
- Verify receipt data is not corrupted
- Ensure proper error handling for network issues

## Best Practices

1. **Always validate receipts** server-side for production apps
2. **Handle all error cases** gracefully
3. **Test thoroughly** with sandbox users
4. **Provide restore functionality** for non-consumable products

## Next Steps

- [Learn about Android setup](./setup-android)
- [Explore getting started guide](../guides/getting-started)
- [Understand error codes](../api/error-codes)
