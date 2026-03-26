import {
  createPurchaseError,
  createPurchaseErrorFromPlatform,
  ErrorCodeUtils,
  isUserCancelledError,
  isDuplicatePurchaseError,
  isNetworkError,
  isRecoverableError,
  getUserFriendlyErrorMessage,
  ErrorCodeMapping,
  DUPLICATE_PURCHASE_CODE,
} from '../errorMapping';
import {ErrorCode} from '../../types';

describe('errorMapping', () => {
  describe('createPurchaseError', () => {
    it('should create a PurchaseError with default values', () => {
      const error = createPurchaseError({});

      expect(error.name).toBe('[react-native-iap]: PurchaseError');
      expect(error.message).toBe('Unknown error occurred');
      expect(error.code).toBeUndefined();
    });

    it('should create a PurchaseError with provided values', () => {
      const error = createPurchaseError({
        message: 'Test error',
        code: ErrorCode.UserCancelled,
        responseCode: 1,
        debugMessage: 'Debug info',
        productId: 'test.product',
        platform: 'ios',
      });

      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ErrorCode.UserCancelled);
      expect(error.responseCode).toBe(1);
      expect(error.debugMessage).toBe('Debug info');
      expect(error.productId).toBe('test.product');
      expect(error.platform).toBe('ios');
    });

    it('should convert string error code to ErrorCode enum', () => {
      const error = createPurchaseError({
        code: 'E_USER_CANCELLED',
        platform: 'ios',
      });

      expect(error.code).toBe(ErrorCode.UserCancelled);
    });
  });

  describe('createPurchaseErrorFromPlatform', () => {
    it('should create error from platform data', () => {
      const error = createPurchaseErrorFromPlatform(
        {
          code: 'E_USER_CANCELLED',
          message: 'User cancelled',
          responseCode: 1,
        },
        'ios',
      );

      expect(error.code).toBe(ErrorCode.UserCancelled);
      expect(error.message).toBe('User cancelled');
      expect(error.platform).toBe('ios');
    });

    it('should use default error code when none provided', () => {
      const error = createPurchaseErrorFromPlatform({}, 'android');

      expect(error.code).toBe(ErrorCode.Unknown);
      expect(error.platform).toBe('android');
    });
  });

  describe('ErrorCodeUtils', () => {
    describe('fromPlatformCode', () => {
      it('should convert E_ prefixed error codes', () => {
        expect(ErrorCodeUtils.fromPlatformCode('E_USER_CANCELLED', 'ios')).toBe(
          ErrorCode.UserCancelled,
        );
        expect(
          ErrorCodeUtils.fromPlatformCode('E_NETWORK_ERROR', 'android'),
        ).toBe(ErrorCode.NetworkError);
      });

      it('should convert kebab-case error codes', () => {
        expect(ErrorCodeUtils.fromPlatformCode('user-cancelled', 'ios')).toBe(
          ErrorCode.UserCancelled,
        );
        expect(
          ErrorCodeUtils.fromPlatformCode('network-error', 'android'),
        ).toBe(ErrorCode.NetworkError);
      });

      it('should return Unknown for unrecognized codes', () => {
        expect(ErrorCodeUtils.fromPlatformCode('UNKNOWN_ERROR', 'ios')).toBe(
          ErrorCode.Unknown,
        );
      });
    });

    describe('toPlatformCode', () => {
      it('should convert ErrorCode to string', () => {
        expect(
          ErrorCodeUtils.toPlatformCode(ErrorCode.UserCancelled, 'ios'),
        ).toBe('user-cancelled');
        expect(
          ErrorCodeUtils.toPlatformCode(ErrorCode.NetworkError, 'android'),
        ).toBe('network-error');
      });
    });

    describe('isValidForPlatform', () => {
      it('should validate error codes for platforms', () => {
        expect(
          ErrorCodeUtils.isValidForPlatform(ErrorCode.UserCancelled, 'ios'),
        ).toBe(true);
        expect(
          ErrorCodeUtils.isValidForPlatform(ErrorCode.UserCancelled, 'android'),
        ).toBe(true);
        expect(
          ErrorCodeUtils.isValidForPlatform(ErrorCode.Unknown as any, 'ios'),
        ).toBe(true);
      });
    });
  });

  describe('ErrorCodeMapping', () => {
    it('should contain mappings for both platforms', () => {
      expect(ErrorCodeMapping.ios).toBeDefined();
      expect(ErrorCodeMapping.android).toBeDefined();
      expect(ErrorCodeMapping.ios[ErrorCode.UserCancelled]).toBe(
        'user-cancelled',
      );
      expect(ErrorCodeMapping.android[ErrorCode.UserCancelled]).toBe(
        'user-cancelled',
      );
    });
  });

  describe('isUserCancelledError', () => {
    it('should identify user cancelled errors', () => {
      expect(isUserCancelledError({code: ErrorCode.UserCancelled})).toBe(true);
      expect(isUserCancelledError({code: 'user-cancelled'})).toBe(true);
      expect(isUserCancelledError({code: 'E_USER_CANCELLED'})).toBe(true);
      expect(isUserCancelledError({code: ErrorCode.NetworkError})).toBe(false);
      expect(isUserCancelledError('user-cancelled')).toBe(true);
      expect(isUserCancelledError('E_USER_CANCELLED')).toBe(true);
      expect(isUserCancelledError({})).toBe(false);
    });
  });

  describe('isDuplicatePurchaseError', () => {
    it('should identify duplicate purchase errors', () => {
      expect(isDuplicatePurchaseError({code: DUPLICATE_PURCHASE_CODE})).toBe(
        true,
      );
      expect(isDuplicatePurchaseError({code: 'duplicate-purchase'})).toBe(true);
      expect(isDuplicatePurchaseError({code: ErrorCode.UserCancelled})).toBe(
        false,
      );
      expect(isDuplicatePurchaseError({})).toBe(false);
    });
  });

  describe('isNetworkError', () => {
    it('should identify network-related errors', () => {
      expect(isNetworkError({code: ErrorCode.NetworkError})).toBe(true);
      expect(isNetworkError({code: ErrorCode.RemoteError})).toBe(true);
      expect(isNetworkError({code: ErrorCode.ServiceError})).toBe(true);
      expect(isNetworkError({code: ErrorCode.ServiceDisconnected})).toBe(true);
      expect(isNetworkError({code: ErrorCode.BillingUnavailable})).toBe(true);
      expect(isNetworkError({code: ErrorCode.UserCancelled})).toBe(false);
    });
  });

  describe('isRecoverableError', () => {
    it('should identify recoverable errors', () => {
      expect(isRecoverableError({code: ErrorCode.NetworkError})).toBe(true);
      expect(isRecoverableError({code: ErrorCode.RemoteError})).toBe(true);
      expect(isRecoverableError({code: ErrorCode.ServiceError})).toBe(true);
      expect(isRecoverableError({code: ErrorCode.Interrupted})).toBe(true);
      expect(isRecoverableError({code: ErrorCode.ServiceDisconnected})).toBe(
        true,
      );
      expect(isRecoverableError({code: ErrorCode.BillingUnavailable})).toBe(
        true,
      );
      expect(isRecoverableError({code: ErrorCode.QueryProduct})).toBe(true);
      expect(isRecoverableError({code: ErrorCode.InitConnection})).toBe(true);
      expect(isRecoverableError({code: DUPLICATE_PURCHASE_CODE})).toBe(true);
      expect(isRecoverableError({code: ErrorCode.UserCancelled})).toBe(false);
    });
  });

  describe('getUserFriendlyErrorMessage', () => {
    it('should return user-friendly messages for known errors', () => {
      expect(getUserFriendlyErrorMessage({code: ErrorCode.UserCancelled})).toBe(
        'Purchase cancelled',
      );
      expect(getUserFriendlyErrorMessage({code: ErrorCode.NetworkError})).toBe(
        'Network connection error. Please check your internet connection and try again.',
      );
      expect(
        getUserFriendlyErrorMessage({code: ErrorCode.ItemUnavailable}),
      ).toBe('This item is not available for purchase');
      expect(getUserFriendlyErrorMessage({code: ErrorCode.SkuNotFound})).toBe(
        'Requested product could not be found',
      );
      expect(getUserFriendlyErrorMessage({code: DUPLICATE_PURCHASE_CODE})).toBe(
        'This purchase has already been processed. Try restoring purchases.',
      );
    });

    it('should return custom message when provided', () => {
      expect(
        getUserFriendlyErrorMessage({
          code: ErrorCode.Unknown,
          message: 'Custom error',
        }),
      ).toBe('Custom error');
    });

    it('should return default message for unknown errors', () => {
      expect(getUserFriendlyErrorMessage({code: 'unknown-error'})).toBe(
        'An unexpected error occurred',
      );
      expect(getUserFriendlyErrorMessage({})).toBe(
        'An unexpected error occurred',
      );
    });

    it('should handle string error codes', () => {
      expect(getUserFriendlyErrorMessage('user-cancelled')).toBe(
        'Purchase cancelled',
      );
      expect(getUserFriendlyErrorMessage('E_USER_CANCELLED')).toBe(
        'Purchase cancelled',
      );
    });
  });
});
