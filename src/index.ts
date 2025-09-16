// External dependencies
import {Platform} from 'react-native';
// Side-effect import ensures Nitro installs its dispatcher before IAP is used (no-op in tests)
import 'react-native-nitro-modules';
import {NitroModules} from 'react-native-nitro-modules';

// Internal modules
import type {
  NitroPurchaseResult,
  RnIap,
  NitroReceiptValidationParams,
  NitroReceiptValidationResultIOS,
  NitroReceiptValidationResultAndroid,
} from './specs/RnIap.nitro';
import type {
  ProductQueryType,
  RequestPurchaseProps,
  RequestPurchaseResult,
} from './types';
import type {
  Product,
  ProductRequest,
  Purchase,
  PurchaseAndroid,
  PurchaseOptions,
  PurchaseError,
  ReceiptValidationResultAndroid,
  ReceiptValidationResultIOS,
  RequestPurchaseAndroidProps,
  RequestPurchaseIosProps,
  RequestPurchasePropsByPlatforms,
  RequestSubscriptionAndroidProps,
  RequestSubscriptionIosProps,
  RequestSubscriptionPropsByPlatforms,
  SubscriptionStatusIOS,
} from './types';
import {
  convertNitroProductToProduct,
  convertNitroPurchaseToPurchase,
  validateNitroProduct,
  validateNitroPurchase,
  convertNitroSubscriptionStatusToSubscriptionStatusIOS,
} from './utils/type-bridge';
import {parseErrorStringToJsonObj} from './utils/error';
import {normalizeErrorCodeFromNative} from './utils/errorMapping';

// Export all types
export type {
  RnIap,
  NitroProduct,
  NitroPurchase,
  NitroPurchaseResult,
} from './specs/RnIap.nitro';
export * from './types';
export * from './utils/error';

export type ProductTypeInput = 'inapp' | 'in-app' | 'subs';

const LEGACY_INAPP_WARNING =
  "[react-native-iap] `type: 'inapp'` is deprecated and will be removed in v14.4.0. Use 'in-app' instead.";

function toNitroProductType(
  type?: ProductTypeInput | ProductQueryType | null,
): 'inapp' | 'subs' {
  if (type === 'subs') {
    return 'subs';
  }
  if (type === 'inapp') {
    console.warn(LEGACY_INAPP_WARNING);
    return 'inapp';
  }
  if (type === 'all') {
    return 'inapp';
  }
  return 'inapp';
}

function isSubscriptionQuery(type?: ProductQueryType | null): boolean {
  return type === 'subs';
}

function normalizeProductQueryType(
  type?: ProductQueryType | string | null,
): ProductQueryType {
  if (type === 'all' || type === 'subs' || type === 'in-app') {
    return type;
  }

  if (typeof type === 'string') {
    const normalized = type.trim().toLowerCase().replace(/_/g, '-');

    if (normalized === 'all') {
      return 'all';
    }
    if (normalized === 'subs') {
      return 'subs';
    }
    if (normalized === 'inapp') {
      console.warn(LEGACY_INAPP_WARNING);
      return 'in-app';
    }
    if (normalized === 'in-app') {
      return 'in-app';
    }
  }
  return 'in-app';
}

export interface EventSubscription {
  remove(): void;
}

export type FinishTransactionParams = {
  purchase: Purchase;
  isConsumable?: boolean;
};

// ActiveSubscription and PurchaseError types are already exported via 'export * from ./types'

// Export hooks
export {useIAP} from './hooks/useIAP';

// iOS promoted product aliases for API parity
export const getPromotedProductIOS = async (): Promise<Product | null> =>
  requestPromotedProductIOS();
export const requestPurchaseOnPromotedProductIOS = async (): Promise<void> =>
  buyPromotedProductIOS();

