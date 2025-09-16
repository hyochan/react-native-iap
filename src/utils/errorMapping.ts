import {ErrorCode, type PurchaseError} from '../types';

const LEGACY_CANCELLED_CODE = 'E_USER_CANCELED' as unknown as ErrorCode;

export const normalizeErrorCodeFromNative = (code: unknown): ErrorCode => {
  if (typeof code === 'string') {
    const trimmed = code.startsWith('E_') ? code.slice(2) : code;
    const camel = trimmed
      .toLowerCase()
      .split('_')
      .map((segment) => {
        if (!segment) return segment;
        return segment.charAt(0).toUpperCase() + segment.slice(1);
      })
      .join('');
    if ((ErrorCode as any)[camel]) {
      return (ErrorCode as any)[camel];
    }
  }
  return ErrorCode.Unknown;
};

export function isUserCancelledError(error: PurchaseError): boolean {
  return (
    error.code === ErrorCode.UserCancelled ||
    error.code === LEGACY_CANCELLED_CODE
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
