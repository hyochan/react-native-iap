// External dependencies
import {Platform} from 'react-native';
import {NitroModules} from 'react-native-nitro-modules';

// Internal modules
import type {NitroPurchaseResult, RnIap} from './specs/RnIap.nitro';
import type {
  Product,
  Purchase,
  PurchaseAndroid,
  RequestPurchaseProps,
  RequestSubscriptionProps,
  RequestSubscriptionAndroidProps,
  PurchaseOptions,
  FinishTransactionParams,
} from './types';
import {
  convertNitroProductToProduct,
  convertNitroPurchaseToPurchase,
  validateNitroProduct,
  validateNitroPurchase,
} from './utils/type-bridge';

// Export all types
export type {
  RnIap,
  NitroProduct,
  NitroPurchase,
  NitroPurchaseResult,
} from './specs/RnIap.nitro';
export * from './types';
export * from './utils/error';

// Types for event listeners
export interface EventSubscription {
  remove(): void;
}

// ActiveSubscription and PurchaseError types are already exported via 'export * from ./types'

// Export hooks
export {useIAP} from './hooks/useIAP';

// Development utilities removed - use type bridge functions directly if needed

// Create the RnIap HybridObject instance (internal use only)
const iap = NitroModules.createHybridObject<RnIap>('RnIap');

/**
 * Initialize connection to the store
 */
export const initConnection = async (): Promise<boolean> => {
  try {
    return await iap.initConnection();
  } catch (error) {
    console.error('Failed to initialize IAP connection:', error);
    throw error;
  }
};

/**
 * End connection to the store
 */
export const endConnection = async (): Promise<boolean> => {
  try {
    return await iap.endConnection();
  } catch (error) {
    console.error('Failed to end IAP connection:', error);
    throw error;
  }
};

/**
 * Request products from the store
 * @param params - Product request configuration
 * @param params.skus - Array of product SKUs to fetch
 * @param params.type - Type of products: 'inapp' for regular products (default) or 'subs' for subscriptions
 * @returns Promise<Product[]> - Array of products from the store
 *
 * @example
 * ```typescript
 * // Regular products
 * const products = await requestProducts({
 *   skus: ['product1', 'product2'],
 *   type: 'inapp'
 * });
 *
 * // Subscriptions
 * const subscriptions = await requestProducts({
 *   skus: ['sub1', 'sub2'],
 *   type: 'subs'
 * });
 * ```
 */
export const requestProducts = async ({
  skus,
  type = 'inapp',
}: {
  skus: string[];
  type?: 'inapp' | 'subs';
}): Promise<Product[]> => {
  try {
    if (!skus || skus.length === 0) {
      throw new Error('No SKUs provided');
    }

    const nitroProducts = await iap.requestProducts(skus, type);

    // Validate and convert NitroProducts to TypeScript Products
    const validProducts = nitroProducts.filter(validateNitroProduct);
    if (validProducts.length !== nitroProducts.length) {
      console.warn(
        `[requestProducts] Some products failed validation: ${nitroProducts.length - validProducts.length} invalid`,
      );
    }

    const typedProducts = validProducts.map(convertNitroProductToProduct);
    return typedProducts;
  } catch (error) {
    console.error('[requestProducts] Failed:', error);
    throw error;
  }
};

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
  request: RequestPurchaseProps | RequestSubscriptionProps;
  type?: 'inapp' | 'subs';
}): Promise<void> => {
  try {
    // Validate platform-specific requests
    if (Platform.OS === 'ios') {
      const iosRequest = request.ios;
      if (!iosRequest?.sku) {
        throw new Error(
          'Invalid request for iOS. The `sku` property is required.',
        );
      }
    } else if (Platform.OS === 'android') {
      const androidRequest = request.android;
      if (!androidRequest?.skus?.length) {
        throw new Error(
          'Invalid request for Android. The `skus` property is required and must be a non-empty array.',
        );
      }
    } else {
      throw new Error('Unsupported platform');
    }

    // Transform the request for the unified interface
    const unifiedRequest: any = {};

    if (Platform.OS === 'ios' && request.ios) {
      unifiedRequest.ios = {
        ...request.ios,
      };
    }

    if (Platform.OS === 'android' && request.android) {
      if (type === 'subs') {
        const subsRequest = request.android as RequestSubscriptionAndroidProps;
        unifiedRequest.android = {
          ...subsRequest,
          subscriptionOffers: subsRequest.subscriptionOffers || [],
        };
      } else {
        unifiedRequest.android = request.android;
      }
    }

    // Call unified method - returns void, listen for events instead
    await iap.requestPurchase(unifiedRequest);
  } catch (error) {
    console.error('Failed to request purchase:', error);
    throw error;
  }
};

