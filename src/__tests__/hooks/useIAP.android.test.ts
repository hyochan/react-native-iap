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

// Mock Android platform
jest.mock('react-native', () => ({
  Platform: {OS: 'android', select: (obj: any) => obj.android},
}));

// Import after mocks
import * as IAP from '../../index';
import {useIAP} from '../../hooks/useIAP';

describe('hooks/useIAP Android', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    jest.spyOn(IAP, 'initConnection').mockResolvedValue(true as any);
    jest.spyOn(IAP, 'getAvailablePurchases').mockResolvedValue([] as any);
    jest.spyOn(IAP, 'getActiveSubscriptions').mockResolvedValue([] as any);
    jest.spyOn(IAP, 'hasActiveSubscriptions').mockResolvedValue(false as any);
    jest.spyOn(IAP, 'finishTransaction').mockResolvedValue(undefined as any);
    jest.spyOn(IAP, 'purchaseUpdatedListener').mockImplementation(() => {
      return {remove: jest.fn()};
    });
    jest.spyOn(IAP, 'purchaseErrorListener').mockImplementation(() => {
      return {remove: jest.fn()};
    });
    // promotedProductListenerIOS won't be called on Android but mock anyway
    jest
      .spyOn(IAP, 'promotedProductListenerIOS')
      .mockImplementation(() => ({remove: jest.fn()}));
  });

  it('passes enableBillingProgramAndroid config to initConnection on Android', async () => {
    let api: any;
    const Harness = () => {
      api = useIAP({
        enableBillingProgramAndroid: 'user-choice-billing',
      });
      return null;
    };

    await act(async () => {
      TestRenderer.create(React.createElement(Harness));
    });

    // Allow effects to run and connection to settle
    await act(async () => {});
    expect(api.connected).toBe(true);

    // Verify initConnection was called with the billing program config
    expect(IAP.initConnection).toHaveBeenCalledWith({
      enableBillingProgramAndroid: 'user-choice-billing',
    });
  });

  it('passes alternativeBillingModeAndroid config to initConnection on Android (deprecated)', async () => {
    let api: any;
    const Harness = () => {
      api = useIAP({
        alternativeBillingModeAndroid: 'user-choice',
      });
      return null;
    };

    await act(async () => {
      TestRenderer.create(React.createElement(Harness));
    });

    // Allow effects to run and connection to settle
    await act(async () => {});
    expect(api.connected).toBe(true);

    // Verify initConnection was called with the alternative billing config
    expect(IAP.initConnection).toHaveBeenCalledWith({
      alternativeBillingModeAndroid: 'user-choice',
    });
  });

  it('prefers enableBillingProgramAndroid over alternativeBillingModeAndroid', async () => {
    let api: any;
    const Harness = () => {
      api = useIAP({
        enableBillingProgramAndroid: 'external-offer',
        alternativeBillingModeAndroid: 'user-choice',
      });
      return null;
    };

    await act(async () => {
      TestRenderer.create(React.createElement(Harness));
    });

    // Allow effects to run and connection to settle
    await act(async () => {});
    expect(api.connected).toBe(true);

    // Verify initConnection was called with enableBillingProgramAndroid (takes priority)
    expect(IAP.initConnection).toHaveBeenCalledWith({
      enableBillingProgramAndroid: 'external-offer',
    });
  });
});
