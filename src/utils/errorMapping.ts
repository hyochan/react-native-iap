import {ErrorCode, type PurchaseError} from '../types';

const ERROR_CODE_ALIASES: Record<string, ErrorCode> = {
  E_USER_CANCELED: ErrorCode.UserCancelled,
  USER_CANCELED: ErrorCode.UserCancelled,
  E_USER_CANCELLED: ErrorCode.UserCancelled,
  USER_CANCELLED: ErrorCode.UserCancelled,
};

export const normalizeErrorCodeFromNative = (code: unknown): ErrorCode => {
  if (typeof code === 'string') {
    const upper = code.toUpperCase();
    const alias = ERROR_CODE_ALIASES[upper];
    if (alias) {
      return alias;
    }

    const trimmed = upper.startsWith('E_') ? upper.slice(2) : upper;
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
  return normalizeErrorCodeFromNative(error.code) === ErrorCode.UserCancelled;
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