// Restore completed transactions (cross-platform)
export const restorePurchases = async (
  options: PurchaseOptions = {
    alsoPublishToEventListenerIOS: false,
    onlyIncludeActiveItemsIOS: true,
  },
): Promise<Purchase[]> => {
  if (Platform.OS === 'ios') {
    await syncIOS();
  }
  return getAvailablePurchases(options);
};

// Development utilities removed - use type bridge functions directly if needed

// Create the RnIap HybridObject instance lazily to avoid early JSI crashes
let iapRef: RnIap | null = null;

const IAP = {
  get instance(): RnIap {
    if (iapRef) return iapRef;

    // Attempt to create the HybridObject and map common Nitro/JSI readiness errors
    try {
      iapRef = NitroModules.createHybridObject<RnIap>('RnIap');
    } catch (e) {
      const msg = String((e as any)?.message ?? e ?? '');
      if (
        msg.includes('Nitro') ||
        msg.includes('JSI') ||
        msg.includes('dispatcher') ||
        msg.includes('HybridObject')
      ) {
        throw new Error(
          'Nitro runtime not installed yet. Ensure react-native-nitro-modules is initialized before calling IAP.',
        );
      }
      throw e;
    }
    return iapRef;
  },
};

/**
 * Initialize connection to the store
 */
export const initConnection = async (): Promise<boolean> => {
  try {
    return await IAP.instance.initConnection();
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
    // If never initialized, treat as ended
    if (!iapRef) return true;
    return await IAP.instance.endConnection();
  } catch (error) {
    console.error('Failed to end IAP connection:', error);
    throw error;
  }
};

/**
 * Fetch products from the store
 * @param params - Product request configuration
 * @param params.skus - Array of product SKUs to fetch
 * @param params.type - Optional filter: 'in-app' (default) for products, 'subs' for subscriptions, or 'all' for both.
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
  type = 'in-app',
}: ProductRequest): Promise<Product[]> => {
  try {
    if (!skus || skus.length === 0) {
      throw new Error('No SKUs provided');
    }

    const normalizedType = normalizeProductQueryType(type);

    if (normalizedType === 'all') {
      const [inappNitro, subsNitro] = await Promise.all([
        IAP.instance.fetchProducts(skus, 'inapp'),
        IAP.instance.fetchProducts(skus, 'subs'),
      ]);
      const allNitro = [...inappNitro, ...subsNitro];
      const validAll = allNitro.filter(validateNitroProduct);
      if (validAll.length !== allNitro.length) {
        console.warn(
          `[fetchProducts] Some products failed validation: ${allNitro.length - validAll.length} invalid`,
        );
      }
      return validAll.map(convertNitroProductToProduct);
    }

    const nitroProducts = await IAP.instance.fetchProducts(
      skus,
      toNitroProductType(normalizedType),
    );

    // Validate and convert NitroProducts to TypeScript Products
    const validProducts = nitroProducts.filter(validateNitroProduct);
    if (validProducts.length !== nitroProducts.length) {
      console.warn(
        `[fetchProducts] Some products failed validation: ${nitroProducts.length - validProducts.length} invalid`,
      );
    }

    const typedProducts = validProducts.map(convertNitroProductToProduct);
    return typedProducts;
  } catch (error) {
    console.error('[fetchProducts] Failed:', error);
    throw error;
  }
};

/**
 * Request a purchase for products or subscriptions
 * @param params - Purchase request configuration
 * @param params.request - Platform-specific purchase parameters
 * @param params.type - Type of purchase: 'in-app' for products (default) or 'subs' for subscriptions
 *
 * @example
 * ```typescript
 * // Product purchase
 * await requestPurchase({
 *   request: {
 *     ios: { sku: productId },
 *     android: { skus: [productId] }
 *   },
 *   type: 'in-app'
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
 * @param params.request - Platform-specific request parameters
 * @param params.type - Type of purchase (defaults to in-app)
 */
