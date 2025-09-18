/* eslint-disable @typescript-eslint/no-require-imports */
// Keep mocks static and simple for readability.
// No dynamic imports; mock before importing the module under test.

import {Platform} from 'react-native';
import {ErrorCode} from '../types';
import type {DiscountOfferInputIOS} from '../types';

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
  });

  describe('getAvailablePurchases', () => {
    it('iOS path passes deprecation-compatible flags', async () => {
      (Platform as any).OS = 'ios';
      mockIap.getAvailablePurchases.mockResolvedValueOnce([]);
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

    it('deepLinkToSubscriptions uses iOS manage subscriptions on iOS', async () => {
      (Platform as any).OS = 'ios';
      mockIap.showManageSubscriptionsIOS = jest.fn(async () => []);
      await expect(IAP.deepLinkToSubscriptions()).resolves.toBeUndefined();
      expect(mockIap.showManageSubscriptionsIOS).toHaveBeenCalled();
    });
  });
});
