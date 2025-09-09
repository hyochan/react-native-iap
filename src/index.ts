// External dependencies
import { Platform } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'

// Internal modules
import type {
  NitroPurchaseResult,
  RnIap,
  NitroReceiptValidationParams,
  NitroReceiptValidationResultIOS,
  NitroReceiptValidationResultAndroid,
} from './specs/RnIap.nitro'
import type {
  Product,
  Purchase,
  PurchaseAndroid,
  RequestPurchaseProps,
  RequestSubscriptionProps,
  RequestSubscriptionAndroidProps,
  PurchaseOptions,
  FinishTransactionParams,
  ReceiptValidationResultIOS,
  ReceiptValidationResultAndroid,
  RequestPurchaseIosProps,
  RequestPurchaseAndroidProps,
  SubscriptionStatusIOS,
} from './types'
import type { ProductRequest } from './types'
import {
  convertNitroProductToProduct,
  convertNitroPurchaseToPurchase,
  validateNitroProduct,
  validateNitroPurchase,
  convertNitroSubscriptionStatusToSubscriptionStatusIOS,
} from './utils/type-bridge'
import { parseErrorStringToJsonObj } from './utils/error'

// Export all types
export type {
  RnIap,
  NitroProduct,
  NitroPurchase,
  NitroPurchaseResult,
} from './specs/RnIap.nitro'
export * from './types'
export * from './utils/error'

// Types for event listeners
export interface EventSubscription {
  remove(): void
}

// ActiveSubscription and PurchaseError types are already exported via 'export * from ./types'

// Export hooks
export { useIAP } from './hooks/useIAP'

// iOS promoted product aliases for API parity
export const getPromotedProductIOS = async (): Promise<Product | null> =>
  requestPromotedProductIOS()
export const requestPurchaseOnPromotedProductIOS = async (): Promise<void> =>
  buyPromotedProductIOS()

// Restore completed transactions (cross-platform)
export const restorePurchases = async (
  options: PurchaseOptions = {
    alsoPublishToEventListenerIOS: false,
    onlyIncludeActiveItemsIOS: true,
  }
): Promise<Purchase[]> => {
  if (Platform.OS === 'ios') {
    await syncIOS()
  }
  return getAvailablePurchases(options)
}

// Development utilities removed - use type bridge functions directly if needed

// Create the RnIap HybridObject instance (internal use only)
const iap = NitroModules.createHybridObject<RnIap>('RnIap')

/**
 * Initialize connection to the store
 */
export const initConnection = async (): Promise<boolean> => {
  try {
    return await iap.initConnection()
  } catch (error) {
    console.error('Failed to initialize IAP connection:', error)
    throw error
  }
}

/**
 * End connection to the store
 */
export const endConnection = async (): Promise<boolean> => {
  try {
    return await iap.endConnection()
  } catch (error) {
    console.error('Failed to end IAP connection:', error)
    throw error
  }
}

/**
 * Fetch products from the store
 * @param params - Product request configuration
 * @param params.skus - Array of product SKUs to fetch
 * @param params.type - Optional filter: 'inapp' (default) for products, 'subs' for subscriptions, or 'all' for both.
 * @returns Promise<Product[]> - Array of products from the store
 *
 * @example
 * ```typescript
 * // Regular products
 * const products = await fetchProducts({ skus: ['product1', 'product2'] });
 *
 * // Subscriptions
 * const subscriptions = await fetchProducts({ skus: ['sub1', 'sub2'], type: 'subs' });
 * ```
 */
export const fetchProducts = async ({
  skus,
  type = 'inapp',
}: ProductRequest): Promise<Product[]> => {
  try {
    if (!skus || skus.length === 0) {
      throw new Error('No SKUs provided')
    }

    if (type === 'all') {
      const [inappNitro, subsNitro] = await Promise.all([
        iap.fetchProducts(skus, 'inapp'),
        iap.fetchProducts(skus, 'subs'),
      ])
      const allNitro = [...inappNitro, ...subsNitro]
      const validAll = allNitro.filter(validateNitroProduct)
      if (validAll.length !== allNitro.length) {
        console.warn(
          `[fetchProducts] Some products failed validation: ${allNitro.length - validAll.length} invalid`
        )
      }
      return validAll.map(convertNitroProductToProduct)
    }

    const nitroProducts = await iap.fetchProducts(skus, type)

    // Validate and convert NitroProducts to TypeScript Products
    const validProducts = nitroProducts.filter(validateNitroProduct)
    if (validProducts.length !== nitroProducts.length) {
      console.warn(
        `[fetchProducts] Some products failed validation: ${nitroProducts.length - validProducts.length} invalid`
      )
    }

    const typedProducts = validProducts.map(convertNitroProductToProduct)
    return typedProducts
  } catch (error) {
    console.error('[fetchProducts] Failed:', error)
    throw error
  }
}

