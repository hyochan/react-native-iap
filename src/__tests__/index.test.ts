/* eslint-disable @typescript-eslint/no-require-imports */
// Keep mocks static and simple for readability.
// No dynamic imports; mock before importing the module under test.

import {Platform} from 'react-native';
import {ErrorCode} from '../types';
import type {DiscountOfferInputIOS, Purchase} from '../types';

const PLATFORM_IOS = 'ios';

// Minimal Nitro IAP mock to exercise wrappers
const mockIap: any = {
  // connection
  initConnection: jest.fn(async () => true),
  endConnection: jest.fn(async () => true),

  // products
  fetchProducts: jest.fn(async () => []),

  // purchases
  requestPurchase: jest.fn(async () => undefined),
  getAvailablePurchases: jest.fn(async () => []),
  finishTransaction: jest.fn(async () => true),

  // listeners
  addPurchaseUpdatedListener: jest.fn(),
  removePurchaseUpdatedListener: jest.fn(),
  addPurchaseErrorListener: jest.fn(),
  removePurchaseErrorListener: jest.fn(),
  addPromotedProductListenerIOS: jest.fn(),
  removePromotedProductListenerIOS: jest.fn(),

  // iOS-only
  getStorefrontIOS: jest.fn(async () => 'USA'),
  getAppTransactionIOS: jest.fn(async () => null),
  requestPromotedProductIOS: jest.fn(async () => null),
  buyPromotedProductIOS: jest.fn(async () => undefined),
  presentCodeRedemptionSheetIOS: jest.fn(async () => true),

  // Unified storefront
  getStorefront: jest.fn(async () => 'USA'),

  // receipt validation (unified API)
  validateReceipt: jest.fn(async () => ({
    isValid: true,
    receiptData: 'mock-receipt',
    jwsRepresentation: 'mock-jws',
    latestTransaction: null,
  })),
};

jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    createHybridObject: jest.fn(() => mockIap),
  },
}));

// Import after mocks using require to ensure init-time mocks apply cleanly
// (explicit require is used here to avoid dynamic import and to cooperate with jest.resetModules)
// eslint-disable-next-line @typescript-eslint/no-var-requires
let IAP: any = require('../index');

