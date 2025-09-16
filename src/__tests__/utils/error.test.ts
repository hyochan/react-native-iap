import {
  parseErrorStringToJsonObj,
  isUserCancelledError,
} from '../../utils/error';
import {ErrorCode} from '../../types';

describe('Error utilities', () => {
  describe('parseErrorStringToJsonObj', () => {
    it('should parse valid JSON error string', () => {
      const errorString = JSON.stringify({
        code: ErrorCode.UserCancelled,
        message: 'User cancelled',
        responseCode: 1,
      });

      const result = parseErrorStringToJsonObj(errorString);

      expect(result).toEqual({
        code: ErrorCode.UserCancelled,
        message: 'User cancelled',
        responseCode: 1,
      });
    });

    it('should handle Error object with JSON message', () => {
      const errorObj = {
        code: ErrorCode.NetworkError,
        message: 'Network error',
      };
      const error = new Error(JSON.stringify(errorObj));

      const result = parseErrorStringToJsonObj(error);

      expect(result).toEqual(errorObj);
    });

    it('should handle plain Error object', () => {
      const error = new Error('Something went wrong');

      const result = parseErrorStringToJsonObj(error);

      expect(result).toEqual({
        code: ErrorCode.Unknown,
        message: 'Something went wrong',
      });
    });

    it('should handle non-JSON string', () => {
      const errorString = 'Not a JSON string';

      const result = parseErrorStringToJsonObj(errorString);

      expect(result).toEqual({
        code: ErrorCode.Unknown,
        message: 'Not a JSON string',
      });
    });

    it('should handle undefined input', () => {
      const result = parseErrorStringToJsonObj(undefined);

      expect(result).toEqual({
        code: ErrorCode.Unknown,
        message: 'Unknown error occurred',
      });
    });

    it('should handle null input', () => {
      const result = parseErrorStringToJsonObj(null);

      expect(result).toEqual({
        code: ErrorCode.Unknown,
        message: 'Unknown error occurred',
      });
    });

    it('should handle empty string', () => {
      const result = parseErrorStringToJsonObj('');

      expect(result).toEqual({
        code: ErrorCode.Unknown,
        message: '',
      });
    });

    it('should handle object input', () => {
      const errorObj = {
        code: ErrorCode.ItemUnavailable,
        message: 'Item not available',
      };

      const result = parseErrorStringToJsonObj(errorObj);

      expect(result).toEqual({
        code: ErrorCode.Unknown,
        message: 'Unknown error occurred',
      });
    });

    it('should parse error code format "CODE: message"', () => {
      const errorString = 'E_NETWORK_ERROR: Network connection failed';

      const result = parseErrorStringToJsonObj(errorString);

      expect(result).toEqual({
        code: 'E_NETWORK_ERROR',
        message: 'Network connection failed',
      });
    });
  });

  describe('isUserCancelledError', () => {
    it('should return true for user cancelled error', () => {
      const error = {
        code: ErrorCode.UserCancelled,
        message: 'User cancelled the purchase',
      };

      expect(isUserCancelledError(error)).toBe(true);
    });

    it('should return false for other errors', () => {
      const error = {
        code: ErrorCode.NetworkError,
        message: 'Network error occurred',
      };

      expect(isUserCancelledError(error)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isUserCancelledError(undefined)).toBe(false);
    });

    it('should return false for error without code', () => {
      const error = {
        message: 'Some error',
      };

      expect(isUserCancelledError(error)).toBe(false);
    });
  });
});
