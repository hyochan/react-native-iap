// External dependencies
import {Platform} from 'react-native';
import {NitroModules} from 'react-native-nitro-modules';

// Internal modules
import type {
  NitroPurchaseResult,
  RnIap,
} from './specs/RnIap.nitro';
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

// Export all types
export type {
  RnIap,
  NitroProduct,
  NitroPurchase,
  NitroPurchaseResult,
} from './specs/RnIap.nitro';
export * from './types';
export * from './utils';

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
    console.log('[requestProducts] Starting with:', {skus, type});

    if (!skus || skus.length === 0) {
      throw new Error('No SKUs provided');
    }

    const products = await iap.requestProducts(skus, type);
    console.log('[requestProducts] Native returned:', products);

    // NitroProduct is returned from native, cast to our Product type
    const typedProducts = products as Product[];
    console.log('[requestProducts] Returning products:', typedProducts.length);

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
      const {withOffer, ...iosParams} = request.ios;
      unifiedRequest.ios = {
        ...iosParams,
        withOffer: withOffer
          ? {
              identifier: withOffer.identifier,
              keyIdentifier: withOffer.keyIdentifier,
              nonce: withOffer.nonce,
              signature: withOffer.signature,
              timestamp: withOffer.timestamp.toString(),
            }
          : undefined,
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
      const inappPurchases = await iap.getAvailablePurchases({
        android: {type: 'inapp'},
      });
      const subsPurchases = await iap.getAvailablePurchases({
        android: {type: 'subs'},
      });
      return [...inappPurchases, ...subsPurchases] as Purchase[];
    } else {
      throw new Error('Unsupported platform');
    }

    const purchases = await iap.getAvailablePurchases(options);
    return purchases as Purchase[];
  } catch (error) {
    console.error('Failed to get available purchases:', error);
    throw error;
  }
};

/**
 * Get purchase histories (iOS only)
 * @param params - Options for getting purchase histories
 * @param params.alsoPublishToEventListener - Whether to also publish to event listener
 * @param params.onlyIncludeActiveItems - Whether to only include active items
 *
 * @example
 * ```typescript
 * const histories = await getPurchaseHistories({
 *   onlyIncludeActiveItems: false
 * });
 * ```
 */
export const getPurchaseHistories = async ({
  alsoPublishToEventListener = false,
  onlyIncludeActiveItems = false,
}: PurchaseOptions = {}): Promise<Purchase[]> => {
  try {
    if (Platform.OS === 'ios') {
      const options = {
        ios: {
          alsoPublishToEventListener,
          onlyIncludeActiveItems,
        },
      };
      const purchases = await iap.getAvailablePurchases(options);
      return purchases as Purchase[];
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

// MARK: - Event Listeners

/**
 * Add a listener for purchase updates
 * @param listener - Function to call when a purchase is updated
 * 
 * @example
 * ```typescript
 * addPurchaseUpdatedListener((purchase) => {
 *   console.log('Purchase updated:', purchase);
 *   // Handle successful purchase
 * });
 * ```
 */
export const addPurchaseUpdatedListener = (
  listener: (purchase: Purchase) => void
): void => {
  iap.addPurchaseUpdatedListener(listener as any);
};

/**
 * Add a listener for purchase errors
 * @param listener - Function to call when a purchase error occurs
 * 
 * @example
 * ```typescript
 * addPurchaseErrorListener((error) => {
 *   console.log('Purchase error:', error);
 *   // Handle purchase error
 * });
 * ```
 */
export const addPurchaseErrorListener = (
  listener: (error: NitroPurchaseResult) => void
): void => {
  iap.addPurchaseErrorListener(listener);
};

/**
 * Remove a purchase updated listener
 * @param listener - Function to remove from listeners
 */
export const removePurchaseUpdatedListener = (
  listener: (purchase: Purchase) => void
): void => {
  iap.removePurchaseUpdatedListener(listener as any);
};

/**
 * Remove a purchase error listener
 * @param listener - Function to remove from listeners
 */
export const removePurchaseErrorListener = (
  listener: (error: NitroPurchaseResult) => void
): void => {
  iap.removePurchaseErrorListener(listener);
};
