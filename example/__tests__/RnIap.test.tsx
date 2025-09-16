import * as RNIap from 'react-native-iap';
import {Platform} from 'react-native';

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios),
  },
}));

// Mock NitroModules
jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    createHybridObject: jest.fn().mockReturnValue({
      initConnection: jest.fn().mockResolvedValue(true),
      endConnection: jest.fn().mockResolvedValue(true),
      fetchProducts: jest.fn().mockResolvedValue([]),
      requestPurchase: jest.fn().mockResolvedValue(undefined),
      getAvailablePurchases: jest.fn().mockResolvedValue([]),
      finishTransaction: jest.fn().mockResolvedValue(true),
      addPurchaseUpdatedListener: jest.fn(),
      removePurchaseUpdatedListener: jest.fn(),
      addPurchaseErrorListener: jest.fn(),
      removePurchaseErrorListener: jest.fn(),
      addPromotedProductListenerIOS: jest.fn(),
      removePromotedProductListenerIOS: jest.fn(),
      getStorefrontIOS: jest.fn().mockResolvedValue('USA'),
      getAppTransactionIOS: jest.fn().mockResolvedValue(null),
      requestPromotedProductIOS: jest.fn().mockResolvedValue(null),
      buyPromotedProductIOS: jest.fn().mockResolvedValue(undefined),
      presentCodeRedemptionSheetIOS: jest.fn().mockResolvedValue(true),
      clearTransactionIOS: jest.fn().mockResolvedValue(undefined),
      beginRefundRequestIOS: jest.fn().mockResolvedValue(null),
      acknowledgePurchaseAndroid: jest.fn().mockResolvedValue(true),
      consumePurchaseAndroid: jest.fn().mockResolvedValue(true),
      validateReceipt: jest.fn().mockResolvedValue({
        isValid: true,
        receiptData: 'mock-receipt',
        jwsRepresentation: 'mock-jws',
        latestTransaction: null,
      }),
    }),
  },
}));

