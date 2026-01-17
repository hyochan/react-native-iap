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

    it('converts iOS subscription with standardized subscriptionOffers', () => {
      const nitroProduct: NitroProduct = {
        id: 'com.example.ios.subs',
        title: 'Premium',
        description: 'Premium subscription',
        type: 'subs',
        displayName: 'Premium Display',
        displayPrice: '$4.99',
        currency: 'USD',
        price: 4.99,
        platform: 'ios',
        typeIOS: 'autoRenewableSubscription',
        subscriptionOffers: JSON.stringify([
          {
            id: 'intro_weekly',
            displayPrice: 'Free',
            price: 0,
            type: 'introductory',
            paymentMode: 'free-trial',
            periodCount: 1,
            period: {
              unit: 'week',
              value: 1,
            },
          },
          {
            id: 'promo_20off',
            displayPrice: '$3.99',
            price: 3.99,
            type: 'promotional',
            paymentMode: 'pay-as-you-go',
            periodCount: 3,
            period: {
              unit: 'month',
              value: 1,
            },
          },
        ]),
      } as NitroProduct;

      const result = convertNitroProductToProduct(nitroProduct) as any;

      expect(result.type).toBe('subs');
      expect(result.platform).toBe('ios');
      expect(Array.isArray(result.subscriptionOffers)).toBe(true);
      expect(result.subscriptionOffers.length).toBe(2);
      expect(result.subscriptionOffers[0].id).toBe('intro_weekly');
      expect(result.subscriptionOffers[0].type).toBe('introductory');
      expect(result.subscriptionOffers[0].paymentMode).toBe('free-trial');
      expect(result.subscriptionOffers[1].id).toBe('promo_20off');
      expect(result.subscriptionOffers[1].type).toBe('promotional');
    });

    it('converts Android subscription with standardized subscriptionOffers', () => {
      const nitroProduct: NitroProduct = {
        id: 'com.example.android.subs',
        title: 'Premium',
        description: 'Premium subscription',
        type: 'subs',
        displayName: 'Premium Display',
        displayPrice: '$4.99',
        currency: 'USD',
        price: 4.99,
        platform: 'android',
        subscriptionOffers: JSON.stringify([
          {
            id: 'base-monthly',
            displayPrice: '$4.99',
            price: 4.99,
            type: 'introductory',
            basePlanIdAndroid: 'monthly',
            offerTokenAndroid: 'token123',
            offerTagsAndroid: ['monthly', 'default'],
            paymentMode: 'pay-as-you-go',
            period: {
              unit: 'month',
              value: 1,
            },
            pricingPhasesAndroid: {
              pricingPhaseList: [
                {
                  formattedPrice: '$4.99',
                  priceAmountMicros: '4990000',
                  priceCurrencyCode: 'USD',
                  billingPeriod: 'P1M',
                  billingCycleCount: 0,
                  recurrenceMode: 2,
                },
              ],
            },
          },
        ]),
      } as NitroProduct;

      const result = convertNitroProductToProduct(nitroProduct) as any;

      expect(result.type).toBe('subs');
      expect(result.platform).toBe('android');
      expect(Array.isArray(result.subscriptionOffers)).toBe(true);
      expect(result.subscriptionOffers[0].basePlanIdAndroid).toBe('monthly');
      expect(result.subscriptionOffers[0].offerTokenAndroid).toBe('token123');
    });

    it('converts Android product with standardized discountOffers', () => {
      const nitroProduct: NitroProduct = {
        id: 'com.example.android.otp',
        title: 'Item Pack',
        description: 'One-time purchase item pack',
        type: 'inapp',
        displayName: 'Item Pack Display',
        displayPrice: '$9.99',
        currency: 'USD',
        price: 9.99,
        platform: 'android',
        discountOffers: JSON.stringify([
          {
            id: 'discount_50off',
            currency: 'USD',
            displayPrice: '$4.99',
            price: 4.99,
            offerTokenAndroid: 'discount_token123',
            offerTagsAndroid: ['sale', 'limited'],
            discountAmountMicrosAndroid: '5000000',
            formattedDiscountAmountAndroid: '$5.00 OFF',
            fullPriceMicrosAndroid: '9990000',
          },
        ]),
      } as NitroProduct;

      const result = convertNitroProductToProduct(nitroProduct) as any;

      expect(result.type).toBe('in-app');
      expect(result.platform).toBe('android');
      expect(Array.isArray(result.discountOffers)).toBe(true);
      expect(result.discountOffers[0].id).toBe('discount_50off');
      expect(result.discountOffers[0].discountAmountMicrosAndroid).toBe(
        '5000000',
      );
      expect(result.discountOffers[0].formattedDiscountAmountAndroid).toBe(
        '$5.00 OFF',
      );
    });

    it('handles missing subscriptionOffers gracefully', () => {
      const nitroProduct: NitroProduct = {
        id: 'com.example.product',
        title: 'Test Product',
        description: 'Test Description',
        type: 'subs',
        platform: 'ios',
      } as NitroProduct;

      const result = convertNitroProductToProduct(nitroProduct) as any;

      expect(result.subscriptionOffers).toBeNull();
      expect(result.discountOffers).toBeNull();
    });

    it('handles invalid JSON in subscriptionOffers gracefully for Android subscription', () => {
      const nitroProduct: NitroProduct = {
        id: 'com.example.product',
        title: 'Test Product',
        description: 'Test Description',
        type: 'subs',
        platform: 'android',
        subscriptionOffers: 'invalid json{',
      } as NitroProduct;

      const result = convertNitroProductToProduct(nitroProduct) as any;

      // Android subscription type requires non-nullable subscriptionOffers, so it defaults to empty array
      expect(result.subscriptionOffers).toEqual([]);
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
        store: 'apple',
        quantity: 1,
        purchaseState: 'purchased',
        isAutoRenewing: false,
      };

      const result = convertNitroPurchaseToPurchase(nitroPurchase);
      expect(result.platform).toBe('ios');
      expect(result.purchaseState).toBe('purchased');
    });

    it('normalizes restored purchases to purchased state', () => {
      // Test legacy 'restored' state from native layer (not part of PurchaseState type)
      const nitroPurchase = {
        id: 'tx-restored',
        productId: 'sku-ios',
        transactionDate: 123,
        purchaseToken: 'token-ios',
        platform: 'ios',
        store: 'apple',
        quantity: 1,
        purchaseState: 'restored', // Legacy value from native
        isAutoRenewing: false,
      } as unknown as NitroPurchase;

      const result = convertNitroPurchaseToPurchase(nitroPurchase);
      expect(result.purchaseState).toBe('purchased');
    });

    it('normalizes deferred purchases to pending state', () => {
      // Test legacy 'deferred' state from native layer (not part of PurchaseState type)
      const nitroPurchase = {
        id: 'tx-deferred',
        productId: 'sku-ios',
        transactionDate: 123,
        purchaseToken: 'token-ios',
        platform: 'ios',
        store: 'apple',
        quantity: 1,
        purchaseState: 'deferred', // Legacy value from native
        isAutoRenewing: false,
      } as unknown as NitroPurchase;

      const result = convertNitroPurchaseToPurchase(nitroPurchase);
      expect(result.purchaseState).toBe('pending');
    });

    it('converts Android purchases and maps purchase state', () => {
      const nitroPurchase: NitroPurchase = {
        id: 'tx-android',
        productId: 'sku-android',
        transactionDate: 456,
        purchaseTokenAndroid: 'token-android',
        platform: 'android',
        store: 'google',
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
