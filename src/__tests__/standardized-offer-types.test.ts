/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * Tests for standardized offer types and the input field naming convention.
 *
 * Key principle tested here:
 * - Response types (DiscountOffer, SubscriptionOffer, etc.) use Android suffix for platform-specific fields
 * - Input types (RequestPurchaseAndroidProps) do NOT use Android suffix since the parent type indicates platform
 *
 * Example:
 * - Response: DiscountOffer.offerTokenAndroid (suffix because it's cross-platform type)
 * - Input: RequestPurchaseAndroidProps.offerToken (no suffix, parent type is Android-specific)
 */

import type {
  DiscountOffer,
  SubscriptionOffer,
  ProductAndroid,
  ProductSubscriptionAndroid,
  RequestPurchaseAndroidProps,
} from '../types';

describe('Standardized Offer Types', () => {
  describe('DiscountOffer', () => {
    it('should have correct structure with Android-specific fields', () => {
      const discountOffer: DiscountOffer = {
        id: 'summer_sale_2025',
        displayPrice: '$4.99',
        price: 4.99,
        currency: 'USD',
        type: 'one-time',
        offerTokenAndroid: 'token_abc123',
        offerTagsAndroid: ['summer', 'sale'],
        fullPriceMicrosAndroid: '9990000',
        percentageDiscountAndroid: 50,
        discountAmountMicrosAndroid: '4990000',
        formattedDiscountAmountAndroid: '$5.00 OFF',
        validTimeWindowAndroid: {
          startTimeMillis: '1704067200000',
          endTimeMillis: '1735689599000',
        },
        limitedQuantityInfoAndroid: {
          maximumQuantity: 3,
          remainingQuantity: 2,
        },
      };

      expect(discountOffer.id).toBe('summer_sale_2025');
      expect(discountOffer.displayPrice).toBe('$4.99');
      expect(discountOffer.price).toBe(4.99);
      expect(discountOffer.currency).toBe('USD');
      expect(discountOffer.type).toBe('one-time');
      expect(discountOffer.offerTokenAndroid).toBe('token_abc123');
      expect(discountOffer.offerTagsAndroid).toEqual(['summer', 'sale']);
      expect(discountOffer.fullPriceMicrosAndroid).toBe('9990000');
      expect(discountOffer.percentageDiscountAndroid).toBe(50);
      expect(discountOffer.validTimeWindowAndroid?.startTimeMillis).toBe(
        '1704067200000',
      );
      expect(discountOffer.limitedQuantityInfoAndroid?.maximumQuantity).toBe(3);
    });

    it('should support all DiscountOfferType values', () => {
      const introductory: DiscountOffer = {
        displayPrice: '$0.99',
        price: 0.99,
        currency: 'USD',
        type: 'introductory',
      };

      const promotional: DiscountOffer = {
        displayPrice: '$1.99',
        price: 1.99,
        currency: 'USD',
        type: 'promotional',
      };

      const oneTime: DiscountOffer = {
        displayPrice: '$2.99',
        price: 2.99,
        currency: 'USD',
        type: 'one-time',
      };

      expect(introductory.type).toBe('introductory');
      expect(promotional.type).toBe('promotional');
      expect(oneTime.type).toBe('one-time');
    });
  });

  describe('SubscriptionOffer', () => {
    it('should have correct structure with cross-platform fields', () => {
      const subscriptionOffer: SubscriptionOffer = {
        id: 'intro_monthly',
        displayPrice: '$0.00',
        price: 0,
        currency: 'USD',
        type: 'introductory',
        paymentMode: 'free-trial',
        period: {unit: 'week', value: 1},
        periodCount: 1,
        basePlanIdAndroid: 'monthly_base',
        offerTokenAndroid: 'offer_token_abc',
        offerTagsAndroid: ['trial'],
      };

      expect(subscriptionOffer.id).toBe('intro_monthly');
      expect(subscriptionOffer.displayPrice).toBe('$0.00');
      expect(subscriptionOffer.price).toBe(0);
      expect(subscriptionOffer.paymentMode).toBe('free-trial');
      expect(subscriptionOffer.period?.unit).toBe('week');
      expect(subscriptionOffer.period?.value).toBe(1);
      expect(subscriptionOffer.periodCount).toBe(1);
      expect(subscriptionOffer.basePlanIdAndroid).toBe('monthly_base');
      expect(subscriptionOffer.offerTokenAndroid).toBe('offer_token_abc');
    });

    it('should support iOS-specific fields', () => {
      const iosOffer: SubscriptionOffer = {
        id: 'promo_ios',
        displayPrice: '$4.99',
        price: 4.99,
        type: 'promotional',
        keyIdentifierIOS: 'key_123',
        nonceIOS: 'uuid-nonce-456',
        signatureIOS: 'signature_base64',
        timestampIOS: 1704067200000,
        numberOfPeriodsIOS: 3,
        localizedPriceIOS: '$4.99',
      };

      expect(iosOffer.keyIdentifierIOS).toBe('key_123');
      expect(iosOffer.nonceIOS).toBe('uuid-nonce-456');
      expect(iosOffer.signatureIOS).toBe('signature_base64');
      expect(iosOffer.timestampIOS).toBe(1704067200000);
      expect(iosOffer.numberOfPeriodsIOS).toBe(3);
    });

    it('should support all PaymentMode values', () => {
      const freeTrial: SubscriptionOffer = {
        id: 'trial',
        displayPrice: '$0.00',
        price: 0,
        type: 'introductory',
        paymentMode: 'free-trial',
      };

      const payAsYouGo: SubscriptionOffer = {
        id: 'payg',
        displayPrice: '$2.99',
        price: 2.99,
        type: 'introductory',
        paymentMode: 'pay-as-you-go',
      };

      const payUpFront: SubscriptionOffer = {
        id: 'upfront',
        displayPrice: '$9.99',
        price: 9.99,
        type: 'introductory',
        paymentMode: 'pay-up-front',
      };

      const unknown: SubscriptionOffer = {
        id: 'unknown',
        displayPrice: '$0.00',
        price: 0,
        type: 'introductory',
        paymentMode: 'unknown',
      };

      expect(freeTrial.paymentMode).toBe('free-trial');
      expect(payAsYouGo.paymentMode).toBe('pay-as-you-go');
      expect(payUpFront.paymentMode).toBe('pay-up-front');
      expect(unknown.paymentMode).toBe('unknown');
    });

    it('should support pricingPhasesAndroid', () => {
      const offerWithPhases: SubscriptionOffer = {
        id: 'offer_with_phases',
        displayPrice: '$0.00',
        price: 0,
        type: 'introductory',
        pricingPhasesAndroid: {
          pricingPhaseList: [
            {
              billingCycleCount: 0,
              billingPeriod: 'P1W',
              formattedPrice: '$0.00',
              priceAmountMicros: '0',
              priceCurrencyCode: 'USD',
              recurrenceMode: 3,
            },
            {
              billingCycleCount: 0,
              billingPeriod: 'P1M',
              formattedPrice: '$9.99',
              priceAmountMicros: '9990000',
              priceCurrencyCode: 'USD',
              recurrenceMode: 1,
            },
          ],
        },
      };

      const pricingPhases = offerWithPhases.pricingPhasesAndroid;
      expect(pricingPhases).toBeDefined();
      expect(pricingPhases!.pricingPhaseList).toHaveLength(2);
      expect(pricingPhases!.pricingPhaseList[0]!.billingPeriod).toBe('P1W');
      expect(pricingPhases!.pricingPhaseList[0]!.recurrenceMode).toBe(3);
      expect(pricingPhases!.pricingPhaseList[1]!.formattedPrice).toBe('$9.99');
    });
  });

  describe('Product with offer fields', () => {
    it('should have correct type structure for ProductAndroid with discountOffers', () => {
      // This test validates the type structure rather than the API call
      // The actual fetchProducts conversion is tested in index.test.ts
      const mockProduct: ProductAndroid = {
        id: 'test_product',
        title: 'Test Product',
        description: 'A test product',
        displayName: 'Test',
        displayPrice: '$9.99',
        price: 9.99,
        currency: 'USD',
        platform: 'android',
        type: 'in-app',
        nameAndroid: 'Test Product',
        discountOffers: [
          {
            id: 'discount_001',
            displayPrice: '$4.99',
            price: 4.99,
            currency: 'USD',
            type: 'one-time',
            offerTokenAndroid: 'disc_token',
          },
        ],
      };

      const discountOffers = mockProduct.discountOffers;
      expect(discountOffers).toBeDefined();
      expect(discountOffers).toHaveLength(1);
      expect(discountOffers![0]!.id).toBe('discount_001');
      expect(discountOffers![0]!.offerTokenAndroid).toBe('disc_token');
    });

    it('should have correct type structure for ProductSubscriptionAndroid with subscriptionOffers', () => {
      // This test validates the type structure rather than the API call
      // The actual fetchProducts conversion is tested in index.test.ts
      const mockSubscription: ProductSubscriptionAndroid = {
        id: 'subscription_product',
        title: 'Premium Subscription',
        description: 'Monthly premium subscription',
        displayName: 'Premium',
        displayPrice: '$9.99',
        price: 9.99,
        currency: 'USD',
        platform: 'android',
        type: 'subs',
        nameAndroid: 'Premium Subscription',
        subscriptionOfferDetailsAndroid: [],
        subscriptionOffers: [
          {
            id: 'sub_intro',
            displayPrice: '$0.00',
            price: 0,
            type: 'introductory',
            paymentMode: 'free-trial',
            basePlanIdAndroid: 'monthly',
            offerTokenAndroid: 'sub_token',
          },
        ],
      };

      const subscriptionOffers = mockSubscription.subscriptionOffers;
      expect(subscriptionOffers).toBeDefined();
      expect(subscriptionOffers).toHaveLength(1);
      expect(subscriptionOffers![0]!.id).toBe('sub_intro');
      expect(subscriptionOffers![0]!.paymentMode).toBe('free-trial');
      expect(subscriptionOffers![0]!.basePlanIdAndroid).toBe('monthly');
      expect(subscriptionOffers![0]!.offerTokenAndroid).toBe('sub_token');
    });
  });

  describe('Building purchase request with subscriptionOffers', () => {
    it('should extract offerTokenAndroid for purchase request', () => {
      const subscriptionOffers: SubscriptionOffer[] = [
        {
          id: 'offer1',
          displayPrice: '$0.00',
          price: 0,
          type: 'introductory',
          paymentMode: 'free-trial',
          basePlanIdAndroid: 'monthly',
          offerTokenAndroid: 'token_1',
        },
        {
          id: 'offer2',
          displayPrice: '$4.99',
          price: 4.99,
          type: 'promotional',
          basePlanIdAndroid: 'yearly',
          offerTokenAndroid: 'token_2',
        },
      ];

      // Simulate building purchase request
      const offers = subscriptionOffers
        .filter((offer) => offer.offerTokenAndroid)
        .map((offer) => ({
          sku: 'premium_sub',
          offerToken: offer.offerTokenAndroid!,
        }));

      expect(offers).toHaveLength(2);
      expect(offers[0]).toEqual({sku: 'premium_sub', offerToken: 'token_1'});
      expect(offers[1]).toEqual({sku: 'premium_sub', offerToken: 'token_2'});
    });

    it('should filter out offers without offerTokenAndroid', () => {
      const subscriptionOffers: SubscriptionOffer[] = [
        {
          id: 'ios_offer',
          displayPrice: '$4.99',
          price: 4.99,
          type: 'promotional',
          // No offerTokenAndroid - iOS only
          keyIdentifierIOS: 'key_123',
          signatureIOS: 'sig_abc',
        },
        {
          id: 'android_offer',
          displayPrice: '$0.00',
          price: 0,
          type: 'introductory',
          offerTokenAndroid: 'token_android',
        },
      ];

      const androidOffers = subscriptionOffers
        .filter((offer) => offer.offerTokenAndroid)
        .map((offer) => ({
          sku: 'sub_id',
          offerToken: offer.offerTokenAndroid!,
        }));

      expect(androidOffers).toHaveLength(1);
      expect(androidOffers[0]!.offerToken).toBe('token_android');
    });
  });

  describe('RequestPurchaseAndroidProps with offerToken', () => {
    it('should support offerToken for one-time purchase discounts', () => {
      // This tests the type structure for one-time purchase discount offers
      // introduced in Google Play Billing Library 7.0
      // Note: Input fields no longer have Android suffix (parent type indicates platform)
      const purchaseRequest: RequestPurchaseAndroidProps = {
        skus: ['premium_upgrade'],
        offerToken: 'discount_offer_token_abc123',
        isOfferPersonalized: false,
        obfuscatedAccountId: 'account_123',
        obfuscatedProfileId: 'profile_456',
      };

      expect(purchaseRequest.skus).toEqual(['premium_upgrade']);
      expect(purchaseRequest.offerToken).toBe('discount_offer_token_abc123');
      expect(purchaseRequest.isOfferPersonalized).toBe(false);
      expect(purchaseRequest.obfuscatedAccountId).toBe('account_123');
      expect(purchaseRequest.obfuscatedProfileId).toBe('profile_456');
    });

    it('should allow offerToken to be optional', () => {
      const purchaseRequestWithoutOffer: RequestPurchaseAndroidProps = {
        skus: ['regular_product'],
        // No offerToken - regular purchase without discount
      };

      expect(purchaseRequestWithoutOffer.skus).toEqual(['regular_product']);
      expect(purchaseRequestWithoutOffer).not.toHaveProperty('offerToken');
    });

    it('should extract offerTokenAndroid from DiscountOffer for purchase input', () => {
      // Simulate getting a product with discount offers
      // Note: Response types (DiscountOffer) keep Android suffix
      const discountOffer: DiscountOffer = {
        id: 'flash_sale',
        displayPrice: '$2.99',
        price: 2.99,
        currency: 'USD',
        type: 'one-time',
        offerTokenAndroid: 'flash_sale_token_xyz',
        percentageDiscountAndroid: 50,
      };

      // Build purchase request using the offer token from the discount offer
      // Input field uses offerToken (no suffix), value comes from response's offerTokenAndroid
      const purchaseRequest: RequestPurchaseAndroidProps = {
        skus: ['premium_upgrade'],
        offerToken: discountOffer.offerTokenAndroid ?? undefined,
      };

      expect(purchaseRequest.offerToken).toBe('flash_sale_token_xyz');
      expect(purchaseRequest.offerToken).toBe(discountOffer.offerTokenAndroid);
    });

    it('should support isOfferPersonalized for EU compliance', () => {
      // isOfferPersonalized indicates when the price was customized for this user
      // Required for EU Digital Services Act compliance
      // Note: Input field uses isOfferPersonalized (no Android suffix)
      const personalizedRequest: RequestPurchaseAndroidProps = {
        skus: ['premium_product'],
        isOfferPersonalized: true,
      };

      const nonPersonalizedRequest: RequestPurchaseAndroidProps = {
        skus: ['premium_product'],
        isOfferPersonalized: false,
      };

      expect(personalizedRequest.isOfferPersonalized).toBe(true);
      expect(nonPersonalizedRequest.isOfferPersonalized).toBe(false);
    });

    it('should combine discountOffers offerTokenAndroid with purchase request', () => {
      // Full workflow: product → discount offer → purchase request
      // Response type (ProductAndroid.discountOffers) uses offerTokenAndroid
      // Input type (purchase request) uses offerToken (no suffix)
      const mockProduct: ProductAndroid = {
        id: 'consumable_gems',
        title: '100 Gems',
        description: 'A pack of 100 gems',
        displayName: 'Gems Pack',
        displayPrice: '$4.99',
        price: 4.99,
        currency: 'USD',
        platform: 'android',
        type: 'in-app',
        nameAndroid: '100 Gems',
        discountOffers: [
          {
            id: 'summer_sale',
            displayPrice: '$2.49',
            price: 2.49,
            currency: 'USD',
            type: 'one-time',
            offerTokenAndroid: 'summer_sale_offer_token', // Response field keeps suffix
            percentageDiscountAndroid: 50,
          },
        ],
      };

      // Get the offer token from product's discount offers (response field has suffix)
      const discountOffers = mockProduct.discountOffers;
      expect(discountOffers).toBeDefined();
      const selectedOffer = discountOffers![0]!;
      const offerTokenValue = selectedOffer.offerTokenAndroid;

      // Create purchase request with the offer token (input field has no suffix)
      const purchaseRequest: RequestPurchaseAndroidProps = {
        skus: [mockProduct.id],
        offerToken: offerTokenValue ?? undefined, // Input field: no suffix
      };

      expect(purchaseRequest.skus).toEqual(['consumable_gems']);
      expect(purchaseRequest.offerToken).toBe('summer_sale_offer_token');
    });
  });
});