/**
 * Request a purchase for products or subscriptions
 * @param params - Purchase request configuration
 * @param params.request - Platform-specific purchase parameters
 * @param params.type - Type of purchase: 'inapp' for products (default) or 'subs' for subscriptions
 *
 * @example
 * ```typescript
 * // Product purchase
 * await requestPurchase({
 *   request: {
 *     ios: { sku: productId },
 *     android: { skus: [productId] }
 *   },
 *   type: 'inapp'
 * });
 *
 * // Subscription purchase
 * await requestPurchase({
 *   request: {
 *     ios: { sku: subscriptionId },
 *     android: {
 *       skus: [subscriptionId],
 *       subscriptionOffers: [{ sku: subscriptionId, offerToken: 'token' }]
 *     }
 *   },
 *   type: 'subs'
 * });
 * ```
 */
/**
 * Request a purchase for products or subscriptions
 * ⚠️ Important: This is an event-based operation, not promise-based.
 * Listen for events through purchaseUpdatedListener or purchaseErrorListener.
 * @param params - Purchase request configuration
 * @param params.request - Platform-specific purchase parameters
 * @param params.type - Type of purchase: 'inapp' for products (default) or 'subs' for subscriptions
 */
export const requestPurchase = async ({
  request,
  type = 'inapp',
}: {
  request: RequestPurchaseProps | RequestSubscriptionProps
  type?: 'inapp' | 'subs'
}): Promise<void> => {
  try {
    // Validate platform-specific requests
    if (Platform.OS === 'ios') {
      const iosRequest = request.ios
      if (!iosRequest?.sku) {
        throw new Error(
          'Invalid request for iOS. The `sku` property is required.'
        )
      }
    } else if (Platform.OS === 'android') {
      const androidRequest = request.android
      if (!androidRequest?.skus?.length) {
        throw new Error(
          'Invalid request for Android. The `skus` property is required and must be a non-empty array.'
        )
      }
    } else {
      throw new Error('Unsupported platform')
    }

    // Transform the request for the unified interface
    const unifiedRequest: any = {}

    if (Platform.OS === 'ios' && request.ios) {
      const iosReq = request.ios as RequestPurchaseIosProps
      const autoFinishSubs =
        type === 'subs' &&
        iosReq.andDangerouslyFinishTransactionAutomatically == null
      unifiedRequest.ios = {
        ...iosReq,
        // Align with native SwiftUI flow: auto-finish subscriptions by default
        ...(autoFinishSubs
          ? { andDangerouslyFinishTransactionAutomatically: true }
          : {}),
      } as RequestPurchaseIosProps
    }

    if (Platform.OS === 'android' && request.android) {
      if (type === 'subs') {
        const subsRequest = request.android as RequestSubscriptionAndroidProps
        unifiedRequest.android = {
          ...subsRequest,
          subscriptionOffers: subsRequest.subscriptionOffers || [],
        } as RequestPurchaseAndroidProps
      } else {
        unifiedRequest.android = request.android
      }
    }

    // Call unified method - returns void, listen for events instead
    await iap.requestPurchase(unifiedRequest)
  } catch (error) {
    console.error('Failed to request purchase:', error)
    throw error
  }
}

/**
 * Get available purchases (purchased items not yet consumed/finished)
 * @param params - Options for getting available purchases
 * @param params.alsoPublishToEventListener - Whether to also publish to event listener
 * @param params.onlyIncludeActiveItems - Whether to only include active items
 *
 * @example
 * ```typescript
 * const purchases = await getAvailablePurchases({
 *   onlyIncludeActiveItemsIOS: true
 * });
 * ```
 */
