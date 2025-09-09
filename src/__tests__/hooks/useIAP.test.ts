import { renderHook, act } from '@testing-library/react-hooks'

// Mock NitroModules to avoid native dependency and drive events via iap instance
const mockIap: any = {
  initConnection: jest.fn(async () => true),
  endConnection: jest.fn(async () => true),
  fetchProducts: jest.fn(async () => []),
  getAvailablePurchases: jest.fn(async () => []),
  finishTransaction: jest.fn(async () => true),
  validateReceipt: jest.fn(async () => ({})),
  addPurchaseUpdatedListener: jest.fn(),
  removePurchaseUpdatedListener: jest.fn(),
  addPurchaseErrorListener: jest.fn(),
  removePurchaseErrorListener: jest.fn(),
  addPromotedProductListenerIOS: jest.fn(),
  removePromotedProductListenerIOS: jest.fn(),
}

jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    createHybridObject: jest.fn(() => mockIap),
  },
}))

// Import after mocks
let IAP: any
let useIAPHook: any

function loadModulesWithMocks() {
  jest.resetModules()
  jest.doMock('react-native-nitro-modules', () => ({
    NitroModules: {
      createHybridObject: jest.fn(() => mockIap),
    },
  }))
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  IAP = require('../../index')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useIAPHook = require('../../hooks/useIAP').useIAP
}

describe.skip('hooks/useIAP', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('initializes connection and exposes connected state', async () => {
    loadModulesWithMocks()
    const { result, waitFor } = renderHook(() => useIAPHook())
    await waitFor(() => result.current.connected === true)
    expect(IAP.initConnection).toHaveBeenCalled()
  })

  it('handles purchase update and refreshes states', async () => {
    loadModulesWithMocks()
    const onPurchaseSuccess = jest.fn()
    const { result, waitFor } = renderHook(() =>
      useIAPHook({ onPurchaseSuccess })
    )
    await waitFor(() => result.current.connected)

    const purchase = {
      id: 't1',
      productId: 'p1',
      transactionDate: Date.now(),
      platform: 'ios',
    } as any

    act(() => {
      // Get the wrapped listener passed through the index wrapper
      const wrapped = mockIap.addPurchaseUpdatedListener.mock.calls[0][0]
      wrapped(purchase)
    })

    await waitFor(() => result.current.currentPurchase !== undefined)
    expect(result.current.currentPurchase?.productId).toBe('p1')
    expect(onPurchaseSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ productId: 'p1' })
    )

    // finishTransaction wrapper is returned; ensure callable
    await act(async () => {
      await result.current.finishTransaction({ purchase, isConsumable: false })
    })
    expect(IAP.finishTransaction).toHaveBeenCalled()
  })

  it('handles purchase errors and exposes currentPurchaseError', async () => {
    loadModulesWithMocks()
    const onPurchaseError = jest.fn()
    const { result, waitFor } = renderHook(() =>
      useIAPHook({ onPurchaseError })
    )
    await waitFor(() => result.current.connected)

    const err = { code: 'E_SERVICE_ERROR', message: 'boom' } as any
    act(() => {
      const wrapped = mockIap.addPurchaseErrorListener.mock.calls[0][0]
      wrapped(err)
    })

    await waitFor(() => result.current.currentPurchaseError !== undefined)
    expect(result.current.currentPurchaseError?.message).toBe('boom')
    expect(onPurchaseError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'boom' })
    )
  })
})
