import {
  convertNitroProductToProduct,
  convertProductToProductSubscription,
  convertNitroPurchaseToPurchase,
  validateNitroProduct,
  validateNitroPurchase,
  checkTypeSynchronization,
} from '../../utils/type-bridge';
import type {NitroProduct, NitroPurchase} from '../../specs/RnIap.nitro';

describe('type-bridge utilities', () => {
  describe('convertNitroProductToProduct', () => {
    it('converts iOS in-app product', () => {
      const nitroProduct: NitroProduct = {
        id: 'com.example.product',
        title: 'Test Product',
        description: 'Test Description',
        type: 'inapp',
        displayName: 'Display Name',
        displayPrice: '$9.99',
        currency: 'USD',
        price: 9.99,
        platform: 'ios',
        isFamilyShareableIOS: true,
        jsonRepresentationIOS: '{"sku": "com.example.product"}',
        typeIOS: 'consumable',
      } as NitroProduct;

      const result = convertNitroProductToProduct(nitroProduct);

      expect(result.type).toBe('in-app');
      expect(result.platform).toBe('ios');
      expect((result as any).displayNameIOS).toBe('Display Name');
      expect((result as any).isFamilyShareableIOS).toBe(true);
      expect((result as any).typeIOS).toBe('consumable');
    });

    it('converts iOS subscription fields with enums', () => {
      const nitroProduct: NitroProduct = {
        id: 'com.example.subscription',
        title: 'Premium',
        description: 'Premium plan',
        type: 'subs',
        displayName: 'Premium Display',
        displayPrice: '$4.99',
        currency: 'USD',
        price: 4.99,
        platform: 'ios',
        typeIOS: 'autoRenewableSubscription',
        introductoryPriceSubscriptionPeriodIOS: 'MONTH',
        subscriptionPeriodUnitIOS: 'YEAR',
      } as NitroProduct;

      const result = convertNitroProductToProduct(nitroProduct) as any;

      expect(result.type).toBe('subs');
      expect(result.typeIOS).toBe('auto-renewable-subscription');
      expect(result.introductoryPriceSubscriptionPeriodIOS).toBe('month');
      expect(result.subscriptionPeriodUnitIOS).toBe('year');
    });

    it('converts Android subscription and parses offer details', () => {
      const nitroProduct: NitroProduct = {
        id: 'com.example.android.subs',
        title: 'Android Sub',
        description: 'Android subscription',
        type: 'subs',
        displayName: 'Android Display',
        displayPrice: '$2.99',
        currency: 'USD',
        price: 2.99,
        platform: 'android',
        subscriptionOfferDetailsAndroid: JSON.stringify([
          {
            basePlanId: 'base',
            offerId: 'offer',
            offerToken: 'token',
            offerTags: ['tag'],
            pricingPhases: {
              pricingPhaseList: [
                {
                  formattedPrice: '$2.99',
                  priceCurrencyCode: 'USD',
                  billingPeriod: 'P1M',
                  billingCycleCount: 1,
                  priceAmountMicros: '2990000',
                  recurrenceMode: 1,
                },
              ],
            },
          },
        ]),
      } as NitroProduct;

      const result = convertNitroProductToProduct(nitroProduct) as any;

      expect(result.type).toBe('subs');
      expect(result.platform).toBe('android');
      expect(Array.isArray(result.subscriptionOfferDetailsAndroid)).toBe(true);
      expect(result.subscriptionOfferDetailsAndroid[0].offerToken).toBe(
        'token',
      );
    });
  });

  describe('convertProductToProductSubscription', () => {
    it('preserves subscription type', () => {
      const product = {
        id: 'sub',
        title: 'Subscription',
        description: 'Desc',
        type: 'subs',
        displayPrice: '$1.99',
        currency: 'USD',
        platform: 'android',
        subscriptionOfferDetailsAndroid: [],
      } as any;

      const subscription = convertProductToProductSubscription(product);
      expect(subscription.type).toBe('subs');
    });
  });

  describe('convertNitroPurchaseToPurchase', () => {
    it('converts iOS purchases with enums', () => {
      const nitroPurchase: NitroPurchase = {
        id: 'tx-ios',
        productId: 'sku-ios',
        transactionDate: 123,
        purchaseToken: 'token-ios',
        platform: 'ios',
        quantity: 1,
        purchaseState: 'purchased',
        isAutoRenewing: false,
      };

      const result = convertNitroPurchaseToPurchase(nitroPurchase);
      expect(result.platform).toBe('ios');
      expect(result.purchaseState).toBe('purchased');
    });

    it('converts Android purchases and maps purchase state', () => {
      const nitroPurchase: NitroPurchase = {
        id: 'tx-android',
        productId: 'sku-android',
        transactionDate: 456,
        purchaseTokenAndroid: 'token-android',
        platform: 'android',
        quantity: 1,
        purchaseState: 'unknown',
        purchaseStateAndroid: 1,
        isAutoRenewing: true,
      } as NitroPurchase;

      const result = convertNitroPurchaseToPurchase(nitroPurchase) as any;
      expect(result.platform).toBe('android');
      expect(result.purchaseState).toBe('purchased');
      expect(result.autoRenewingAndroid).toBe(true);
    });
  });

  describe('validation helpers', () => {
    it('validates NitroProduct shape', () => {
      const valid = validateNitroProduct({
        id: 'id',
        title: 'title',
        description: 'desc',
        type: 'inapp',
        platform: 'ios',
      } as NitroProduct);

      const invalid = validateNitroProduct({
        title: 'missing fields',
      } as NitroProduct);

      expect(valid).toBe(true);
      expect(invalid).toBe(false);
    });

    it('validates NitroPurchase shape', () => {
      const valid = validateNitroPurchase({
        id: 'id',
        productId: 'sku',
        transactionDate: 1,
        platform: 'ios',
      } as NitroPurchase);

      const invalid = validateNitroPurchase({
        productId: 'sku',
      } as NitroPurchase);

      expect(valid).toBe(true);
      expect(invalid).toBe(false);
    });
  });

  it('keeps type synchronization healthy', () => {
    const result = checkTypeSynchronization();
    expect(result.isSync).toBe(true);
  });
});
