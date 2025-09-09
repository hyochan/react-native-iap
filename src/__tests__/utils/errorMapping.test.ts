import {
  getUserFriendlyErrorMessage,
  isRecoverableError,
  isUserCancelledError,
} from '../../utils/errorMapping'
import { ErrorCode } from '../../types'

describe('utils/errorMapping', () => {
  test('isUserCancelledError matches both cancel codes', () => {
    expect(
      isUserCancelledError({
        code: ErrorCode.E_USER_CANCELLED,
        message: 'x',
      } as any)
    ).toBe(true)
    expect(
      isUserCancelledError({ code: 'E_USER_CANCELED', message: 'x' } as any)
    ).toBe(true)
    expect(
      isUserCancelledError({
        code: ErrorCode.E_NETWORK_ERROR,
        message: 'x',
      } as any)
    ).toBe(false)
  })

  test('isRecoverableError covers network/service family', () => {
    const recoverables = [
      ErrorCode.E_NETWORK_ERROR,
      ErrorCode.E_SERVICE_ERROR,
      ErrorCode.E_REMOTE_ERROR,
      ErrorCode.E_CONNECTION_CLOSED,
      ErrorCode.E_SERVICE_DISCONNECTED,
      ErrorCode.E_INIT_CONNECTION,
      ErrorCode.E_SYNC_ERROR,
    ]
    for (const code of recoverables) {
      expect(isRecoverableError({ code, message: 'x' } as any)).toBe(true)
    }
    expect(
      isRecoverableError({
        code: ErrorCode.E_USER_CANCELLED,
        message: 'x',
      } as any)
    ).toBe(false)
  })

  test('getUserFriendlyErrorMessage maps known codes and falls back to message', () => {
    expect(
      getUserFriendlyErrorMessage({
        code: ErrorCode.E_USER_CANCELLED,
        message: 'ignored',
      } as any)
    ).toBe('Purchase cancelled')
    expect(
      getUserFriendlyErrorMessage({
        code: ErrorCode.E_NETWORK_ERROR,
        message: 'ignored',
      } as any)
    ).toBe('Network connection error')
    expect(
      getUserFriendlyErrorMessage({
        code: ErrorCode.E_IAP_NOT_AVAILABLE,
        message: 'ignored',
      } as any)
    ).toBe('In-app purchases are not available on this device')

    // default fallback
    expect(
      getUserFriendlyErrorMessage({
        code: 'E_UNKNOWN_CUSTOM' as any,
        message: 'custom',
      } as any)
    ).toBe('custom')
  })
})
