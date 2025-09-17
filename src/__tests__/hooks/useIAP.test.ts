/* eslint-disable import/first */
import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';

// Minimal Nitro mock used by index/useIAP under the hood
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
};

jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    createHybridObject: jest.fn(() => mockIap),
  },
}));

jest.mock('react-native', () => ({
  Platform: {OS: 'ios', select: (obj: any) => obj.ios},
}));

// Mock helpers used via index re-exports
jest.mock('../../helpers/subscription', () => ({
  getActiveSubscriptions: jest.fn(async () => []),
  hasActiveSubscriptions: jest.fn(async () => false),
}));

// Import after mocks
import * as IAP from '../../index';
import {useIAP} from '../../hooks/useIAP';

describe('hooks/useIAP (renderer)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  let capturedPurchaseListener: any;

  beforeEach(() => {
    jest.spyOn(IAP, 'initConnection').mockResolvedValue(true as any);
    jest.spyOn(IAP, 'getAvailablePurchases').mockResolvedValue([] as any);
    jest.spyOn(IAP, 'finishTransaction').mockResolvedValue(true as any);
    jest.spyOn(IAP, 'purchaseUpdatedListener').mockImplementation((cb: any) => {
      capturedPurchaseListener = cb;
      return {remove: jest.fn()};
    });
    jest.spyOn(IAP, 'purchaseErrorListener').mockImplementation(() => {
      return {remove: jest.fn()};
    });
    // Avoid native iap call in index.promotedProductListenerIOS
    jest
      .spyOn(IAP, 'promotedProductListenerIOS')
      .mockImplementation(() => ({remove: jest.fn()}));
  });

  it('connects on mount and updates state on purchase events', async () => {
    let api: any;
    const onPurchaseSuccess = jest.fn();
    const Harness = () => {
      api = useIAP({onPurchaseSuccess});
      return null;
    };

    await act(async () => {
      TestRenderer.create(React.createElement(Harness));
    });

    // Allow effects to run and connection to settle
    await act(async () => {});
    expect(api.connected).toBe(true);
    expect(IAP.initConnection).toBeDefined();

    // Simulate a purchase update coming from native
    const purchase = {
      id: 't1',
      productId: 'p1',
      transactionDate: Date.now(),
      platform: 'ios',
      quantity: 1,
      purchaseState: 'purchased',
      isAutoRenewing: false,
    };
    act(() => {
      capturedPurchaseListener?.(purchase);
    });
    await act(async () => {});
    expect(onPurchaseSuccess).toHaveBeenCalledWith(purchase);

    // Ensure finishTransaction wrapper works
    await act(async () => {
      await api.finishTransaction({purchase, isConsumable: false});
    });
    expect(IAP.finishTransaction).toBeDefined();
  });
});
