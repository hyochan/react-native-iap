"use strict";

/**
 * Error mapping utilities for react-native-iap.
 * Provides helpers for working with platform-specific error codes
 * and constructing structured purchase errors.
 */

import { ErrorCode } from "../types.js";
const ERROR_CODE_ALIASES = {
  E_USER_CANCELED: ErrorCode.UserCancelled,
  USER_CANCELED: ErrorCode.UserCancelled,
  E_USER_CANCELLED: ErrorCode.UserCancelled,
  USER_CANCELLED: ErrorCode.UserCancelled,
  // Deprecated error code mappings (map old Receipt* codes to new PurchaseVerification* codes)
  // These ensure backwards compatibility while preferring new codes
  RECEIPT_FAILED: ErrorCode.PurchaseVerificationFailed,
  E_RECEIPT_FAILED: ErrorCode.PurchaseVerificationFailed,
  RECEIPT_FINISHED: ErrorCode.PurchaseVerificationFinished,
  E_RECEIPT_FINISHED: ErrorCode.PurchaseVerificationFinished,
  RECEIPT_FINISHED_FAILED: ErrorCode.PurchaseVerificationFinishFailed,
  E_RECEIPT_FINISHED_FAILED: ErrorCode.PurchaseVerificationFinishFailed,
  // Also handle kebab-case versions
  'receipt-failed': ErrorCode.PurchaseVerificationFailed,
  'receipt-finished': ErrorCode.PurchaseVerificationFinished,
  'receipt-finished-failed': ErrorCode.PurchaseVerificationFinishFailed
};
const toKebabCase = str => {
  if (str.includes('_')) {
    return str.split('_').map(word => word.toLowerCase()).join('-');
  } else {
    return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
  }
};
const normalizePlatform = platform => typeof platform === 'string' && platform.toLowerCase() === 'ios' ? 'ios' : 'android';
const COMMON_ERROR_CODE_MAP = {
  [ErrorCode.Unknown]: ErrorCode.Unknown,
  [ErrorCode.UserCancelled]: ErrorCode.UserCancelled,
  [ErrorCode.UserError]: ErrorCode.UserError,
  [ErrorCode.ItemUnavailable]: ErrorCode.ItemUnavailable,
  [ErrorCode.RemoteError]: ErrorCode.RemoteError,
  [ErrorCode.NetworkError]: ErrorCode.NetworkError,
  [ErrorCode.ServiceError]: ErrorCode.ServiceError,
  [ErrorCode.ReceiptFailed]: ErrorCode.ReceiptFailed,
  [ErrorCode.ReceiptFinished]: ErrorCode.ReceiptFinished,
  [ErrorCode.ReceiptFinishedFailed]: ErrorCode.ReceiptFinishedFailed,
  [ErrorCode.NotPrepared]: ErrorCode.NotPrepared,
  [ErrorCode.NotEnded]: ErrorCode.NotEnded,
  [ErrorCode.AlreadyOwned]: ErrorCode.AlreadyOwned,
  [ErrorCode.DeveloperError]: ErrorCode.DeveloperError,
  [ErrorCode.BillingResponseJsonParseError]: ErrorCode.BillingResponseJsonParseError,
  [ErrorCode.DeferredPayment]: ErrorCode.DeferredPayment,
  [ErrorCode.Interrupted]: ErrorCode.Interrupted,
  [ErrorCode.IapNotAvailable]: ErrorCode.IapNotAvailable,
  [ErrorCode.PurchaseError]: ErrorCode.PurchaseError,
  [ErrorCode.SyncError]: ErrorCode.SyncError,
  [ErrorCode.TransactionValidationFailed]: ErrorCode.TransactionValidationFailed,
  [ErrorCode.ActivityUnavailable]: ErrorCode.ActivityUnavailable,
  [ErrorCode.AlreadyPrepared]: ErrorCode.AlreadyPrepared,
  [ErrorCode.Pending]: ErrorCode.Pending,
  [ErrorCode.ConnectionClosed]: ErrorCode.ConnectionClosed,
  [ErrorCode.InitConnection]: ErrorCode.InitConnection,
  [ErrorCode.ServiceDisconnected]: ErrorCode.ServiceDisconnected,
  [ErrorCode.QueryProduct]: ErrorCode.QueryProduct,
  [ErrorCode.SkuNotFound]: ErrorCode.SkuNotFound,
  [ErrorCode.SkuOfferMismatch]: ErrorCode.SkuOfferMismatch,
  [ErrorCode.ItemNotOwned]: ErrorCode.ItemNotOwned,
  [ErrorCode.BillingUnavailable]: ErrorCode.BillingUnavailable,
  [ErrorCode.FeatureNotSupported]: ErrorCode.FeatureNotSupported,
  [ErrorCode.EmptySkuList]: ErrorCode.EmptySkuList,
  [ErrorCode.PurchaseVerificationFailed]: ErrorCode.PurchaseVerificationFailed,
  [ErrorCode.PurchaseVerificationFinishFailed]: ErrorCode.PurchaseVerificationFinishFailed,
  [ErrorCode.PurchaseVerificationFinished]: ErrorCode.PurchaseVerificationFinished
};
export const ErrorCodeMapping = {
  ios: COMMON_ERROR_CODE_MAP,
  android: COMMON_ERROR_CODE_MAP
};
const OPENIAP_ERROR_CODE_SET = new Set(Object.values(ErrorCode));
export const createPurchaseError = props => {
  const errorCode = props.code ? typeof props.code === 'string' || typeof props.code === 'number' ? ErrorCodeUtils.fromPlatformCode(props.code, props.platform || 'ios') : props.code : undefined;
  const error = new Error(props.message ?? 'Unknown error occurred');
  error.name = '[react-native-iap]: PurchaseError';
  error.responseCode = props.responseCode;
  error.debugMessage = props.debugMessage;
  error.code = errorCode;
  error.productId = props.productId;
  error.platform = props.platform;
  return error;
};
export const createPurchaseErrorFromPlatform = (errorData, platform) => {
  const normalizedPlatform = normalizePlatform(platform);
  const errorCode = errorData.code ? typeof errorData.code === 'string' || typeof errorData.code === 'number' ? ErrorCodeUtils.fromPlatformCode(errorData.code, normalizedPlatform) : errorData.code : ErrorCode.Unknown;
  return createPurchaseError({
    message: errorData.message ?? 'Unknown error occurred',
    responseCode: errorData.responseCode,
    debugMessage: errorData.debugMessage,
    code: errorCode,
    productId: errorData.productId,
    platform
  });
};
export const ErrorCodeUtils = {
  getNativeErrorCode: errorCode => {
    return errorCode;
  },
  fromPlatformCode: (platformCode, _platform) => {
    if (typeof platformCode === 'string') {
      // Handle direct ErrorCode enum values
      if (OPENIAP_ERROR_CODE_SET.has(platformCode)) {
        return platformCode;
      }

      // Handle E_ prefixed codes
      if (platformCode.startsWith('E_')) {
        const withoutE = platformCode.substring(2);
        const kebabCase = toKebabCase(withoutE);
        if (OPENIAP_ERROR_CODE_SET.has(kebabCase)) {
          return kebabCase;
        }
      }

      // Handle kebab-case codes
      const kebabCase = toKebabCase(platformCode);
      if (OPENIAP_ERROR_CODE_SET.has(kebabCase)) {
        return kebabCase;
      }

      // Handle legacy formats like USER_CANCELED
      const upperCase = platformCode.toUpperCase();
      if (upperCase === 'USER_CANCELED' || upperCase === 'E_USER_CANCELED') {
        return ErrorCode.UserCancelled;
      }
    }
    return ErrorCode.Unknown;
  },
  toPlatformCode: (errorCode, _platform) => {
    return COMMON_ERROR_CODE_MAP[errorCode] ?? 'E_UNKNOWN';
  },
  isValidForPlatform: (errorCode, platform) => {
    return errorCode in ErrorCodeMapping[normalizePlatform(platform)];
  }
};