/**
 * Get available purchases (purchased items not yet consumed/finished)
 * @param params - Options for getting available purchases
 * @param params.alsoPublishToEventListener - Whether to also publish to event listener
 * @param params.onlyIncludeActiveItems - Whether to only include active items
 *
 * @example
 * ```typescript
 * const purchases = await getAvailablePurchases({
 *   onlyIncludeActiveItems: true
 * });
 * ```
 */
export const getAvailablePurchases = async ({
  alsoPublishToEventListener = false,
  onlyIncludeActiveItems = true,
}: PurchaseOptions = {}): Promise<Purchase[]> => {
  try {
    // Create unified options
    const options: any = {};

    if (Platform.OS === 'ios') {
      options.ios = {
        alsoPublishToEventListener,
        onlyIncludeActiveItems,
      };
    } else if (Platform.OS === 'android') {
      // For Android, we need to call twice for inapp and subs
      const inappNitroPurchases = await iap.getAvailablePurchases({
        android: {type: 'inapp'},
      });
      const subsNitroPurchases = await iap.getAvailablePurchases({
        android: {type: 'subs'},
      });

      // Validate and convert both sets of purchases
      const allNitroPurchases = [...inappNitroPurchases, ...subsNitroPurchases];
      const validPurchases = allNitroPurchases.filter(validateNitroPurchase);
      if (validPurchases.length !== allNitroPurchases.length) {
        console.warn(
          `[getAvailablePurchases] Some Android purchases failed validation: ${allNitroPurchases.length - validPurchases.length} invalid`,
        );
      }

      return validPurchases.map(convertNitroPurchaseToPurchase);
    } else {
      throw new Error('Unsupported platform');
    }

    const nitroPurchases = await iap.getAvailablePurchases(options);

    // Validate and convert NitroPurchases to TypeScript Purchases
    const validPurchases = nitroPurchases.filter(validateNitroPurchase);
    if (validPurchases.length !== nitroPurchases.length) {
      console.warn(
        `[getAvailablePurchases] Some purchases failed validation: ${nitroPurchases.length - validPurchases.length} invalid`,
      );
    }

    return validPurchases.map(convertNitroPurchaseToPurchase);
  } catch (error) {
    console.error('Failed to get available purchases:', error);
    throw error;
  }
};

/**
 * Get purchase histories
 * @param options - Options for getting purchase histories
 * @returns Promise<Purchase[]> - Array of purchase histories
 */