export const requestPurchase = async (
  params: RequestPurchaseProps,
): Promise<RequestPurchaseResult> => {
  try {
    const normalizedType = normalizeProductQueryType(params.type);
    const isSubs = isSubscriptionQuery(normalizedType);
    const request = params.request as
      | RequestPurchasePropsByPlatforms
      | RequestSubscriptionPropsByPlatforms
      | undefined;

    if (!request) {
      throw new Error('Missing purchase request configuration');
    }

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
      if (isSubs) {
        const iosReq = request.ios as RequestSubscriptionIosProps;
        const autoFinishSubs =
          iosReq.andDangerouslyFinishTransactionAutomatically == null;
        unifiedRequest.ios = {
          ...iosReq,
          ...(autoFinishSubs
            ? {andDangerouslyFinishTransactionAutomatically: true}
            : {}),
        } as RequestSubscriptionIosProps;
      } else {
        unifiedRequest.ios = request.ios as RequestPurchaseIosProps;
      }
    }

    if (Platform.OS === 'android' && request.android) {
      if (isSubs) {
        const subsRequest = request.android as RequestSubscriptionAndroidProps;
        unifiedRequest.android = {
          ...subsRequest,
          subscriptionOffers: subsRequest.subscriptionOffers || [],
        } as RequestSubscriptionAndroidProps;
      } else {
        unifiedRequest.android = request.android as RequestPurchaseAndroidProps;
      }
    }

    // Call unified method - returns void, listen for events instead
    return await IAP.instance.requestPurchase(unifiedRequest);
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
    const options: any = {};

    if (Platform.OS === 'ios') {
      // Provide both new and deprecated keys for compatibility
      options.ios = {
        alsoPublishToEventListenerIOS,
        onlyIncludeActiveItemsIOS,
        alsoPublishToEventListener: alsoPublishToEventListenerIOS,
        onlyIncludeActiveItems: onlyIncludeActiveItemsIOS,
      };
    } else if (Platform.OS === 'android') {
      // For Android, we need to call twice for inapp and subs
      const inappNitroPurchases = await IAP.instance.getAvailablePurchases({
        android: {type: 'inapp'},
      });
      const subsNitroPurchases = await IAP.instance.getAvailablePurchases({
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

    const nitroPurchases = await IAP.instance.getAvailablePurchases(options);

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
      const token = androidPurchase.purchaseToken;

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

    const result = await IAP.instance.finishTransaction(params);

    // Handle variant return type
    if (typeof result === 'boolean') {
      return result;
    }
    // It's a PurchaseResult
    return result as NitroPurchaseResult;
  } catch (error) {
    // If iOS transaction has already been auto-finished natively, treat as success
    if (Platform.OS === 'ios') {
      const err = parseErrorStringToJsonObj(error);
      const msg = (err?.message || '').toString();
      const code = (err?.code || '').toString();
      if (
        msg.includes('Transaction not found') ||
        code === 'E_ITEM_UNAVAILABLE'
      ) {
        // Consider already finished
        return true;
      }
    }
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
 * await acknowledgePurchaseAndroid('purchase_token_here');
 * ```
 */
export const acknowledgePurchaseAndroid = async (
  purchaseToken: string,
): Promise<NitroPurchaseResult> => {
  try {
    if (Platform.OS !== 'android') {
      throw new Error(
        'acknowledgePurchaseAndroid is only available on Android',
      );
    }

    const result = await IAP.instance.finishTransaction({
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
    console.error('Failed to acknowledge purchase Android:', error);
    throw error;
  }
};

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
  purchaseToken: string,
): Promise<NitroPurchaseResult> => {
  try {
    if (Platform.OS !== 'android') {
      throw new Error('consumePurchaseAndroid is only available on Android');
    }

    const result = await IAP.instance.finishTransaction({
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
    console.error('Failed to consume purchase Android:', error);
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
  let attached = false;
  try {
    IAP.instance.addPurchaseUpdatedListener(wrappedListener);
    attached = true;
  } catch (e) {
    const msg = String(e ?? '');
    if (msg.includes('Nitro runtime not installed')) {
      console.warn(
        '[purchaseUpdatedListener] Nitro not ready yet; listener inert until initConnection()',
      );
    } else {
      throw e;
    }
  }

  return {
    remove: () => {
      const wrapped = listenerMap.get(listener);
      if (wrapped) {
        if (attached) {
          try {
            IAP.instance.removePurchaseUpdatedListener(wrapped as any);
          } catch {}
        }
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
  listener: (error: PurchaseError) => void,
): EventSubscription => {
  const wrapped = (error: NitroPurchaseResult) => {
    listener({
      code: normalizeErrorCodeFromNative(error.code),
      message: error.message,
      productId: undefined,
    });
  };

  listenerMap.set(listener, wrapped);
  let attached = false;
  try {
    IAP.instance.addPurchaseErrorListener(wrapped as any);
    attached = true;
  } catch (e) {
    const msg = String(e ?? '');
    if (msg.includes('Nitro runtime not installed')) {
      console.warn(
        '[purchaseErrorListener] Nitro not ready yet; listener inert until initConnection()',
      );
    } else {
      throw e;
    }
  }

  return {
    remove: () => {
      const stored = listenerMap.get(listener);
      if (stored) {
        if (attached) {
          try {
            IAP.instance.removePurchaseErrorListener(stored as any);
          } catch {}
        }
        listenerMap.delete(listener);
      }
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
  let attached = false;
  try {
    IAP.instance.addPromotedProductListenerIOS(wrappedListener);
    attached = true;
  } catch (e) {
    const msg = String(e ?? '');
    if (msg.includes('Nitro runtime not installed')) {
      console.warn(
        '[promotedProductListenerIOS] Nitro not ready yet; listener inert until initConnection()',
      );
    } else {
      throw e;
    }
  }

  return {
    remove: () => {
      const wrapped = listenerMap.get(listener);
      if (wrapped) {
        if (attached) {
          try {
            IAP.instance.removePromotedProductListenerIOS(wrapped as any);
          } catch {}
        }
        listenerMap.delete(listener);
      }
    },
  };
};

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
    packageName: string;
    productToken: string;
    accessToken: string;
    isSub?: boolean;
  },
): Promise<import('./types').ReceiptValidationResult> => {
  try {
    const params: NitroReceiptValidationParams = {
      sku,
      androidOptions,
    };

    const nitroResult = await IAP.instance.validateReceipt(params);

    // Convert Nitro result to public API result
    if (Platform.OS === 'ios') {
      const iosResult = nitroResult as NitroReceiptValidationResultIOS;
      const result: ReceiptValidationResultIOS = {
        isValid: iosResult.isValid,
        receiptData: iosResult.receiptData,
        jwsRepresentation: iosResult.jwsRepresentation,
        latestTransaction: iosResult.latestTransaction
          ? convertNitroPurchaseToPurchase(iosResult.latestTransaction)
          : undefined,
      };
      return result;
    } else {
      // Android
      const androidResult = nitroResult as NitroReceiptValidationResultAndroid;
      const result: ReceiptValidationResultAndroid = {
        autoRenewing: androidResult.autoRenewing,
        betaProduct: androidResult.betaProduct,
        cancelDate: androidResult.cancelDate,
        cancelReason: androidResult.cancelReason,
        deferredDate: androidResult.deferredDate,
        deferredSku: androidResult.deferredSku?.toString() ?? null,
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
      };
      return result;
    }
  } catch (error) {
    console.error('[validateReceipt] Failed:', error);
    const errorJson = parseErrorStringToJsonObj(error);
    throw new Error(errorJson.message);
  }
};

/**
 * Sync iOS purchases with App Store (iOS only)
 * @returns Promise<boolean>
 * @platform iOS
 */
export const syncIOS = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios') {
    throw new Error('syncIOS is only available on iOS');
  }

  try {
    return await IAP.instance.syncIOS();
  } catch (error) {
    console.error('[syncIOS] Failed:', error);
    const errorJson = parseErrorStringToJsonObj(error);
    throw new Error(errorJson.message);
  }
};

/**
 * Request the promoted product from the App Store (iOS only)
 * @returns Promise<Product | null> - The promoted product or null if none available
 * @platform iOS
 */
export const requestPromotedProductIOS = async (): Promise<Product | null> => {
  if (Platform.OS !== 'ios') {
    return null;
  }

  try {
    const nitroProduct = await IAP.instance.requestPromotedProductIOS();
    if (nitroProduct) {
      return convertNitroProductToProduct(nitroProduct);
    }
    return null;
  } catch (error) {
    console.error('[getPromotedProductIOS] Failed:', error);
    const errorJson = parseErrorStringToJsonObj(error);
    throw new Error(errorJson.message);
  }
};

/**
 * Present the code redemption sheet for offer codes (iOS only)
 * @returns Promise<boolean> - True if the sheet was presented successfully
 * @platform iOS
 */
export const presentCodeRedemptionSheetIOS = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios') {
    return false;
  }

  try {
    return await IAP.instance.presentCodeRedemptionSheetIOS();
  } catch (error) {
    console.error('[presentCodeRedemptionSheetIOS] Failed:', error);
    const errorJson = parseErrorStringToJsonObj(error);
    throw new Error(errorJson.message);
  }
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

  try {
    await IAP.instance.buyPromotedProductIOS();
  } catch (error) {
    console.error('[buyPromotedProductIOS] Failed:', error);
    const errorJson = parseErrorStringToJsonObj(error);
    throw new Error(errorJson.message);
  }
};

/**
 * Clear unfinished transactions on iOS
 * @returns Promise<void>
 * @platform iOS
 */
export const clearTransactionIOS = async (): Promise<void> => {
  if (Platform.OS !== 'ios') {
    return;
  }

  try {
    await IAP.instance.clearTransactionIOS();
  } catch (error) {
    console.error('[clearTransactionIOS] Failed:', error);
    const errorJson = parseErrorStringToJsonObj(error);
    throw new Error(errorJson.message);
  }
};

/**
 * Begin a refund request for a product on iOS 15+
 * @param sku - The product SKU to refund
 * @returns Promise<string | null> - The refund status or null if not available
 * @platform iOS
 */
export const beginRefundRequestIOS = async (
  sku: string,
): Promise<string | null> => {
  if (Platform.OS !== 'ios') {
    return null;
  }

  try {
    return await IAP.instance.beginRefundRequestIOS(sku);
  } catch (error) {
    console.error('[beginRefundRequestIOS] Failed:', error);
    const errorJson = parseErrorStringToJsonObj(error);
    throw new Error(errorJson.message);
  }
};

/**
 * Get subscription status for a product (iOS only)
 * @param sku - The product SKU
 * @returns Promise<SubscriptionStatusIOS[]> - Array of subscription status objects
 * @throws Error when called on non-iOS platforms or when IAP is not initialized
 * @platform iOS
 */
export const subscriptionStatusIOS = async (
  sku: string,
): Promise<SubscriptionStatusIOS[]> => {
  if (Platform.OS !== 'ios') {
    throw new Error('subscriptionStatusIOS is only available on iOS');
  }

  try {
    const statuses = await IAP.instance.subscriptionStatusIOS(sku);
    if (!statuses || !Array.isArray(statuses)) return [];
    return statuses.map((s) =>
      convertNitroSubscriptionStatusToSubscriptionStatusIOS(s as any),
    );
  } catch (error) {
    console.error('[subscriptionStatusIOS] Failed:', error);
    const errorJson = parseErrorStringToJsonObj(error);
    throw new Error(errorJson.message);
  }
};

/**
 * Get current entitlement for a product (iOS only)
 * @param sku - The product SKU
 * @returns Promise<Purchase | null> - Current entitlement or null
 * @platform iOS
 */
export const currentEntitlementIOS = async (
  sku: string,
): Promise<Purchase | null> => {
  if (Platform.OS !== 'ios') {
    return null;
  }

  try {
    const nitroPurchase = await IAP.instance.currentEntitlementIOS(sku);
    if (nitroPurchase) {
      return convertNitroPurchaseToPurchase(nitroPurchase);
    }
    return null;
  } catch (error) {
    console.error('[currentEntitlementIOS] Failed:', error);
    const errorJson = parseErrorStringToJsonObj(error);
    throw new Error(errorJson.message);
  }
};

/**
 * Get latest transaction for a product (iOS only)
 * @param sku - The product SKU
 * @returns Promise<Purchase | null> - Latest transaction or null
 * @platform iOS
 */
export const latestTransactionIOS = async (
  sku: string,
): Promise<Purchase | null> => {
  if (Platform.OS !== 'ios') {
    return null;
  }

  try {
    const nitroPurchase = await IAP.instance.latestTransactionIOS(sku);
    if (nitroPurchase) {
      return convertNitroPurchaseToPurchase(nitroPurchase);
    }
    return null;
  } catch (error) {
    console.error('[latestTransactionIOS] Failed:', error);
    const errorJson = parseErrorStringToJsonObj(error);
    throw new Error(errorJson.message);
  }
};

/**
 * Get pending transactions (iOS only)
 * @returns Promise<Purchase[]> - Array of pending transactions
 * @platform iOS
 */
export const getPendingTransactionsIOS = async (): Promise<Purchase[]> => {
  if (Platform.OS !== 'ios') {
    return [];
  }

  try {
    const nitroPurchases = await IAP.instance.getPendingTransactionsIOS();
    return nitroPurchases.map(convertNitroPurchaseToPurchase);
  } catch (error) {
    console.error('[getPendingTransactionsIOS] Failed:', error);
    const errorJson = parseErrorStringToJsonObj(error);
    throw new Error(errorJson.message);
  }
};

/**
 * Show manage subscriptions screen (iOS only)
 * @returns Promise<Purchase[]> - Subscriptions where auto-renewal status changed
 * @platform iOS
 */
export const showManageSubscriptionsIOS = async (): Promise<Purchase[]> => {
  if (Platform.OS !== 'ios') {
    return [];
  }

  try {
    const nitroPurchases = await IAP.instance.showManageSubscriptionsIOS();
    return nitroPurchases.map(convertNitroPurchaseToPurchase);
  } catch (error) {
    console.error('[showManageSubscriptionsIOS] Failed:', error);
    const errorJson = parseErrorStringToJsonObj(error);
    throw new Error(errorJson.message);
  }
};

/**
 * Check if user is eligible for intro offer (iOS only)
 * @param groupID - The subscription group ID
 * @returns Promise<boolean> - Eligibility status
 * @platform iOS
 */
export const isEligibleForIntroOfferIOS = async (
  groupID: string,
): Promise<boolean> => {
  if (Platform.OS !== 'ios') {
    return false;
  }

  try {
    return await IAP.instance.isEligibleForIntroOfferIOS(groupID);
  } catch (error) {
    console.error('[isEligibleForIntroOfferIOS] Failed:', error);
    const errorJson = parseErrorStringToJsonObj(error);
    throw new Error(errorJson.message);
  }
};

/**
 * Get receipt data (iOS only)
 * @returns Promise<string> - Base64 encoded receipt data
 * @platform iOS
 */
export const getReceiptDataIOS = async (): Promise<string> => {
  if (Platform.OS !== 'ios') {
    throw new Error('getReceiptDataIOS is only available on iOS');
  }

  try {
    return await IAP.instance.getReceiptDataIOS();
  } catch (error) {
    console.error('[getReceiptDataIOS] Failed:', error);
    const errorJson = parseErrorStringToJsonObj(error);
    throw new Error(errorJson.message);
  }
};

/**
 * Check if transaction is verified (iOS only)
 * @param sku - The product SKU
 * @returns Promise<boolean> - Verification status
 * @platform iOS
 */
export const isTransactionVerifiedIOS = async (
  sku: string,
): Promise<boolean> => {
  if (Platform.OS !== 'ios') {
    return false;
  }

  try {
    return await IAP.instance.isTransactionVerifiedIOS(sku);
  } catch (error) {
    console.error('[isTransactionVerifiedIOS] Failed:', error);
    const errorJson = parseErrorStringToJsonObj(error);
    throw new Error(errorJson.message);
  }
};

/**
 * Get transaction JWS representation (iOS only)
 * @param sku - The product SKU
 * @returns Promise<string | null> - JWS representation or null
 * @platform iOS
 */
export const getTransactionJwsIOS = async (
  sku: string,
): Promise<string | null> => {
  if (Platform.OS !== 'ios') {
    return null;
  }

  try {
    return await IAP.instance.getTransactionJwsIOS(sku);
  } catch (error) {
    console.error('[getTransactionJwsIOS] Failed:', error);
    const errorJson = parseErrorStringToJsonObj(error);
    throw new Error(errorJson.message);
  }
};

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
    throw new Error('getStorefrontIOS is only available on iOS');
  }

  try {
    // Call the native method to get storefront
    const storefront = await IAP.instance.getStorefrontIOS();
    return storefront;
  } catch (error) {
    console.error('Failed to get storefront:', error);
    throw error;
  }
};

/**
 * Gets the storefront country code from the underlying native store.
 * Returns a two-letter country code such as 'US', 'KR', or empty string on failure.
 *
 * Cross-platform alias aligning with expo-iap.
 */
export const getStorefront = async (): Promise<string> => {
  if (Platform.OS === 'android') {
    try {
      // Optional since older builds may not have the method
      const result = await IAP.instance.getStorefrontAndroid?.();
      return result ?? '';
    } catch {
      return '';
    }
  }
  return getStorefrontIOS();
};

/**
 * Deeplinks to native interface that allows users to manage their subscriptions
 * Cross-platform alias aligning with expo-iap
 */
export const deepLinkToSubscriptions = async (
  options: {
    skuAndroid?: string;
    packageNameAndroid?: string;
  } = {},
): Promise<void> => {
  if (Platform.OS === 'android') {
    await IAP.instance.deepLinkToSubscriptionsAndroid?.({
      skuAndroid: options.skuAndroid,
      packageNameAndroid: options.packageNameAndroid,
    });
    return;
  }
  // iOS: Use manage subscriptions sheet (ignore returned purchases for deeplink parity)
  if (Platform.OS === 'ios') {
    try {
      await IAP.instance.showManageSubscriptionsIOS();
    } catch {
      // no-op
    }
    return;
  }
  return;
};

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
    throw new Error('getAppTransactionIOS is only available on iOS');
  }

  try {
    // Call the native method to get app transaction
    const appTransaction = await IAP.instance.getAppTransactionIOS();
    return appTransaction;
  } catch (error) {
    console.error('Failed to get app transaction:', error);
    throw error;
  }
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
  convertProductToProductSubscription,
  validateNitroProduct,
  validateNitroPurchase,
  checkTypeSynchronization,
} from './utils/type-bridge';

// Deprecated exports for backward compatibility
/**
 * @deprecated Use acknowledgePurchaseAndroid instead
 */
export const acknowledgePurchase = acknowledgePurchaseAndroid;

/**
 * @deprecated Use consumePurchaseAndroid instead
 */
export const consumePurchase = consumePurchaseAndroid;
