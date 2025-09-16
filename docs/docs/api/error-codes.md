---
sidebar_position: 2
---

import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# Error Codes

<AdFitTopFixed />

React Native IAP uses standardized error codes that conform to the OpenIAP specification.

## OpenIAP Error Documentation

For comprehensive error code definitions, error handling patterns, and platform-specific error mappings, please refer to:

**👉 [OpenIAP Error Documentation](https://www.openiap.dev/docs/errors)**

## Basic Usage Example

```tsx
import {useIAP, ErrorCode, PurchaseError} from 'react-native-iap';

const {requestPurchase} = useIAP({
  onPurchaseError: (error: PurchaseError) => {
    console.log('Error details:', {
      code: error.code,
      message: error.message,
      platform: error.platform,
    });

    switch (error.code) {
      case ErrorCode.UserCancelled:
        // Don't show error for user cancellation
        break;
      case ErrorCode.NetworkError:
        Alert.alert('Network Error', 'Please check your internet connection');
        break;
      case ErrorCode.ItemUnavailable:
        Alert.alert('Item Unavailable', 'This item is not available');
        break;
      case ErrorCode.AlreadyOwned:
        Alert.alert('Already Owned', 'You already own this item');
        break;
      case ErrorCode.DeveloperError:
        Alert.alert('Configuration Error', 'Please contact support');
        break;
      default:
        Alert.alert('Purchase Failed', error.message);
    }
  },
});
```

## Advanced Error Handling with Retry

```tsx
const handlePurchaseWithRetry = async (productId: string, retryCount = 0) => {
  const MAX_RETRIES = 2;

  try {
    await requestPurchase({
      request: {
        ios: {sku: productId},
        android: {skus: [productId]},
      },
    });
  } catch (error: any) {
    const purchaseError = error as PurchaseError;

    // Determine if we should retry
    const retryableErrors = [
      ErrorCode.NetworkError,
      ErrorCode.ServiceError,
      ErrorCode.Interrupted,
    ];

    const shouldRetry =
      retryableErrors.includes(purchaseError.code!) && retryCount < MAX_RETRIES;

    if (shouldRetry) {
      console.log(`Retrying purchase (${retryCount + 1}/${MAX_RETRIES})`);
      setTimeout(
        () => {
          handlePurchaseWithRetry(productId, retryCount + 1);
        },
        1000 * Math.pow(2, retryCount),
      ); // Exponential backoff
    } else {
      handlePurchaseError(purchaseError);
    }
  }
};
```

## Platform-Specific Error Handling

```tsx
const handlePlatformSpecificError = (error: PurchaseError) => {
  if (Platform.OS === 'ios') {
    switch (error.code) {
      case ErrorCode.DeferredPayment:
        // iOS-specific: Parental approval required
        Alert.alert('Approval Required', 'This purchase requires approval');
        break;
      case ErrorCode.TransactionValidationFailed:
        // iOS-specific: StoreKit validation failed
        Alert.alert('Validation Failed', 'Transaction could not be validated');
        break;
    }
  } else if (Platform.OS === 'android') {
    switch (error.code) {
      case ErrorCode.BillingResponseJsonParseError:
        // Android-specific: Billing response parse error
        Alert.alert('Error', 'Failed to process purchase response');
        break;
      case ErrorCode.Pending:
        // Android-specific: Purchase is pending
        Alert.alert('Purchase Pending', 'Your purchase is being processed');
        break;
    }
  }
};
```

## Error Logging

```tsx
const logError = (error: PurchaseError) => {
  // Log to analytics service
  analytics.track('purchase_error', {
    error_code: error.code,
    platform: error.platform,
    product_id: error.productId,
    message: error.message,
  });

  // Log to crash reporting
  if (error.code !== ErrorCode.UserCancelled) {
    crashlytics.recordError(error);
  }
};
```

## See Also

- [OpenIAP Error Documentation](https://www.openiap.dev/docs/errors) - Complete error reference
- [useIAP Hook](./use-iap) - Error handling with hooks
- [Types Reference](./types) - Error type definitions
- [Troubleshooting](../guides/troubleshooting) - Common issues and solutions