export const getPurchaseHistories = async (
  options: PurchaseOptions = {},
): Promise<Purchase[]> => {
  try {
    if (Platform.OS === 'ios') {
      const iosOptions = {
        ios: {
          alsoPublishToEventListener:
            options.alsoPublishToEventListener || false,
          onlyIncludeActiveItems: options.onlyIncludeActiveItems || false,
        },
      };
      const nitroPurchases = await iap.getAvailablePurchases(iosOptions);

      // Validate and convert NitroPurchases to TypeScript Purchases
      const validPurchases = nitroPurchases.filter(validateNitroPurchase);
      if (validPurchases.length !== nitroPurchases.length) {
        console.warn(
          `[getPurchaseHistories] Some purchases failed validation: ${nitroPurchases.length - validPurchases.length} invalid`,
        );
      }

      return validPurchases.map(convertNitroPurchaseToPurchase);
    }

    if (Platform.OS === 'android') {
      // Google Play Billing Library v8 doesn't support purchase history anymore
      console.warn(
        'getPurchaseHistories is not supported on Android with Google Play Billing Library v8. Use getAvailablePurchases instead.',
      );
      return [];
    }

    throw new Error('Unsupported platform');
  } catch (error) {
    console.error('Failed to get purchase histories:', error);
    throw error;
  }
};

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
    const params: any = {};

    if (Platform.OS === 'ios') {
      if (!purchase.id) {
        throw new Error('purchase.id required to finish iOS transaction');
      }
      params.ios = {
        transactionId: purchase.id,
      };
    } else if (Platform.OS === 'android') {
      const androidPurchase = purchase as PurchaseAndroid;
      const token =
        androidPurchase.purchaseToken || androidPurchase.purchaseTokenAndroid;

      if (!token) {
        throw new Error('purchaseToken required to finish Android transaction');
      }

      params.android = {
        purchaseToken: token,
        isConsumable,
      };
    } else {
      throw new Error('Unsupported platform');
    }

    const result = await iap.finishTransaction(params);

    // Handle variant return type
    if (typeof result === 'boolean') {
      return result;
    }
    // It's a PurchaseResult
    return result as NitroPurchaseResult;
  } catch (error) {
    console.error('Failed to finish transaction:', error);
    throw error;
  }
};

/**
 * Acknowledge a purchase (Android only)
 * @param purchaseToken - The purchase token to acknowledge
 *
 * @example
 * ```typescript
 * await acknowledgePurchase('purchase_token_here');
 * ```
 */
export const acknowledgePurchase = async (
  purchaseToken: string,
): Promise<NitroPurchaseResult> => {
  try {
    if (Platform.OS !== 'android') {
      throw new Error('acknowledgePurchase is only available on Android');
    }

    const result = await iap.finishTransaction({
      android: {
        purchaseToken,
        isConsumable: false,
      },
    });

    // Result is a variant, extract PurchaseResult
    if (typeof result === 'boolean') {
      // This shouldn't happen for Android, but handle it
      return {
        responseCode: 0,
        code: '0',
        message: 'Success',
        purchaseToken,
      };
    }
    return result as NitroPurchaseResult;
  } catch (error) {
    console.error('Failed to acknowledge purchase:', error);
    throw error;
  }
};

/**
 * Consume a purchase (Android only)
 * @param purchaseToken - The purchase token to consume
 *
 * @example
 * ```typescript
 * await consumePurchase('purchase_token_here');
 * ```
 */
export const consumePurchase = async (
  purchaseToken: string,
): Promise<NitroPurchaseResult> => {
  try {
    if (Platform.OS !== 'android') {
      throw new Error('consumePurchase is only available on Android');
    }

    const result = await iap.finishTransaction({
      android: {
        purchaseToken,
        isConsumable: true,
      },
    });

    // Result is a variant, extract PurchaseResult
    if (typeof result === 'boolean') {
      // This shouldn't happen for Android, but handle it
      return {
        responseCode: 0,
        code: '0',
        message: 'Success',
        purchaseToken,
      };
    }
    return result as NitroPurchaseResult;
  } catch (error) {
    console.error('Failed to consume purchase:', error);
    throw error;
  }
};

// ============================================================================
// EVENT LISTENERS
// ============================================================================

