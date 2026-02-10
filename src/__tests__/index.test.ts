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

  // Unified storefront
  getStorefront: jest.fn(async () => 'USA'),

  // receipt validation (unified API)
  validateReceipt: jest.fn(async () => ({
    isValid: true,
    receiptData: 'mock-receipt',
    jwsRepresentation: 'mock-jws',
    latestTransaction: null,
  })),

  // Billing Programs API (Android 8.2.0+)
  enableBillingProgramAndroid: jest.fn(),
  isBillingProgramAvailableAndroid: jest.fn(async () => ({
    billingProgram: 'external-offer',
    isAvailable: true,
  })),
  createBillingProgramReportingDetailsAndroid: jest.fn(async () => ({
    billingProgram: 'external-offer',
    externalTransactionToken: 'mock-token-123',
  })),
  launchExternalLinkAndroid: jest.fn(async () => true),
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
    // Ensure getAvailablePurchases always returns an empty array by default
    mockIap.getAvailablePurchases = jest.fn(async () => []);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    IAP = require('../index');
  });

  describe('platform detection helpers', () => {
    // Note: More comprehensive platform detection tests are in platform-detection.test.ts
    // which properly resets modules for accurate Platform detection testing
    it('isNitroReady returns true when Nitro is initialized', () => {
      expect(IAP.isNitroReady()).toBe(true);
    });

    it('exports platform detection functions', () => {
      expect(typeof IAP.isTVOS).toBe('function');
      expect(typeof IAP.isMacOS).toBe('function');
      expect(typeof IAP.isStandardIOS).toBe('function');
      expect(typeof IAP.isNitroReady).toBe('function');
    });
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
      (Platform as any).isTV = false;
      (Platform as any).isMacCatalyst = false;
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
          // Explicitly set as undefined to mark as in-app product
          subscriptionOfferDetailsAndroid: undefined,
        },
        {
          id: 'y',
          title: 'Y',
          description: 'dy',
          type: 'subs',
          platform: 'android',
          displayPrice: '$2.00',
          currency: 'USD',
          // Add subscription offer details to properly identify as subscription
          subscriptionOfferDetailsAndroid: [
            {
              basePlanId: 'base',
              offerTags: [],
              offerToken: 'token',
              pricingPhases: {
                pricingPhaseList: [
                  {
                    billingCycleCount: 0,
                    billingPeriod: 'P1M',
                    formattedPrice: '$2.00',
                    priceAmountMicros: '2000000',
                    priceCurrencyCode: 'USD',
                    recurrenceMode: 1,
                  },
                ],
              },
            },
          ],
        },
      ]);
      const result = await IAP.fetchProducts({
        skus: ['x', 'y'],
        type: 'all',
      });
      const items = result ?? [];

      // Debug: Log what we received
      console.log(
        'Test items received:',
        items.map((item: any) => ({
          id: item.id,
          type: item.type,
          hasOffers: item.subscriptionOfferDetailsAndroid?.length > 0,
        })),
      );

      // Products should be properly categorized
      expect(items).toHaveLength(2);
      // Check that we have both products
      const productIds = items.map((item: any) => item.id);
      expect(productIds).toContain('x');
      expect(productIds).toContain('y');

      const xProduct = items.find((item: any) => item.id === 'x');
      const yProduct = items.find((item: any) => item.id === 'y');

      // Product x should be an in-app product (no subscription offers)
      expect(xProduct?.type).toBe('in-app');

      // Product y should be a subscription (has subscription offers)
      expect(yProduct?.type).toBe('subs');
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

    it('iOS subs does not auto-set andDangerouslyFinishTransactionAutomatically when not provided', async () => {
      (Platform as any).OS = 'ios';
      await IAP.requestPurchase({
        request: {ios: {sku: 'sub1'}},
        type: 'subs',
      });
      const passed = mockIap.requestPurchase.mock.calls.pop()?.[0];
      expect(
        passed.ios.andDangerouslyFinishTransactionAutomatically,
      ).toBeUndefined();
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

    it('Android subs forwards subscriptionProductReplacementParams when provided', async () => {
      (Platform as any).OS = 'android';
      await IAP.requestPurchase({
        request: {
          google: {
            skus: ['new_sub'],
            subscriptionOffers: [{sku: 'new_sub', offerToken: 'offer-token'}],
            subscriptionProductReplacementParams: {
              oldProductId: 'old_sub',
              replacementMode: 'with-time-proration',
            },
          },
        },
        type: 'subs',
      });
      const [lastCallArgs] = mockIap.requestPurchase.mock.lastCall;
      expect(lastCallArgs.android.subscriptionProductReplacementParams).toEqual(
        {
          oldProductId: 'old_sub',
          replacementMode: 'with-time-proration',
        },
      );
    });

    it('Android subs does not include subscriptionProductReplacementParams when not provided', async () => {
      (Platform as any).OS = 'android';
      await IAP.requestPurchase({
        request: {
          google: {
            skus: ['sub1'],
            subscriptionOffers: [{sku: 'sub1', offerToken: 'token'}],
          },
        },
        type: 'subs',
      });
      const [lastCallArgs] = mockIap.requestPurchase.mock.lastCall;
      expect(
        lastCallArgs.android.subscriptionProductReplacementParams,
      ).toBeUndefined();
    });

    it('Android subs supports all replacement modes', async () => {
      (Platform as any).OS = 'android';
      const replacementModes = [
        'unknown-replacement-mode',
        'with-time-proration',
        'charge-prorated-price',
        'charge-full-price',
        'without-proration',
        'deferred',
        'keep-existing',
      ] as const;

      for (const mode of replacementModes) {
        await IAP.requestPurchase({
          request: {
            google: {
              skus: ['new_sub'],
              subscriptionOffers: [{sku: 'new_sub', offerToken: 'token'}],
              subscriptionProductReplacementParams: {
                oldProductId: 'old_sub',
                replacementMode: mode,
              },
            },
          },
          type: 'subs',
        });
        const [lastCallArgs] = mockIap.requestPurchase.mock.lastCall;
        expect(
          lastCallArgs.android.subscriptionProductReplacementParams
            .replacementMode,
        ).toBe(mode);
      }
    });

    // New tests for google/apple field support
    it('supports apple field (recommended) on iOS', async () => {
      (Platform as any).OS = 'ios';
      await IAP.requestPurchase({
        request: {apple: {sku: 'premium_sub'}},
        type: 'in-app',
      });
      const passed = mockIap.requestPurchase.mock.calls.pop()?.[0];
      expect(passed.ios.sku).toBe('premium_sub');
    });

    it('supports google field (recommended) on Android', async () => {
      (Platform as any).OS = 'android';
      await IAP.requestPurchase({
        request: {google: {skus: ['premium_sub']}},
        type: 'in-app',
      });
      const passed = mockIap.requestPurchase.mock.calls.pop()?.[0];
      expect(passed.android.skus).toEqual(['premium_sub']);
    });

    it('prefers apple field over ios field when both provided', async () => {
      (Platform as any).OS = 'ios';
      await IAP.requestPurchase({
        request: {
          apple: {sku: 'apple_sku'},
          ios: {sku: 'ios_sku'},
        },
        type: 'in-app',
      });
      const passed = mockIap.requestPurchase.mock.calls.pop()?.[0];
      expect(passed.ios.sku).toBe('apple_sku');
    });

    it('prefers google field over android field when both provided', async () => {
      (Platform as any).OS = 'android';
      await IAP.requestPurchase({
        request: {
          google: {skus: ['google_sku']},
          android: {skus: ['android_sku']},
        },
        type: 'in-app',
      });
      const passed = mockIap.requestPurchase.mock.calls.pop()?.[0];
      expect(passed.android.skus).toEqual(['google_sku']);
    });

    it('iOS passes advancedCommerceData through to native', async () => {
      (Platform as any).OS = 'ios';
      await IAP.requestPurchase({
        request: {
          apple: {
            sku: 'premium_sub',
            advancedCommerceData: 'campaign_summer_2025',
          },
        },
        type: 'in-app',
      });
      const passed = mockIap.requestPurchase.mock.calls.pop()?.[0];
      expect(passed.ios.advancedCommerceData).toBe('campaign_summer_2025');
    });

    it('iOS passes advancedCommerceData with JSON format', async () => {
      (Platform as any).OS = 'ios';
      const advancedData = '{"signatureInfo": {"token": "affiliate_123"}}';
      await IAP.requestPurchase({
        request: {
          apple: {
            sku: 'premium_sub',
            advancedCommerceData: advancedData,
          },
        },
        type: 'subs',
      });
      const passed = mockIap.requestPurchase.mock.calls.pop()?.[0];
      expect(passed.ios.advancedCommerceData).toBe(advancedData);
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
      // RnIapConsole.warn adds "[RN-IAP]" prefix
      expect(console.warn).toHaveBeenCalledWith(
        '[RN-IAP]',
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
        apple: {sku: 'sku'},
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
        google: {
          sku: 'sku',
          packageName: 'com.app',
          purchaseToken: 'tok',
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
      // Mock getActiveSubscriptions for iOS - returns empty array by default
      mockIap.getActiveSubscriptions = jest.fn(async () => []);
      // Ensure getAvailablePurchases returns empty array by default
      mockIap.getAvailablePurchases = jest.fn(async () => []);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    describe('getActiveSubscriptions', () => {
      it('iOS: should call native getActiveSubscriptions and map results', async () => {
        (Platform as any).OS = 'ios';

        const mockActiveSubscriptions = [
          {
            productId: 'subscription1',
            isActive: true,
            transactionId: 'trans1',
            purchaseToken: 'token1',
            transactionDate: Date.now(),
            expirationDateIOS: Date.now() + 86400000,
            environmentIOS: 'Production',
            renewalInfoIOS: {
              willAutoRenew: true,
              autoRenewPreference: 'subscription1',
              expirationIntent: null,
              gracePeriodExpiresAt: null,
              offerType: null,
              originalTransactionId: 'trans1',
              priceIncreaseStatus: null,
              renewalDate: Date.now() + 86400000,
              signedDate: Date.now(),
            },
          },
        ];

        mockIap.getActiveSubscriptions.mockResolvedValueOnce(
          mockActiveSubscriptions,
        );

        const result = await IAP.getActiveSubscriptions();

        expect(mockIap.getActiveSubscriptions).toHaveBeenCalledWith(undefined);
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(
          expect.objectContaining({
            productId: 'subscription1',
            isActive: true,
            renewalInfoIOS: expect.objectContaining({
              willAutoRenew: true,
            }),
          }),
        );
      });

      it('iOS: should pass subscription IDs to native method', async () => {
        (Platform as any).OS = 'ios';

        mockIap.getActiveSubscriptions.mockResolvedValueOnce([]);

        await IAP.getActiveSubscriptions(['sub1', 'sub2']);

        expect(mockIap.getActiveSubscriptions).toHaveBeenCalledWith([
          'sub1',
          'sub2',
        ]);
      });

      it('Android: should call native getActiveSubscriptions with Android fields', async () => {
        (Platform as any).OS = 'android';

        const mockActiveSubscriptions = [
          {
            productId: 'subscription1',
            isActive: true,
            transactionId: 'trans1',
            purchaseToken: 'token1',
            transactionDate: Date.now(),
            autoRenewingAndroid: true,
            basePlanIdAndroid: 'monthly-base',
            currentPlanId: 'monthly-base',
            purchaseTokenAndroid: 'token1',
          },
        ];

        mockIap.getActiveSubscriptions.mockResolvedValueOnce(
          mockActiveSubscriptions,
        );

        const result = await IAP.getActiveSubscriptions();

        expect(mockIap.getActiveSubscriptions).toHaveBeenCalledWith(undefined);
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(
          expect.objectContaining({
            productId: 'subscription1',
            isActive: true,
            autoRenewingAndroid: true,
            basePlanIdAndroid: 'monthly-base',
          }),
        );
      });

      it('should pass subscription IDs for filtering', async () => {
        const mockActiveSubscriptions = [
          {
            productId: 'sub1',
            isActive: true,
            transactionId: 'trans1',
            purchaseToken: 'token1',
            transactionDate: Date.now(),
          },
        ];

        mockIap.getActiveSubscriptions.mockResolvedValueOnce(
          mockActiveSubscriptions,
        );

        const result = await IAP.getActiveSubscriptions(['sub1', 'sub2']);

        expect(mockIap.getActiveSubscriptions).toHaveBeenCalledWith([
          'sub1',
          'sub2',
        ]);
        expect(result).toHaveLength(1);
        expect(result[0]?.productId).toBe('sub1');
      });

      it('should return empty array when no subscriptions available', async () => {
        (Platform as any).OS = 'ios';
        mockIap.getActiveSubscriptions.mockResolvedValueOnce([]);

        const result = await IAP.getActiveSubscriptions();

        expect(result).toEqual([]);
      });

      it('should handle errors and rethrow them', async () => {
        (Platform as any).OS = 'ios';
        const error = new Error('Failed to fetch');
        mockIap.getActiveSubscriptions.mockRejectedValueOnce(error);

        await expect(IAP.getActiveSubscriptions()).rejects.toThrow(
          'Failed to fetch',
        );
      });
    });

    describe('hasActiveSubscriptions', () => {
      it('should return true when there are active subscriptions', async () => {
        (Platform as any).OS = 'ios';
        mockIap.getActiveSubscriptions.mockResolvedValueOnce([
          {productId: 'sub1', isActive: true},
        ]);

        const result = await IAP.hasActiveSubscriptions();

        expect(result).toBe(true);
      });

      it('should return false when there are no active subscriptions', async () => {
        (Platform as any).OS = 'ios';
        mockIap.getActiveSubscriptions.mockResolvedValueOnce([]);

        const result = await IAP.hasActiveSubscriptions();

        expect(result).toBe(false);
      });

      it('should return false on error', async () => {
        (Platform as any).OS = 'ios';
        const error = new Error('Failed to fetch');
        mockIap.getActiveSubscriptions.mockRejectedValueOnce(error);

        const result = await IAP.hasActiveSubscriptions();

        expect(result).toBe(false);
      });
    });
  });

  describe('verifyPurchaseWithProvider', () => {
    beforeEach(() => {
      mockIap.verifyPurchaseWithProvider = jest.fn();
    });

    it('should call native verifyPurchaseWithProvider with correct params', async () => {
      (Platform as any).OS = 'ios';
      const mockResult = {
        provider: 'iapkit',
        iapkit: {
          isValid: true,
          state: 'entitled',
          store: 'apple',
        },
      };
      mockIap.verifyPurchaseWithProvider.mockResolvedValueOnce(mockResult);

      const result = await IAP.verifyPurchaseWithProvider({
        provider: 'iapkit',
        iapkit: {
          apiKey: 'test-api-key',
          environment: 'sandbox',
          apple: {
            jws: 'test-jws-token',
          },
        },
      });

      expect(mockIap.verifyPurchaseWithProvider).toHaveBeenCalledWith({
        provider: 'iapkit',
        iapkit: {
          apiKey: 'test-api-key',
          environment: 'sandbox',
          apple: {
            jws: 'test-jws-token',
          },
        },
      });
      expect(result.provider).toBe('iapkit');
      expect(result.iapkit?.isValid).toBe(true);
      expect(result.iapkit?.state).toBe('entitled');
      expect(result.iapkit?.store).toBe('apple');
    });

    it('should handle Android verification', async () => {
      (Platform as any).OS = 'android';
      const mockResult = {
        provider: 'iapkit',
        iapkit: {
          isValid: true,
          state: 'entitled',
          store: 'google',
        },
      };
      mockIap.verifyPurchaseWithProvider.mockResolvedValueOnce(mockResult);

      const result = await IAP.verifyPurchaseWithProvider({
        provider: 'iapkit',
        iapkit: {
          apiKey: 'test-api-key',
          google: {
            purchaseToken: 'test-purchase-token',
            packageName: 'com.test.app',
            productId: 'test-product',
          },
        },
      });

      expect(result.iapkit?.store).toBe('google');
    });

    it('should throw error when provider is not iapkit', async () => {
      (Platform as any).OS = 'ios';
      const mockResult = {
        provider: 'none',
        iapkit: null,
      };
      mockIap.verifyPurchaseWithProvider.mockResolvedValueOnce(mockResult);

      await expect(
        IAP.verifyPurchaseWithProvider({
          provider: 'iapkit',
          iapkit: {
            apiKey: 'test-api-key',
            apple: {jws: 'test-jws'},
          },
        }),
      ).rejects.toThrow(/Unsupported provider/);
    });

    it('should handle verification failure states', async () => {
      (Platform as any).OS = 'ios';
      const mockResult = {
        provider: 'iapkit',
        iapkit: {
          isValid: false,
          state: 'expired',
          store: 'apple',
        },
      };
      mockIap.verifyPurchaseWithProvider.mockResolvedValueOnce(mockResult);

      const result = await IAP.verifyPurchaseWithProvider({
        provider: 'iapkit',
        iapkit: {
          apiKey: 'test-api-key',
          apple: {jws: 'test-jws'},
        },
      });

      expect(result.iapkit?.isValid).toBe(false);
      expect(result.iapkit?.state).toBe('expired');
    });

    it('should handle native errors', async () => {
      (Platform as any).OS = 'ios';
      mockIap.verifyPurchaseWithProvider.mockRejectedValueOnce(
        new Error('Network error'),
      );

      await expect(
        IAP.verifyPurchaseWithProvider({
          provider: 'iapkit',
          iapkit: {
            apiKey: 'test-api-key',
            apple: {jws: 'test-jws'},
          },
        }),
      ).rejects.toThrow();
    });

    it('should handle null iapkit param', async () => {
      (Platform as any).OS = 'ios';
      const mockResult = {
        provider: 'iapkit',
        iapkit: [],
      };
      mockIap.verifyPurchaseWithProvider.mockResolvedValueOnce(mockResult);

      await IAP.verifyPurchaseWithProvider({
        provider: 'iapkit',
      });

      expect(mockIap.verifyPurchaseWithProvider).toHaveBeenCalledWith({
        provider: 'iapkit',
        iapkit: null,
      });
    });

    it('should handle various IAPKit purchase states', async () => {
      (Platform as any).OS = 'ios';
      const states = [
        'entitled',
        'pending-acknowledgment',
        'pending',
        'canceled',
        'expired',
        'ready-to-consume',
        'consumed',
        'unknown',
        'inauthentic',
      ];

      for (const state of states) {
        const mockResult = {
          provider: 'iapkit',
          iapkit: {isValid: state !== 'inauthentic', state, store: 'apple'},
        };
        mockIap.verifyPurchaseWithProvider.mockResolvedValueOnce(mockResult);

        const result = await IAP.verifyPurchaseWithProvider({
          provider: 'iapkit',
          iapkit: {
            apiKey: 'key',
            apple: {jws: 'jws'},
          },
        });

        expect(result.iapkit?.state).toBe(state);
      }
    });

    it('should handle inauthentic verification response', async () => {
      (Platform as any).OS = 'ios';
      const mockResult = {
        provider: 'iapkit',
        iapkit: {isValid: false, state: 'inauthentic', store: 'apple'},
      };
      mockIap.verifyPurchaseWithProvider.mockResolvedValueOnce(mockResult);

      const result = await IAP.verifyPurchaseWithProvider({
        provider: 'iapkit',
        iapkit: {
          apiKey: 'key',
          apple: {jws: 'invalid-jws'},
        },
      });

      expect(result.iapkit?.isValid).toBe(false);
      expect(result.iapkit?.state).toBe('inauthentic');
    });

    it('should handle ready-to-consume state for consumables', async () => {
      (Platform as any).OS = 'android';
      const mockResult = {
        provider: 'iapkit',
        iapkit: {isValid: true, state: 'ready-to-consume', store: 'google'},
      };
      mockIap.verifyPurchaseWithProvider.mockResolvedValueOnce(mockResult);

      const result = await IAP.verifyPurchaseWithProvider({
        provider: 'iapkit',
        iapkit: {
          apiKey: 'key',
          google: {
            purchaseToken: 'token',
            packageName: 'com.app',
            productId: 'consumable',
          },
        },
      });

      expect(result.iapkit?.state).toBe('ready-to-consume');
    });

    it('should handle pending-acknowledgment state for subscriptions', async () => {
      (Platform as any).OS = 'android';
      const mockResult = {
        provider: 'iapkit',
        iapkit: {
          isValid: true,
          state: 'pending-acknowledgment',
          store: 'google',
        },
      };
      mockIap.verifyPurchaseWithProvider.mockResolvedValueOnce(mockResult);

      const result = await IAP.verifyPurchaseWithProvider({
        provider: 'iapkit',
        iapkit: {
          apiKey: 'key',
          google: {
            purchaseToken: 'token',
            packageName: 'com.app',
            productId: 'subscription',
          },
        },
      });

      expect(result.iapkit?.state).toBe('pending-acknowledgment');
    });
  });

  describe('developerProvidedBillingListenerAndroid (External Payments 8.3.0+)', () => {
    it('should warn and no-op on non-Android', () => {
      (Platform as any).OS = 'ios';
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const sub = IAP.developerProvidedBillingListenerAndroid(jest.fn());
      expect(typeof sub.remove).toBe('function');
      expect(warn).toHaveBeenCalledWith(
        '[RN-IAP]',
        'developerProvidedBillingListenerAndroid: This listener is only available on Android',
      );
      warn.mockRestore();
    });

    it('should attach listener and forward details on Android', () => {
      (Platform as any).OS = 'android';
      mockIap.addDeveloperProvidedBillingListenerAndroid = jest.fn();
      mockIap.removeDeveloperProvidedBillingListenerAndroid = jest.fn();

      const listener = jest.fn();
      const sub = IAP.developerProvidedBillingListenerAndroid(listener);

      expect(
        mockIap.addDeveloperProvidedBillingListenerAndroid,
      ).toHaveBeenCalled();

      // Simulate native event
      const details = {
        externalTransactionToken: 'external-token-123',
      };
      const wrapped =
        mockIap.addDeveloperProvidedBillingListenerAndroid.mock.calls[0][0];
      wrapped(details);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          externalTransactionToken: 'external-token-123',
        }),
      );

      sub.remove();
      expect(
        mockIap.removeDeveloperProvidedBillingListenerAndroid,
      ).toHaveBeenCalled();
    });
  });

  describe('Billing Programs API (Android 8.2.0+)', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('enableBillingProgramAndroid', () => {
      it('should call native method on Android', () => {
        (Platform as any).OS = 'android';
        IAP.enableBillingProgramAndroid('external-offer');
        expect(mockIap.enableBillingProgramAndroid).toHaveBeenCalledWith(
          'external-offer',
        );
      });

      it('should support external-payments program (8.3.0+)', () => {
        (Platform as any).OS = 'android';
        IAP.enableBillingProgramAndroid('external-payments');
        expect(mockIap.enableBillingProgramAndroid).toHaveBeenCalledWith(
          'external-payments',
        );
      });

      it('should warn and return early on non-Android', () => {
        (Platform as any).OS = 'ios';
        IAP.enableBillingProgramAndroid('external-offer');
        expect(mockIap.enableBillingProgramAndroid).not.toHaveBeenCalled();
        expect(console.warn).toHaveBeenCalledWith(
          '[RN-IAP]',
          'enableBillingProgramAndroid is only supported on Android',
        );
      });

      it('should handle errors gracefully', () => {
        (Platform as any).OS = 'android';
        mockIap.enableBillingProgramAndroid.mockImplementationOnce(() => {
          throw new Error('Native error');
        });
        // Should not throw, just log error
        expect(() =>
          IAP.enableBillingProgramAndroid('external-offer'),
        ).not.toThrow();
        expect(console.error).toHaveBeenCalled();
      });

      it('should support external-content-link program', () => {
        (Platform as any).OS = 'android';
        IAP.enableBillingProgramAndroid('external-content-link');
        expect(mockIap.enableBillingProgramAndroid).toHaveBeenCalledWith(
          'external-content-link',
        );
      });
    });

    describe('isBillingProgramAvailableAndroid', () => {
      it('should return availability result on Android', async () => {
        (Platform as any).OS = 'android';
        mockIap.isBillingProgramAvailableAndroid.mockResolvedValueOnce({
          billingProgram: 'external-offer',
          isAvailable: true,
        });

        const result =
          await IAP.isBillingProgramAvailableAndroid('external-offer');

        expect(mockIap.isBillingProgramAvailableAndroid).toHaveBeenCalledWith(
          'external-offer',
        );
        expect(result.billingProgram).toBe('external-offer');
        expect(result.isAvailable).toBe(true);
      });

      it('should return false when program not available', async () => {
        (Platform as any).OS = 'android';
        mockIap.isBillingProgramAvailableAndroid.mockResolvedValueOnce({
          billingProgram: 'external-offer',
          isAvailable: false,
        });

        const result =
          await IAP.isBillingProgramAvailableAndroid('external-offer');

        expect(result.isAvailable).toBe(false);
      });

      it('should throw on non-Android', async () => {
        (Platform as any).OS = 'ios';
        await expect(
          IAP.isBillingProgramAvailableAndroid('external-offer'),
        ).rejects.toThrow('Billing Programs API is only supported on Android');
      });

      it('should handle native errors', async () => {
        (Platform as any).OS = 'android';
        mockIap.isBillingProgramAvailableAndroid.mockRejectedValueOnce(
          new Error('Service unavailable'),
        );

        await expect(
          IAP.isBillingProgramAvailableAndroid('external-offer'),
        ).rejects.toThrow('Service unavailable');
      });

      it('should support external-content-link program', async () => {
        (Platform as any).OS = 'android';
        mockIap.isBillingProgramAvailableAndroid.mockResolvedValueOnce({
          billingProgram: 'external-content-link',
          isAvailable: true,
        });

        const result = await IAP.isBillingProgramAvailableAndroid(
          'external-content-link',
        );

        expect(result.billingProgram).toBe('external-content-link');
      });
    });

    describe('createBillingProgramReportingDetailsAndroid', () => {
      it('should return reporting details with token on Android', async () => {
        (Platform as any).OS = 'android';
        mockIap.createBillingProgramReportingDetailsAndroid.mockResolvedValueOnce(
          {
            billingProgram: 'external-offer',
            externalTransactionToken: 'token-abc-123',
          },
        );

        const result =
          await IAP.createBillingProgramReportingDetailsAndroid(
            'external-offer',
          );

        expect(
          mockIap.createBillingProgramReportingDetailsAndroid,
        ).toHaveBeenCalledWith('external-offer');
        expect(result.billingProgram).toBe('external-offer');
        expect(result.externalTransactionToken).toBe('token-abc-123');
      });

      it('should throw on non-Android', async () => {
        (Platform as any).OS = 'ios';
        await expect(
          IAP.createBillingProgramReportingDetailsAndroid('external-offer'),
        ).rejects.toThrow('Billing Programs API is only supported on Android');
      });

      it('should handle native errors', async () => {
        (Platform as any).OS = 'android';
        mockIap.createBillingProgramReportingDetailsAndroid.mockRejectedValueOnce(
          new Error('Token creation failed'),
        );

        await expect(
          IAP.createBillingProgramReportingDetailsAndroid('external-offer'),
        ).rejects.toThrow('Token creation failed');
      });

      it('should support external-content-link program', async () => {
        (Platform as any).OS = 'android';
        mockIap.createBillingProgramReportingDetailsAndroid.mockResolvedValueOnce(
          {
            billingProgram: 'external-content-link',
            externalTransactionToken: 'content-token-456',
          },
        );

        const result = await IAP.createBillingProgramReportingDetailsAndroid(
          'external-content-link',
        );

        expect(result.billingProgram).toBe('external-content-link');
        expect(result.externalTransactionToken).toBe('content-token-456');
      });
    });

    describe('launchExternalLinkAndroid', () => {
      const defaultParams = {
        billingProgram: 'external-offer' as const,
        launchMode: 'launch-in-external-browser-or-app' as const,
        linkType: 'link-to-digital-content-offer' as const,
        linkUri: 'https://example.com/purchase',
      };

      it('should return true when user accepts on Android', async () => {
        (Platform as any).OS = 'android';
        mockIap.launchExternalLinkAndroid.mockResolvedValueOnce(true);

        const result = await IAP.launchExternalLinkAndroid(defaultParams);

        expect(mockIap.launchExternalLinkAndroid).toHaveBeenCalledWith({
          billingProgram: 'external-offer',
          launchMode: 'launch-in-external-browser-or-app',
          linkType: 'link-to-digital-content-offer',
          linkUri: 'https://example.com/purchase',
        });
        expect(result).toBe(true);
      });

      it('should return false when user declines', async () => {
        (Platform as any).OS = 'android';
        mockIap.launchExternalLinkAndroid.mockResolvedValueOnce(false);

        const result = await IAP.launchExternalLinkAndroid(defaultParams);

        expect(result).toBe(false);
      });

      it('should throw on non-Android', async () => {
        (Platform as any).OS = 'ios';
        await expect(
          IAP.launchExternalLinkAndroid(defaultParams),
        ).rejects.toThrow('Billing Programs API is only supported on Android');
      });

      it('should handle native errors', async () => {
        (Platform as any).OS = 'android';
        mockIap.launchExternalLinkAndroid.mockRejectedValueOnce(
          new Error('Launch failed'),
        );

        await expect(
          IAP.launchExternalLinkAndroid(defaultParams),
        ).rejects.toThrow('Launch failed');
      });

      it('should support external-content-link program', async () => {
        (Platform as any).OS = 'android';
        mockIap.launchExternalLinkAndroid.mockResolvedValueOnce(true);

        const params = {
          billingProgram: 'external-content-link' as const,
          launchMode: 'launch-in-external-browser-or-app' as const,
          linkType: 'link-to-app-download' as const,
          linkUri: 'https://example.com/download',
        };

        await IAP.launchExternalLinkAndroid(params);

        expect(mockIap.launchExternalLinkAndroid).toHaveBeenCalledWith(params);
      });

      it('should support caller-will-launch-link mode', async () => {
        (Platform as any).OS = 'android';
        mockIap.launchExternalLinkAndroid.mockResolvedValueOnce(true);

        const params = {
          billingProgram: 'external-offer' as const,
          launchMode: 'caller-will-launch-link' as const,
          linkType: 'link-to-digital-content-offer' as const,
          linkUri: 'https://example.com/custom',
        };

        await IAP.launchExternalLinkAndroid(params);

        expect(mockIap.launchExternalLinkAndroid).toHaveBeenCalledWith(params);
      });
    });
  });

  describe('ExternalPurchaseCustomLink APIs (iOS 18.1+)', () => {
    describe('isEligibleForExternalPurchaseCustomLinkIOS', () => {
      it('should return true when eligible on iOS', async () => {
        (Platform as any).OS = 'ios';
        mockIap.isEligibleForExternalPurchaseCustomLinkIOS = jest.fn(
          async () => true,
        );

        const result = await IAP.isEligibleForExternalPurchaseCustomLinkIOS();

        expect(result).toBe(true);
        expect(
          mockIap.isEligibleForExternalPurchaseCustomLinkIOS,
        ).toHaveBeenCalled();
      });

      it('should return false when not eligible on iOS', async () => {
        (Platform as any).OS = 'ios';
        mockIap.isEligibleForExternalPurchaseCustomLinkIOS = jest.fn(
          async () => false,
        );

        const result = await IAP.isEligibleForExternalPurchaseCustomLinkIOS();

        expect(result).toBe(false);
      });

      it('should return false on non-iOS platforms', async () => {
        (Platform as any).OS = 'android';

        const result = await IAP.isEligibleForExternalPurchaseCustomLinkIOS();

        expect(result).toBe(false);
      });

      it('should return false on error', async () => {
        (Platform as any).OS = 'ios';
        mockIap.isEligibleForExternalPurchaseCustomLinkIOS = jest.fn(
          async () => {
            throw new Error('Feature not supported');
          },
        );

        const result = await IAP.isEligibleForExternalPurchaseCustomLinkIOS();

        expect(result).toBe(false);
      });
    });

    describe('getExternalPurchaseCustomLinkTokenIOS', () => {
      it('should return token for acquisition type on iOS', async () => {
        (Platform as any).OS = 'ios';
        const mockResult = {
          token: 'external-purchase-token-123',
          error: null,
        };
        mockIap.getExternalPurchaseCustomLinkTokenIOS = jest.fn(
          async () => mockResult,
        );

        const result =
          await IAP.getExternalPurchaseCustomLinkTokenIOS('acquisition');

        expect(result.token).toBe('external-purchase-token-123');
        expect(result.error).toBeNull();
        expect(
          mockIap.getExternalPurchaseCustomLinkTokenIOS,
        ).toHaveBeenCalledWith('acquisition');
      });

      it('should return token for services type on iOS', async () => {
        (Platform as any).OS = 'ios';
        const mockResult = {
          token: 'services-token-456',
          error: null,
        };
        mockIap.getExternalPurchaseCustomLinkTokenIOS = jest.fn(
          async () => mockResult,
        );

        const result =
          await IAP.getExternalPurchaseCustomLinkTokenIOS('services');

        expect(result.token).toBe('services-token-456');
        expect(
          mockIap.getExternalPurchaseCustomLinkTokenIOS,
        ).toHaveBeenCalledWith('services');
      });

      it('should throw on non-iOS platforms', async () => {
        (Platform as any).OS = 'android';

        await expect(
          IAP.getExternalPurchaseCustomLinkTokenIOS('acquisition'),
        ).rejects.toThrow(
          'External purchase custom link is only supported on iOS 18.1+',
        );
      });

      it('should throw native errors', async () => {
        (Platform as any).OS = 'ios';
        mockIap.getExternalPurchaseCustomLinkTokenIOS = jest.fn(async () => {
          throw new Error('Token generation failed');
        });

        await expect(
          IAP.getExternalPurchaseCustomLinkTokenIOS('acquisition'),
        ).rejects.toThrow('Token generation failed');
      });
    });

    describe('showExternalPurchaseCustomLinkNoticeIOS', () => {
      it('should return continued=true when user agrees on iOS', async () => {
        (Platform as any).OS = 'ios';
        const mockResult = {
          continued: true,
          error: null,
        };
        mockIap.showExternalPurchaseCustomLinkNoticeIOS = jest.fn(
          async () => mockResult,
        );

        const result =
          await IAP.showExternalPurchaseCustomLinkNoticeIOS('browser');

        expect(result.continued).toBe(true);
        expect(result.error).toBeNull();
        expect(
          mockIap.showExternalPurchaseCustomLinkNoticeIOS,
        ).toHaveBeenCalledWith('browser');
      });

      it('should return continued=false when user declines on iOS', async () => {
        (Platform as any).OS = 'ios';
        const mockResult = {
          continued: false,
          error: null,
        };
        mockIap.showExternalPurchaseCustomLinkNoticeIOS = jest.fn(
          async () => mockResult,
        );

        const result =
          await IAP.showExternalPurchaseCustomLinkNoticeIOS('browser');

        expect(result.continued).toBe(false);
      });

      it('should throw on non-iOS platforms', async () => {
        (Platform as any).OS = 'android';

        await expect(
          IAP.showExternalPurchaseCustomLinkNoticeIOS('browser'),
        ).rejects.toThrow(
          'External purchase custom link is only supported on iOS 18.1+',
        );
      });

      it('should throw native errors', async () => {
        (Platform as any).OS = 'ios';
        mockIap.showExternalPurchaseCustomLinkNoticeIOS = jest.fn(async () => {
          throw new Error('Notice display failed');
        });

        await expect(
          IAP.showExternalPurchaseCustomLinkNoticeIOS('browser'),
        ).rejects.toThrow('Notice display failed');
      });

      it('should handle unspecified noticeType gracefully', async () => {
        (Platform as any).OS = 'ios';
        const mockResult = {
          continued: true,
          error: null,
        };
        mockIap.showExternalPurchaseCustomLinkNoticeIOS = jest.fn(
          async () => mockResult,
        );

        // 'unspecified' is a valid TypeScript value due to Nitro constraint workaround
        const result =
          await IAP.showExternalPurchaseCustomLinkNoticeIOS('unspecified');

        expect(result.continued).toBe(true);
        expect(
          mockIap.showExternalPurchaseCustomLinkNoticeIOS,
        ).toHaveBeenCalledWith('unspecified');
      });
    });
  });
});