export const getAvailablePurchases = async ({
  alsoPublishToEventListenerIOS = false,
  onlyIncludeActiveItemsIOS = true,
}: PurchaseOptions = {}): Promise<Purchase[]> => {
  try {
    // Create unified options
    const options: any = {}

    if (Platform.OS === 'ios') {
      // Provide both new and deprecated keys for compatibility
      options.ios = {
        alsoPublishToEventListenerIOS,
        onlyIncludeActiveItemsIOS,
        alsoPublishToEventListener: alsoPublishToEventListenerIOS,
        onlyIncludeActiveItems: onlyIncludeActiveItemsIOS,
      }
    } else if (Platform.OS === 'android') {
      // For Android, we need to call twice for inapp and subs
      const inappNitroPurchases = await iap.getAvailablePurchases({
        android: { type: 'inapp' },
      })
      const subsNitroPurchases = await iap.getAvailablePurchases({
        android: { type: 'subs' },
      })

      // Validate and convert both sets of purchases
      const allNitroPurchases = [...inappNitroPurchases, ...subsNitroPurchases]
      const validPurchases = allNitroPurchases.filter(validateNitroPurchase)
      if (validPurchases.length !== allNitroPurchases.length) {
        console.warn(
          `[getAvailablePurchases] Some Android purchases failed validation: ${allNitroPurchases.length - validPurchases.length} invalid`
        )
      }

      return validPurchases.map(convertNitroPurchaseToPurchase)
    } else {
      throw new Error('Unsupported platform')
    }

    const nitroPurchases = await iap.getAvailablePurchases(options)

    // Validate and convert NitroPurchases to TypeScript Purchases
    const validPurchases = nitroPurchases.filter(validateNitroPurchase)
    if (validPurchases.length !== nitroPurchases.length) {
      console.warn(
        `[getAvailablePurchases] Some purchases failed validation: ${nitroPurchases.length - validPurchases.length} invalid`
      )
    }

    return validPurchases.map(convertNitroPurchaseToPurchase)
  } catch (error) {
    console.error('Failed to get available purchases:', error)
    throw error
  }
}

/**
 * Finish a transaction (consume or acknowledge)
 * @param params - Transaction finish parameters
 * @param params.purchase - The purchase to finish
 * @param params.isConsumable - Whether this is a consumable product (Android only)
 *
 * @example
 * ```typescript
 * await finishTransaction({
 *   purchase: myPurchase,
 *   isConsumable: true
 * });
 * ```
 */
export const finishTransaction = async ({
  purchase,
  isConsumable = false,
}: FinishTransactionParams): Promise<NitroPurchaseResult | boolean> => {
  try {
    // Create unified params
    const params: any = {}

    if (Platform.OS === 'ios') {
      if (!purchase.id) {
        throw new Error('purchase.id required to finish iOS transaction')
      }
      params.ios = {
        transactionId: purchase.id,
      }
    } else if (Platform.OS === 'android') {
      const androidPurchase = purchase as PurchaseAndroid
      const token =
        androidPurchase.purchaseToken || androidPurchase.purchaseTokenAndroid

      if (!token) {
        throw new Error('purchaseToken required to finish Android transaction')
      }

      params.android = {
        purchaseToken: token,
        isConsumable,
      }
    } else {
      throw new Error('Unsupported platform')
    }

    const result = await iap.finishTransaction(params)

    // Handle variant return type
    if (typeof result === 'boolean') {
      return result
    }
    // It's a PurchaseResult
    return result as NitroPurchaseResult
  } catch (error) {
    // If iOS transaction has already been auto-finished natively, treat as success
    if (Platform.OS === 'ios') {
      const err = parseErrorStringToJsonObj(error)
      const msg = (err?.message || '').toString()
      const code = (err?.code || '').toString()
      if (
        msg.includes('Transaction not found') ||
        code === 'E_ITEM_UNAVAILABLE'
      ) {
        // Consider already finished
        return true
      }
    }
    console.error('Failed to finish transaction:', error)
    throw error
  }
}

/**
 * Acknowledge a purchase (Android only)
 * @param purchaseToken - The purchase token to acknowledge
 *
 * @example
 * ```typescript
 * await acknowledgePurchaseAndroid('purchase_token_here');
 * ```
 */
export const acknowledgePurchaseAndroid = async (
  purchaseToken: string
): Promise<NitroPurchaseResult> => {
  try {
    if (Platform.OS !== 'android') {
      throw new Error('acknowledgePurchaseAndroid is only available on Android')
    }

    const result = await iap.finishTransaction({
      android: {
        purchaseToken,
        isConsumable: false,
      },
    })

    // Result is a variant, extract PurchaseResult
    if (typeof result === 'boolean') {
      // This shouldn't happen for Android, but handle it
      return {
        responseCode: 0,
        code: '0',
        message: 'Success',
        purchaseToken,
      }
    }
    return result as NitroPurchaseResult
  } catch (error) {
    console.error('Failed to acknowledge purchase Android:', error)
    throw error
  }
}

/**
 * Consume a purchase (Android only)
 * @param purchaseToken - The purchase token to consume
 *
 * @example
 * ```typescript
 * await consumePurchaseAndroid('purchase_token_here');
 * ```
 */
