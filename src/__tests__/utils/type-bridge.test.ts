import { Platform } from 'react-native'
import {
  convertNitroProductToProduct,
  convertProductToSubscriptionProduct,
  convertNitroPurchaseToPurchase,
  validateNitroProduct,
  validateNitroPurchase,
  checkTypeSynchronization,
} from '../../utils/type-bridge'
import type { NitroProduct, NitroPurchase } from '../../specs/RnIap.nitro'
import type { Product } from '../../types'
import { ProductTypeIOS } from '../../types'

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

    it('should convert iOS consumable product type', () => {
      ;(Platform.OS as any) = 'ios'

      const nitroProduct: NitroProduct = {
        id: 'com.example.consumable',
        title: 'Consumable Product',
        description: 'Test Description',
        type: 'inapp',
        displayName: 'Display Name',
        displayPrice: '$0.99',
        currency: 'USD',
        price: 0.99,
        platform: 'ios',
        typeIOS: 'consumable',
      } as NitroProduct

      const result = convertNitroProductToProduct(nitroProduct)
      expect((result as any).typeIOS).toBe(ProductTypeIOS.consumable)
    })

    it('should convert iOS non-consumable product type', () => {
      ;(Platform.OS as any) = 'ios'

      const nitroProduct: NitroProduct = {
        id: 'com.example.nonconsumable',
        title: 'Non-Consumable Product',
        description: 'Test Description',
        type: 'inapp',
        displayName: 'Display Name',
        displayPrice: '$4.99',
        currency: 'USD',
        price: 4.99,
        platform: 'ios',
        typeIOS: 'nonConsumable',
      } as NitroProduct

      const result = convertNitroProductToProduct(nitroProduct)
      expect((result as any).typeIOS).toBe(ProductTypeIOS.nonConsumable)
    })

    it('should convert iOS auto-renewable subscription type', () => {
      ;(Platform.OS as any) = 'ios'

      const nitroProduct: NitroProduct = {
        id: 'com.example.subscription',
        title: 'Premium Subscription',
        description: 'Test Description',
        type: 'subs',
        displayName: 'Display Name',
        displayPrice: '$9.99',
        currency: 'USD',
        price: 9.99,
        platform: 'ios',
        typeIOS: 'autoRenewableSubscription',
      } as NitroProduct

      const result = convertNitroProductToProduct(nitroProduct)
      expect((result as any).typeIOS).toBe(
        ProductTypeIOS.autoRenewableSubscription
      )
    })

    it('should convert iOS non-renewing subscription type', () => {
      ;(Platform.OS as any) = 'ios'

      const nitroProduct: NitroProduct = {
        id: 'com.example.nonrenewing',
        title: 'Non-Renewing Subscription',
        description: 'Test Description',
        type: 'subs',
        displayName: 'Display Name',
        displayPrice: '$19.99',
        currency: 'USD',
        price: 19.99,
        platform: 'ios',
        typeIOS: 'nonRenewingSubscription',
      } as NitroProduct

      const result = convertNitroProductToProduct(nitroProduct)
      expect((result as any).typeIOS).toBe(
        ProductTypeIOS.nonRenewingSubscription
      )
    })

    it('should handle undefined iOS product type', () => {
      ;(Platform.OS as any) = 'ios'

      const nitroProduct: NitroProduct = {
        id: 'com.example.unknown',
        title: 'Unknown Type Product',
        description: 'Test Description',
        type: 'inapp',
        displayName: 'Display Name',
        displayPrice: '$2.99',
        currency: 'USD',
        price: 2.99,
        platform: 'ios',
        typeIOS: 'unknownType',
      } as NitroProduct

      const result = convertNitroProductToProduct(nitroProduct)
      expect((result as any).typeIOS).toBeUndefined()
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

    it('should handle failed JSON parsing for Android subscription offers', () => {
      ;(Platform.OS as any) = 'android'
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

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
        subscriptionOfferDetailsAndroid: 'invalid json {',
      } as NitroProduct

      const result = convertNitroProductToProduct(nitroProduct)

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to parse subscription offer details:',
        expect.any(Error)
      )
      expect((result as any).subscriptionOfferDetailsAndroid).toBe(null)

      consoleWarnSpy.mockRestore()
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
    beforeEach(() => {
      jest.clearAllMocks()
    })

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

    it('should handle purchase with minimal fields', () => {
      ;(Platform.OS as any) = 'ios'

      const nitroPurchase: NitroPurchase = {
        id: 'purchase123',
        productId: 'com.example.product',
        transactionDate: new Date('2024-01-01').getTime(),
        platform: 'ios',
      } as NitroPurchase

      const result = convertNitroPurchaseToPurchase(nitroPurchase)

      expect(result.quantity).toBe(1) // default value
      expect(result.isAutoRenewing).toBe(false) // default value
      expect(result.purchaseState).toBe('unknown') // default from PurchaseState.unknown
    })

    it('should use quantityIOS when available on iOS', () => {
      ;(Platform.OS as any) = 'ios'

      const nitroPurchase: NitroPurchase = {
        id: 'purchase123',
        productId: 'com.example.product',
        transactionDate: new Date('2024-01-01').getTime(),
        platform: 'ios',
        quantityIOS: 5,
        quantity: 1,
      } as NitroPurchase

      const result = convertNitroPurchaseToPurchase(nitroPurchase)

      expect(result.quantity).toBe(5) // Should use quantityIOS value
    })

    it('should map Android purchase state 0 to unknown', () => {
      ;(Platform.OS as any) = 'android'

      const nitroPurchase: NitroPurchase = {
        id: 'purchase123',
        productId: 'com.example.product',
        transactionDate: new Date('2024-01-01').getTime(),
        platform: 'android',
        purchaseStateAndroid: 0,
      } as NitroPurchase

      const result = convertNitroPurchaseToPurchase(nitroPurchase)

      expect(result.purchaseState).toBe('unknown')
    })

    it('should map Android purchase state 2 to pending', () => {
      ;(Platform.OS as any) = 'android'

      const nitroPurchase: NitroPurchase = {
        id: 'purchase123',
        productId: 'com.example.product',
        transactionDate: new Date('2024-01-01').getTime(),
        platform: 'android',
        purchaseStateAndroid: 2,
      } as NitroPurchase

      const result = convertNitroPurchaseToPurchase(nitroPurchase)

      expect(result.purchaseState).toBe('pending')
    })

    it('should handle autoRenewingAndroid fallback to isAutoRenewing', () => {
      ;(Platform.OS as any) = 'android'

      const nitroPurchase: NitroPurchase = {
        id: 'purchase123',
        productId: 'com.example.product',
        transactionDate: new Date('2024-01-01').getTime(),
        platform: 'android',
        isAutoRenewing: true,
        autoRenewingAndroid: undefined,
      } as NitroPurchase

      const result = convertNitroPurchaseToPurchase(nitroPurchase)

      expect((result as any).autoRenewingAndroid).toBe(true)
      expect(result.isAutoRenewing).toBe(true)
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

  describe('checkTypeSynchronization', () => {
    it('should return isSync true for valid type conversion', () => {
      const result = checkTypeSynchronization()
      expect(result.isSync).toBe(true)
      expect(result.issues).toHaveLength(0)
    })
  })
})
