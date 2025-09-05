import { Platform } from 'react-native'
import {
  convertNitroProductToProduct,
  convertProductToSubscriptionProduct,
  convertNitroPurchaseToPurchase,
  validateNitroProduct,
  validateNitroPurchase,
} from '../../utils/type-bridge'
import type { NitroProduct, NitroPurchase } from '../../specs/RnIap.nitro'
import type { Product } from '../../types'

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios),
  },
}))

describe('type-bridge utilities', () => {
  describe('convertNitroProductToProduct', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should convert basic NitroProduct fields for iOS', () => {
      ;(Platform.OS as any) = 'ios'

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
        jsonRepresentationIOS: '{"test": "data"}',
      } as NitroProduct

      const result = convertNitroProductToProduct(nitroProduct)

      expect(result.id).toBe('com.example.product')
      expect(result.title).toBe('Test Product')
      expect(result.description).toBe('Test Description')
      expect(result.type).toBe('inapp')
      expect(result.displayName).toBe('Display Name')
      expect(result.displayPrice).toBe('$9.99')
      expect(result.currency).toBe('USD')
      expect(result.price).toBe(9.99)
      expect(result.platform).toBe('ios')
      expect((result as any).isFamilyShareable).toBe(true)
      expect((result as any).jsonRepresentation).toBe('{"test": "data"}')
    })

    it('should convert basic NitroProduct fields for Android', () => {
      ;(Platform.OS as any) = 'android'

      const nitroProduct: NitroProduct = {
        id: 'com.example.product',
        title: 'Test Product',
        description: 'Test Description',
        type: 'subs',
        displayName: 'Display Name',
        displayPrice: '$9.99',
        currency: 'USD',
        price: 9.99,
        platform: 'android',
        oneTimePurchaseOfferDetailsAndroid: { token: 'test-token' },
        installmentPlanDetailsAndroid: { commitmentPaymentsCount: 3 },
        subscriptionOfferDetailsAndroid: JSON.stringify([
          { offerId: 'offer1' },
        ]),
      } as NitroProduct

      const result = convertNitroProductToProduct(nitroProduct)

      expect(result.id).toBe('com.example.product')
      expect(result.platform).toBe('android')
      // These fields are created by the converter as flattened fields
      expect((result as any).oneTimePurchaseOfferFormattedPrice).toBe('$9.99')
      expect((result as any).oneTimePurchaseOfferPriceCurrencyCode).toBe('USD')
      expect((result as any).subscriptionOfferDetailsAndroid).toEqual([
        { offerId: 'offer1' },
      ])
    })

    it('should handle null/undefined optional fields', () => {
      const nitroProduct: NitroProduct = {
        id: 'com.example.product',
        title: 'Test Product',
        description: 'Test Description',
        type: 'inapp',
        displayName: 'Display Name',
        displayPrice: null as any,
        currency: undefined as any,
        price: 9.99,
        platform: 'ios',
      } as NitroProduct

      const result = convertNitroProductToProduct(nitroProduct)

      expect(result.displayPrice).toBe('')
      expect(result.currency).toBe('')
    })
  })

  describe('convertProductToSubscriptionProduct', () => {
    it('should convert Product to SubscriptionProduct for iOS', () => {
      ;(Platform.OS as any) = 'ios'

      const product: Product = {
        id: 'com.example.subscription',
        title: 'Test Subscription',
        description: 'Test Description',
        type: 'subs',
        displayName: 'Display Name',
        displayPrice: '$9.99',
        currency: 'USD',
        price: 9.99,
        platform: 'ios',
      } as Product

      const result = convertProductToSubscriptionProduct(product)

      expect(result.type).toBe('subs')
      expect(result.id).toBe('com.example.subscription')
    })

    it('should warn for non-subscription products', () => {
      const product: Product = {
        id: 'com.example.product',
        type: 'inapp',
      } as Product

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation()
      const result = convertProductToSubscriptionProduct(product)

      expect(warnSpy).toHaveBeenCalledWith(
        'Converting non-subscription product to SubscriptionProduct:',
        'com.example.product'
      )
      expect(result.type).toBe('subs')
      warnSpy.mockRestore()
    })
  })

  describe('convertNitroPurchaseToPurchase', () => {
    it('should convert NitroPurchase for iOS', () => {
      ;(Platform.OS as any) = 'ios'

      const nitroPurchase: NitroPurchase = {
        id: 'purchase123',
        productId: 'com.example.product',
        transactionDate: new Date('2024-01-01').getTime(),
        transactionReceipt: 'receipt-data',
        quantity: 1,
        purchaseState: 'purchased',
        isAutoRenewing: false,
        platform: 'ios',
        appAccountToken: 'app-token',
        verificationResultIOS: 'verified',
      } as NitroPurchase

      const result = convertNitroPurchaseToPurchase(nitroPurchase)

      expect(result.id).toBe('purchase123')
      expect(result.productId).toBe('com.example.product')
      expect(result.transactionDate).toBe(new Date('2024-01-01').getTime())
      expect(result.transactionReceipt).toBe('') // Always set to empty string by converter
      expect(result.platform).toBe('ios')
      expect((result as any).appAccountToken).toBe('app-token')
      // verificationResultIOS is not mapped by the converter
    })

    it('should convert NitroPurchase for Android', () => {
      ;(Platform.OS as any) = 'android'

      const nitroPurchase: NitroPurchase = {
        id: 'purchase123',
        productId: 'com.example.product',
        transactionDate: new Date('2024-01-01').getTime(),
        transactionReceipt: 'receipt-data',
        quantity: 1,
        purchaseState: 'purchased',
        isAutoRenewing: false,
        platform: 'android',
        packageNameAndroid: 'com.example.app',
        purchaseStateAndroid: 1,
        isAcknowledgedAndroid: true,
        purchaseTokenAndroid: 'token123',
      } as NitroPurchase

      const result = convertNitroPurchaseToPurchase(nitroPurchase)

      expect(result.platform).toBe('android')
      expect((result as any).packageNameAndroid).toBe('com.example.app')
      expect(result.purchaseState).toBe('purchased')
      expect((result as any).isAcknowledgedAndroid).toBe(true)
      expect((result as any).purchaseTokenAndroid).toBe('token123')
    })
  })

  describe('validateNitroProduct', () => {
    it('should return true for valid product', () => {
      const product: NitroProduct = {
        id: 'com.example.product',
        title: 'Test Product',
        description: 'Test Description',
        type: 'inapp',
        platform: 'ios',
      } as NitroProduct

      const result = validateNitroProduct(product)
      expect(result).toBe(true)
    })

    it('should return false for null product', () => {
      const result = validateNitroProduct(null as any)
      expect(result).toBe(false)
    })

    it('should return false for product without id', () => {
      const product = {
        title: 'Test Product',
      } as any

      const result = validateNitroProduct(product)
      expect(result).toBe(false)
    })
  })

  describe('validateNitroPurchase', () => {
    it('should return true for valid purchase', () => {
      const purchase: NitroPurchase = {
        id: 'purchase123',
        productId: 'com.example.product',
        transactionDate: Date.now(),
        platform: 'ios',
      } as NitroPurchase

      const result = validateNitroPurchase(purchase)
      expect(result).toBe(true)
    })

    it('should return false for null purchase', () => {
      const result = validateNitroPurchase(null as any)
      expect(result).toBe(false)
    })

    it('should return false for purchase without productId', () => {
      const purchase = {
        id: 'purchase123',
      } as any

      const result = validateNitroPurchase(purchase)
      expect(result).toBe(false)
    })
  })
})
