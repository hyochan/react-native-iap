---
sidebar_position: 2
---

import GreatFrontEndTopFixed from "@site/src/uis/GreatFrontEndTopFixed";

# Error Codes

<GreatFrontEndTopFixed />

React Native IAP provides a centralized error handling system with platform-specific error code mapping. This ensures consistent error handling across iOS and Android platforms.

## Error Code Enum

### ErrorCode

The `ErrorCode` enum provides standardized error codes that map to platform-specific errors:

```tsx
import {ErrorCode} from 'react-native-iap';

export enum ErrorCode {
  Unknown = 'unknown',
  UserCancelled = 'user-cancelled',
  UserError = 'user-error',
  ItemUnavailable = 'item-unavailable',
  RemoteError = 'remote-error',
  NetworkError = 'network-error',
  ServiceError = 'service-error',
  ReceiptFailed = 'receipt-failed',
  ReceiptFinished = 'receipt-finished',
  ReceiptFinishedFailed = 'receipt-finished-failed',
  NotPrepared = 'not-prepared',
  NotEnded = 'not-ended',
  AlreadyOwned = 'already-owned',
  DeveloperError = 'developer-error',
  BillingResponseJsonParseError = 'billing-response-json-parse-error',
  DeferredPayment = 'deferred-payment',
  Interrupted = 'interrupted',
  IapNotAvailable = 'iap-not-available',
  PurchaseError = 'purchase-error',
  SyncError = 'sync-error',
  TransactionValidationFailed = 'transaction-validation-failed',
  ActivityUnavailable = 'activity-unavailable',
  AlreadyPrepared = 'already-prepared',
  Pending = 'pending',
  ConnectionClosed = 'connection-closed',
  InitConnection = 'init-connection',
  ServiceDisconnected = 'service-disconnected',
  QueryProduct = 'query-product',
  SkuNotFound = 'sku-not-found',
  SkuOfferMismatch = 'sku-offer-mismatch',
  ItemNotOwned = 'item-not-owned',
  BillingUnavailable = 'billing-unavailable',
  FeatureNotSupported = 'feature-not-supported',
  EmptySkuList = 'empty-sku-list',
}
```

## PurchaseError

A custom error class for purchase-related errors.

```tsx
export interface PurchaseErrorProps {
  message: string;
  responseCode?: number;
  debugMessage?: string;
  code?: ErrorCode;
  productId?: string;
  platform?: IapPlatform;
}

export type PurchaseError = Error & PurchaseErrorProps;
```

### createPurchaseError

Creates a `PurchaseError` instance.

```tsx
export const createPurchaseError = (
  props: PurchaseErrorProps,
): PurchaseError => {
  // ...
};
```

### createPurchaseErrorFromPlatform

Creates a `PurchaseError` from platform-specific error data.

```tsx
export const createPurchaseErrorFromPlatform = (
  errorData: PurchaseErrorProps,
  platform: IapPlatform,
): PurchaseError => {
  // ...
};
```

## ErrorCodeUtils

Utility functions for error code mapping and validation.

### getNativeErrorCode

Gets the native error code for the current platform:

```tsx
ErrorCodeUtils.getNativeErrorCode(errorCode: ErrorCode): string
```

### fromPlatformCode

Maps platform-specific error code to standardized ErrorCode:

```tsx
ErrorCodeUtils.fromPlatformCode(
  platformCode: string | number,
  platform?: IapPlatform,
): ErrorCode
```

### toPlatformCode

Maps ErrorCode to platform-specific code:

```tsx
ErrorCodeUtils.toPlatformCode(
  errorCode: ErrorCode,
  platform?: IapPlatform,
): string | number
```

### isValidForPlatform

Checks if error code is valid for the specified platform:

```tsx
ErrorCodeUtils.isValidForPlatform(
  errorCode: ErrorCode,
  platform: IapPlatform,
): boolean
```

## Error Helper Functions

These functions help interpret error objects.

### isUserCancelledError

Returns `true` if the error is a user cancellation error.

```tsx
export function isUserCancelledError(error: unknown): boolean;
```

### isNetworkError

Returns `true` if the error is a network-related error.

```tsx
export function isNetworkError(error: unknown): boolean;
```

### isRecoverableError

Returns `true` if the error is a recoverable error.

```tsx
export function isRecoverableError(error: unknown): boolean;
```

### getUserFriendlyErrorMessage

Returns a user-friendly error message for a given error.

```tsx
export function getUserFriendlyErrorMessage(error: ErrorLike): string;
```

## User-Friendly Error Messages

The `getUserFriendlyErrorMessage` function provides localized and user-friendly messages for common errors.

| ErrorCode | Message |
| --- | --- |
| `UserCancelled` | 'Purchase cancelled' |
| `NetworkError` | 'Network connection error. Please check your internet connection and try again.' |
| `ReceiptFinished` | 'Receipt already finished' |
| `ServiceDisconnected` | 'Billing service disconnected. Please try again.' |
| `BillingUnavailable` | 'Billing is unavailable on this device or account.' |
| `ItemUnavailable` | 'This item is not available for purchase' |
| `ItemNotOwned` | "You don't own this item" |
| `AlreadyOwned` | 'You already own this item' |
| `SkuNotFound` | 'Requested product could not be found' |
| `SkuOfferMismatch` | 'Selected offer does not match the SKU' |
| `DeferredPayment` | 'Payment is pending approval' |
| `NotPrepared` | 'In-app purchase is not ready. Please try again later.' |
| `ServiceError` | 'Store service error. Please try again later.' |
| `FeatureNotSupported` | 'This feature is not supported on this device.' |
| `TransactionValidationFailed` | 'Transaction could not be verified' |
| `ReceiptFailed` | 'Receipt processing failed' |
| `EmptySkuList` | 'No product IDs provided' |
| `InitConnection` | 'Failed to initialize billing connection' |
| `QueryProduct` | 'Failed to query products. Please try again later.' |
| _default_ | 'An unexpected error occurred' |

## See Also

- [Error Handling Guide](../guides/error-handling)
- [useIAP Hook](./use-iap)
- [Types Reference](./types)
- [Troubleshooting](../guides/troubleshooting)