// ---------------------------------------------------------------------------
// Convenience helpers for interpreting error objects
// ---------------------------------------------------------------------------

const ERROR_CODES = new Set(Object.values(ErrorCode));
const normalizeErrorCode = code => {
  if (!code) {
    return undefined;
  }

  // If it's already an ErrorCode enum value, return it as string
  if (typeof code !== 'string' && ERROR_CODES.has(code)) {
    return code;
  }
  if (ERROR_CODES.has(code)) {
    return code;
  }
  const camelCased = toKebabCase(code);
  if (ERROR_CODES.has(camelCased)) {
    return camelCased;
  }
  if (typeof code === 'string' && code.startsWith('E_')) {
    const trimmed = code.substring(2);
    if (ERROR_CODES.has(trimmed)) {
      return trimmed;
    }
    const camelTrimmed = toKebabCase(trimmed);
    if (ERROR_CODES.has(camelTrimmed)) {
      return camelTrimmed;
    }
  }

  // Handle legacy formats
  if (code === 'E_USER_CANCELED') {
    return ErrorCode.UserCancelled;
  }
  return code;
};
function extractCode(error) {
  if (typeof error === 'string') {
    return normalizeErrorCode(error);
  }
  if (error && typeof error === 'object' && 'code' in error) {
    const code = error.code;
    return normalizeErrorCode(typeof code === 'string' ? code : code);
  }
  return undefined;
}
export function isUserCancelledError(error) {
  return extractCode(error) === ErrorCode.UserCancelled;
}
export function isNetworkError(error) {
  const networkErrors = [ErrorCode.NetworkError, ErrorCode.RemoteError, ErrorCode.ServiceError, ErrorCode.ServiceDisconnected, ErrorCode.BillingUnavailable];
  const code = extractCode(error);
  return !!code && networkErrors.includes(code);
}
export function isRecoverableError(error) {
  const recoverableErrors = [ErrorCode.NetworkError, ErrorCode.RemoteError, ErrorCode.ServiceError, ErrorCode.Interrupted, ErrorCode.ServiceDisconnected, ErrorCode.BillingUnavailable, ErrorCode.QueryProduct, ErrorCode.InitConnection, ErrorCode.SyncError, ErrorCode.ConnectionClosed];
  const code = extractCode(error);
  return !!code && recoverableErrors.includes(code);
}
export function getUserFriendlyErrorMessage(error) {
  const errorCode = extractCode(error);
  switch (errorCode) {
    case ErrorCode.UserCancelled:
      return 'Purchase cancelled';
    case ErrorCode.NetworkError:
      return 'Network connection error. Please check your internet connection and try again.';
    case ErrorCode.ServiceDisconnected:
      return 'Billing service disconnected. Please try again.';
    case ErrorCode.BillingUnavailable:
      return 'Billing is unavailable on this device or account.';
    case ErrorCode.ItemUnavailable:
      return 'This item is not available for purchase';
    case ErrorCode.ItemNotOwned:
      return "You don't own this item";
    case ErrorCode.AlreadyOwned:
      return 'You already own this item';
    case ErrorCode.SkuNotFound:
      return 'Requested product could not be found';
    case ErrorCode.SkuOfferMismatch:
      return 'Selected offer does not match the SKU';
    case ErrorCode.DeferredPayment:
      return 'Payment is pending approval';
    case ErrorCode.NotPrepared:
      return 'In-app purchase is not ready. Please try again later.';
    case ErrorCode.ServiceError:
      return 'Store service error. Please try again later.';
    case ErrorCode.FeatureNotSupported:
      return 'This feature is not supported on this device.';
    case ErrorCode.TransactionValidationFailed:
      return 'Transaction could not be verified';
    case ErrorCode.ReceiptFailed:
    case ErrorCode.PurchaseVerificationFailed:
      return 'Purchase verification failed';
    case ErrorCode.ReceiptFinished:
    case ErrorCode.PurchaseVerificationFinished:
      return 'Purchase verification completed';
    case ErrorCode.ReceiptFinishedFailed:
    case ErrorCode.PurchaseVerificationFinishFailed:
      return 'Failed to complete purchase verification';
    case ErrorCode.EmptySkuList:
      return 'No product IDs provided';
    case ErrorCode.InitConnection:
      return 'Failed to initialize billing connection';
    case ErrorCode.IapNotAvailable:
      return 'In-app purchases are not available on this device';
    case ErrorCode.QueryProduct:
      return 'Failed to query products. Please try again later.';
    default:
      {
        if (error && typeof error === 'object' && 'message' in error) {
          return error.message ?? 'An unexpected error occurred';
        }
        return 'An unexpected error occurred';
      }
  }
}
export const normalizeErrorCodeFromNative = code => {
  if (typeof code === 'string') {
    const upper = code.toUpperCase();

    // Check aliases first (includes deprecated Receipt* -> PurchaseVerification* mappings)
    const alias = ERROR_CODE_ALIASES[upper];
    if (alias) {
      return alias;
    }

    // Also check lowercase alias for kebab-case codes
    const lowerAlias = ERROR_CODE_ALIASES[code];
    if (lowerAlias) {
      return lowerAlias;
    }

    // Handle various user cancelled formats
    if (upper === 'USER_CANCELLED' || upper === 'USER_CANCELED' || upper === 'E_USER_CANCELLED' || upper === 'E_USER_CANCELED' || upper === 'USER_CANCEL' || upper === 'CANCELLED' || upper === 'CANCELED' || code === 'user-cancelled' || code === 'user-canceled') {
      return ErrorCode.UserCancelled;
    }

    // Handle E_ prefixed codes
    if (upper.startsWith('E_')) {
      const trimmed = upper.slice(2);

      // Try kebab-case conversion (most common format)
      const kebab = trimmed.toLowerCase().replace(/_/g, '-');
      if (OPENIAP_ERROR_CODE_SET.has(kebab)) {
        return kebab;
      }
    }

    // Handle direct kebab-case codes (check against enum values, not keys)
    if (code.includes('-')) {
      // Check if the code is already a valid ErrorCode value
      if (OPENIAP_ERROR_CODE_SET.has(code)) {
        return code;
      }
    }

    // Handle snake_case codes
    if (code.includes('_')) {
      const kebab = code.toLowerCase().replace(/_/g, '-');
      if (OPENIAP_ERROR_CODE_SET.has(kebab)) {
        return kebab;
      }
    }

    // Try direct match with ErrorCode enum values
    if (OPENIAP_ERROR_CODE_SET.has(code)) {
      return code;
    }

    // Try lowercase match
    const lower = code.toLowerCase();
    if (OPENIAP_ERROR_CODE_SET.has(lower)) {
      return lower;
    }
  }
  return ErrorCode.Unknown;
};
//# sourceMappingURL=errorMapping.js.map