// Store wrapped listeners for proper removal
const listenerMap = new WeakMap<Function, Function>();

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
  listener: (purchase: Purchase) => void,
): EventSubscription => {
  // Wrap the listener to convert NitroPurchase to Purchase
  const wrappedListener = (nitroPurchase: any) => {
    if (validateNitroPurchase(nitroPurchase)) {
      const convertedPurchase = convertNitroPurchaseToPurchase(nitroPurchase);
      listener(convertedPurchase);
    } else {
      console.error(
        'Invalid purchase data received from native:',
        nitroPurchase,
      );
    }
  };

  // Store the wrapped listener for removal
  listenerMap.set(listener, wrappedListener);
  iap.addPurchaseUpdatedListener(wrappedListener);

  return {
    remove: () => {
      const wrapped = listenerMap.get(listener);
      if (wrapped) {
        iap.removePurchaseUpdatedListener(wrapped as any);
        listenerMap.delete(listener);
      }
    },
  };
};

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
  listener: (error: NitroPurchaseResult) => void,
): EventSubscription => {
  // Store the listener for removal
  listenerMap.set(listener, listener);
  iap.addPurchaseErrorListener(listener as any);

  return {
    remove: () => {
      iap.removePurchaseErrorListener(listener as any);
      listenerMap.delete(listener);
    },
  };
};

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
  listener: (product: Product) => void,
): EventSubscription => {
  if (Platform.OS !== 'ios') {
    console.warn(
      'promotedProductListenerIOS: This listener is only available on iOS',
    );
    return {remove: () => {}};
  }

  // Wrap the listener to convert NitroProduct to Product
  const wrappedListener = (nitroProduct: any) => {
    if (validateNitroProduct(nitroProduct)) {
      const convertedProduct = convertNitroProductToProduct(nitroProduct);
      listener(convertedProduct);
    } else {
      console.error(
        'Invalid promoted product data received from native:',
        nitroProduct,
      );
    }
  };

  // Store the wrapped listener for removal
  listenerMap.set(listener, wrappedListener);
  iap.addPromotedProductListenerIOS(wrappedListener);

  return {
    remove: () => {
      const wrapped = listenerMap.get(listener);
      if (wrapped) {
        iap.removePromotedProductListenerIOS(wrapped as any);
        listenerMap.delete(listener);
      }
    },
  };
};

// ============================================================================
// iOS-SPECIFIC FUNCTIONS
// ============================================================================

/**
 * Validate receipt (iOS only)
 * @param sku - Product SKU
 * @param androidOptions - Android-specific validation options (ignored on iOS)
 * @returns Promise<any> - Receipt validation result
 * @platform iOS
 */
export const validateReceipt = async (
  sku: string,
  androidOptions?: {
    packageName: string;
    productToken: string;
    accessToken: string;
    isSub?: boolean;
  },
): Promise<any> => {
  if (Platform.OS !== 'ios') {
    throw new Error('validateReceipt is only available on iOS');
  }

  // For now, return a placeholder - this would need native implementation
  void androidOptions; // Suppress unused parameter warning\n  console.warn('validateReceipt: Native implementation needed');
  return {
    productId: sku,
    status: 0,
    message: 'Receipt validation not implemented',
  };
};

/**
 * Sync iOS purchases with App Store (iOS only)
 * @returns Promise<void>
 * @platform iOS
 */
export const syncIOS = async (): Promise<void> => {
  if (Platform.OS !== 'ios') {
    throw new Error('syncIOS is only available on iOS');
  }

  // For now, just refresh available purchases
  await getAvailablePurchases();
};

/**
 * Get promoted product on iOS
 * @returns Promise<Product | null> - The promoted product or null if none
 * @platform iOS
 */
export const getPromotedProductIOS = async (): Promise<Product | null> => {
  if (Platform.OS !== 'ios') {
    return null;
  }

  // For now, return null - this would need native implementation
  console.warn('getPromotedProductIOS: Native implementation needed');
  return null;
};

/**
 * Buy promoted product on iOS
 * @returns Promise<void>
 * @platform iOS
 */
export const buyPromotedProductIOS = async (): Promise<void> => {
  if (Platform.OS !== 'ios') {
    throw new Error('buyPromotedProductIOS is only available on iOS');
  }

  // For now, throw an error - this would need native implementation
  console.warn('buyPromotedProductIOS: Native implementation needed');
  throw new Error('buyPromotedProductIOS: Native implementation needed');
};

// Export subscription helpers
export {
  getActiveSubscriptions,
  hasActiveSubscriptions,
} from './helpers/subscription';

// Type conversion utilities
export {
  convertNitroProductToProduct,
  convertNitroPurchaseToPurchase,
  convertProductToSubscriptionProduct,
  validateNitroProduct,
  validateNitroPurchase,
  checkTypeSynchronization,
} from './utils/type-bridge';
