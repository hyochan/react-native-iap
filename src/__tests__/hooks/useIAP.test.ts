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

// Mock is handled through spyOn in beforeEach

// Import after mocks
import * as IAP from '../../index';
import {useIAP} from '../../hooks/useIAP';

describe('hooks/useIAP (renderer)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  let capturedPurchaseListener: any;
  let mockFetchProducts: jest.SpyInstance;
  let mockGetAvailablePurchases: jest.SpyInstance;
  let mockGetActiveSubscriptions: jest.SpyInstance;
  let mockHasActiveSubscriptions: jest.SpyInstance;
  let mockRestorePurchases: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(IAP, 'initConnection').mockResolvedValue(true as any);
    mockGetAvailablePurchases = jest
      .spyOn(IAP, 'getAvailablePurchases')
      .mockResolvedValue([] as any);
    mockGetActiveSubscriptions = jest
      .spyOn(IAP, 'getActiveSubscriptions')
      .mockResolvedValue([] as any);
    mockHasActiveSubscriptions = jest
      .spyOn(IAP, 'hasActiveSubscriptions')
      .mockResolvedValue(false as any);
    jest.spyOn(IAP, 'finishTransaction').mockResolvedValue(undefined as any);
    mockFetchProducts = jest
      .spyOn(IAP, 'fetchProducts')
      .mockResolvedValue([] as any);
    mockRestorePurchases = jest
      .spyOn(IAP, 'restorePurchases')
      .mockResolvedValue(undefined as any);
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
      store: 'apple',
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

  describe('onError callback', () => {
    it('calls onError when fetchProducts fails', async () => {
      const fetchError = new Error('Network error fetching products');
      mockFetchProducts.mockRejectedValueOnce(fetchError);

      let api: any;
      const onError = jest.fn();
      const Harness = () => {
        api = useIAP({onError});
        return null;
      };

      await act(async () => {
        TestRenderer.create(React.createElement(Harness));
      });
      await act(async () => {});

      // Call fetchProducts which should trigger onError
      await act(async () => {
        await api.fetchProducts({skus: ['product1']});
      });

      expect(onError).toHaveBeenCalledWith(fetchError);
    });

    it('calls onError when getAvailablePurchases fails', async () => {
      const purchaseError = new Error('Failed to get purchases');
      mockGetAvailablePurchases.mockRejectedValueOnce(purchaseError);

      let api: any;
      const onError = jest.fn();
      const Harness = () => {
        api = useIAP({onError});
        return null;
      };

      await act(async () => {
        TestRenderer.create(React.createElement(Harness));
      });
      await act(async () => {});

      await act(async () => {
        await api.getAvailablePurchases();
      });

      expect(onError).toHaveBeenCalledWith(purchaseError);
    });

    it('calls onError when getActiveSubscriptions fails', async () => {
      const subscriptionError = new Error('Failed to get subscriptions');
      mockGetActiveSubscriptions.mockRejectedValueOnce(subscriptionError);

      let api: any;
      const onError = jest.fn();
      const Harness = () => {
        api = useIAP({onError});
        return null;
      };

      await act(async () => {
        TestRenderer.create(React.createElement(Harness));
      });
      await act(async () => {});

      await act(async () => {
        const result = await api.getActiveSubscriptions();
        // Should return empty array on error
        expect(result).toEqual([]);
      });

      expect(onError).toHaveBeenCalledWith(subscriptionError);
    });

    it('calls onError when hasActiveSubscriptions fails', async () => {
      const hasSubsError = new Error('Failed to check subscriptions');
      mockHasActiveSubscriptions.mockRejectedValueOnce(hasSubsError);

      let api: any;
      const onError = jest.fn();
      const Harness = () => {
        api = useIAP({onError});
        return null;
      };

      await act(async () => {
        TestRenderer.create(React.createElement(Harness));
      });
      await act(async () => {});

      await act(async () => {
        const result = await api.hasActiveSubscriptions();
        // Should return false on error
        expect(result).toBe(false);
      });

      expect(onError).toHaveBeenCalledWith(hasSubsError);
    });

    it('calls onError when restorePurchases fails', async () => {
      const restoreError = new Error('Failed to restore');
      mockRestorePurchases.mockRejectedValueOnce(restoreError);

      let api: any;
      const onError = jest.fn();
      const Harness = () => {
        api = useIAP({onError});
        return null;
      };

      await act(async () => {
        TestRenderer.create(React.createElement(Harness));
      });
      await act(async () => {});

      await act(async () => {
        await api.restorePurchases();
      });

      expect(onError).toHaveBeenCalledWith(restoreError);
    });

    it('does not call onError when operations succeed', async () => {
      let api: any;
      const onError = jest.fn();
      const Harness = () => {
        api = useIAP({onError});
        return null;
      };

      await act(async () => {
        TestRenderer.create(React.createElement(Harness));
      });
      await act(async () => {});

      await act(async () => {
        await api.fetchProducts({skus: ['product1']});
        await api.getAvailablePurchases();
        await api.getActiveSubscriptions();
        await api.hasActiveSubscriptions();
      });

      expect(onError).not.toHaveBeenCalled();
    });

    it('converts non-Error objects to Error in onError callback', async () => {
      const stringError = 'String error message';
      mockFetchProducts.mockRejectedValueOnce(stringError);

      let api: any;
      const onError = jest.fn();
      const Harness = () => {
        api = useIAP({onError});
        return null;
      };

      await act(async () => {
        TestRenderer.create(React.createElement(Harness));
      });
      await act(async () => {});

      await act(async () => {
        await api.fetchProducts({skus: ['product1']});
      });

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
      expect(onError.mock.calls[0][0].message).toBe(stringError);
    });

    it('calls onError when initConnection fails', async () => {
      const initError = new Error('Failed to initialize connection');
      jest.spyOn(IAP, 'initConnection').mockRejectedValueOnce(initError);

      const onError = jest.fn();
      const Harness = () => {
        useIAP({onError});
        return null;
      };

      await act(async () => {
        TestRenderer.create(React.createElement(Harness));
      });

      // Wait for initConnection to be called and fail
      await act(async () => {});

      expect(onError).toHaveBeenCalledWith(initError);
    });

    it('does not throw unhandled exception when initConnection fails with onError', async () => {
      const initError = new Error('Store unavailable');
      jest.spyOn(IAP, 'initConnection').mockRejectedValueOnce(initError);

      const onError = jest.fn();
      const Harness = () => {
        useIAP({onError});
        return null;
      };

      // This should not throw an unhandled promise rejection
      await act(async () => {
        TestRenderer.create(React.createElement(Harness));
      });

      await act(async () => {});

      // onError should be called, error should be handled gracefully
      expect(onError).toHaveBeenCalledWith(initError);
    });

    it('handles initConnection failure without onError callback', async () => {
      const initError = new Error('Connection failed');
      const initConnectionSpy = jest
        .spyOn(IAP, 'initConnection')
        .mockRejectedValueOnce(initError);

      // No onError callback - should not throw unhandled exception
      const Harness = () => {
        useIAP();
        return null;
      };

      await act(async () => {
        TestRenderer.create(React.createElement(Harness));
      });

      await act(async () => {});

      // Test passes if no unhandled exception is thrown
      expect(initConnectionSpy).toHaveBeenCalled();
    });
  });
});
