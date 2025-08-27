/**
 * Error mapping utilities for react-native-iap
 * Provides helper functions for handling platform-specific errors
 */

import { ErrorCode } from '../types';

type ErrorLike = { code?: string; message?: string };

const getCode = (e: unknown): string | undefined =>
  typeof e === 'string' ? e : (e as ErrorLike | null | undefined)?.code;

/**
 * Checks if an error is a user cancellation
 * @param error Error object or error code
 * @returns True if the error represents user cancellation
 */
export function isUserCancelledError(error: unknown): boolean {
  return getCode(error) === ErrorCode.E_USER_CANCELLED;
}

/**
 * Checks if an error is related to network connectivity
 * @param error Error object or error code
 * @returns True if the error is network-related
 */
export function isNetworkError(error: unknown): boolean {
  const networkErrors = [
    ErrorCode.E_NETWORK_ERROR,
    ErrorCode.E_REMOTE_ERROR,
    ErrorCode.E_SERVICE_ERROR,
  ] as const;
  const code = getCode(error);
  return !!code && (networkErrors as readonly string[]).includes(code);
}

/**
 * Checks if an error is recoverable (user can retry)
 * @param error Error object or error code
 * @returns True if the error is potentially recoverable
 */
export function isRecoverableError(error: unknown): boolean {
  const recoverableErrors = [
    ErrorCode.E_NETWORK_ERROR,
    ErrorCode.E_REMOTE_ERROR,
    ErrorCode.E_SERVICE_ERROR,
    ErrorCode.E_INTERRUPTED,
  ] as const;
  const code = getCode(error);
  return !!code && (recoverableErrors as readonly string[]).includes(code);
}

/**
 * Gets a user-friendly error message for display
 * @param error Error object or error code
 * @returns User-friendly error message
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  const errorCode = getCode(error);

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
      return (error as ErrorLike)?.message || 'An unexpected error occurred';
  }
}