export const consumePurchaseAndroid = async (
  purchaseToken: string
): Promise<NitroPurchaseResult> => {
  try {
    if (Platform.OS !== 'android') {
      throw new Error('consumePurchaseAndroid is only available on Android')
    }

    const result = await iap.finishTransaction({
      android: {
        purchaseToken,
        isConsumable: true,
      },
    })

    // Result is a variant, extract PurchaseResult
    if (typeof result === 'boolean') {
      // This shouldn't happen for Android, but handle it
      return {
        responseCode: 0,
        code: '0',
        message: 'Success',
        purchaseToken,
      }
    }
    return result as NitroPurchaseResult
  } catch (error) {
    console.error('Failed to consume purchase Android:', error)
    throw error
  }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

// Store wrapped listeners for proper removal
const listenerMap = new WeakMap<Function, Function>()

/**
 * Purchase updated event listener
 * Fired when a purchase is successful or when a pending purchase is completed.
 *
 * @param listener - Function to call when a purchase is updated
 * @returns EventSubscription object with remove method
 *
 * @example
 * ```typescript
 * const subscription = purchaseUpdatedListener((purchase) => {
 *   console.log('Purchase successful:', purchase);
 *   // 1. Validate receipt with backend
 *   // 2. Deliver content to user
 *   // 3. Call finishTransaction to acknowledge
 * });
 *
 * // Later, clean up
 * subscription.remove();
 * ```
 */
export const purchaseUpdatedListener = (
  listener: (purchase: Purchase) => void
): EventSubscription => {
  // Wrap the listener to convert NitroPurchase to Purchase
  const wrappedListener = (nitroPurchase: any) => {
    if (validateNitroPurchase(nitroPurchase)) {
      const convertedPurchase = convertNitroPurchaseToPurchase(nitroPurchase)
      listener(convertedPurchase)
    } else {
      console.error(
        'Invalid purchase data received from native:',
        nitroPurchase
      )
    }
  }

  // Store the wrapped listener for removal
  listenerMap.set(listener, wrappedListener)
  iap.addPurchaseUpdatedListener(wrappedListener)

  return {
    remove: () => {
      const wrapped = listenerMap.get(listener)
      if (wrapped) {
        iap.removePurchaseUpdatedListener(wrapped as any)
        listenerMap.delete(listener)
      }
    },
  }
}

/**
 * Purchase error event listener
 * Fired when a purchase fails or is cancelled by the user.
 *
 * @param listener - Function to call when a purchase error occurs
 * @returns EventSubscription object with remove method
 *
 * @example
 * ```typescript
 * const subscription = purchaseErrorListener((error) => {
 *   switch (error.code) {
 *     case 'E_USER_CANCELLED':
 *       // User cancelled - no action needed
 *       break;
 *     case 'E_ITEM_UNAVAILABLE':
 *       // Product not available
 *       break;
 *     case 'E_NETWORK_ERROR':
 *       // Retry with backoff
 *       break;
 *   }
 * });
 *
 * // Later, clean up
 * subscription.remove();
 * ```
 */
export const purchaseErrorListener = (
  listener: (error: NitroPurchaseResult) => void
): EventSubscription => {
  // Store the listener for removal
  listenerMap.set(listener, listener)
  iap.addPurchaseErrorListener(listener as any)

  return {
    remove: () => {
      iap.removePurchaseErrorListener(listener as any)
      listenerMap.delete(listener)
    },
  }
}

/**
 * iOS-only listener for App Store promoted product events.
 * Fired when a user clicks on a promoted in-app purchase in the App Store.
 *
 * @param listener - Callback function that receives the promoted product
 * @returns EventSubscription object with remove method
 *
 * @example
 * ```typescript
 * const subscription = promotedProductListenerIOS((product) => {
 *   console.log('Promoted product:', product);
 *   // Trigger purchase flow for the promoted product
 * });
 *
 * // Later, clean up
 * subscription.remove();
 * ```
 *
 * @platform iOS
 */
export const promotedProductListenerIOS = (
  listener: (product: Product) => void
): EventSubscription => {
  if (Platform.OS !== 'ios') {
    console.warn(
      'promotedProductListenerIOS: This listener is only available on iOS'
    )
    return { remove: () => {} }
  }

  // Wrap the listener to convert NitroProduct to Product
  const wrappedListener = (nitroProduct: any) => {
    if (validateNitroProduct(nitroProduct)) {
      const convertedProduct = convertNitroProductToProduct(nitroProduct)
      listener(convertedProduct)
    } else {
      console.error(
        'Invalid promoted product data received from native:',
        nitroProduct
      )
    }
  }

  // Store the wrapped listener for removal
  listenerMap.set(listener, wrappedListener)
  iap.addPromotedProductListenerIOS(wrappedListener)

  return {
    remove: () => {
      const wrapped = listenerMap.get(listener)
      if (wrapped) {
        iap.removePromotedProductListenerIOS(wrapped as any)
        listenerMap.delete(listener)
      }
    },
  }
}

// ============================================================================
// iOS-SPECIFIC FUNCTIONS
// ============================================================================

/**
 * Validate receipt on both iOS and Android platforms
 * @param sku - Product SKU
 * @param androidOptions - Android-specific validation options (required for Android)
 * @returns Promise<ReceiptValidationResultIOS | ReceiptValidationResultAndroid> - Platform-specific receipt validation result
 */
export const validateReceipt = async (
  sku: string,
  androidOptions?: {
    packageName: string
    productToken: string
    accessToken: string
    isSub?: boolean
  }
): Promise<import('./types').ReceiptValidationResult> => {
  if (!iap) {
    const errorJson = parseErrorStringToJsonObj(
      'RnIap: Service not initialized. Call initConnection() first.'
    )
    throw new Error(errorJson.message)
  }

  try {
    const params: NitroReceiptValidationParams = {
      sku,
      androidOptions,
    }

    const nitroResult = await iap.validateReceipt(params)

    // Convert Nitro result to public API result
    if (Platform.OS === 'ios') {
      const iosResult = nitroResult as NitroReceiptValidationResultIOS
      const result: ReceiptValidationResultIOS = {
        isValid: iosResult.isValid,
        receiptData: iosResult.receiptData,
        jwsRepresentation: iosResult.jwsRepresentation,
        latestTransaction: iosResult.latestTransaction
          ? convertNitroPurchaseToPurchase(iosResult.latestTransaction)
          : undefined,
      }
      return result
    } else {
      // Android
      const androidResult = nitroResult as NitroReceiptValidationResultAndroid
      const result: ReceiptValidationResultAndroid = {
        autoRenewing: androidResult.autoRenewing,
        betaProduct: androidResult.betaProduct,
        cancelDate: androidResult.cancelDate,
        cancelReason: androidResult.cancelReason,
        deferredDate: androidResult.deferredDate,
        deferredSku: androidResult.deferredSku,
        freeTrialEndDate: androidResult.freeTrialEndDate,
        gracePeriodEndDate: androidResult.gracePeriodEndDate,
        parentProductId: androidResult.parentProductId,
        productId: androidResult.productId,
        productType: androidResult.productType === 'subs' ? 'subs' : 'inapp',
        purchaseDate: androidResult.purchaseDate,
        quantity: androidResult.quantity,
        receiptId: androidResult.receiptId,
        renewalDate: androidResult.renewalDate,
        term: androidResult.term,
        termSku: androidResult.termSku,
        testTransaction: androidResult.testTransaction,
      }
      return result
    }
  } catch (error) {
    console.error('[validateReceipt] Failed:', error)
    const errorJson = parseErrorStringToJsonObj(error)
    throw new Error(errorJson.message)
  }
}

/**
 * Sync iOS purchases with App Store (iOS only)
 * @returns Promise<boolean>
 * @platform iOS
 */
export const syncIOS = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios') {
    throw new Error('syncIOS is only available on iOS')
  }

  if (!iap) {
    const errorJson = parseErrorStringToJsonObj(
      'RnIap: Service not initialized. Call initConnection() first.'
    )
    throw new Error(errorJson.message)
  }

  try {
    return await iap.syncIOS()
  } catch (error) {
    console.error('[syncIOS] Failed:', error)
    const errorJson = parseErrorStringToJsonObj(error)
    throw new Error(errorJson.message)
  }
}

