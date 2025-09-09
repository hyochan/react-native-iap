import { ErrorCode, type PurchaseError } from '../types'

export function isUserCancelledError(error: PurchaseError): boolean {
  return (
    error.code === ErrorCode.E_USER_CANCELLED ||
    error.code === 'E_USER_CANCELED'
  )
}

export function isRecoverableError(error: PurchaseError): boolean {
  const recoverable = new Set<string>([
    ErrorCode.E_NETWORK_ERROR,
    ErrorCode.E_SERVICE_ERROR,
    ErrorCode.E_REMOTE_ERROR,
    ErrorCode.E_CONNECTION_CLOSED,
    ErrorCode.E_SERVICE_DISCONNECTED,
    ErrorCode.E_INIT_CONNECTION,
    ErrorCode.E_SYNC_ERROR,
  ])
  return recoverable.has(error.code)
}

export function getUserFriendlyErrorMessage(error: PurchaseError): string {
  switch (error.code) {
    case ErrorCode.E_USER_CANCELLED:
      return 'Purchase cancelled'
    case ErrorCode.E_NETWORK_ERROR:
      return 'Network connection error'
    case ErrorCode.E_SERVICE_ERROR:
      return 'Store service error'
    case ErrorCode.E_REMOTE_ERROR:
      return 'Remote service error'
    case ErrorCode.E_IAP_NOT_AVAILABLE:
      return 'In-app purchases are not available on this device'
    case ErrorCode.E_DEFERRED_PAYMENT:
      return 'Payment was deferred (pending approval)'
    case ErrorCode.E_TRANSACTION_VALIDATION_FAILED:
      return 'Transaction validation failed'
    case ErrorCode.E_SKU_NOT_FOUND:
      return 'Product not found'
    default:
      return error.message || 'Unknown error occurred'
  }
}
