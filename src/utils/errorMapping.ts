import {ErrorCode, type PurchaseError} from '../types';

export function isUserCancelledError(error: PurchaseError): boolean {
  return (
    error.code === ErrorCode.UserCancelled || error.code === 'E_USER_CANCELED'
  );
}

export function isRecoverableError(error: PurchaseError): boolean {
  const recoverable = new Set<string>([
    ErrorCode.NetworkError,
    ErrorCode.ServiceError,
    ErrorCode.RemoteError,
    ErrorCode.ConnectionClosed,
    ErrorCode.ServiceDisconnected,
    ErrorCode.InitConnection,
    ErrorCode.SyncError,
  ]);
  return recoverable.has(error.code);
}

export function getUserFriendlyErrorMessage(error: PurchaseError): string {
  switch (error.code) {
    case ErrorCode.UserCancelled:
      return 'Purchase cancelled';
    case ErrorCode.NetworkError:
      return 'Network connection error';
    case ErrorCode.ServiceError:
      return 'Store service error';
    case ErrorCode.RemoteError:
      return 'Remote service error';
    case ErrorCode.IapNotAvailable:
      return 'In-app purchases are not available on this device';
    case ErrorCode.DeferredPayment:
      return 'Payment was deferred (pending approval)';
    case ErrorCode.TransactionValidationFailed:
      return 'Transaction validation failed';
    case ErrorCode.SkuNotFound:
      return 'Product not found';
    default:
      return error.message || 'Unknown error occurred';
  }
}