/**
 * Request the promoted product from the App Store (iOS only)
 * @returns Promise<Product | null> - The promoted product or null if none available
 * @platform iOS
 */
export const requestPromotedProductIOS = async (): Promise<Product | null> => {
  if (Platform.OS !== 'ios') {
    return null
  }

  if (!iap) {
    const errorJson = parseErrorStringToJsonObj(
      'RnIap: Service not initialized. Call initConnection() first.'
    )
    throw new Error(errorJson.message)
  }

  try {
    const nitroProduct = await iap.requestPromotedProductIOS()
    if (nitroProduct) {
      return convertNitroProductToProduct(nitroProduct)
    }
    return null
  } catch (error) {
    console.error('[getPromotedProductIOS] Failed:', error)
    const errorJson = parseErrorStringToJsonObj(error)
    throw new Error(errorJson.message)
  }
}

/**
 * Present the code redemption sheet for offer codes (iOS only)
 * @returns Promise<boolean> - True if the sheet was presented successfully
 * @platform iOS
 */
export const presentCodeRedemptionSheetIOS = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios') {
    return false
  }

  if (!iap) {
    const errorJson = parseErrorStringToJsonObj(
      'RnIap: Service not initialized. Call initConnection() first.'
    )
    throw new Error(errorJson.message)
  }

  try {
    return await iap.presentCodeRedemptionSheetIOS()
  } catch (error) {
    console.error('[presentCodeRedemptionSheetIOS] Failed:', error)
    const errorJson = parseErrorStringToJsonObj(error)
    throw new Error(errorJson.message)
  }
}

