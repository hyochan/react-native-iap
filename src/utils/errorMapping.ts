/**
 * Error mapping utilities for react-native-iap
 * Provides helper functions for handling platform-specific errors
 */

import {ErrorCode} from '../purchaseError';

/**
 * Checks if an error is a user cancellation
 * @param error Error object or error code
 * @returns True if the error represents user cancellation
 */
export function isUserCancelledError(error: any): boolean {
  if (typeof error === 'string') {
    return error === ErrorCode.E_USER_CANCELLED;
  }

  if (error && error.code) {
    return error.code === ErrorCode.E_USER_CANCELLED;
  }

  return false;
}

/**
 * Checks if an error is related to network connectivity
 * @param error Error object or error code
 * @returns True if the error is network-related
 */
export function isNetworkError(error: any): boolean {
  const networkErrors = [
    ErrorCode.E_NETWORK_ERROR,
    ErrorCode.E_REMOTE_ERROR,
    ErrorCode.E_SERVICE_ERROR,
  ];

  const errorCode = typeof error === 'string' ? error : error?.code;
  return networkErrors.includes(errorCode);
}

/**
 * Checks if an error is recoverable (user can retry)
 * @param error Error object or error code
 * @returns True if the error is potentially recoverable
 */
export function isRecoverableError(error: any): boolean {
  const recoverableErrors = [
    ErrorCode.E_NETWORK_ERROR,
    ErrorCode.E_REMOTE_ERROR,
    ErrorCode.E_SERVICE_ERROR,
    ErrorCode.E_INTERRUPTED,
  ];

  const errorCode = typeof error === 'string' ? error : error?.code;
  return recoverableErrors.includes(errorCode);
}

/**
 * Gets a user-friendly error message for display
 * @param error Error object or error code
 * @returns User-friendly error message
 */
export function getUserFriendlyErrorMessage(error: any): string {
  const errorCode = typeof error === 'string' ? error : error?.code;

  switch (errorCode) {
    case ErrorCode.E_USER_CANCELLED:
      return 'Purchase was cancelled by user';
    case ErrorCode.E_NETWORK_ERROR:
      return 'Network connection error. Please check your internet connection and try again.';
    case ErrorCode.E_ITEM_UNAVAILABLE:
      return 'This item is not available for purchase';
    case ErrorCode.E_ALREADY_OWNED:
      return 'You already own this item';
    case ErrorCode.E_DEFERRED_PAYMENT:
      return 'Payment is pending approval';
    case ErrorCode.E_NOT_PREPARED:
      return 'In-app purchase is not ready. Please try again later.';
    case ErrorCode.E_SERVICE_ERROR:
      return 'Store service error. Please try again later.';
    case ErrorCode.E_TRANSACTION_VALIDATION_FAILED:
      return 'Transaction could not be verified';
    case ErrorCode.E_RECEIPT_FAILED:
      return 'Receipt processing failed';
    default:
      return error?.message || 'An unexpected error occurred';
  }
}