describe('RnIap Complete Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Core Connection APIs', () => {
    it('should export initConnection', () => {
      expect(RNIap.initConnection).toBeDefined();
      expect(typeof RNIap.initConnection).toBe('function');
    });

    it('should export endConnection', () => {
      expect(RNIap.endConnection).toBeDefined();
      expect(typeof RNIap.endConnection).toBe('function');
    });

    it('should initialize connection successfully', async () => {
      const result = await RNIap.initConnection();
      expect(result).toBeDefined();
    });

    it('should end connection successfully', async () => {
      await expect(RNIap.endConnection()).resolves.not.toThrow();
    });
  });

  describe('Product APIs', () => {
    it('should export fetchProducts', () => {
      expect(RNIap.fetchProducts).toBeDefined();
      expect(typeof RNIap.fetchProducts).toBe('function');
    });

    it('should request products with SKUs', async () => {
      const skus = ['product1', 'product2'];
      await expect(RNIap.fetchProducts({skus})).resolves.toBeDefined();
    });
  });

  describe('Purchase APIs', () => {
    it('should export requestPurchase', () => {
      expect(RNIap.requestPurchase).toBeDefined();
      expect(typeof RNIap.requestPurchase).toBe('function');
    });

    it('should export finishTransaction', () => {
      expect(RNIap.finishTransaction).toBeDefined();
      expect(typeof RNIap.finishTransaction).toBe('function');
    });

    it('should export getAvailablePurchases', () => {
      expect(RNIap.getAvailablePurchases).toBeDefined();
      expect(typeof RNIap.getAvailablePurchases).toBe('function');
    });

    it('should request purchase', async () => {
      const request = {ios: {sku: 'product1'}};
      await expect(
        RNIap.requestPurchase({request, type: 'in-app'}),
      ).resolves.not.toThrow();
    });

    it('should get available purchases', async () => {
      await expect(RNIap.getAvailablePurchases()).resolves.toBeDefined();
    });
  });

  describe('Listener APIs', () => {
    it('should export purchaseUpdatedListener', () => {
      expect(RNIap.purchaseUpdatedListener).toBeDefined();
      expect(typeof RNIap.purchaseUpdatedListener).toBe('function');
    });

    it('should export purchaseErrorListener', () => {
      expect(RNIap.purchaseErrorListener).toBeDefined();
      expect(typeof RNIap.purchaseErrorListener).toBe('function');
    });

    it('should add purchase updated listener', () => {
      const listener = jest.fn();
      const subscription = RNIap.purchaseUpdatedListener(listener);
      expect(subscription).toBeDefined();
      expect(subscription.remove).toBeDefined();
    });

    it('should add purchase error listener', () => {
      const listener = jest.fn();
      const subscription = RNIap.purchaseErrorListener(listener);
      expect(subscription).toBeDefined();
      expect(subscription.remove).toBeDefined();
    });
  });

  describe('iOS-specific APIs', () => {
    it('should export requestPromotedProductIOS', () => {
      expect(RNIap.requestPromotedProductIOS).toBeDefined();
      expect(typeof RNIap.requestPromotedProductIOS).toBe('function');
    });

    it('should export buyPromotedProductIOS', () => {
      expect(RNIap.buyPromotedProductIOS).toBeDefined();
      expect(typeof RNIap.buyPromotedProductIOS).toBe('function');
    });

    it('should export presentCodeRedemptionSheetIOS', () => {
      expect(RNIap.presentCodeRedemptionSheetIOS).toBeDefined();
      expect(typeof RNIap.presentCodeRedemptionSheetIOS).toBe('function');
    });

    it('should export clearTransactionIOS', () => {
      expect(RNIap.clearTransactionIOS).toBeDefined();
      expect(typeof RNIap.clearTransactionIOS).toBe('function');
    });

    it('should export beginRefundRequestIOS', () => {
      expect(RNIap.beginRefundRequestIOS).toBeDefined();
      expect(typeof RNIap.beginRefundRequestIOS).toBe('function');
    });

    it('should present code redemption sheet on iOS', async () => {
      await expect(
        RNIap.presentCodeRedemptionSheetIOS(),
      ).resolves.not.toThrow();
    });

    it('should clear transactions on iOS', async () => {
      await expect(RNIap.clearTransactionIOS()).resolves.not.toThrow();
    });

    it('should request promoted product on iOS', async () => {
      const result = await RNIap.requestPromotedProductIOS();
      expect(result).toBeNull();
    });

    it('should buy promoted product on iOS', async () => {
      await expect(RNIap.buyPromotedProductIOS()).resolves.not.toThrow();
    });

    it('should begin refund request on iOS', async () => {
      const result = await RNIap.beginRefundRequestIOS('test-sku');
      expect(result).toBeNull();
    });
  });

  describe('Android-specific APIs', () => {
    beforeEach(() => {
      (Platform as any).OS = 'android';
    });

    afterEach(() => {
      (Platform as any).OS = 'ios';
    });

    it('should export acknowledgePurchaseAndroid', () => {
      expect(RNIap.acknowledgePurchaseAndroid).toBeDefined();
      expect(typeof RNIap.acknowledgePurchaseAndroid).toBe('function');
    });

    it('should export consumePurchaseAndroid', () => {
      expect(RNIap.consumePurchaseAndroid).toBeDefined();
      expect(typeof RNIap.consumePurchaseAndroid).toBe('function');
    });
  });

  describe('Hook API', () => {
    it('should export useIAP hook', () => {
      expect(RNIap.useIAP).toBeDefined();
      expect(typeof RNIap.useIAP).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should export ErrorCode enum', () => {
      expect(RNIap.ErrorCode).toBeDefined();
      expect(RNIap.ErrorCode.Unknown).toBeDefined();
      expect(RNIap.ErrorCode.UserCancelled).toBeDefined();
      expect(RNIap.ErrorCode.ItemUnavailable).toBeDefined();
      expect(RNIap.ErrorCode.NetworkError).toBeDefined();
      expect(RNIap.ErrorCode.ServiceError).toBeDefined();
      expect(RNIap.ErrorCode.DeveloperError).toBeDefined();
    });

    it('should export parseErrorStringToJsonObj', () => {
      expect(RNIap.parseErrorStringToJsonObj).toBeDefined();
      expect(typeof RNIap.parseErrorStringToJsonObj).toBe('function');
    });

    it('should export isUserCancelledError', () => {
      expect(RNIap.isUserCancelledError).toBeDefined();
      expect(typeof RNIap.isUserCancelledError).toBe('function');
    });

    it('should parse error string to JSON object', () => {
      const errorString = JSON.stringify({
        code: 'E_USER_CANCELLED',
        message: 'User cancelled',
      });
      const parsed = RNIap.parseErrorStringToJsonObj(errorString);
      expect(parsed.code).toBe('E_USER_CANCELLED');
      expect(parsed.message).toBe('User cancelled');
    });

    it('should identify user cancelled errors', () => {
      const cancelledError = {code: 'E_USER_CANCELLED', message: 'Cancelled'};
      const otherError = {code: 'E_UNKNOWN', message: 'Unknown'};

      expect(RNIap.isUserCancelledError(cancelledError)).toBe(true);
      expect(RNIap.isUserCancelledError(otherError)).toBe(false);
    });
  });
});
