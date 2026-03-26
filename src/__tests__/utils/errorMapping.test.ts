import {
  getUserFriendlyErrorMessage,
  isRecoverableError,
  isUserCancelledError,
  isDuplicatePurchaseError,
  DUPLICATE_PURCHASE_CODE,
} from '../../utils/errorMapping';
import {ErrorCode} from '../../types';

describe('utils/errorMapping', () => {
  test('isUserCancelledError matches both cancel codes', () => {
    expect(
      isUserCancelledError({
        code: ErrorCode.UserCancelled,
        message: 'x',
      } as any),
    ).toBe(true);
    expect(
      isUserCancelledError({code: 'E_USER_CANCELED', message: 'x'} as any),
    ).toBe(true);
    expect(
      isUserCancelledError({
        code: ErrorCode.NetworkError,
        message: 'x',
      } as any),
    ).toBe(false);
  });

  test('isRecoverableError covers network/service family', () => {
    const recoverables = [
      ErrorCode.NetworkError,
      ErrorCode.ServiceError,
      ErrorCode.RemoteError,
      ErrorCode.ConnectionClosed,
      ErrorCode.ServiceDisconnected,
      ErrorCode.InitConnection,
      ErrorCode.SyncError,
    ];
    for (const code of recoverables) {
      expect(isRecoverableError({code, message: 'x'} as any)).toBe(true);
    }
    expect(
      isRecoverableError({
        code: ErrorCode.UserCancelled,
        message: 'x',
      } as any),
    ).toBe(false);
  });

  test('isDuplicatePurchaseError detects duplicate purchase errors', () => {
    expect(
      isDuplicatePurchaseError({
        code: DUPLICATE_PURCHASE_CODE,
        message: 'x',
      } as any),
    ).toBe(true);
    expect(
      isDuplicatePurchaseError({
        code: 'duplicate-purchase',
        message: 'x',
      } as any),
    ).toBe(true);
    expect(
      isDuplicatePurchaseError({
        code: ErrorCode.UserCancelled,
        message: 'x',
      } as any),
    ).toBe(false);
  });

  test('isRecoverableError includes duplicate-purchase', () => {
    expect(
      isRecoverableError({
        code: DUPLICATE_PURCHASE_CODE,
        message: 'x',
      } as any),
    ).toBe(true);
  });

  test('getUserFriendlyErrorMessage returns message for duplicate-purchase', () => {
    expect(
      getUserFriendlyErrorMessage({
        code: DUPLICATE_PURCHASE_CODE,
        message: 'ignored',
      } as any),
    ).toBe(
      'This purchase has already been processed. Try restoring purchases.',
    );
  });

  test('getUserFriendlyErrorMessage maps known codes and falls back to message', () => {
    expect(
      getUserFriendlyErrorMessage({
        code: ErrorCode.UserCancelled,
        message: 'ignored',
      } as any),
    ).toBe('Purchase cancelled');
    expect(
      getUserFriendlyErrorMessage({
        code: ErrorCode.NetworkError,
        message: 'ignored',
      } as any),
    ).toBe(
      'Network connection error. Please check your internet connection and try again.',
    );
    expect(
      getUserFriendlyErrorMessage({
        code: ErrorCode.IapNotAvailable,
        message: 'ignored',
      } as any),
    ).toBe('In-app purchases are not available on this device');

    // default fallback
    expect(
      getUserFriendlyErrorMessage({
        code: 'E_UNKNOWN_CUSTOM' as any,
        message: 'custom',
      } as any),
    ).toBe('custom');
  });
});
