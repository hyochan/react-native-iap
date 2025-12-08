---
title: Error Handling
sidebar_label: Error Handling
---

import GreatFrontEndTopFixed from "@site/src/uis/GreatFrontEndTopFixed";

# Error Handling

<GreatFrontEndTopFixed />

All methods can throw errors that should be handled appropriately. Use the `PurchaseError` type and helper functions for consistent, cross‑platform error information.

```ts
import {
  PurchaseError,
  requestPurchase,
  isUserCancelledError,
  isNetworkError,
  getUserFriendlyErrorMessage,
  ErrorCode,
} from 'react-native-iap';

try {
  await requestPurchase({
    request: {ios: {sku: 'product_id'}},
    type: 'in-app',
  });
} catch (error) {
  // Check for user cancellation
  if (isUserCancelledError(error)) {
    console.log('User cancelled purchase');
    return;
  }

  // Check for network errors
  if (isNetworkError(error)) {
    console.log('Network error, please try again');
    return;
  }

  // Get user-friendly error message
  const friendlyMessage = getUserFriendlyErrorMessage(error);
  console.error('Purchase failed:', friendlyMessage);

  // Or access error details directly
  if (error instanceof PurchaseError) {
    console.error(`Error code: ${error.code}, Message: ${error.message}`);
  }
}
```

## Error Types

### PurchaseError

The `PurchaseError` interface extends the standard `Error` class with additional purchase-specific properties:

```ts
interface PurchaseError extends Error {
  code?: ErrorCode;
  responseCode?: number;
  debugMessage?: string;
  productId?: string;
  platform?: IapPlatform;
}
```

### ErrorCode Enum

Use the `ErrorCode` enum for type-safe error code comparisons:

```ts
import {ErrorCode} from 'react-native-iap';

if (error instanceof PurchaseError && error.code === ErrorCode.UserCancelled) {
  // Handle user cancellation
}
```

## Error Codes

For the complete list of error codes and their meanings, see the reference below.

- [Error Codes](./error-codes)