/**
 * Buy promoted product on iOS
 * @returns Promise<void>
 * @platform iOS
 */
export const buyPromotedProductIOS = async (): Promise<void> => {
  if (Platform.OS !== 'ios') {
    throw new Error('buyPromotedProductIOS is only available on iOS')
  }

  if (!iap) {
    const errorJson = parseErrorStringToJsonObj(
      'RnIap: Service not initialized. Call initConnection() first.'
    )
    throw new Error(errorJson.message)
  }

  try {
    await iap.buyPromotedProductIOS()
  } catch (error) {
    console.error('[buyPromotedProductIOS] Failed:', error)
    const errorJson = parseErrorStringToJsonObj(error)
    throw new Error(errorJson.message)
  }
}

/**
 * Clear unfinished transactions on iOS
 * @returns Promise<void>
 * @platform iOS
 */
export const clearTransactionIOS = async (): Promise<void> => {
  if (Platform.OS !== 'ios') {
    return
  }

  if (!iap) {
    const errorJson = parseErrorStringToJsonObj(
      'RnIap: Service not initialized. Call initConnection() first.'
    )
    throw new Error(errorJson.message)
  }

  try {
    await iap.clearTransactionIOS()
  } catch (error) {
    console.error('[clearTransactionIOS] Failed:', error)
    const errorJson = parseErrorStringToJsonObj(error)
    throw new Error(errorJson.message)
  }
}

/**
 * Begin a refund request for a product on iOS 15+
 * @param sku - The product SKU to refund
 * @returns Promise<string | null> - The refund status or null if not available
 * @platform iOS
 */
export const beginRefundRequestIOS = async (
  sku: string
): Promise<string | null> => {
  if (Platform.OS !== 'ios') {
    return null
  }

  if (!iap) {
    const errorJson = parseErrorStringToJsonObj(
      'RnIap: Service not initialized. Call initConnection() first.'
    )
    throw new Error(errorJson.message)
  }

  try {
    return await iap.beginRefundRequestIOS(sku)
  } catch (error) {
    console.error('[beginRefundRequestIOS] Failed:', error)
    const errorJson = parseErrorStringToJsonObj(error)
    throw new Error(errorJson.message)
  }
}

/**
 * Get subscription status for a product (iOS only)
 * @param sku - The product SKU
 * @returns Promise<SubscriptionStatusIOS[]> - Array of subscription status objects
 * @throws Error when called on non-iOS platforms or when IAP is not initialized
 * @platform iOS
 */
export const subscriptionStatusIOS = async (
  sku: string
): Promise<SubscriptionStatusIOS[]> => {
  if (Platform.OS !== 'ios') {
    throw new Error('subscriptionStatusIOS is only available on iOS')
  }

  if (!iap) {
    const errorJson = parseErrorStringToJsonObj(
      'RnIap: Service not initialized. Call initConnection() first.'
    )
    throw new Error(errorJson.message)
  }

  try {
    const statuses = await iap.subscriptionStatusIOS(sku)
    if (!statuses || !Array.isArray(statuses)) return []
    return statuses.map((s) =>
      convertNitroSubscriptionStatusToSubscriptionStatusIOS(s as any)
    )
  } catch (error) {
    console.error('[subscriptionStatusIOS] Failed:', error)
    const errorJson = parseErrorStringToJsonObj(error)
    throw new Error(errorJson.message)
  }
}

/**
 * Get current entitlement for a product (iOS only)
 * @param sku - The product SKU
 * @returns Promise<Purchase | null> - Current entitlement or null
 * @platform iOS
 */