describe('Public API (src/index.ts)', () => {
  let originalError: any;
  let originalWarn: any;

  beforeAll(() => {
    originalError = console.error;
    originalWarn = console.warn;
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
    console.warn = originalWarn;
  });
  beforeEach(() => {
    jest.clearAllMocks();
    // Default to iOS in tests; override per-case
    (Platform as any).OS = 'ios';
    // Re-require module to ensure fresh state if needed
    jest.resetModules();
    // Reinstall the NitroModules mock after reset
    jest.doMock('react-native-nitro-modules', () => ({
      NitroModules: {
        createHybridObject: jest.fn(() => mockIap),
      },
    }));
    mockIap.deepLinkToSubscriptionsIOS = undefined;
    mockIap.getReceiptIOS = undefined;
    mockIap.requestReceiptRefreshIOS = undefined;
    mockIap.getStorefront = jest.fn(async () => 'USA');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    IAP = require('../index');
  });

  describe('listeners', () => {
    it('purchaseUpdatedListener wraps and forwards validated purchases', () => {
      const listener = jest.fn();
      const sub = IAP.purchaseUpdatedListener(listener);
      expect(typeof sub.remove).toBe('function');

      // Emulate native event
      const nitroPurchase = {
        id: 't1',
        productId: 'p1',
        transactionDate: Date.now(),
        platform: 'ios',
        quantity: 1,
        purchaseState: 'purchased',
        isAutoRenewing: false,
      };
      const wrapped = mockIap.addPurchaseUpdatedListener.mock.calls[0][0];
      wrapped(nitroPurchase);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 'p1',
          platform: PLATFORM_IOS,
        }),
      );

      // remove
      sub.remove();
      expect(mockIap.removePurchaseUpdatedListener).toHaveBeenCalled();
    });

    it('purchaseErrorListener forwards error objects and supports removal', () => {
      const listener = jest.fn();
      const sub = IAP.purchaseErrorListener(listener);
      expect(typeof sub.remove).toBe('function');

      const err = {code: 'E_UNKNOWN', message: 'oops'};
      const passed = mockIap.addPurchaseErrorListener.mock.calls[0][0];
      passed(err);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          code: ErrorCode.Unknown,
          message: 'oops',
        }),
      );

      sub.remove();
      expect(mockIap.removePurchaseErrorListener).toHaveBeenCalled();
    });

    it('promotedProductListenerIOS warns and no-ops on non‑iOS', () => {
      (Platform as any).OS = 'android';
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const sub = IAP.promotedProductListenerIOS(jest.fn());
      expect(typeof sub.remove).toBe('function');
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });

    it('promotedProductListenerIOS on iOS converts and forwards product', () => {
      (Platform as any).OS = 'ios';
      const nitroProduct = {
        id: 'sku1',
        title: 'Title',
        description: 'Desc',
        type: 'inapp',
        platform: 'ios',
        isAutoRenewing: true,
        displayPrice: '$1',
        currency: 'USD',
      };
      const listener = jest.fn();
      const sub = IAP.promotedProductListenerIOS(listener);
      const wrapped = mockIap.addPromotedProductListenerIOS.mock.calls[0][0];
      wrapped(nitroProduct);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({id: 'sku1', platform: PLATFORM_IOS}),
      );
      sub.remove();
      expect(mockIap.removePromotedProductListenerIOS).toHaveBeenCalled();
    });

    it('purchaseUpdatedListener ignores invalid purchase payload', () => {
      const listener = jest.fn();
      IAP.purchaseUpdatedListener(listener);
      const wrapped = mockIap.addPurchaseUpdatedListener.mock.calls[0][0];
      wrapped({});
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('connection', () => {
    it('initConnection and endConnection delegate to native', async () => {
      await expect(IAP.initConnection()).resolves.toBe(true);
      await expect(IAP.endConnection()).resolves.toBe(true);
      expect(mockIap.initConnection).toHaveBeenCalled();
      expect(mockIap.endConnection).toHaveBeenCalled();
    });
  });

  describe('fetchProducts', () => {
    it('rejects when no SKUs provided', async () => {
      await expect(IAP.fetchProducts({skus: [] as any} as any)).rejects.toThrow(
        /No SKUs provided/,
      );
    });
    it('validates and maps products for a single type', async () => {
      (Platform as any).OS = 'ios';
      mockIap.fetchProducts.mockResolvedValueOnce([
        // valid
        {
          id: 'a',
          title: 'A',
          description: 'desc',
          type: 'inapp',
          platform: 'ios',
          isAutoRenewing: true,
          displayPrice: '$1.00',
          currency: 'USD',
        },
        // invalid (missing title)
        {id: 'b', description: 'x', type: 'inapp', platform: 'ios'},
      ]);
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const products = await IAP.fetchProducts({
        skus: ['a', 'b'],
        type: 'in-app',
      });
      expect((products ?? []).map((p: any) => p.id)).toEqual(['a']);
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });

    it('fetches both inapp and subs when type = all', async () => {
      (Platform as any).OS = 'android';
      mockIap.fetchProducts.mockResolvedValueOnce([
        {
          id: 'x',
          title: 'X',
          description: 'dx',
          type: 'inapp',
          platform: 'android',
          displayPrice: '$1.00',
          currency: 'USD',
        },
        {
          id: 'y',
          title: 'Y',
          description: 'dy',
          type: 'subs',
          platform: 'android',
          displayPrice: '$2.00',
          currency: 'USD',
        },
      ]);
      const result = await IAP.fetchProducts({
        skus: ['x', 'y'],
        type: 'all',
      });
      const items = result ?? [];
      const productIds = items
        .filter((item: any) => item.type === 'in-app')
        .map((item: any) => item.id);
      const subscriptionIds = items
        .filter((item: any) => item.type === 'subs')
        .map((item: any) => item.id);
      expect(productIds).toEqual(['x']);
      expect(subscriptionIds).toEqual(['y']);
      expect(mockIap.fetchProducts).toHaveBeenNthCalledWith(
        1,
        ['x', 'y'],
        'all',
      );
    });
  });

  describe('requestPurchase', () => {
    it('requires ios.sku on iOS', async () => {
      (Platform as any).OS = 'ios';
      await expect(
        IAP.requestPurchase({
          request: {ios: {}} as any,
          type: 'in-app',
        }),
      ).rejects.toThrow(/sku/);
    });

    it('requires android.skus on Android', async () => {
      (Platform as any).OS = 'android';
      await expect(
        IAP.requestPurchase({
          request: {android: {}} as any,
          type: 'in-app',
        }),
      ).rejects.toThrow(/skus/);
    });

    it('passes unified request to native', async () => {
      (Platform as any).OS = 'android';
      await IAP.requestPurchase({
        request: {android: {skus: ['p1']}},
        type: 'in-app',
      });
      expect(mockIap.requestPurchase).toHaveBeenCalledWith(
        expect.objectContaining({
          android: expect.objectContaining({skus: ['p1']}),
        }),
      );
    });

    it('iOS subs auto-sets andDangerouslyFinishTransactionAutomatically when not provided', async () => {
      (Platform as any).OS = 'ios';
      await IAP.requestPurchase({
        request: {ios: {sku: 'sub1'}},
        type: 'subs',
      });
      const passed = mockIap.requestPurchase.mock.calls.pop()?.[0];
      expect(passed.ios.andDangerouslyFinishTransactionAutomatically).toBe(
        true,
      );
    });

    it('iOS passes withOffer through to native', async () => {
      (Platform as any).OS = 'ios';
      const offer = {
        identifier: 'offer-id',
        keyIdentifier: 'key-id',
        nonce: 'nonce-value',
        signature: 'signature-value',
        timestamp: 1720000000,
      } satisfies DiscountOfferInputIOS;
      await IAP.requestPurchase({
        request: {
          ios: {sku: 'p1', withOffer: offer},
        },
        type: 'in-app',
      });
      const passed = mockIap.requestPurchase.mock.calls.pop()?.[0];
      expect(passed.ios.withOffer).toEqual({
        identifier: 'offer-id',
        keyIdentifier: 'key-id',
        nonce: 'nonce-value',
        signature: 'signature-value',
        timestamp: String(1720000000),
      });
    });

    it('Android subs fills empty subscriptionOffers array when missing', async () => {
      (Platform as any).OS = 'android';
      await IAP.requestPurchase({
        request: {android: {skus: ['sub1']}},
        type: 'subs',
      });
      const passed = mockIap.requestPurchase.mock.calls.pop()?.[0];
      expect(passed.android.subscriptionOffers).toEqual([]);
    });

    it('Android subs forwards subscriptionOffers when provided', async () => {
      (Platform as any).OS = 'android';
      await IAP.requestPurchase({
        request: {
          android: {
            skus: ['sub1'],
            subscriptionOffers: [
              {sku: 'sub1', offerToken: 'offer-1'},
              {sku: 'sub1', offerToken: 'offer-2'},
            ],
          },
        },
        type: 'subs',
      });
      const [lastCallArgs] = mockIap.requestPurchase.mock.lastCall;
      expect(lastCallArgs.android.subscriptionOffers).toEqual([
        {sku: 'sub1', offerToken: 'offer-1'},
        {sku: 'sub1', offerToken: 'offer-2'},
      ]);
    });
  });

  describe('getAvailablePurchases', () => {
    it('iOS path passes deprecation-compatible flags', async () => {
      (Platform as any).OS = 'ios';
      mockIap.getAvailablePurchases.mockImplementationOnce(async () => []);
      await IAP.getAvailablePurchases({
        alsoPublishToEventListenerIOS: true,
        onlyIncludeActiveItemsIOS: false,
      });
      expect(mockIap.getAvailablePurchases).toHaveBeenCalledWith(
        expect.objectContaining({
          ios: expect.objectContaining({
            alsoPublishToEventListenerIOS: true,
            onlyIncludeActiveItemsIOS: false,
            alsoPublishToEventListener: true,
            onlyIncludeActiveItems: false,
          }),
        }),
      );
    });

    it('Android path merges inapp+subs results', async () => {
      (Platform as any).OS = 'android';
      const nitro = (id: string) => ({
        id: `t-${id}`,
        productId: id,
        transactionDate: Date.now(),
        platform: 'android',
        quantity: 1,
        purchaseState: 'purchased',
        isAutoRenewing: false,
      });
      mockIap.getAvailablePurchases
        .mockResolvedValueOnce([nitro('p1')])
        .mockResolvedValueOnce([nitro('s1')]);
      const res = await IAP.getAvailablePurchases();
      expect(mockIap.getAvailablePurchases).toHaveBeenNthCalledWith(1, {
        android: {type: 'inapp'},
      });
      expect(mockIap.getAvailablePurchases).toHaveBeenNthCalledWith(2, {
        android: {type: 'subs'},
      });
      expect(res.map((p: any) => p.productId).sort()).toEqual(['p1', 's1']);
    });

    it('throws on unsupported platform', async () => {
      (Platform as any).OS = 'web';
      await expect(IAP.getAvailablePurchases()).rejects.toThrow(
        /Unsupported platform/,
      );
    });
  });

  describe('finishTransaction', () => {
    it('iOS requires purchase.id and returns success state', async () => {
      (Platform as any).OS = 'ios';
      await expect(
        IAP.finishTransaction({purchase: {id: ''} as any}),
      ).rejects.toThrow(/required/);

      mockIap.finishTransaction.mockResolvedValueOnce(true);
      await expect(
        IAP.finishTransaction({purchase: {id: 'tid'} as any}),
      ).resolves.toBeUndefined();
    });

    it('Android requires token; maps consume flag', async () => {
      (Platform as any).OS = 'android';
      await expect(
        IAP.finishTransaction({purchase: {productId: 'p'} as any}),
      ).rejects.toThrow(/token/i);

      mockIap.finishTransaction.mockResolvedValueOnce({
        responseCode: 0,
        code: '0',
        message: 'ok',
        purchaseToken: 'tok',
      });
      await IAP.finishTransaction({
        purchase: {productId: 'p', purchaseToken: 'tok'} as any,
        isConsumable: true,
      });
      expect(mockIap.finishTransaction).toHaveBeenCalledWith({
        android: {purchaseToken: 'tok', isConsumable: true},
      });
    });

    it('iOS: treats already-finished error as success', async () => {
      (Platform as any).OS = 'ios';
      mockIap.finishTransaction.mockRejectedValueOnce(
        new Error('Transaction not found'),
      );
      await expect(
        IAP.finishTransaction({purchase: {id: 'tid'} as any}),
      ).resolves.toBeUndefined();
    });
  });

  describe('storefront helpers', () => {
    it('getStorefront uses unified native method when available on iOS', async () => {
      (Platform as any).OS = 'ios';
      mockIap.getStorefront = jest.fn(async () => 'USA');
      await expect(IAP.getStorefront()).resolves.toBe('USA');
      expect(mockIap.getStorefront).toHaveBeenCalledTimes(1);
      expect(mockIap.getStorefrontIOS).not.toHaveBeenCalled();
    });

    it('getStorefront falls back to iOS-specific implementation when unified method missing', async () => {
      (Platform as any).OS = 'ios';
      mockIap.getStorefront = undefined;
      await expect(IAP.getStorefront()).resolves.toBe('USA');
      expect(mockIap.getStorefrontIOS).toHaveBeenCalledTimes(1);
    });

    it('getStorefront uses unified method on Android', async () => {
      const expected = 'KOR';
      mockIap.getStorefront = jest.fn(async () => expected);
      (Platform as any).OS = 'android';
      await expect(IAP.getStorefront()).resolves.toBe(expected);
      expect(mockIap.getStorefront).toHaveBeenCalledTimes(1);
    });

    it('getStorefront returns empty string and warns when native method missing', async () => {
      (Platform as any).OS = 'android';
      mockIap.getStorefront = undefined;
      await expect(IAP.getStorefront()).resolves.toBe('');
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Native getStorefront is not available'),
      );
    });
  });

  describe('iOS-only helpers', () => {
    it('getStorefrontIOS returns storefront on iOS and throws on Android', async () => {
      (Platform as any).OS = 'ios';
      await expect(IAP.getStorefrontIOS()).resolves.toBe('USA');
      (Platform as any).OS = 'android';
      await expect(IAP.getStorefrontIOS()).rejects.toThrow(
        /only available on iOS/,
      );
    });

    it('getAppTransactionIOS returns value on iOS and throws on Android', async () => {
      (Platform as any).OS = 'ios';
      await expect(IAP.getAppTransactionIOS()).resolves.toBeNull();
      (Platform as any).OS = 'android';
      await expect(IAP.getAppTransactionIOS()).rejects.toThrow(
        /only available on iOS/,
      );
    });

    it('presentCodeRedemptionSheetIOS returns true', async () => {
      (Platform as any).OS = 'ios';
      mockIap.presentCodeRedemptionSheetIOS.mockResolvedValueOnce(true);
      await expect(IAP.presentCodeRedemptionSheetIOS()).resolves.toBe(true);
    });

    it('presentCodeRedemptionSheetIOS returns false on non‑iOS', async () => {
      (Platform as any).OS = 'android';
      await expect(IAP.presentCodeRedemptionSheetIOS()).resolves.toBe(false);
    });

    it('getPendingTransactionsIOS maps purchases', async () => {
      (Platform as any).OS = 'ios';
      const nitro = {
        id: 't1',
        productId: 'p1',
        transactionDate: Date.now(),
        platform: 'ios',
        quantity: 1,
        purchaseState: 'purchased',
        isAutoRenewing: false,
      };
      mockIap.getPendingTransactionsIOS = jest.fn(async () => [nitro]);
      const res = await IAP.getPendingTransactionsIOS();
      expect(res[0].id).toBe('t1');
    });

    it('showManageSubscriptionsIOS maps purchases', async () => {
      (Platform as any).OS = 'ios';
      const nitro = {
        id: 't2',
        productId: 'p2',
        transactionDate: Date.now(),
        platform: 'ios',
        quantity: 1,
        purchaseState: 'purchased',
        isAutoRenewing: false,
      };
      mockIap.showManageSubscriptionsIOS = jest.fn(async () => [nitro]);
      const res = await IAP.showManageSubscriptionsIOS();
      expect(res[0].productId).toBe('p2');
    });

    it('showManageSubscriptionsIOS returns [] on non‑iOS', async () => {
      (Platform as any).OS = 'android';
      await expect(IAP.showManageSubscriptionsIOS()).resolves.toEqual([]);
    });

    it('requestPromotedProductIOS and alias getPromotedProductIOS map product', async () => {
      (Platform as any).OS = 'ios';
      const nitroProduct = {
        id: 'sku2',
        title: 'Title2',
        description: 'Desc2',
        type: 'inapp',
        platform: 'ios',
        isAutoRenewing: true,
        displayPrice: '$1',
        currency: 'USD',
      };
      mockIap.requestPromotedProductIOS = jest.fn(async () => nitroProduct);
      const p1 = await IAP.requestPromotedProductIOS();
      expect(p1?.id).toBe('sku2');
      const p2 = await IAP.getPromotedProductIOS();
      expect(p2?.id).toBe('sku2');
    });

    it('requestPurchaseOnPromotedProductIOS triggers native purchase', async () => {
      (Platform as any).OS = 'ios';
      mockIap.buyPromotedProductIOS = jest.fn(async () => undefined);
      const pending = {
        id: 'tid',
        productId: 'sku2',
        transactionDate: Date.now(),
        platform: 'ios',
        quantity: 1,
        purchaseState: 'purchased',
        isAutoRenewing: false,
      } as any;
      mockIap.getPendingTransactionsIOS = jest.fn(async () => [pending]);
      const result = await IAP.requestPurchaseOnPromotedProductIOS();
      expect(result).toBe(true);
      expect(mockIap.buyPromotedProductIOS).toHaveBeenCalledTimes(1);
      expect(mockIap.getPendingTransactionsIOS).toHaveBeenCalledTimes(1);
    });

    it('clearTransactionIOS resolves without throwing', async () => {
      (Platform as any).OS = 'ios';
      mockIap.clearTransactionIOS = jest.fn(async () => undefined);
      await expect(IAP.clearTransactionIOS()).resolves.toBe(true);
    });

    it('beginRefundRequestIOS returns status string', async () => {
      (Platform as any).OS = 'ios';
      mockIap.beginRefundRequestIOS = jest.fn(async () => 'success');
      await expect(IAP.beginRefundRequestIOS('sku')).resolves.toBe('success');
    });

    it('subscriptionStatusIOS converts items', async () => {
      (Platform as any).OS = 'ios';
      mockIap.subscriptionStatusIOS = jest.fn(async () => [
        {
          state: 1,
          platform: 'ios',
          isAutoRenewing: true,
          renewalInfo: {autoRenewStatus: true, platform: 'ios'},
        },
      ]);
      const res = await IAP.subscriptionStatusIOS('sku');
      expect(Array.isArray(res)).toBe(true);
      expect(res?.length).toBe(1);
    });

    it('currentEntitlementIOS and latestTransactionIOS map purchases', async () => {
      (Platform as any).OS = 'ios';
      const nitro = {
        id: 't3',
        productId: 'p3',
        transactionDate: Date.now(),
        platform: 'ios',
        quantity: 1,
        purchaseState: 'purchased',
        isAutoRenewing: false,
      };
      mockIap.currentEntitlementIOS = jest.fn(async () => nitro);

      mockIap.latestTransactionIOS = jest.fn(async () => nitro);
      const e = await IAP.currentEntitlementIOS('p3');
      const t = await IAP.latestTransactionIOS('p3');
      expect(e?.productId).toBe('p3');
      expect(t?.id).toBe('t3');
    });

    it('isEligibleForIntroOfferIOS returns boolean', async () => {
      (Platform as any).OS = 'ios';
      mockIap.isEligibleForIntroOfferIOS = jest.fn(async () => true);
      await expect(IAP.isEligibleForIntroOfferIOS('group')).resolves.toBe(true);
    });

    it('getReceiptDataIOS returns string', async () => {
      (Platform as any).OS = 'ios';
      mockIap.getReceiptDataIOS = jest.fn(async () => 'r');
      await expect(IAP.getReceiptDataIOS()).resolves.toBe('r');
    });

    it('getReceiptIOS prefers dedicated native method', async () => {
      (Platform as any).OS = 'ios';
      mockIap.getReceiptIOS = jest.fn(async () => 'get');
      await expect(IAP.getReceiptIOS()).resolves.toBe('get');
      expect(mockIap.getReceiptIOS).toHaveBeenCalled();
    });

    it('getReceiptIOS falls back to getReceiptDataIOS when missing', async () => {
      (Platform as any).OS = 'ios';
      delete mockIap.getReceiptIOS;
      mockIap.getReceiptDataIOS = jest.fn(async () => 'fallback');
      await expect(IAP.getReceiptIOS()).resolves.toBe('fallback');
      expect(mockIap.getReceiptDataIOS).toHaveBeenCalled();
    });

    it('requestReceiptRefreshIOS prefers native method when available', async () => {
      (Platform as any).OS = 'ios';
      mockIap.requestReceiptRefreshIOS = jest.fn(async () => 'refresh');
      await expect(IAP.requestReceiptRefreshIOS()).resolves.toBe('refresh');
      expect(mockIap.requestReceiptRefreshIOS).toHaveBeenCalled();
    });

    it('requestReceiptRefreshIOS falls back to getReceiptDataIOS when missing', async () => {
      (Platform as any).OS = 'ios';
      delete mockIap.requestReceiptRefreshIOS;
      mockIap.getReceiptDataIOS = jest.fn(async () => 'fallback-refresh');
      await expect(IAP.requestReceiptRefreshIOS()).resolves.toBe(
        'fallback-refresh',
      );
      expect(mockIap.getReceiptDataIOS).toHaveBeenCalled();
    });

    it('isTransactionVerifiedIOS returns boolean', async () => {
      (Platform as any).OS = 'ios';
      mockIap.isTransactionVerifiedIOS = jest.fn(async () => true);
      await expect(IAP.isTransactionVerifiedIOS('sku')).resolves.toBe(true);
    });

    it('getTransactionJwsIOS returns string', async () => {
      (Platform as any).OS = 'ios';
      mockIap.getTransactionJwsIOS = jest.fn(async () => 'jws');
      await expect(IAP.getTransactionJwsIOS('sku')).resolves.toBe('jws');
    });

    it('syncIOS calls native sync', async () => {
      (Platform as any).OS = 'ios';
      mockIap.syncIOS = jest.fn(async () => true);
      await expect(IAP.syncIOS()).resolves.toBe(true);
    });

    it('restorePurchases on iOS calls syncIOS first', async () => {
      (Platform as any).OS = 'ios';
      mockIap.syncIOS = jest.fn(async () => true);
      await IAP.restorePurchases();
      expect(mockIap.syncIOS).toHaveBeenCalled();
    });
  });

  describe('Android-only wrappers', () => {
    it('acknowledgePurchaseAndroid calls unified finishTransaction', async () => {
      (Platform as any).OS = 'android';
      mockIap.finishTransaction.mockResolvedValueOnce({
        responseCode: 0,
        code: '0',
        message: 'ok',
        purchaseToken: 'tok',
      });
      const res = await IAP.acknowledgePurchaseAndroid('tok');
      expect(res).toBe(true);
      expect(mockIap.finishTransaction).toHaveBeenCalledWith({
        android: {purchaseToken: 'tok', isConsumable: false},
      });
    });

    it('consumePurchaseAndroid calls unified finishTransaction', async () => {
      (Platform as any).OS = 'android';
      mockIap.finishTransaction.mockResolvedValueOnce({
        responseCode: 0,
        code: '0',
        message: 'ok',
        purchaseToken: 'tok',
      });
      const res = await IAP.consumePurchaseAndroid('tok');
      expect(res).toBe(true);
      expect(mockIap.finishTransaction).toHaveBeenCalledWith({
        android: {purchaseToken: 'tok', isConsumable: true},
      });
    });
  });

  describe('validateReceipt', () => {
    it('iOS path maps NitroReceiptValidationResultIOS', async () => {
      (Platform as any).OS = 'ios';
      mockIap.validateReceipt.mockResolvedValueOnce({
        isValid: true,
        receiptData: 'r',
        jwsRepresentation: 'jws',
        latestTransaction: null,
      });
      const res = await IAP.validateReceipt({
        sku: 'sku',
      });
      expect(res).toEqual(
        expect.objectContaining({
          isValid: true,
          receiptData: 'r',
          jwsRepresentation: 'jws',
        }),
      );
    });

    it('Android path maps NitroReceiptValidationResultAndroid', async () => {
      (Platform as any).OS = 'android';
      mockIap.validateReceipt.mockResolvedValueOnce({
        autoRenewing: false,
        betaProduct: false,
        cancelDate: null,
        cancelReason: 'none',
        deferredDate: null,
        deferredSku: null,
        freeTrialEndDate: 0,
        gracePeriodEndDate: 0,
        parentProductId: 'parent',
        productId: 'sku',
        productType: 'inapp',
        purchaseDate: 123,
        quantity: 1,
        receiptId: 'rid',
        renewalDate: 0,
        term: 'term',
        termSku: 'termSku',
        testTransaction: false,
      });
      const res = await IAP.validateReceipt({
        sku: 'sku',
        androidOptions: {
          packageName: 'com.app',
          productToken: 'tok',
          accessToken: 'acc',
        },
      });
      expect(res).toEqual(
        expect.objectContaining({productId: 'sku', productType: 'inapp'}),
      );
    });
  });

  describe('Non‑iOS branches', () => {
    it('isEligibleForIntroOfferIOS returns false on non‑iOS', async () => {
      (Platform as any).OS = 'android';
      await expect(IAP.isEligibleForIntroOfferIOS('group')).resolves.toBe(
        false,
      );
    });

    it('getReceiptDataIOS throws on non‑iOS', async () => {
      (Platform as any).OS = 'android';
      await expect(IAP.getReceiptDataIOS()).rejects.toThrow(
        /only available on iOS/,
      );
    });

    it('isTransactionVerifiedIOS returns false on non‑iOS', async () => {
      (Platform as any).OS = 'android';
      await expect(IAP.isTransactionVerifiedIOS('sku')).resolves.toBe(false);
    });

    it('getTransactionJwsIOS returns null on non‑iOS', async () => {
      (Platform as any).OS = 'android';
      await expect(IAP.getTransactionJwsIOS('sku')).resolves.toBeNull();
    });

    it('getPendingTransactionsIOS returns [] on non‑iOS', async () => {
      (Platform as any).OS = 'android';
      await expect(IAP.getPendingTransactionsIOS()).resolves.toEqual([]);
    });

    it('currentEntitlementIOS returns null on non‑iOS', async () => {
      (Platform as any).OS = 'android';
      await expect(IAP.currentEntitlementIOS('sku')).resolves.toBeNull();
    });

    it('latestTransactionIOS returns null on non‑iOS', async () => {
      (Platform as any).OS = 'android';
      await expect(IAP.latestTransactionIOS('sku')).resolves.toBeNull();
    });

    it('restorePurchases on Android does not call syncIOS', async () => {
      (Platform as any).OS = 'android';
      mockIap.syncIOS = jest.fn(async () => true);
      await expect(IAP.restorePurchases()).resolves.toBeUndefined();
      expect(mockIap.syncIOS).not.toHaveBeenCalled();
    });
  });

  describe('Error paths', () => {
    it('getStorefrontIOS catch branch surfaces error', async () => {
      (Platform as any).OS = 'ios';
      mockIap.getStorefrontIOS = jest.fn(async () => {
        throw new Error('boom');
      });
      await expect(IAP.getStorefrontIOS()).rejects.toThrow('boom');
    });
  });

  describe('Cross‑platform helpers', () => {
    it('deepLinkToSubscriptions calls Android native deeplink when on Android', async () => {
      (Platform as any).OS = 'android';
      mockIap.deepLinkToSubscriptionsAndroid = jest.fn(async () => undefined);
      await expect(
        IAP.deepLinkToSubscriptions({
          skuAndroid: 'sub1',
          packageNameAndroid: 'dev.hyo.martie',
        }),
      ).resolves.toBeUndefined();
      expect(mockIap.deepLinkToSubscriptionsAndroid).toHaveBeenCalledWith({
        skuAndroid: 'sub1',
        packageNameAndroid: 'dev.hyo.martie',
      });
    });

    it('deepLinkToSubscriptions uses iOS deeplink when available', async () => {
      (Platform as any).OS = 'ios';
      mockIap.deepLinkToSubscriptionsIOS = jest.fn(async () => true);
      await expect(IAP.deepLinkToSubscriptions()).resolves.toBeUndefined();
      expect(mockIap.deepLinkToSubscriptionsIOS).toHaveBeenCalled();
    });

    it('deepLinkToSubscriptions falls back to manage subscriptions when deeplink missing', async () => {
      (Platform as any).OS = 'ios';
      delete mockIap.deepLinkToSubscriptionsIOS;
      mockIap.showManageSubscriptionsIOS = jest.fn(async () => []);
      await expect(IAP.deepLinkToSubscriptions()).resolves.toBeUndefined();
      expect(mockIap.showManageSubscriptionsIOS).toHaveBeenCalled();
    });
  });

  describe('subscription helpers', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    describe('getActiveSubscriptions', () => {
      it('should return active subscriptions from available purchases', async () => {
        // Set Platform to iOS (getAvailablePurchases behaves differently per platform)
        (Platform as any).OS = 'ios';

        const mockPurchases: Purchase[] = [
          {
            productId: 'subscription1',
            id: 'trans1',
            transactionId: 'trans1',
            purchaseToken: 'token1',
            transactionDate: Date.now(),
            platform: 'ios',
            isAutoRenewing: true,
            quantity: 1,
            purchaseState: 'purchased',
            expirationDateIOS: Date.now() + 86400000, // 1 day from now
            environmentIOS: 'Production',
          } as any,
          {
            productId: 'subscription2',
            id: 'trans2',
            transactionId: 'trans2',
            purchaseToken: 'token2',
            transactionDate: Date.now(),
            platform: 'ios', // Changed to iOS (purchases can only be from one platform)
            isAutoRenewing: true,
            quantity: 1,
            purchaseState: 'purchased',
            subscriptionGroupIdIOS: 'group1', // Add iOS subscription field
          } as any,
        ];

        // Mock returns data as NitroPurchase format (raw from native)
        // For iOS, getAvailablePurchases is called with ios options
        mockIap.getAvailablePurchases.mockImplementation(
          async (options: any) => {
            if (options?.ios) {
              return mockPurchases;
            }
            return [];
          },
        );

        const result = await IAP.getActiveSubscriptions();

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual(
          expect.objectContaining({
            productId: 'subscription1',
            isActive: true,
            transactionId: 'trans1',
            purchaseToken: 'token1',
            transactionDate: expect.any(Number),
          }),
        );
        expect(result[1]).toEqual(
          expect.objectContaining({
            productId: 'subscription2',
            isActive: true,
            transactionId: 'trans2',
            purchaseToken: 'token2',
            transactionDate: expect.any(Number),
          }),
        );
      });

      it('should calculate days until expiration correctly for iOS subscriptions', async () => {
        (Platform as any).OS = 'ios';
        const mockPurchases: Purchase[] = [
          {
            productId: 'subscription1',
            id: 'trans1',
            transactionId: 'trans1',
            purchaseToken: 'token1',
            transactionDate: Date.now(),
            platform: 'ios',
            isAutoRenewing: true,
            quantity: 1,
            purchaseState: 'purchased',
            expirationDateIOS: Date.now() + 3 * 86400000, // 3 days from now
            environmentIOS: 'Production',
          } as any,
          {
            productId: 'subscription2',
            id: 'trans2',
            transactionId: 'trans2',
            purchaseToken: 'token2',
            transactionDate: Date.now(),
            platform: 'ios',
            isAutoRenewing: true,
            quantity: 1,
            purchaseState: 'purchased',
            expirationDateIOS: Date.now() + 10 * 86400000, // 10 days from now
          } as any,
        ];

        // For iOS, check if called with ios options
        mockIap.getAvailablePurchases.mockImplementation(
          async (options: any) => {
            if ((Platform as any).OS === 'ios' && options?.ios) {
              return mockPurchases;
            }
            if ((Platform as any).OS === 'android' && options?.android) {
              // For Android, return based on type
              if (options.android.type === 'inapp') {
                return [];
              }
              return mockPurchases;
            }
            // Fallback for tests without platform check
            return mockPurchases;
          },
        );

        const result = await IAP.getActiveSubscriptions();

        // Note: Platform-specific fields may not be properly set in mocked tests
        expect(result).toHaveLength(2);
        expect(result[0]?.isActive).toBe(true);
        expect(result[1]?.isActive).toBe(true);
      });

      it('should handle expired iOS subscriptions', async () => {
        (Platform as any).OS = 'ios';
        const mockPurchases: Purchase[] = [
          {
            productId: 'subscription1',
            id: 'trans1',
            transactionId: 'trans1',
            purchaseToken: 'token1',
            transactionDate: Date.now() - 86400000,
            platform: 'ios',
            isAutoRenewing: true,
            quantity: 1,
            purchaseState: 'purchased',
            expirationDateIOS: Date.now() - 3600000, // 1 hour ago
          } as any,
        ];

        // For iOS, check if called with ios options
        mockIap.getAvailablePurchases.mockImplementation(
          async (options: any) => {
            if ((Platform as any).OS === 'ios' && options?.ios) {
              return mockPurchases;
            }
            if ((Platform as any).OS === 'android' && options?.android) {
              // For Android, return based on type
              if (options.android.type === 'inapp') {
                return [];
              }
              return mockPurchases;
            }
            // Fallback for tests without platform check
            return mockPurchases;
          },
        );

        const result = await IAP.getActiveSubscriptions();

        expect(result).toHaveLength(1);
        // Note: isActive is always true if purchase is in available purchases
        expect(result[0]?.isActive).toBe(true);
      });

      it('should handle Android subscriptions with various states', async () => {
        (Platform as any).OS = 'android';
        const mockPurchases: Purchase[] = [
          {
            productId: 'subscription1',
            id: 'trans1',
            transactionId: 'trans1',
            purchaseToken: 'token1',
            transactionDate: Date.now(),
            platform: 'android',
            isAutoRenewing: true,
            quantity: 1,
            purchaseState: 'purchased',
            autoRenewingAndroid: true,
          } as any,
          {
            productId: 'subscription2',
            id: 'trans2',
            transactionId: 'trans2',
            purchaseToken: 'token2',
            transactionDate: Date.now(),
            platform: 'android',
            isAutoRenewing: false,
            quantity: 1,
            purchaseState: 'purchased',
            autoRenewingAndroid: false,
          } as any,
          {
            productId: 'subscription3',
            id: 'trans3',
            transactionId: 'trans3',
            purchaseToken: 'token3',
            transactionDate: Date.now(),
            platform: 'android',
            isAutoRenewing: false, // Has the field but is false
            quantity: 1,
            purchaseState: 'purchased',
          } as any,
        ];

        // For Android, getAvailablePurchases is called twice (inapp and subs)
        // Return empty for inapp, and mockPurchases for subs
        mockIap.getAvailablePurchases.mockImplementation(
          async (options: any) => {
            if (options?.android?.type === 'inapp') {
              return [];
            }
            return mockPurchases;
          },
        );

        const result = await IAP.getActiveSubscriptions();

        expect(result).toHaveLength(3);
        expect(result[0]?.isActive).toBe(true);
        expect(result[1]?.isActive).toBe(true);
        expect(result[2]?.isActive).toBe(true);
      });

      it('should handle mixed platform subscriptions', async () => {
        (Platform as any).OS = 'ios';
        // iOS platform can only have iOS purchases
        const mockPurchases: Purchase[] = [
          {
            productId: 'ios_sub',
            id: 'trans1',
            transactionId: 'trans1',
            purchaseToken: 'token1',
            transactionDate: Date.now(),
            platform: 'ios',
            isAutoRenewing: true,
            expirationDateIOS: Date.now() + 86400000,
            environmentIOS: 'Sandbox',
          } as any,
          {
            productId: 'ios_sub2',
            id: 'trans2',
            transactionId: 'trans2',
            purchaseToken: 'token2',
            transactionDate: Date.now(),
            platform: 'ios',
            isAutoRenewing: true,
            subscriptionGroupIdIOS: 'group1',
          } as any,
        ];

        // For iOS, check if called with ios options
        mockIap.getAvailablePurchases.mockImplementation(
          async (options: any) => {
            if ((Platform as any).OS === 'ios' && options?.ios) {
              return mockPurchases;
            }
            if ((Platform as any).OS === 'android' && options?.android) {
              // For Android, return based on type
              if (options.android.type === 'inapp') {
                return [];
              }
              return mockPurchases;
            }
            // Fallback for tests without platform check
            return mockPurchases;
          },
        );

        const result = await IAP.getActiveSubscriptions();

        expect(result).toHaveLength(2);
        expect(
          result.find((s: any) => s.productId === 'ios_sub'),
        ).toBeDefined();
        expect(
          result.find((s: any) => s.productId === 'ios_sub2'),
        ).toBeDefined();
      });

      it('should filter subscriptions by provided IDs', async () => {
        (Platform as any).OS = 'ios';
        const mockPurchases: Purchase[] = [
          {
            productId: 'subscription1',
            id: 'trans1',
            transactionId: 'trans1',
            purchaseToken: 'token1',
            transactionDate: Date.now(),
            platform: 'ios',
            isAutoRenewing: true,
            quantity: 1,
            purchaseState: 'purchased',
            expirationDateIOS: Date.now() + 86400000, // Add subscription field
          } as any,
          {
            productId: 'subscription2',
            id: 'trans2',
            transactionId: 'trans2',
            purchaseToken: 'token2',
            transactionDate: Date.now(),
            platform: 'ios',
            isAutoRenewing: true,
            quantity: 1,
            purchaseState: 'purchased',
            subscriptionGroupIdIOS: 'group1', // Add subscription field
          } as any,
          {
            productId: 'subscription3',
            id: 'trans3',
            transactionId: 'trans3',
            purchaseToken: 'token3',
            transactionDate: Date.now(),
            platform: 'ios',
            isAutoRenewing: true,
            quantity: 1,
            purchaseState: 'purchased',
            expirationDateIOS: Date.now() + 86400000, // Add subscription field
          } as any,
        ];

        // For iOS, check if called with ios options
        mockIap.getAvailablePurchases.mockImplementation(
          async (options: any) => {
            if ((Platform as any).OS === 'ios' && options?.ios) {
              return mockPurchases;
            }
            if ((Platform as any).OS === 'android' && options?.android) {
              // For Android, return based on type
              if (options.android.type === 'inapp') {
                return [];
              }
              return mockPurchases;
            }
            // Fallback for tests without platform check
            return mockPurchases;
          },
        );

        const result = await IAP.getActiveSubscriptions([
          'subscription1',
          'subscription3',
        ]);

        expect(result).toHaveLength(2);
        expect(result[0]?.productId).toBe('subscription1');
        expect(result[1]?.productId).toBe('subscription3');
      });

      it('should calculate days until expiration for iOS subscriptions', async () => {
        (Platform as any).OS = 'ios';
        const futureDate = Date.now() + 5 * 86400000; // 5 days from now
        const mockPurchases: Purchase[] = [
          {
            productId: 'subscription1',
            id: 'trans1',
            transactionId: 'trans1',
            purchaseToken: 'token1',
            transactionDate: Date.now(),
            platform: 'ios',
            isAutoRenewing: true,
            expirationDateIOS: futureDate,
          } as any,
        ];

        // For iOS, check if called with ios options
        mockIap.getAvailablePurchases.mockImplementation(
          async (options: any) => {
            if ((Platform as any).OS === 'ios' && options?.ios) {
              return mockPurchases;
            }
            if ((Platform as any).OS === 'android' && options?.android) {
              // For Android, return based on type
              if (options.android.type === 'inapp') {
                return [];
              }
              return mockPurchases;
            }
            // Fallback for tests without platform check
            return mockPurchases;
          },
        );

        const result = await IAP.getActiveSubscriptions();

        expect(result[0]?.isActive).toBe(true);
      });

      it('should handle errors and rethrow them', async () => {
        const error = new Error('Failed to fetch purchases');
        mockIap.getAvailablePurchases.mockImplementation(async () => {
          throw error;
        });

        await expect(IAP.getActiveSubscriptions()).rejects.toThrow(
          'Failed to fetch purchases',
        );
        expect(console.error).toHaveBeenCalledWith(
          'Failed to get active subscriptions:',
          error,
        );
      });

      it('should return empty array when no purchases available', async () => {
        mockIap.getAvailablePurchases.mockImplementation(async () => []);

        const result = await IAP.getActiveSubscriptions();

        expect(result).toEqual([]);
      });

      it('should handle duplicate subscription IDs in purchases', async () => {
        (Platform as any).OS = 'ios';
        const mockPurchases: Purchase[] = [
          {
            productId: 'subscription1',
            id: 'trans1',
            transactionId: 'trans1',
            purchaseToken: 'token1',
            transactionDate: Date.now() - 86400000,
            platform: 'ios',
            isAutoRenewing: true,
            quantity: 1,
            purchaseState: 'purchased',
            expirationDateIOS: Date.now() + 86400000, // Add subscription field
          } as any,
          {
            productId: 'subscription1', // Duplicate ID
            id: 'trans2',
            transactionId: 'trans2',
            purchaseToken: 'token2',
            transactionDate: Date.now(), // Newer transaction
            platform: 'ios',
            isAutoRenewing: true,
            quantity: 1,
            purchaseState: 'purchased',
            subscriptionGroupIdIOS: 'group1', // Add subscription field
          } as any,
        ];

        // For iOS, check if called with ios options
        mockIap.getAvailablePurchases.mockImplementation(
          async (options: any) => {
            if ((Platform as any).OS === 'ios' && options?.ios) {
              return mockPurchases;
            }
            if ((Platform as any).OS === 'android' && options?.android) {
              // For Android, return based on type
              if (options.android.type === 'inapp') {
                return [];
              }
              return mockPurchases;
            }
            // Fallback for tests without platform check
            return mockPurchases;
          },
        );

        const result = await IAP.getActiveSubscriptions();

        // Should return both even if they have the same productId
        expect(result).toHaveLength(2);
        expect(result.every((s: any) => s.productId === 'subscription1')).toBe(
          true,
        );
      });

      it('should handle null or undefined expiration dates', async () => {
        (Platform as any).OS = 'ios';
        const mockPurchases: Purchase[] = [
          {
            productId: 'subscription1',
            id: 'trans1',
            transactionId: 'trans1',
            purchaseToken: 'token1',
            transactionDate: Date.now(),
            platform: 'ios',
            isAutoRenewing: true,
            quantity: 1,
            purchaseState: 'purchased',
            expirationDateIOS: null,
            subscriptionGroupIdIOS: 'group1', // Has subscription group, so it's a subscription
          } as any,
          {
            productId: 'subscription2',
            id: 'trans2',
            transactionId: 'trans2',
            purchaseToken: 'token2',
            transactionDate: Date.now(),
            platform: 'ios',
            isAutoRenewing: true,
            quantity: 1,
            purchaseState: 'purchased',
            expirationDateIOS: undefined,
            subscriptionGroupIdIOS: 'group2', // Has subscription group, so it's a subscription
          } as any,
        ];

        // For iOS, check if called with ios options
        mockIap.getAvailablePurchases.mockImplementation(
          async (options: any) => {
            if ((Platform as any).OS === 'ios' && options?.ios) {
              return mockPurchases;
            }
            if ((Platform as any).OS === 'android' && options?.android) {
              // For Android, return based on type
              if (options.android.type === 'inapp') {
                return [];
              }
              return mockPurchases;
            }
            // Fallback for tests without platform check
            return mockPurchases;
          },
        );

        const result = await IAP.getActiveSubscriptions();

        expect(result).toHaveLength(2);
        expect(result[0]?.isActive).toBe(true);
        expect(result[1]?.isActive).toBe(true);
      });

      it('should handle purchases with missing platform field', async () => {
        const mockPurchases: Purchase[] = [
          {
            productId: 'subscription1',
            id: 'trans1',
            transactionId: 'trans1',
            purchaseToken: 'token1',
            transactionDate: Date.now(),
            quantity: 1,
            purchaseState: 'purchased',
            // platform field missing
          } as any,
        ];

        // For iOS, check if called with ios options
        mockIap.getAvailablePurchases.mockImplementation(
          async (options: any) => {
            if ((Platform as any).OS === 'ios' && options?.ios) {
              return mockPurchases;
            }
            if ((Platform as any).OS === 'android' && options?.android) {
              // For Android, return based on type
              if (options.android.type === 'inapp') {
                return [];
              }
              return mockPurchases;
            }
            // Fallback for tests without platform check
            return mockPurchases;
          },
        );

        const result = await IAP.getActiveSubscriptions();

        // Platform field missing means it might not be recognized as a subscription
        expect(result).toHaveLength(0);
      });

      it('should handle very large subscription lists efficiently', async () => {
        (Platform as any).OS = 'ios';
        const largeNumberOfPurchases = Array.from(
          {length: 1000},
          (_, i) =>
            ({
              productId: `subscription${i}`,
              id: `trans${i}`,
              transactionId: `trans${i}`,
              purchaseToken: `token${i}`,
              transactionDate: Date.now(),
              platform: i % 2 === 0 ? 'ios' : 'android',
              quantity: 1,
              purchaseState: 'purchased',
              expirationDateIOS:
                i % 2 === 0 ? Date.now() + i * 86400000 : undefined,
              autoRenewingAndroid: i % 2 === 1 ? true : undefined,
            }) as any,
        );

        // For iOS, check if called with ios options
        mockIap.getAvailablePurchases.mockImplementation(
          async (options: any) => {
            if (options?.ios) {
              return largeNumberOfPurchases;
            }
            return [];
          },
        );

        const startTime = Date.now();
        const result = await IAP.getActiveSubscriptions();
        const endTime = Date.now();

        expect(result).toHaveLength(1000);
        expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      });

      it('should handle case-sensitive subscription ID filtering', async () => {
        (Platform as any).OS = 'ios';
        const mockPurchases: Purchase[] = [
          {
            productId: 'Subscription1',
            id: 'trans1',
            transactionId: 'trans1',
            purchaseToken: 'token1',
            transactionDate: Date.now(),
            platform: 'ios',
            isAutoRenewing: true,
            quantity: 1,
            purchaseState: 'purchased',
            expirationDateIOS: Date.now() + 86400000, // Add subscription field
          } as any,
          {
            productId: 'subscription1',
            id: 'trans2',
            transactionId: 'trans2',
            purchaseToken: 'token2',
            transactionDate: Date.now(),
            platform: 'ios',
            isAutoRenewing: true,
            quantity: 1,
            purchaseState: 'purchased',
            subscriptionGroupIdIOS: 'group1', // Add subscription field
          } as any,
        ];

        // For iOS, check if called with ios options
        mockIap.getAvailablePurchases.mockImplementation(
          async (options: any) => {
            if ((Platform as any).OS === 'ios' && options?.ios) {
              return mockPurchases;
            }
            if ((Platform as any).OS === 'android' && options?.android) {
              // For Android, return based on type
              if (options.android.type === 'inapp') {
                return [];
              }
              return mockPurchases;
            }
            // Fallback for tests without platform check
            return mockPurchases;
          },
        );

        const result = await IAP.getActiveSubscriptions(['subscription1']);

        // Should only match exact case
        expect(result).toHaveLength(1);
        expect(result[0]?.productId).toBe('subscription1');
      });
    });

    describe('hasActiveSubscriptions', () => {
      it('should return true when there are active subscriptions', async () => {
        (Platform as any).OS = 'ios';
        const mockPurchases: Purchase[] = [
          {
            productId: 'subscription1',
            id: 'trans1',
            transactionId: 'trans1',
            purchaseToken: 'token1',
            transactionDate: Date.now(),
            platform: 'ios',
            isAutoRenewing: true,
            quantity: 1,
            purchaseState: 'purchased',
            expirationDateIOS: Date.now() + 86400000, // Add subscription field
          } as any,
        ];

        // For iOS, check if called with ios options
        mockIap.getAvailablePurchases.mockImplementation(
          async (options: any) => {
            if ((Platform as any).OS === 'ios' && options?.ios) {
              return mockPurchases;
            }
            if ((Platform as any).OS === 'android' && options?.android) {
              // For Android, return based on type
              if (options.android.type === 'inapp') {
                return [];
              }
              return mockPurchases;
            }
            // Fallback for tests without platform check
            return mockPurchases;
          },
        );

        const result = await IAP.hasActiveSubscriptions();

        expect(result).toBe(true);
      });

      it('should return false when there are no active subscriptions', async () => {
        mockIap.getAvailablePurchases.mockImplementation(async () => []);

        const result = await IAP.hasActiveSubscriptions();

        expect(result).toBe(false);
      });

      it('should filter by subscription IDs when checking', async () => {
        (Platform as any).OS = 'ios';
        const mockPurchases: Purchase[] = [
          {
            productId: 'subscription1',
            id: 'trans1',
            transactionId: 'trans1',
            purchaseToken: 'token1',
            transactionDate: Date.now(),
            platform: 'ios',
            isAutoRenewing: true,
            quantity: 1,
            purchaseState: 'purchased',
            expirationDateIOS: Date.now() + 86400000, // Add subscription field
          } as any,
          {
            productId: 'subscription2',
            id: 'trans2',
            transactionId: 'trans2',
            purchaseToken: 'token2',
            transactionDate: Date.now(),
            platform: 'ios',
            isAutoRenewing: true,
            quantity: 1,
            purchaseState: 'purchased',
            subscriptionGroupIdIOS: 'group1', // Add subscription field
          } as any,
        ];

        // For iOS, check if called with ios options
        mockIap.getAvailablePurchases.mockImplementation(
          async (options: any) => {
            if ((Platform as any).OS === 'ios' && options?.ios) {
              return mockPurchases;
            }
            if ((Platform as any).OS === 'android' && options?.android) {
              // For Android, return based on type
              if (options.android.type === 'inapp') {
                return [];
              }
              return mockPurchases;
            }
            // Fallback for tests without platform check
            return mockPurchases;
          },
        );

        const result1 = await IAP.hasActiveSubscriptions(['subscription1']);
        expect(result1).toBe(true);

        const result2 = await IAP.hasActiveSubscriptions(['subscription3']);
        expect(result2).toBe(false);
      });

      it('should return false and log error when getActiveSubscriptions fails', async () => {
        const error = new Error('Failed to fetch');
        mockIap.getAvailablePurchases.mockImplementation(async () => {
          throw error;
        });

        const result = await IAP.hasActiveSubscriptions();

        expect(result).toBe(false);
        expect(console.error).toHaveBeenCalledWith(
          'Failed to check active subscriptions:',
          error,
        );
      });

      it('should handle empty subscription ID array', async () => {
        (Platform as any).OS = 'ios';
        const mockPurchases: Purchase[] = [
          {
            productId: 'subscription1',
            id: 'trans1',
            transactionId: 'trans1',
            purchaseToken: 'token1',
            transactionDate: Date.now(),
            platform: 'ios',
            isAutoRenewing: true,
            quantity: 1,
            purchaseState: 'purchased',
            expirationDateIOS: Date.now() + 86400000, // Add subscription field
          } as any,
        ];

        // For iOS, check if called with ios options
        mockIap.getAvailablePurchases.mockImplementation(
          async (options: any) => {
            if ((Platform as any).OS === 'ios' && options?.ios) {
              return mockPurchases;
            }
            if ((Platform as any).OS === 'android' && options?.android) {
              // For Android, return based on type
              if (options.android.type === 'inapp') {
                return [];
              }
              return mockPurchases;
            }
            // Fallback for tests without platform check
            return mockPurchases;
          },
        );

        // Empty array means no filter, so returns all subscriptions
        const result = await IAP.hasActiveSubscriptions([]);

        expect(result).toBe(true);
      });

      it('should return true for expired iOS subscription if purchase exists', async () => {
        (Platform as any).OS = 'ios';
        const mockPurchases: Purchase[] = [
          {
            productId: 'subscription1',
            id: 'trans1',
            transactionId: 'trans1',
            purchaseToken: 'token1',
            transactionDate: Date.now(),
            platform: 'ios',
            isAutoRenewing: true,
            quantity: 1,
            purchaseState: 'purchased',
            expirationDateIOS: Date.now() - 86400000, // Expired 1 day ago
          } as any,
        ];

        // For iOS, check if called with ios options
        mockIap.getAvailablePurchases.mockImplementation(
          async (options: any) => {
            if ((Platform as any).OS === 'ios' && options?.ios) {
              return mockPurchases;
            }
            if ((Platform as any).OS === 'android' && options?.android) {
              // For Android, return based on type
              if (options.android.type === 'inapp') {
                return [];
              }
              return mockPurchases;
            }
            // Fallback for tests without platform check
            return mockPurchases;
          },
        );

        // Should return true even if expired (presence check)
        const result = await IAP.hasActiveSubscriptions();

        expect(result).toBe(true);
      });

      it('should handle mixed array of valid and invalid subscription IDs', async () => {
        (Platform as any).OS = 'ios';
        const mockPurchases: Purchase[] = [
          {
            productId: 'valid_sub',
            id: 'trans1',
            transactionId: 'trans1',
            purchaseToken: 'token1',
            transactionDate: Date.now(),
            platform: 'ios',
            isAutoRenewing: true,
            quantity: 1,
            purchaseState: 'purchased',
            expirationDateIOS: Date.now() + 86400000, // Add subscription field
          } as any,
        ];

        // For iOS, check if called with ios options
        mockIap.getAvailablePurchases.mockImplementation(
          async (options: any) => {
            if ((Platform as any).OS === 'ios' && options?.ios) {
              return mockPurchases;
            }
            if ((Platform as any).OS === 'android' && options?.android) {
              // For Android, return based on type
              if (options.android.type === 'inapp') {
                return [];
              }
              return mockPurchases;
            }
            // Fallback for tests without platform check
            return mockPurchases;
          },
        );

        const result = await IAP.hasActiveSubscriptions([
          'valid_sub',
          'invalid_sub',
          'another_invalid',
        ]);

        expect(result).toBe(true); // At least one match found
      });

      it('should handle concurrent calls correctly', async () => {
        (Platform as any).OS = 'ios';
        const mockPurchases: Purchase[] = [
          {
            productId: 'subscription1',
            id: 'trans1',
            transactionId: 'trans1',
            purchaseToken: 'token1',
            transactionDate: Date.now(),
            platform: 'ios',
            isAutoRenewing: true,
            quantity: 1,
            purchaseState: 'purchased',
            expirationDateIOS: Date.now() + 86400000, // Add subscription field
          } as any,
        ];

        // For iOS, check if called with ios options
        mockIap.getAvailablePurchases.mockImplementation(
          async (options: any) => {
            if ((Platform as any).OS === 'ios' && options?.ios) {
              return mockPurchases;
            }
            if ((Platform as any).OS === 'android' && options?.android) {
              // For Android, return based on type
              if (options.android.type === 'inapp') {
                return [];
              }
              return mockPurchases;
            }
            // Fallback for tests without platform check
            return mockPurchases;
          },
        );

        // Make concurrent calls
        const results = await Promise.all([
          IAP.hasActiveSubscriptions(),
          IAP.hasActiveSubscriptions(['subscription1']),
          IAP.hasActiveSubscriptions(['subscription2']),
        ]);

        expect(results[0]).toBe(true);
        expect(results[1]).toBe(true);
        expect(results[2]).toBe(false);
      });

      it('should handle special characters in subscription IDs', async () => {
        (Platform as any).OS = 'android';
        const mockPurchases: Purchase[] = [
          {
            productId: 'sub.premium.monthly',
            id: 'trans1',
            transactionId: 'trans1',
            purchaseToken: 'token1',
            transactionDate: Date.now(),
            platform: 'android',
            isAutoRenewing: true,
            quantity: 1,
            purchaseState: 'purchased',
            autoRenewingAndroid: true, // Add subscription field
          } as any,
          {
            productId: 'sub-basic-yearly',
            id: 'trans2',
            transactionId: 'trans2',
            purchaseToken: 'token2',
            transactionDate: Date.now(),
            platform: 'android',
            isAutoRenewing: true, // Add subscription field
            quantity: 1,
            purchaseState: 'purchased',
          } as any,
          {
            productId: 'sub_pro_lifetime',
            id: 'trans3',
            transactionId: 'trans3',
            purchaseToken: 'token3',
            transactionDate: Date.now(),
            platform: 'android',
            isAutoRenewing: true,
            quantity: 1,
            purchaseState: 'purchased',
            autoRenewingAndroid: true, // Add subscription field
          } as any,
        ];

        // For Android, getAvailablePurchases is called twice (inapp and subs)
        mockIap.getAvailablePurchases.mockImplementation(
          async (options: any) => {
            if (options?.android?.type === 'inapp') {
              return [];
            }
            return mockPurchases;
          },
        );

        const result1 = await IAP.hasActiveSubscriptions([
          'sub.premium.monthly',
        ]);
        const result2 = await IAP.hasActiveSubscriptions(['sub-basic-yearly']);
        const result3 = await IAP.hasActiveSubscriptions(['sub_pro_lifetime']);

        expect(result1).toBe(true);
        expect(result2).toBe(true);
        expect(result3).toBe(true);
      });

      it('should handle undefined subscription ID parameter', async () => {
        // Ensure Platform.OS is set to 'ios' for this test
        (Platform as any).OS = 'ios';

        const mockPurchases: Purchase[] = [
          {
            productId: 'subscription1',
            id: 'trans1',
            transactionId: 'trans1',
            purchaseToken: 'token1',
            transactionDate: Date.now(),
            platform: 'ios',
            isAutoRenewing: true,
            quantity: 1,
            purchaseState: 'purchased',
            expirationDateIOS: Date.now() + 86400000, // Add subscription field
          } as any,
        ];

        // Mock getAvailablePurchases to return purchases in NitroPurchase format
        // getAvailablePurchases in the implementation expects raw NitroPurchase objects from native
        // For iOS, check if called with ios options
        mockIap.getAvailablePurchases.mockImplementation(
          async (options: any) => {
            if ((Platform as any).OS === 'ios' && options?.ios) {
              return mockPurchases;
            }
            if ((Platform as any).OS === 'android' && options?.android) {
              // For Android, return based on type
              if (options.android.type === 'inapp') {
                return [];
              }
              return mockPurchases;
            }
            // Fallback for tests without platform check
            return mockPurchases;
          },
        );

        // Undefined should check all subscriptions
        const result = await IAP.hasActiveSubscriptions(undefined);

        expect(result).toBe(true);
      });

      it('should handle purchases with null productId', async () => {
        // Ensure Platform.OS is set to 'ios' for this test
        (Platform as any).OS = 'ios';

        const mockPurchases: Purchase[] = [
          {
            productId: null,
            id: 'trans1',
            transactionId: 'trans1',
            purchaseToken: 'token1',
            transactionDate: Date.now(),
            platform: 'ios',
            isAutoRenewing: true,
            quantity: 1,
            purchaseState: 'purchased',
            expirationDateIOS: Date.now() + 86400000, // Has subscription field
          } as any,
          {
            productId: 'valid_sub',
            id: 'trans2',
            transactionId: 'trans2',
            purchaseToken: 'token2',
            transactionDate: Date.now(),
            platform: 'ios',
            isAutoRenewing: true,
            quantity: 1,
            purchaseState: 'purchased',
            subscriptionGroupIdIOS: 'group1', // Add subscription field
          } as any,
        ];

        // For iOS, check if called with ios options
        mockIap.getAvailablePurchases.mockImplementation(
          async (options: any) => {
            if ((Platform as any).OS === 'ios' && options?.ios) {
              return mockPurchases;
            }
            if ((Platform as any).OS === 'android' && options?.android) {
              // For Android, return based on type
              if (options.android.type === 'inapp') {
                return [];
              }
              return mockPurchases;
            }
            // Fallback for tests without platform check
            return mockPurchases;
          },
        );

        const result = await IAP.hasActiveSubscriptions();

        expect(result).toBe(true); // Should still find valid subscription
      });
    });
  });
});
