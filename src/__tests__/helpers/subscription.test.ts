import {
  getActiveSubscriptions,
  hasActiveSubscriptions,
} from '../../helpers/subscription';
import {getAvailablePurchases} from '../../';
import type {Purchase} from '../../types';

// Mock the main module
jest.mock('../../', () => ({
  getAvailablePurchases: jest.fn(),
}));

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
      const mockPurchases: Purchase[] = [
        {
          productId: 'subscription1',
          transactionId: 'trans1',
          transactionDate: Date.now(),
          platform: 'ios',
          expirationDateIOS: Date.now() + 86400000, // 1 day from now
          environmentIOS: 'Production',
        } as any,
        {
          productId: 'subscription2',
          transactionId: 'trans2',
          transactionDate: Date.now(),
          platform: 'android',
          autoRenewingAndroid: true,
        } as any,
      ];

      (getAvailablePurchases as jest.Mock).mockResolvedValue(mockPurchases);

      const result = await getActiveSubscriptions();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(
        expect.objectContaining({
          productId: 'subscription1',
          isActive: true,
          expirationDateIOS: expect.any(Number),
          autoRenewingAndroid: undefined,
          environmentIOS: 'Production',
          willExpireSoon: false,
          daysUntilExpirationIOS: expect.any(Number),
        }),
      );
      expect(result[1]).toEqual(
        expect.objectContaining({
          productId: 'subscription2',
          isActive: true,
          expirationDateIOS: null,
          autoRenewingAndroid: true,
          environmentIOS: undefined,
          willExpireSoon: false,
          daysUntilExpirationIOS: undefined,
        }),
      );
    });

    it('should calculate days until expiration correctly for iOS subscriptions', async () => {
      const mockPurchases: Purchase[] = [
        {
          productId: 'subscription1',
          transactionId: 'trans1',
          transactionDate: Date.now(),
          platform: 'ios',
          expirationDateIOS: Date.now() + 3 * 86400000, // 3 days from now
          environmentIOS: 'Production',
        } as any,
        {
          productId: 'subscription2',
          transactionId: 'trans2',
          transactionDate: Date.now(),
          platform: 'ios',
          expirationDateIOS: Date.now() + 10 * 86400000, // 10 days from now
        } as any,
      ];

      (getAvailablePurchases as jest.Mock).mockResolvedValue(mockPurchases);

      const result = await getActiveSubscriptions();

      // Note: willExpireSoon is always false in current implementation
      expect(result).toHaveLength(2);
      expect(result[0]?.willExpireSoon).toBe(false);
      expect(result[0]?.daysUntilExpirationIOS).toBe(3);
      expect(result[1]?.willExpireSoon).toBe(false);
      expect(result[1]?.daysUntilExpirationIOS).toBe(10);
    });

    it('should handle expired iOS subscriptions', async () => {
      const mockPurchases: Purchase[] = [
        {
          productId: 'subscription1',
          transactionId: 'trans1',
          transactionDate: Date.now() - 86400000,
          platform: 'ios',
          expirationDateIOS: Date.now() - 3600000, // 1 hour ago
        } as any,
      ];

      (getAvailablePurchases as jest.Mock).mockResolvedValue(mockPurchases);

      const result = await getActiveSubscriptions();

      expect(result).toHaveLength(1);
      // Note: isActive is always true if purchase is in available purchases
      expect(result[0]?.isActive).toBe(true);
      // The value can be -0 or -1 depending on timing
      expect(result[0]?.daysUntilExpirationIOS).toBeLessThanOrEqual(0);
    });

    it('should handle Android subscriptions with various states', async () => {
      const mockPurchases: Purchase[] = [
        {
          productId: 'subscription1',
          transactionId: 'trans1',
          transactionDate: Date.now(),
          platform: 'android',
          autoRenewingAndroid: true,
        } as any,
        {
          productId: 'subscription2',
          transactionId: 'trans2',
          transactionDate: Date.now(),
          platform: 'android',
          autoRenewingAndroid: false,
        } as any,
        {
          productId: 'subscription3',
          transactionId: 'trans3',
          transactionDate: Date.now(),
          platform: 'android',
          // autoRenewingAndroid is undefined
        } as any,
      ];

      (getAvailablePurchases as jest.Mock).mockResolvedValue(mockPurchases);

      const result = await getActiveSubscriptions();

      expect(result).toHaveLength(3);
      expect(result[0]?.autoRenewingAndroid).toBe(true);
      expect(result[0]?.isActive).toBe(true);
      expect(result[1]?.autoRenewingAndroid).toBe(false);
      expect(result[1]?.isActive).toBe(true);
      expect(result[2]?.autoRenewingAndroid).toBeUndefined();
      expect(result[2]?.isActive).toBe(true);
    });

    it('should handle mixed platform subscriptions', async () => {
      const mockPurchases: Purchase[] = [
        {
          productId: 'ios_sub',
          transactionId: 'trans1',
          transactionDate: Date.now(),
          platform: 'ios',
          expirationDateIOS: Date.now() + 86400000,
          environmentIOS: 'Sandbox',
        } as any,
        {
          productId: 'android_sub',
          transactionId: 'trans2',
          transactionDate: Date.now(),
          platform: 'android',
          autoRenewingAndroid: true,
          packageNameAndroid: 'com.example.app',
        } as any,
      ];

      (getAvailablePurchases as jest.Mock).mockResolvedValue(mockPurchases);

      const result = await getActiveSubscriptions();

      expect(result).toHaveLength(2);
      expect(result.find((s) => s.productId === 'ios_sub')).toBeDefined();
      expect(result.find((s) => s.productId === 'android_sub')).toBeDefined();
    });

    it('should filter subscriptions by provided IDs', async () => {
      const mockPurchases: Purchase[] = [
        {
          productId: 'subscription1',
          transactionId: 'trans1',
          transactionDate: Date.now(),
          platform: 'ios',
        } as any,
        {
          productId: 'subscription2',
          transactionId: 'trans2',
          transactionDate: Date.now(),
          platform: 'ios',
        } as any,
        {
          productId: 'subscription3',
          transactionId: 'trans3',
          transactionDate: Date.now(),
          platform: 'ios',
        } as any,
      ];

      (getAvailablePurchases as jest.Mock).mockResolvedValue(mockPurchases);

      const result = await getActiveSubscriptions([
        'subscription1',
        'subscription3',
      ]);

      expect(result).toHaveLength(2);
      expect(result[0]?.productId).toBe('subscription1');
      expect(result[1]?.productId).toBe('subscription3');
    });

    it('should calculate days until expiration for iOS subscriptions', async () => {
      const futureDate = Date.now() + 5 * 86400000; // 5 days from now
      const mockPurchases: Purchase[] = [
        {
          productId: 'subscription1',
          transactionId: 'trans1',
          transactionDate: Date.now(),
          platform: 'ios',
          expirationDateIOS: futureDate,
        } as any,
      ];

      (getAvailablePurchases as jest.Mock).mockResolvedValue(mockPurchases);

      const result = await getActiveSubscriptions();

      expect(result[0]?.daysUntilExpirationIOS).toBe(5);
    });

    it('should handle errors and rethrow them', async () => {
      const error = new Error('Failed to fetch purchases');
      (getAvailablePurchases as jest.Mock).mockRejectedValue(error);

      await expect(getActiveSubscriptions()).rejects.toThrow(
        'Failed to fetch purchases',
      );
      expect(console.error).toHaveBeenCalledWith(
        'Failed to get active subscriptions:',
        error,
      );
    });

    it('should return empty array when no purchases available', async () => {
      (getAvailablePurchases as jest.Mock).mockResolvedValue([]);

      const result = await getActiveSubscriptions();

      expect(result).toEqual([]);
    });

    it('should handle duplicate subscription IDs in purchases', async () => {
      const mockPurchases: Purchase[] = [
        {
          productId: 'subscription1',
          transactionId: 'trans1',
          transactionDate: Date.now() - 86400000,
          platform: 'ios',
        } as any,
        {
          productId: 'subscription1', // Duplicate ID
          transactionId: 'trans2',
          transactionDate: Date.now(), // Newer transaction
          platform: 'ios',
        } as any,
      ];

      (getAvailablePurchases as jest.Mock).mockResolvedValue(mockPurchases);

      const result = await getActiveSubscriptions();

      // Should return both even if they have the same productId
      expect(result).toHaveLength(2);
      expect(result.every((s) => s.productId === 'subscription1')).toBe(true);
    });

    it('should handle null or undefined expiration dates', async () => {
      const mockPurchases: Purchase[] = [
        {
          productId: 'subscription1',
          transactionId: 'trans1',
          transactionDate: Date.now(),
          platform: 'ios',
          expirationDateIOS: null,
        } as any,
        {
          productId: 'subscription2',
          transactionId: 'trans2',
          transactionDate: Date.now(),
          platform: 'ios',
          expirationDateIOS: undefined,
        } as any,
      ];

      (getAvailablePurchases as jest.Mock).mockResolvedValue(mockPurchases);

      const result = await getActiveSubscriptions();

      expect(result).toHaveLength(2);
      expect(result[0]?.expirationDateIOS).toBeNull();
      expect(result[0]?.daysUntilExpirationIOS).toBeUndefined();
      expect(result[1]?.expirationDateIOS).toBeNull();
      expect(result[1]?.daysUntilExpirationIOS).toBeUndefined();
    });

    it('should handle purchases with missing platform field', async () => {
      const mockPurchases: Purchase[] = [
        {
          productId: 'subscription1',
          transactionId: 'trans1',
          transactionDate: Date.now(),
          // platform field missing
        } as any,
      ];

      (getAvailablePurchases as jest.Mock).mockResolvedValue(mockPurchases);

      const result = await getActiveSubscriptions();

      expect(result).toHaveLength(1);
      expect(result[0]?.isActive).toBe(true);
    });

    it('should handle very large subscription lists efficiently', async () => {
      const largeNumberOfPurchases = Array.from(
        {length: 1000},
        (_, i) =>
          ({
            productId: `subscription${i}`,
            transactionId: `trans${i}`,
            transactionDate: Date.now(),
            platform: i % 2 === 0 ? 'ios' : 'android',
            expirationDateIOS:
              i % 2 === 0 ? Date.now() + i * 86400000 : undefined,
            autoRenewingAndroid: i % 2 === 1 ? true : undefined,
          }) as any,
      );

      (getAvailablePurchases as jest.Mock).mockResolvedValue(
        largeNumberOfPurchases,
      );

      const startTime = Date.now();
      const result = await getActiveSubscriptions();
      const endTime = Date.now();

      expect(result).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle case-sensitive subscription ID filtering', async () => {
      const mockPurchases: Purchase[] = [
        {
          productId: 'Subscription1',
          transactionId: 'trans1',
          transactionDate: Date.now(),
          platform: 'ios',
        } as any,
        {
          productId: 'subscription1',
          transactionId: 'trans2',
          transactionDate: Date.now(),
          platform: 'ios',
        } as any,
      ];

      (getAvailablePurchases as jest.Mock).mockResolvedValue(mockPurchases);

      const result = await getActiveSubscriptions(['subscription1']);

      // Should only match exact case
      expect(result).toHaveLength(1);
      expect(result[0]?.productId).toBe('subscription1');
    });
  });

  describe('hasActiveSubscriptions', () => {
    it('should return true when there are active subscriptions', async () => {
      const mockPurchases: Purchase[] = [
        {
          productId: 'subscription1',
          transactionId: 'trans1',
          transactionDate: Date.now(),
          platform: 'ios',
        } as any,
      ];

      (getAvailablePurchases as jest.Mock).mockResolvedValue(mockPurchases);

      const result = await hasActiveSubscriptions();

      expect(result).toBe(true);
    });

    it('should return false when there are no active subscriptions', async () => {
      (getAvailablePurchases as jest.Mock).mockResolvedValue([]);

      const result = await hasActiveSubscriptions();

      expect(result).toBe(false);
    });

    it('should filter by subscription IDs when checking', async () => {
      const mockPurchases: Purchase[] = [
        {
          productId: 'subscription1',
          transactionId: 'trans1',
          transactionDate: Date.now(),
          platform: 'ios',
        } as any,
        {
          productId: 'subscription2',
          transactionId: 'trans2',
          transactionDate: Date.now(),
          platform: 'ios',
        } as any,
      ];

      (getAvailablePurchases as jest.Mock).mockResolvedValue(mockPurchases);

      const result1 = await hasActiveSubscriptions(['subscription1']);
      expect(result1).toBe(true);

      const result2 = await hasActiveSubscriptions(['subscription3']);
      expect(result2).toBe(false);
    });

    it('should return false and log error when getActiveSubscriptions fails', async () => {
      const error = new Error('Failed to fetch');
      (getAvailablePurchases as jest.Mock).mockRejectedValue(error);

      const result = await hasActiveSubscriptions();

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        'Failed to check active subscriptions:',
        error,
      );
    });

    it('should handle empty subscription ID array', async () => {
      const mockPurchases: Purchase[] = [
        {
          productId: 'subscription1',
          transactionId: 'trans1',
          transactionDate: Date.now(),
          platform: 'ios',
        } as any,
      ];

      (getAvailablePurchases as jest.Mock).mockResolvedValue(mockPurchases);

      // Empty array means no filter, so returns all subscriptions
      const result = await hasActiveSubscriptions([]);

      expect(result).toBe(true);
    });

    it('should return true for expired iOS subscription if purchase exists', async () => {
      const mockPurchases: Purchase[] = [
        {
          productId: 'subscription1',
          transactionId: 'trans1',
          transactionDate: Date.now(),
          platform: 'ios',
          expirationDateIOS: Date.now() - 86400000, // Expired 1 day ago
        } as any,
      ];

      (getAvailablePurchases as jest.Mock).mockResolvedValue(mockPurchases);

      // Should return true even if expired (presence check)
      const result = await hasActiveSubscriptions();

      expect(result).toBe(true);
    });

    it('should handle mixed array of valid and invalid subscription IDs', async () => {
      const mockPurchases: Purchase[] = [
        {
          productId: 'valid_sub',
          transactionId: 'trans1',
          transactionDate: Date.now(),
          platform: 'ios',
        } as any,
      ];

      (getAvailablePurchases as jest.Mock).mockResolvedValue(mockPurchases);

      const result = await hasActiveSubscriptions([
        'valid_sub',
        'invalid_sub',
        'another_invalid',
      ]);

      expect(result).toBe(true); // At least one match found
    });

    it('should handle concurrent calls correctly', async () => {
      const mockPurchases: Purchase[] = [
        {
          productId: 'subscription1',
          transactionId: 'trans1',
          transactionDate: Date.now(),
          platform: 'ios',
        } as any,
      ];

      (getAvailablePurchases as jest.Mock).mockResolvedValue(mockPurchases);

      // Make concurrent calls
      const results = await Promise.all([
        hasActiveSubscriptions(),
        hasActiveSubscriptions(['subscription1']),
        hasActiveSubscriptions(['subscription2']),
      ]);

      expect(results[0]).toBe(true);
      expect(results[1]).toBe(true);
      expect(results[2]).toBe(false);
    });

    it('should handle special characters in subscription IDs', async () => {
      const mockPurchases: Purchase[] = [
        {
          productId: 'sub.premium.monthly',
          transactionId: 'trans1',
          transactionDate: Date.now(),
          platform: 'android',
        } as any,
        {
          productId: 'sub-basic-yearly',
          transactionId: 'trans2',
          transactionDate: Date.now(),
          platform: 'android',
        } as any,
        {
          productId: 'sub_pro_lifetime',
          transactionId: 'trans3',
          transactionDate: Date.now(),
          platform: 'android',
        } as any,
      ];

      (getAvailablePurchases as jest.Mock).mockResolvedValue(mockPurchases);

      const result1 = await hasActiveSubscriptions(['sub.premium.monthly']);
      const result2 = await hasActiveSubscriptions(['sub-basic-yearly']);
      const result3 = await hasActiveSubscriptions(['sub_pro_lifetime']);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(true);
    });

    it('should handle undefined subscription ID parameter', async () => {
      const mockPurchases: Purchase[] = [
        {
          productId: 'subscription1',
          transactionId: 'trans1',
          transactionDate: Date.now(),
          platform: 'ios',
        } as any,
      ];

      (getAvailablePurchases as jest.Mock).mockResolvedValue(mockPurchases);

      // Undefined should check all subscriptions
      const result = await hasActiveSubscriptions(undefined);

      expect(result).toBe(true);
    });

    it('should handle purchases with null productId', async () => {
      const mockPurchases: Purchase[] = [
        {
          productId: null,
          transactionId: 'trans1',
          transactionDate: Date.now(),
          platform: 'ios',
        } as any,
        {
          productId: 'valid_sub',
          transactionId: 'trans2',
          transactionDate: Date.now(),
          platform: 'ios',
        } as any,
      ];

      (getAvailablePurchases as jest.Mock).mockResolvedValue(mockPurchases);

      const result = await hasActiveSubscriptions();

      expect(result).toBe(true); // Should still find valid subscription
    });
  });
});