export const currentEntitlementIOS = async (
  sku: string
): Promise<Purchase | null> => {
  if (Platform.OS !== 'ios') {
    return null
  }

  if (!iap) {
    const errorJson = parseErrorStringToJsonObj(
      'RnIap: Service not initialized. Call initConnection() first.'
    )
    throw new Error(errorJson.message)
  }

  try {
    const nitroPurchase = await iap.currentEntitlementIOS(sku)
    if (nitroPurchase) {
      return convertNitroPurchaseToPurchase(nitroPurchase)
    }
    return null
  } catch (error) {
    console.error('[currentEntitlementIOS] Failed:', error)
    const errorJson = parseErrorStringToJsonObj(error)
    throw new Error(errorJson.message)
  }
}

/**
 * Get latest transaction for a product (iOS only)
 * @param sku - The product SKU
 * @returns Promise<Purchase | null> - Latest transaction or null
 * @platform iOS
 */
export const latestTransactionIOS = async (
  sku: string
): Promise<Purchase | null> => {
  if (Platform.OS !== 'ios') {
    return null
  }

  if (!iap) {
    const errorJson = parseErrorStringToJsonObj(
      'RnIap: Service not initialized. Call initConnection() first.'
    )
    throw new Error(errorJson.message)
  }

  try {
    const nitroPurchase = await iap.latestTransactionIOS(sku)
    if (nitroPurchase) {
      return convertNitroPurchaseToPurchase(nitroPurchase)
    }
    return null
  } catch (error) {
    console.error('[latestTransactionIOS] Failed:', error)
    const errorJson = parseErrorStringToJsonObj(error)
    throw new Error(errorJson.message)
  }
}

/**
 * Get pending transactions (iOS only)
 * @returns Promise<Purchase[]> - Array of pending transactions
 * @platform iOS
 */
export const getPendingTransactionsIOS = async (): Promise<Purchase[]> => {
  if (Platform.OS !== 'ios') {
    return []
  }

  if (!iap) {
    const errorJson = parseErrorStringToJsonObj(
      'RnIap: Service not initialized. Call initConnection() first.'
    )
    throw new Error(errorJson.message)
  }

  try {
    const nitroPurchases = await iap.getPendingTransactionsIOS()
    return nitroPurchases.map(convertNitroPurchaseToPurchase)
  } catch (error) {
    console.error('[getPendingTransactionsIOS] Failed:', error)
    const errorJson = parseErrorStringToJsonObj(error)
    throw new Error(errorJson.message)
  }
}

/**
 * Show manage subscriptions screen (iOS only)
 * @returns Promise<Purchase[]> - Subscriptions where auto-renewal status changed
 * @platform iOS
 */
export const showManageSubscriptionsIOS = async (): Promise<Purchase[]> => {
  if (Platform.OS !== 'ios') {
    return []
  }

  if (!iap) {
    const errorJson = parseErrorStringToJsonObj(
      'RnIap: Service not initialized. Call initConnection() first.'
    )
    throw new Error(errorJson.message)
  }

  try {
    const nitroPurchases = await iap.showManageSubscriptionsIOS()
    return nitroPurchases.map(convertNitroPurchaseToPurchase)
  } catch (error) {
    console.error('[showManageSubscriptionsIOS] Failed:', error)
    const errorJson = parseErrorStringToJsonObj(error)
    throw new Error(errorJson.message)
  }
}

/**
 * Check if user is eligible for intro offer (iOS only)
 * @param groupID - The subscription group ID
 * @returns Promise<boolean> - Eligibility status
 * @platform iOS
 */
export const isEligibleForIntroOfferIOS = async (
  groupID: string
): Promise<boolean> => {
  if (Platform.OS !== 'ios') {
    return false
  }

  if (!iap) {
    const errorJson = parseErrorStringToJsonObj(
      'RnIap: Service not initialized. Call initConnection() first.'
    )
    throw new Error(errorJson.message)
  }

  try {
    return await iap.isEligibleForIntroOfferIOS(groupID)
  } catch (error) {
    console.error('[isEligibleForIntroOfferIOS] Failed:', error)
    const errorJson = parseErrorStringToJsonObj(error)
    throw new Error(errorJson.message)
  }
}

/**
 * Get receipt data (iOS only)
 * @returns Promise<string> - Base64 encoded receipt data
 * @platform iOS
 */
export const getReceiptDataIOS = async (): Promise<string> => {
  if (Platform.OS !== 'ios') {
    throw new Error('getReceiptDataIOS is only available on iOS')
  }

  if (!iap) {
    const errorJson = parseErrorStringToJsonObj(
      'RnIap: Service not initialized. Call initConnection() first.'
    )
    throw new Error(errorJson.message)
  }

  try {
    return await iap.getReceiptDataIOS()
  } catch (error) {
    console.error('[getReceiptDataIOS] Failed:', error)
    const errorJson = parseErrorStringToJsonObj(error)
    throw new Error(errorJson.message)
  }
}

/**
 * Check if transaction is verified (iOS only)
 * @param sku - The product SKU
 * @returns Promise<boolean> - Verification status
 * @platform iOS
 */
export const isTransactionVerifiedIOS = async (
  sku: string
): Promise<boolean> => {
  if (Platform.OS !== 'ios') {
    return false
  }

  if (!iap) {
    const errorJson = parseErrorStringToJsonObj(
      'RnIap: Service not initialized. Call initConnection() first.'
    )
    throw new Error(errorJson.message)
  }

  try {
    return await iap.isTransactionVerifiedIOS(sku)
  } catch (error) {
    console.error('[isTransactionVerifiedIOS] Failed:', error)
    const errorJson = parseErrorStringToJsonObj(error)
    throw new Error(errorJson.message)
  }
}

/**
 * Get transaction JWS representation (iOS only)
 * @param sku - The product SKU
 * @returns Promise<string | null> - JWS representation or null
 * @platform iOS
 */
export const getTransactionJwsIOS = async (
  sku: string
): Promise<string | null> => {
  if (Platform.OS !== 'ios') {
    return null
  }

  if (!iap) {
    const errorJson = parseErrorStringToJsonObj(
      'RnIap: Service not initialized. Call initConnection() first.'
    )
    throw new Error(errorJson.message)
  }

  try {
    return await iap.getTransactionJwsIOS(sku)
  } catch (error) {
    console.error('[getTransactionJwsIOS] Failed:', error)
    const errorJson = parseErrorStringToJsonObj(error)
    throw new Error(errorJson.message)
  }
}

/**
 * Get the storefront identifier for the user's App Store account (iOS only)
 * @returns Promise<string> - The storefront identifier (e.g., 'USA' for United States)
 * @platform iOS
 *
 * @example
 * ```typescript
 * const storefront = await getStorefrontIOS();
 * console.log('User storefront:', storefront); // e.g., 'USA', 'GBR', 'KOR'
 * ```
 */
export const getStorefrontIOS = async (): Promise<string> => {
  if (Platform.OS !== 'ios') {
    throw new Error('getStorefrontIOS is only available on iOS')
  }

  try {
    // Call the native method to get storefront
    const storefront = await iap.getStorefrontIOS()
    return storefront
  } catch (error) {
    console.error('Failed to get storefront:', error)
    throw error
  }
}

/**
 * iOS only - Gets the original app transaction ID if the app was purchased from the App Store
 * @platform iOS
 * @description
 * This function retrieves the original app transaction information if the app was purchased
 * from the App Store. Returns null if the app was not purchased (e.g., free app or TestFlight).
 *
 * @returns {Promise<string | null>} The original app transaction ID or null
 *
 * @example
 * ```typescript
 * const appTransaction = await getAppTransactionIOS();
 * if (appTransaction) {
 *   console.log('App was purchased, transaction ID:', appTransaction);
 * } else {
 *   console.log('App was not purchased from App Store');
 * }
 * ```
 */
export const getAppTransactionIOS = async (): Promise<string | null> => {
  if (Platform.OS !== 'ios') {
    throw new Error('getAppTransactionIOS is only available on iOS')
  }

  try {
    // Call the native method to get app transaction
    const appTransaction = await iap.getAppTransactionIOS()
    return appTransaction
  } catch (error) {
    console.error('Failed to get app transaction:', error)
    throw error
  }
}

// Export subscription helpers
export {
  getActiveSubscriptions,
  hasActiveSubscriptions,
} from './helpers/subscription'

// Type conversion utilities
export {
  convertNitroProductToProduct,
  convertNitroPurchaseToPurchase,
  convertProductToSubscriptionProduct,
  validateNitroProduct,
  validateNitroPurchase,
  checkTypeSynchronization,
} from './utils/type-bridge'

// Deprecated exports for backward compatibility
/**
 * @deprecated Use acknowledgePurchaseAndroid instead
 */
export const acknowledgePurchase = acknowledgePurchaseAndroid

/**
 * @deprecated Use consumePurchaseAndroid instead
 */
export const consumePurchase = consumePurchaseAndroid
