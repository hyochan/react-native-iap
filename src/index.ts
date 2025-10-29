// External dependencies
import {Platform} from 'react-native';
// Side-effect import ensures Nitro installs its dispatcher before IAP is used (no-op in tests)
import 'react-native-nitro-modules';
import {NitroModules} from 'react-native-nitro-modules';

// Internal modules
import type {
  NitroActiveSubscription,
  NitroReceiptValidationParams,
  NitroReceiptValidationResultIOS,
  NitroReceiptValidationResultAndroid,
  NitroSubscriptionStatus,
  RnIap,
} from './specs/RnIap.nitro';
import type {
  AndroidSubscriptionOfferInput,
  DiscountOfferInputIOS,
  FetchProductsResult,
  MutationField,
  Product,
  ProductIOS,
  ProductQueryType,
  Purchase,
  PurchaseError,
  PurchaseIOS,
  QueryField,
  AppTransaction,
  ReceiptValidationResultAndroid,
  ReceiptValidationResultIOS,
  RequestPurchaseAndroidProps,
  RequestPurchaseIosProps,
  RequestPurchasePropsByPlatforms,
  RequestSubscriptionAndroidProps,
  RequestSubscriptionIosProps,
  RequestSubscriptionPropsByPlatforms,
  ActiveSubscription,
  ProductAndroid,
  ProductSubscriptionAndroid,
} from './types';
import {
  convertNitroProductToProduct,
  convertNitroPurchaseToPurchase,
  convertProductToProductSubscription,
  validateNitroProduct,
  validateNitroPurchase,
  convertNitroSubscriptionStatusToSubscriptionStatusIOS,
} from './utils/type-bridge';
import {parseErrorStringToJsonObj} from './utils/error';
import {
  normalizeErrorCodeFromNative,
  createPurchaseError,
} from './utils/errorMapping';
import {RnIapConsole} from './utils/debug';
import {getSuccessFromPurchaseVariant} from './utils/purchase';
import {parseAppTransactionPayload} from './utils';

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

type NitroPurchaseRequest = Parameters<RnIap['requestPurchase']>[0];
type NitroAvailablePurchasesOptions = NonNullable<
  Parameters<RnIap['getAvailablePurchases']>[0]
>;
type NitroFinishTransactionParamsInternal = Parameters<
  RnIap['finishTransaction']
>[0];
type NitroPurchaseListener = Parameters<RnIap['addPurchaseUpdatedListener']>[0];
type NitroPurchaseErrorListener = Parameters<
  RnIap['addPurchaseErrorListener']
>[0];
type NitroPromotedProductListener = Parameters<
  RnIap['addPromotedProductListenerIOS']
>[0];

const toErrorMessage = (error: unknown): string => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    (error as {message?: unknown}).message != null
  ) {
    return String((error as {message?: unknown}).message);
  }
  return String(error ?? '');
};

export interface EventSubscription {
  remove(): void;
}

// ActiveSubscription and PurchaseError types are already exported via 'export * from ./types'

// Export hooks
export {useIAP} from './hooks/useIAP';

// Restore completed transactions (cross-platform)
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
      const msg = toErrorMessage(e);
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

// ============================================================================
// EVENT LISTENERS
// ============================================================================

const purchaseUpdatedListenerMap = new WeakMap<
  (purchase: Purchase) => void,
  NitroPurchaseListener
>();
const purchaseErrorListenerMap = new WeakMap<
  (error: PurchaseError) => void,
  NitroPurchaseErrorListener
>();
const promotedProductListenerMap = new WeakMap<
  (product: Product) => void,
  NitroPromotedProductListener
>();

export const purchaseUpdatedListener = (
  listener: (purchase: Purchase) => void,
): EventSubscription => {
  const wrappedListener: NitroPurchaseListener = (nitroPurchase) => {
    if (validateNitroPurchase(nitroPurchase)) {
      const convertedPurchase = convertNitroPurchaseToPurchase(nitroPurchase);
      listener(convertedPurchase);
    } else {
      RnIapConsole.error(
        'Invalid purchase data received from native:',
        nitroPurchase,
      );
    }
  };

  purchaseUpdatedListenerMap.set(listener, wrappedListener);
  let attached = false;
  try {
    IAP.instance.addPurchaseUpdatedListener(wrappedListener);
    attached = true;
  } catch (e) {
    const msg = toErrorMessage(e);
    if (msg.includes('Nitro runtime not installed')) {
      RnIapConsole.warn(
        '[purchaseUpdatedListener] Nitro not ready yet; listener inert until initConnection()',
      );
    } else {
      throw e;
    }
  }

  return {
    remove: () => {
      const wrapped = purchaseUpdatedListenerMap.get(listener);
      if (wrapped) {
        if (attached) {
          try {
            IAP.instance.removePurchaseUpdatedListener(wrapped);
          } catch {}
        }
        purchaseUpdatedListenerMap.delete(listener);
      }
    },
  };
};

export const purchaseErrorListener = (
  listener: (error: PurchaseError) => void,
): EventSubscription => {
  const wrapped: NitroPurchaseErrorListener = (error) => {
    listener({
      code: normalizeErrorCodeFromNative(error.code),
      message: error.message,
      productId: undefined,
    });
  };

  purchaseErrorListenerMap.set(listener, wrapped);
  let attached = false;
  try {
    IAP.instance.addPurchaseErrorListener(wrapped);
    attached = true;
  } catch (e) {
    const msg = toErrorMessage(e);
    if (msg.includes('Nitro runtime not installed')) {
      RnIapConsole.warn(
        '[purchaseErrorListener] Nitro not ready yet; listener inert until initConnection()',
      );
    } else {
      throw e;
    }
  }

  return {
    remove: () => {
      const stored = purchaseErrorListenerMap.get(listener);
      if (stored) {
        if (attached) {
          try {
            IAP.instance.removePurchaseErrorListener(stored);
          } catch {}
        }
        purchaseErrorListenerMap.delete(listener);
      }
    },
  };
};

export const promotedProductListenerIOS = (
  listener: (product: Product) => void,
): EventSubscription => {
  if (Platform.OS !== 'ios') {
    RnIapConsole.warn(
      'promotedProductListenerIOS: This listener is only available on iOS',
    );
    return {remove: () => {}};
  }

  const wrappedListener: NitroPromotedProductListener = (nitroProduct) => {
    if (validateNitroProduct(nitroProduct)) {
      const convertedProduct = convertNitroProductToProduct(nitroProduct);
      listener(convertedProduct);
    } else {
      RnIapConsole.error(
        'Invalid promoted product data received from native:',
        nitroProduct,
      );
    }
  };

  promotedProductListenerMap.set(listener, wrappedListener);
  let attached = false;
  try {
    IAP.instance.addPromotedProductListenerIOS(wrappedListener);
    attached = true;
  } catch (e) {
    const msg = toErrorMessage(e);
    if (msg.includes('Nitro runtime not installed')) {
      RnIapConsole.warn(
        '[promotedProductListenerIOS] Nitro not ready yet; listener inert until initConnection()',
      );
    } else {
      throw e;
    }
  }

  return {
    remove: () => {
      const wrapped = promotedProductListenerMap.get(listener);
      if (wrapped) {
        if (attached) {
          try {
            IAP.instance.removePromotedProductListenerIOS(wrapped);
          } catch {}
        }
        promotedProductListenerMap.delete(listener);
      }
    },
  };
};

/**
 * Add a listener for user choice billing events (Android only).
 * Fires when a user selects alternative billing in the User Choice Billing dialog.
 *
 * @param listener - Function to call when user chooses alternative billing
 * @returns EventSubscription with remove() method to unsubscribe
 * @platform Android
 *
 * @example
 * ```typescript
 * const subscription = userChoiceBillingListenerAndroid((details) => {
 *   console.log('User chose alternative billing');
 *   console.log('Products:', details.products);
 *   console.log('Token:', details.externalTransactionToken);
 *
 *   // Send token to backend for Google Play reporting
 *   await reportToGooglePlay(details.externalTransactionToken);
 * });
 *
 * // Later, remove the listener
 * subscription.remove();
 * ```
 */
type NitroUserChoiceBillingListener = Parameters<
  RnIap['addUserChoiceBillingListenerAndroid']
>[0];
const userChoiceBillingListenerMap = new WeakMap<
  (details: any) => void,
  NitroUserChoiceBillingListener
>();

export const userChoiceBillingListenerAndroid = (
  listener: (details: any) => void,
): EventSubscription => {
  if (Platform.OS !== 'android') {
    RnIapConsole.warn(
      'userChoiceBillingListenerAndroid: This listener is only available on Android',
    );
    return {remove: () => {}};
  }

  const wrappedListener: NitroUserChoiceBillingListener = (details) => {
    listener(details);
  };

  userChoiceBillingListenerMap.set(listener, wrappedListener);
  let attached = false;
  try {
    IAP.instance.addUserChoiceBillingListenerAndroid(wrappedListener);
    attached = true;
  } catch (e) {
    const msg = toErrorMessage(e);
    if (msg.includes('Nitro runtime not installed')) {
      RnIapConsole.warn(
        '[userChoiceBillingListenerAndroid] Nitro not ready yet; listener inert until initConnection()',
      );
    } else {
      throw e;
    }
  }

  return {
    remove: () => {
      const wrapped = userChoiceBillingListenerMap.get(listener);
      if (wrapped) {
        if (attached) {
          try {
            IAP.instance.removeUserChoiceBillingListenerAndroid(wrapped);
          } catch {}
        }
        userChoiceBillingListenerMap.delete(listener);
      }
    },
  };
};

// ------------------------------
// Query API
// ------------------------------

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
export const fetchProducts: QueryField<'fetchProducts'> = async (request) => {
  const {skus, type} = request;

  try {
    if (!skus?.length) {
      throw new Error('No SKUs provided');
    }

    const normalizedType = normalizeProductQueryType(type);

    const fetchAndConvert = async (
      nitroType: ReturnType<typeof toNitroProductType> | 'all',
    ) => {
      const nitroProducts = await IAP.instance.fetchProducts(skus, nitroType);
      const validProducts = nitroProducts.filter(validateNitroProduct);
      if (validProducts.length !== nitroProducts.length) {
        RnIapConsole.warn(
          `[fetchProducts] Some products failed validation: ${nitroProducts.length - validProducts.length} invalid`,
        );
      }
      return validProducts.map(convertNitroProductToProduct);
    };

    if (normalizedType === 'all') {
      const converted = await fetchAndConvert('all');

      RnIapConsole.debug(
        '[fetchProducts] Converted items before filtering:',
        converted.map((item) => ({
          id: item.id,
          type: item.type,
          offers: (item as ProductSubscriptionAndroid)
            .subscriptionOfferDetailsAndroid,
        })),
      );

      // For 'all' type, need to properly distinguish between products and subscriptions
      // On Android, check subscriptionOfferDetailsAndroid to determine if it's a real subscription
      const productItems = converted
        .filter((item): item is Product => {
          // iOS: check type
          if (Platform.OS === 'ios') {
            return item.type === 'in-app';
          }
          // Android: if subscriptionOfferDetailsAndroid has content, it's a subscription
          // Empty array or undefined means it's an in-app product (default)
          const androidItem = item as ProductAndroid;
          const hasSubscriptionOffers =
            androidItem.subscriptionOfferDetailsAndroid &&
            Array.isArray(androidItem.subscriptionOfferDetailsAndroid) &&
            androidItem.subscriptionOfferDetailsAndroid.length > 0;

          RnIapConsole.debug(
            `[fetchProducts] ${item.id}: type=${item.type}, subscriptionOfferDetailsAndroid=${
              androidItem.subscriptionOfferDetailsAndroid === undefined
                ? 'undefined'
                : Array.isArray(androidItem.subscriptionOfferDetailsAndroid)
                  ? `array(${androidItem.subscriptionOfferDetailsAndroid.length})`
                  : 'not-array'
            }, isProduct=${!hasSubscriptionOffers}`,
          );
          return !hasSubscriptionOffers; // Default is in-app product
        })
        .map((item) => {
          // Fix the type field for Android products that were incorrectly marked as 'subs'
          if (Platform.OS === 'android' && item.type === 'subs') {
            return {
              ...item,
              type: 'in-app' as const,
            };
          }
          return item;
        });

      const subscriptionItems = converted
        .filter((item) => {
          // iOS: check type
          if (Platform.OS === 'ios') {
            return item.type === 'subs';
          }
          // Android: only consider it a subscription if it has actual offers
          const androidItem = item as ProductAndroid;
          const hasSubscriptionOffers =
            androidItem.subscriptionOfferDetailsAndroid &&
            Array.isArray(androidItem.subscriptionOfferDetailsAndroid) &&
            androidItem.subscriptionOfferDetailsAndroid.length > 0;

          RnIapConsole.debug(
            `[fetchProducts-sub] ${item.id}: type=${item.type}, subscriptionOfferDetailsAndroid=${
              androidItem.subscriptionOfferDetailsAndroid === undefined
                ? 'undefined'
                : Array.isArray(androidItem.subscriptionOfferDetailsAndroid)
                  ? `array(${androidItem.subscriptionOfferDetailsAndroid.length})`
                  : 'not-array'
            }, isSub=${hasSubscriptionOffers}`,
          );
          return hasSubscriptionOffers;
        })
        .map((item) => {
          // Ensure subscription items have the correct type
          const subscription = convertProductToProductSubscription(item);
          return {
            ...subscription,
            type: 'subs' as const,
          };
        });

      RnIapConsole.debug(
        '[fetchProducts] After filtering - products:',
        productItems.length,
        'subs:',
        subscriptionItems.length,
      );
      return [...productItems, ...subscriptionItems] as FetchProductsResult;
    }

    const convertedProducts = await fetchAndConvert(
      toNitroProductType(normalizedType),
    );

    if (normalizedType === 'subs') {
      return convertedProducts.map(
        convertProductToProductSubscription,
      ) as FetchProductsResult;
    }

    return convertedProducts as FetchProductsResult;
  } catch (error) {
    RnIapConsole.error('[fetchProducts] Failed:', error);
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
export const getAvailablePurchases: QueryField<
  'getAvailablePurchases'
> = async (options) => {
  const alsoPublishToEventListenerIOS = Boolean(
    options?.alsoPublishToEventListenerIOS ?? false,
  );
  const onlyIncludeActiveItemsIOS = Boolean(
    options?.onlyIncludeActiveItemsIOS ?? true,
  );
  try {
    if (Platform.OS === 'ios') {
      const nitroOptions: NitroAvailablePurchasesOptions = {
        ios: {
          alsoPublishToEventListenerIOS,
          onlyIncludeActiveItemsIOS,
          alsoPublishToEventListener: alsoPublishToEventListenerIOS,
          onlyIncludeActiveItems: onlyIncludeActiveItemsIOS,
        },
      };
      const nitroPurchases =
        await IAP.instance.getAvailablePurchases(nitroOptions);

      const validPurchases = nitroPurchases.filter(validateNitroPurchase);
      if (validPurchases.length !== nitroPurchases.length) {
        RnIapConsole.warn(
          `[getAvailablePurchases] Some purchases failed validation: ${nitroPurchases.length - validPurchases.length} invalid`,
        );
      }

      return validPurchases.map(convertNitroPurchaseToPurchase);
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
        RnIapConsole.warn(
          `[getAvailablePurchases] Some Android purchases failed validation: ${allNitroPurchases.length - validPurchases.length} invalid`,
        );
      }

      return validPurchases.map(convertNitroPurchaseToPurchase);
    } else {
      throw new Error('Unsupported platform');
    }
  } catch (error) {
    RnIapConsole.error('Failed to get available purchases:', error);
    throw error;
  }
};

/**
 * Request the promoted product from the App Store (iOS only)
 * @returns Promise<Product | null> - The promoted product or null if none available
 * @platform iOS
 */
export const getPromotedProductIOS: QueryField<
  'getPromotedProductIOS'
> = async () => {
  if (Platform.OS !== 'ios') {
    return null;
  }

  try {
    const nitroProduct =
      typeof IAP.instance.getPromotedProductIOS === 'function'
        ? await IAP.instance.getPromotedProductIOS()
        : await IAP.instance.requestPromotedProductIOS();
    if (!nitroProduct) {
      return null;
    }
    const converted = convertNitroProductToProduct(nitroProduct);
    return converted.platform === 'ios' ? (converted as ProductIOS) : null;
  } catch (error) {
    RnIapConsole.error('[getPromotedProductIOS] Failed:', error);
    const parsedError = parseErrorStringToJsonObj(error);
    throw createPurchaseError({
      code: parsedError.code,
      message: parsedError.message,
      responseCode: parsedError.responseCode,
      debugMessage: parsedError.debugMessage,
    });
  }
};

export const requestPromotedProductIOS = getPromotedProductIOS;

export const getStorefrontIOS: QueryField<'getStorefrontIOS'> = async () => {
  if (Platform.OS !== 'ios') {
    throw new Error('getStorefrontIOS is only available on iOS');
  }

  try {
    const storefront = await IAP.instance.getStorefrontIOS();
    return storefront;
  } catch (error) {
    RnIapConsole.error('Failed to get storefront:', error);
    throw error;
  }
};

export const getStorefront: QueryField<'getStorefront'> = async () => {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    RnIapConsole.warn(
      '[getStorefront] Storefront lookup is only supported on iOS and Android.',
    );
    return '';
  }

  const hasUnifiedMethod = typeof IAP.instance.getStorefront === 'function';

  if (!hasUnifiedMethod && Platform.OS === 'ios') {
    return getStorefrontIOS();
  }

  if (!hasUnifiedMethod) {
    RnIapConsole.warn(
      '[getStorefront] Native getStorefront is not available on this build.',
    );
    return '';
  }

  try {
    const storefront = await IAP.instance.getStorefront();
    return storefront ?? '';
  } catch (error) {
    RnIapConsole.error(
      `[getStorefront] Failed to get storefront on ${Platform.OS}:`,
      error,
    );
    throw error;
  }
};

export const getAppTransactionIOS: QueryField<
  'getAppTransactionIOS'
> = async () => {
  if (Platform.OS !== 'ios') {
    throw new Error('getAppTransactionIOS is only available on iOS');
  }

  try {
    const appTransaction = await IAP.instance.getAppTransactionIOS();
    if (appTransaction == null) {
      return null;
    }

    if (typeof appTransaction === 'string') {
      const parsed = parseAppTransactionPayload(appTransaction);
      if (parsed) {
        return parsed;
      }
      throw new Error('Unable to parse app transaction payload');
    }

    if (typeof appTransaction === 'object' && appTransaction !== null) {
      return appTransaction as AppTransaction;
    }

    return null;
  } catch (error) {
    RnIapConsole.error('Failed to get app transaction:', error);
    throw error;
  }
};

export const subscriptionStatusIOS: QueryField<
  'subscriptionStatusIOS'
> = async (sku) => {
  if (Platform.OS !== 'ios') {
    throw new Error('subscriptionStatusIOS is only available on iOS');
  }

  try {
    const statuses = await IAP.instance.subscriptionStatusIOS(sku);
    if (!Array.isArray(statuses)) return [];
    return statuses
      .filter((status): status is NitroSubscriptionStatus => status != null)
      .map(convertNitroSubscriptionStatusToSubscriptionStatusIOS);
  } catch (error) {
    RnIapConsole.error('[subscriptionStatusIOS] Failed:', error);
    const parsedError = parseErrorStringToJsonObj(error);
    throw createPurchaseError({
      code: parsedError.code,
      message: parsedError.message,
      responseCode: parsedError.responseCode,
      debugMessage: parsedError.debugMessage,
    });
  }
};

export const currentEntitlementIOS: QueryField<
  'currentEntitlementIOS'
> = async (sku) => {
  if (Platform.OS !== 'ios') {
    return null;
  }

  try {
    const nitroPurchase = await IAP.instance.currentEntitlementIOS(sku);
    if (nitroPurchase) {
      const converted = convertNitroPurchaseToPurchase(nitroPurchase);
      return converted.platform === 'ios' ? (converted as PurchaseIOS) : null;
    }
    return null;
  } catch (error) {
    RnIapConsole.error('[currentEntitlementIOS] Failed:', error);
    const parsedError = parseErrorStringToJsonObj(error);
    throw createPurchaseError({
      code: parsedError.code,
      message: parsedError.message,
      responseCode: parsedError.responseCode,
      debugMessage: parsedError.debugMessage,
    });
  }
};

export const latestTransactionIOS: QueryField<'latestTransactionIOS'> = async (
  sku,
) => {
  if (Platform.OS !== 'ios') {
    return null;
  }

  try {
    const nitroPurchase = await IAP.instance.latestTransactionIOS(sku);
    if (nitroPurchase) {
      const converted = convertNitroPurchaseToPurchase(nitroPurchase);
      return converted.platform === 'ios' ? (converted as PurchaseIOS) : null;
    }
    return null;
  } catch (error) {
    RnIapConsole.error('[latestTransactionIOS] Failed:', error);
    const parsedError = parseErrorStringToJsonObj(error);
    throw createPurchaseError({
      code: parsedError.code,
      message: parsedError.message,
      responseCode: parsedError.responseCode,
      debugMessage: parsedError.debugMessage,
    });
  }
};

export const getPendingTransactionsIOS: QueryField<
  'getPendingTransactionsIOS'
> = async () => {
  if (Platform.OS !== 'ios') {
    return [];
  }

  try {
    const nitroPurchases = await IAP.instance.getPendingTransactionsIOS();
    return nitroPurchases
      .map(convertNitroPurchaseToPurchase)
      .filter(
        (purchase): purchase is PurchaseIOS => purchase.platform === 'ios',
      );
  } catch (error) {
    RnIapConsole.error('[getPendingTransactionsIOS] Failed:', error);
    const parsedError = parseErrorStringToJsonObj(error);
    throw createPurchaseError({
      code: parsedError.code,
      message: parsedError.message,
      responseCode: parsedError.responseCode,
      debugMessage: parsedError.debugMessage,
    });
  }
};

export const showManageSubscriptionsIOS: MutationField<
  'showManageSubscriptionsIOS'
> = async () => {
  if (Platform.OS !== 'ios') {
    return [];
  }

  try {
    const nitroPurchases = await IAP.instance.showManageSubscriptionsIOS();
    return nitroPurchases
      .map(convertNitroPurchaseToPurchase)
      .filter(
        (purchase): purchase is PurchaseIOS => purchase.platform === 'ios',
      );
  } catch (error) {
    RnIapConsole.error('[showManageSubscriptionsIOS] Failed:', error);
    const parsedError = parseErrorStringToJsonObj(error);
    throw createPurchaseError({
      code: parsedError.code,
      message: parsedError.message,
      responseCode: parsedError.responseCode,
      debugMessage: parsedError.debugMessage,
    });
  }
};

export const isEligibleForIntroOfferIOS: QueryField<
  'isEligibleForIntroOfferIOS'
> = async (groupID) => {
  if (Platform.OS !== 'ios') {
    return false;
  }

  try {
    return await IAP.instance.isEligibleForIntroOfferIOS(groupID);
  } catch (error) {
    RnIapConsole.error('[isEligibleForIntroOfferIOS] Failed:', error);
    const parsedError = parseErrorStringToJsonObj(error);
    throw createPurchaseError({
      code: parsedError.code,
      message: parsedError.message,
      responseCode: parsedError.responseCode,
      debugMessage: parsedError.debugMessage,
    });
  }
};

export const getReceiptDataIOS: QueryField<'getReceiptDataIOS'> = async () => {
  if (Platform.OS !== 'ios') {
    throw new Error('getReceiptDataIOS is only available on iOS');
  }

  RnIapConsole.warn(
    '[getReceiptDataIOS] ⚠️ iOS receipts contain ALL transactions, not just the latest one. ' +
      'For individual purchase validation, use getTransactionJwsIOS(productId) instead. ' +
      'See: https://react-native-iap.hyo.dev/docs/guides/receipt-validation',
  );

  try {
    return await IAP.instance.getReceiptDataIOS();
  } catch (error) {
    RnIapConsole.error('[getReceiptDataIOS] Failed:', error);
    const parsedError = parseErrorStringToJsonObj(error);
    throw createPurchaseError({
      code: parsedError.code,
      message: parsedError.message,
      responseCode: parsedError.responseCode,
      debugMessage: parsedError.debugMessage,
    });
  }
};

export const getReceiptIOS = async (): Promise<string> => {
  if (Platform.OS !== 'ios') {
    throw new Error('getReceiptIOS is only available on iOS');
  }

  RnIapConsole.warn(
    '[getReceiptIOS] ⚠️ iOS receipts contain ALL transactions, not just the latest one. ' +
      'For individual purchase validation, use getTransactionJwsIOS(productId) instead. ' +
      'See: https://react-native-iap.hyo.dev/docs/guides/receipt-validation',
  );

  try {
    if (typeof IAP.instance.getReceiptIOS === 'function') {
      return await IAP.instance.getReceiptIOS();
    }
    return await IAP.instance.getReceiptDataIOS();
  } catch (error) {
    RnIapConsole.error('[getReceiptIOS] Failed:', error);
    const parsedError = parseErrorStringToJsonObj(error);
    throw createPurchaseError({
      code: parsedError.code,
      message: parsedError.message,
      responseCode: parsedError.responseCode,
      debugMessage: parsedError.debugMessage,
    });
  }
};

export const requestReceiptRefreshIOS = async (): Promise<string> => {
  if (Platform.OS !== 'ios') {
    throw new Error('requestReceiptRefreshIOS is only available on iOS');
  }

  RnIapConsole.warn(
    '[requestReceiptRefreshIOS] ⚠️ iOS receipts contain ALL transactions, not just the latest one. ' +
      'For individual purchase validation, use getTransactionJwsIOS(productId) instead. ' +
      'See: https://react-native-iap.hyo.dev/docs/guides/receipt-validation',
  );

  try {
    if (typeof IAP.instance.requestReceiptRefreshIOS === 'function') {
      return await IAP.instance.requestReceiptRefreshIOS();
    }
    return await IAP.instance.getReceiptDataIOS();
  } catch (error) {
    RnIapConsole.error('[requestReceiptRefreshIOS] Failed:', error);
    const parsedError = parseErrorStringToJsonObj(error);
    throw createPurchaseError({
      code: parsedError.code,
      message: parsedError.message,
      responseCode: parsedError.responseCode,
      debugMessage: parsedError.debugMessage,
    });
  }
};

export const isTransactionVerifiedIOS: QueryField<
  'isTransactionVerifiedIOS'
> = async (sku) => {
  if (Platform.OS !== 'ios') {
    return false;
  }

  try {
    return await IAP.instance.isTransactionVerifiedIOS(sku);
  } catch (error) {
    RnIapConsole.error('[isTransactionVerifiedIOS] Failed:', error);
    const parsedError = parseErrorStringToJsonObj(error);
    throw createPurchaseError({
      code: parsedError.code,
      message: parsedError.message,
      responseCode: parsedError.responseCode,
      debugMessage: parsedError.debugMessage,
    });
  }
};

export const getTransactionJwsIOS: QueryField<'getTransactionJwsIOS'> = async (
  sku,
) => {
  if (Platform.OS !== 'ios') {
    return null;
  }

  try {
    return await IAP.instance.getTransactionJwsIOS(sku);
  } catch (error) {
    RnIapConsole.error('[getTransactionJwsIOS] Failed:', error);
    const parsedError = parseErrorStringToJsonObj(error);
    throw createPurchaseError({
      code: parsedError.code,
      message: parsedError.message,
      responseCode: parsedError.responseCode,
      debugMessage: parsedError.debugMessage,
    });
  }
};

// ------------------------------
// Mutation API
// ------------------------------

/**
 * Initialize connection to the store
 * @param config - Optional configuration including alternative billing mode for Android
 * @param config.alternativeBillingModeAndroid - Alternative billing mode: 'none', 'user-choice', or 'alternative-only'
 *
 * @example
 * ```typescript
 * // Standard billing (default)
 * await initConnection();
 *
 * // User choice billing (Android)
 * await initConnection({
 *   alternativeBillingModeAndroid: 'user-choice'
 * });
 *
 * // Alternative billing only (Android)
 * await initConnection({
 *   alternativeBillingModeAndroid: 'alternative-only'
 * });
 * ```
 */
export const initConnection: MutationField<'initConnection'> = async (
  config,
) => {
  try {
    return await IAP.instance.initConnection(
      config as Record<string, unknown> | undefined,
    );
  } catch (error) {
    RnIapConsole.error('Failed to initialize IAP connection:', error);
    const parsedError = parseErrorStringToJsonObj(error);
    throw createPurchaseError({
      code: parsedError.code,
      message: parsedError.message,
      responseCode: parsedError.responseCode,
      debugMessage: parsedError.debugMessage,
    });
  }
};

/**
 * End connection to the store
 */
export const endConnection: MutationField<'endConnection'> = async () => {
  try {
    if (!iapRef) return true;
    return await IAP.instance.endConnection();
  } catch (error) {
    RnIapConsole.error('Failed to end IAP connection:', error);
    const parsedError = parseErrorStringToJsonObj(error);
    throw createPurchaseError({
      code: parsedError.code,
      message: parsedError.message,
      responseCode: parsedError.responseCode,
      debugMessage: parsedError.debugMessage,
    });
  }
};

export const restorePurchases: MutationField<'restorePurchases'> = async () => {
  try {
    if (Platform.OS === 'ios') {
      await syncIOS();
    }

    await getAvailablePurchases({
      alsoPublishToEventListenerIOS: false,
      onlyIncludeActiveItemsIOS: true,
    });
  } catch (error) {
    RnIapConsole.error('Failed to restore purchases:', error);
    const parsedError = parseErrorStringToJsonObj(error);
    throw createPurchaseError({
      code: parsedError.code,
      message: parsedError.message,
      responseCode: parsedError.responseCode,
      debugMessage: parsedError.debugMessage,
    });
  }
};

/**
 * Request a purchase for products or subscriptions
 * ⚠️ Important: This is an event-based operation, not promise-based.
 * Listen for events through purchaseUpdatedListener or purchaseErrorListener.
 */
export const requestPurchase: MutationField<'requestPurchase'> = async (
  request,
) => {
  try {
    const {request: platformRequest, type} = request;
    const normalizedType = normalizeProductQueryType(type ?? 'in-app');
    const isSubs = isSubscriptionQuery(normalizedType);
    const perPlatformRequest = platformRequest as
      | RequestPurchasePropsByPlatforms
      | RequestSubscriptionPropsByPlatforms
      | undefined;

    if (!perPlatformRequest) {
      throw new Error('Missing purchase request configuration');
    }

    if (Platform.OS === 'ios') {
      const iosRequest = perPlatformRequest.ios;
      if (!iosRequest?.sku) {
        throw new Error(
          'Invalid request for iOS. The `sku` property is required.',
        );
      }
    } else if (Platform.OS === 'android') {
      const androidRequest = perPlatformRequest.android;
      if (!androidRequest?.skus?.length) {
        throw new Error(
          'Invalid request for Android. The `skus` property is required and must be a non-empty array.',
        );
      }
    } else {
      throw new Error('Unsupported platform');
    }

    const unifiedRequest: NitroPurchaseRequest = {};

    if (Platform.OS === 'ios' && perPlatformRequest.ios) {
      const iosRequest = isSubs
        ? (perPlatformRequest.ios as RequestSubscriptionIosProps)
        : (perPlatformRequest.ios as RequestPurchaseIosProps);

      const iosPayload: NonNullable<NitroPurchaseRequest['ios']> = {
        sku: iosRequest.sku,
      };

      const explicitAutoFinish =
        iosRequest.andDangerouslyFinishTransactionAutomatically ?? undefined;
      const autoFinish =
        explicitAutoFinish !== undefined
          ? explicitAutoFinish
          : isSubs
            ? true
            : undefined;
      if (autoFinish !== undefined) {
        iosPayload.andDangerouslyFinishTransactionAutomatically = autoFinish;
      }
      if (iosRequest.appAccountToken) {
        iosPayload.appAccountToken = iosRequest.appAccountToken;
      }
      if (typeof iosRequest.quantity === 'number') {
        iosPayload.quantity = iosRequest.quantity;
      }
      const offerRecord = toDiscountOfferRecordIOS(iosRequest.withOffer);
      if (offerRecord) {
        iosPayload.withOffer = offerRecord;
      }

      unifiedRequest.ios = iosPayload;
    }

    if (Platform.OS === 'android' && perPlatformRequest.android) {
      const androidRequest = isSubs
        ? (perPlatformRequest.android as RequestSubscriptionAndroidProps)
        : (perPlatformRequest.android as RequestPurchaseAndroidProps);

      const androidPayload: NonNullable<NitroPurchaseRequest['android']> = {
        skus: androidRequest.skus,
      };

      if (androidRequest.obfuscatedAccountIdAndroid) {
        androidPayload.obfuscatedAccountIdAndroid =
          androidRequest.obfuscatedAccountIdAndroid;
      }
      if (androidRequest.obfuscatedProfileIdAndroid) {
        androidPayload.obfuscatedProfileIdAndroid =
          androidRequest.obfuscatedProfileIdAndroid;
      }
      if (androidRequest.isOfferPersonalized != null) {
        androidPayload.isOfferPersonalized = androidRequest.isOfferPersonalized;
      }

      if (isSubs) {
        const subsRequest = androidRequest as RequestSubscriptionAndroidProps;
        if (subsRequest.purchaseTokenAndroid) {
          androidPayload.purchaseTokenAndroid =
            subsRequest.purchaseTokenAndroid;
        }
        if (subsRequest.replacementModeAndroid != null) {
          androidPayload.replacementModeAndroid =
            subsRequest.replacementModeAndroid;
        }
        androidPayload.subscriptionOffers = (
          subsRequest.subscriptionOffers ?? []
        )
          .filter(
            (offer): offer is AndroidSubscriptionOfferInput => offer != null,
          )
          .map((offer) => ({
            sku: offer.sku,
            offerToken: offer.offerToken,
          }));
      }

      unifiedRequest.android = androidPayload;
    }

    return await IAP.instance.requestPurchase(unifiedRequest);
  } catch (error) {
    RnIapConsole.error('Failed to request purchase:', error);
    const parsedError = parseErrorStringToJsonObj(error);
    throw createPurchaseError({
      code: parsedError.code,
      message: parsedError.message,
      responseCode: parsedError.responseCode,
      debugMessage: parsedError.debugMessage,
      productId: parsedError.productId,
    });
  }
};

/**
 * Finish a transaction (consume or acknowledge)
 * @param params - Transaction finish parameters
 * @param params.purchase - The purchase to finish
 * @param params.isConsumable - Whether this is a consumable product (Android only)
 * @returns Promise<void> - Resolves when the transaction is successfully finished
 *
 * @example
 * ```typescript
 * await finishTransaction({
 *   purchase: myPurchase,
 *   isConsumable: true
 * });
 * ```
 */
export const finishTransaction: MutationField<'finishTransaction'> = async (
  args,
) => {
  const {purchase, isConsumable} = args;
  try {
    let params: NitroFinishTransactionParamsInternal;
    if (Platform.OS === 'ios') {
      if (!purchase.id) {
        throw new Error('purchase.id required to finish iOS transaction');
      }
      params = {
        ios: {
          transactionId: purchase.id,
        },
      };
    } else if (Platform.OS === 'android') {
      const token = purchase.purchaseToken ?? undefined;

      if (!token) {
        throw new Error('purchaseToken required to finish Android transaction');
      }

      params = {
        android: {
          purchaseToken: token,
          isConsumable: isConsumable ?? false,
        },
      };
    } else {
      throw new Error('Unsupported platform');
    }

    const result = await IAP.instance.finishTransaction(params);
    const success = getSuccessFromPurchaseVariant(result, 'finishTransaction');
    if (!success) {
      throw new Error('Failed to finish transaction');
    }
    return;
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
        return;
      }
    }
    RnIapConsole.error('Failed to finish transaction:', error);
    throw error;
  }
};

/**
 * Acknowledge a purchase (Android only)
 * @param purchaseToken - The purchase token to acknowledge
 * @returns Promise<boolean> - Indicates whether the acknowledgement succeeded
 *
 * @example
 * ```typescript
 * await acknowledgePurchaseAndroid('purchase_token_here');
 * ```
 */
export const acknowledgePurchaseAndroid: MutationField<
  'acknowledgePurchaseAndroid'
> = async (purchaseToken) => {
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
    return getSuccessFromPurchaseVariant(result, 'acknowledgePurchaseAndroid');
  } catch (error) {
    RnIapConsole.error('Failed to acknowledge purchase Android:', error);
    const parsedError = parseErrorStringToJsonObj(error);
    throw createPurchaseError({
      code: parsedError.code,
      message: parsedError.message,
      responseCode: parsedError.responseCode,
      debugMessage: parsedError.debugMessage,
    });
  }
};

/**
 * Consume a purchase (Android only)
 * @param purchaseToken - The purchase token to consume
 * @returns Promise<boolean> - Indicates whether the consumption succeeded
 *
 * @example
 * ```typescript
 * await consumePurchaseAndroid('purchase_token_here');
 * ```
 */
export const consumePurchaseAndroid: MutationField<
  'consumePurchaseAndroid'
> = async (purchaseToken) => {
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
    return getSuccessFromPurchaseVariant(result, 'consumePurchaseAndroid');
  } catch (error) {
    RnIapConsole.error('Failed to consume purchase Android:', error);
    const parsedError = parseErrorStringToJsonObj(error);
    throw createPurchaseError({
      code: parsedError.code,
      message: parsedError.message,
      responseCode: parsedError.responseCode,
      debugMessage: parsedError.debugMessage,
    });
  }
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
export const validateReceipt: MutationField<'validateReceipt'> = async (
  options,
) => {
  const {sku, androidOptions} = options;
  try {
    const normalizedAndroidOptions =
      androidOptions != null
        ? {
            ...androidOptions,
            isSub:
              androidOptions.isSub == null
                ? undefined
                : Boolean(androidOptions.isSub),
          }
        : undefined;

    const params: NitroReceiptValidationParams = {
      sku,
      androidOptions: normalizedAndroidOptions,
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
    RnIapConsole.error('[validateReceipt] Failed:', error);
    const parsedError = parseErrorStringToJsonObj(error);
    throw createPurchaseError({
      code: parsedError.code,
      message: parsedError.message,
      responseCode: parsedError.responseCode,
      debugMessage: parsedError.debugMessage,
    });
  }
};

/**
 * Sync iOS purchases with App Store (iOS only)
 * @returns Promise<boolean>
 * @platform iOS
 */
export const syncIOS: MutationField<'syncIOS'> = async () => {
  if (Platform.OS !== 'ios') {
    throw new Error('syncIOS is only available on iOS');
  }

  try {
    const result = await IAP.instance.syncIOS();
    return Boolean(result);
  } catch (error) {
    RnIapConsole.error('[syncIOS] Failed:', error);
    const parsedError = parseErrorStringToJsonObj(error);
    throw createPurchaseError({
      code: parsedError.code,
      message: parsedError.message,
      responseCode: parsedError.responseCode,
      debugMessage: parsedError.debugMessage,
    });
  }
};

/**
 * Present the code redemption sheet for offer codes (iOS only)
 * @returns Promise<boolean> - Indicates whether the redemption sheet was presented
 * @platform iOS
 */
export const presentCodeRedemptionSheetIOS: MutationField<
  'presentCodeRedemptionSheetIOS'
> = async () => {
  if (Platform.OS !== 'ios') {
    return false;
  }

  try {
    const result = await IAP.instance.presentCodeRedemptionSheetIOS();
    return Boolean(result);
  } catch (error) {
    RnIapConsole.error('[presentCodeRedemptionSheetIOS] Failed:', error);
    const parsedError = parseErrorStringToJsonObj(error);
    throw createPurchaseError({
      code: parsedError.code,
      message: parsedError.message,
      responseCode: parsedError.responseCode,
      debugMessage: parsedError.debugMessage,
    });
  }
};

/**
 * Buy promoted product on iOS
 * @returns Promise<boolean> - true when the request triggers successfully
 * @platform iOS
 */
export const requestPurchaseOnPromotedProductIOS: MutationField<
  'requestPurchaseOnPromotedProductIOS'
> = async () => {
  if (Platform.OS !== 'ios') {
    throw new Error(
      'requestPurchaseOnPromotedProductIOS is only available on iOS',
    );
  }

  try {
    await IAP.instance.buyPromotedProductIOS();
    const pending = await IAP.instance.getPendingTransactionsIOS();
    const latest = pending.find((purchase) => purchase != null);
    if (!latest) {
      throw new Error('No promoted purchase available after request');
    }

    const converted = convertNitroPurchaseToPurchase(latest);
    if (converted.platform !== 'ios') {
      throw new Error('Promoted purchase result not available for iOS');
    }

    return true;
  } catch (error) {
    RnIapConsole.error('[requestPurchaseOnPromotedProductIOS] Failed:', error);
    const parsedError = parseErrorStringToJsonObj(error);
    throw createPurchaseError({
      code: parsedError.code,
      message: parsedError.message,
      responseCode: parsedError.responseCode,
      debugMessage: parsedError.debugMessage,
    });
  }
};

/**
 * Clear unfinished transactions on iOS
 * @returns Promise<boolean>
 * @platform iOS
 */
export const clearTransactionIOS: MutationField<
  'clearTransactionIOS'
> = async () => {
  if (Platform.OS !== 'ios') {
    return false;
  }

  try {
    await IAP.instance.clearTransactionIOS();
    return true;
  } catch (error) {
    RnIapConsole.error('[clearTransactionIOS] Failed:', error);
    const parsedError = parseErrorStringToJsonObj(error);
    throw createPurchaseError({
      code: parsedError.code,
      message: parsedError.message,
      responseCode: parsedError.responseCode,
      debugMessage: parsedError.debugMessage,
    });
  }
};

/**
 * Begin a refund request for a product on iOS 15+
 * @param sku - The product SKU to refund
 * @returns Promise<string | null> - The refund status or null if not available
 * @platform iOS
 */
export const beginRefundRequestIOS: MutationField<
  'beginRefundRequestIOS'
> = async (sku) => {
  if (Platform.OS !== 'ios') {
    throw new Error('beginRefundRequestIOS is only available on iOS');
  }

  try {
    const status = await IAP.instance.beginRefundRequestIOS(sku);
    return status ?? null;
  } catch (error) {
    RnIapConsole.error('[beginRefundRequestIOS] Failed:', error);
    const parsedError = parseErrorStringToJsonObj(error);
    throw createPurchaseError({
      code: parsedError.code,
      message: parsedError.message,
      responseCode: parsedError.responseCode,
      debugMessage: parsedError.debugMessage,
    });
  }
};

/**
 * Get subscription status for a product (iOS only)
 * @param sku - The product SKU
 * @returns Promise<SubscriptionStatusIOS[]> - Array of subscription status objects
 * @throws Error when called on non-iOS platforms or when IAP is not initialized
 * @platform iOS
 */
/**
 * Get current entitlement for a product (iOS only)
 * @param sku - The product SKU
 * @returns Promise<Purchase | null> - Current entitlement or null
 * @platform iOS
 */
/**
 * Get latest transaction for a product (iOS only)
 * @param sku - The product SKU
 * @returns Promise<Purchase | null> - Latest transaction or null
 * @platform iOS
 */
/**
 * Get pending transactions (iOS only)
 * @returns Promise<Purchase[]> - Array of pending transactions
 * @platform iOS
 */
/**
 * Show manage subscriptions screen (iOS only)
 * @returns Promise<Purchase[]> - Subscriptions where auto-renewal status changed
 * @platform iOS
 */
/**
 * Check if user is eligible for intro offer (iOS only)
 * @param groupID - The subscription group ID
 * @returns Promise<boolean> - Eligibility status
 * @platform iOS
 */
/**
 * Get receipt data (iOS only)
 * @returns Promise<string> - Base64 encoded receipt data
 * @platform iOS
 */
/**
 * Check if transaction is verified (iOS only)
 * @param sku - The product SKU
 * @returns Promise<boolean> - Verification status
 * @platform iOS
 */
/**
 * Get transaction JWS representation (iOS only)
 * @param sku - The product SKU
 * @returns Promise<string | null> - JWS representation or null
 * @platform iOS
 */
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
/**
 * Deeplinks to native interface that allows users to manage their subscriptions
 * Cross-platform alias aligning with expo-iap
 */
export const deepLinkToSubscriptions: MutationField<
  'deepLinkToSubscriptions'
> = async (options) => {
  const resolvedOptions = options ?? undefined;

  if (Platform.OS === 'android') {
    await IAP.instance.deepLinkToSubscriptionsAndroid?.({
      skuAndroid: resolvedOptions?.skuAndroid ?? undefined,
      packageNameAndroid: resolvedOptions?.packageNameAndroid ?? undefined,
    });
    return;
  }
  if (Platform.OS === 'ios') {
    try {
      if (typeof IAP.instance.deepLinkToSubscriptionsIOS === 'function') {
        await IAP.instance.deepLinkToSubscriptionsIOS();
      } else {
        await IAP.instance.showManageSubscriptionsIOS();
      }
    } catch (error) {
      RnIapConsole.warn('[deepLinkToSubscriptions] Failed on iOS:', error);
    }
  }
};

export const deepLinkToSubscriptionsIOS = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios') {
    throw new Error('deepLinkToSubscriptionsIOS is only available on iOS');
  }

  try {
    if (typeof IAP.instance.deepLinkToSubscriptionsIOS === 'function') {
      return await IAP.instance.deepLinkToSubscriptionsIOS();
    }
    await IAP.instance.showManageSubscriptionsIOS();
    return true;
  } catch (error) {
    RnIapConsole.error('[deepLinkToSubscriptionsIOS] Failed:', error);
    const parsedError = parseErrorStringToJsonObj(error);
    throw createPurchaseError({
      code: parsedError.code,
      message: parsedError.message,
      responseCode: parsedError.responseCode,
      debugMessage: parsedError.debugMessage,
    });
  }
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
/**
 * Get all active subscriptions with detailed information (OpenIAP compliant)
 * Returns an array of active subscriptions. If subscriptionIds is not provided,
 * returns all active subscriptions. Platform-specific fields are populated based
 * on the current platform.
 *
 * On iOS, this uses the native getActiveSubscriptions method which includes
 * renewalInfoIOS with details about subscription renewal status, pending
 * upgrades/downgrades, and auto-renewal preferences.
 *
 * @param subscriptionIds - Optional array of subscription IDs to filter by
 * @returns Promise<ActiveSubscription[]> - Array of active subscriptions
 */
export const getActiveSubscriptions: QueryField<
  'getActiveSubscriptions'
> = async (subscriptionIds) => {
  try {
    // Use native getActiveSubscriptions on both platforms
    // iOS: includes renewalInfoIOS with subscription lifecycle info
    // Android: uses OpenIAP which calls Google Play Billing's getActiveSubscriptions
    const activeSubscriptions = await IAP.instance.getActiveSubscriptions(
      subscriptionIds ?? undefined,
    );

    // Convert NitroActiveSubscription to ActiveSubscription
    return activeSubscriptions.map(
      (sub: NitroActiveSubscription): ActiveSubscription => ({
        productId: sub.productId,
        isActive: sub.isActive,
        transactionId: sub.transactionId,
        purchaseToken: sub.purchaseToken ?? null,
        transactionDate: sub.transactionDate,
        // iOS specific fields
        expirationDateIOS: sub.expirationDateIOS ?? null,
        environmentIOS: sub.environmentIOS ?? null,
        willExpireSoon: sub.willExpireSoon ?? null,
        daysUntilExpirationIOS: sub.daysUntilExpirationIOS ?? null,
        // 🆕 renewalInfoIOS - subscription lifecycle information (iOS only)
        renewalInfoIOS: sub.renewalInfoIOS
          ? {
              willAutoRenew: sub.renewalInfoIOS.willAutoRenew ?? false,
              autoRenewPreference:
                sub.renewalInfoIOS.autoRenewPreference ?? null,
              pendingUpgradeProductId:
                sub.renewalInfoIOS.pendingUpgradeProductId ?? null,
              renewalDate: sub.renewalInfoIOS.renewalDate ?? null,
              expirationReason: sub.renewalInfoIOS.expirationReason ?? null,
              isInBillingRetry: sub.renewalInfoIOS.isInBillingRetry ?? null,
              gracePeriodExpirationDate:
                sub.renewalInfoIOS.gracePeriodExpirationDate ?? null,
              priceIncreaseStatus:
                sub.renewalInfoIOS.priceIncreaseStatus ?? null,
              renewalOfferType: sub.renewalInfoIOS.renewalOfferType ?? null,
              renewalOfferId: sub.renewalInfoIOS.renewalOfferId ?? null,
            }
          : null,
        // Android specific fields
        autoRenewingAndroid: sub.autoRenewingAndroid ?? null,
        basePlanIdAndroid: sub.basePlanIdAndroid ?? null,
        currentPlanId:
          sub.currentPlanId ?? (Platform.OS === 'ios' ? sub.productId : null),
        purchaseTokenAndroid: sub.purchaseTokenAndroid ?? null,
      }),
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('NotPrepared')) {
      RnIapConsole.error('IAP connection not initialized:', error);
      throw error;
    }
    RnIapConsole.error('Failed to get active subscriptions:', error);
    const parsedError = parseErrorStringToJsonObj(error);
    throw createPurchaseError({
      code: parsedError.code,
      message: parsedError.message,
      responseCode: parsedError.responseCode,
      debugMessage: parsedError.debugMessage,
    });
  }
};

// OLD IMPLEMENTATION - REPLACED WITH NATIVE CALL
/*
export const getActiveSubscriptions_OLD: QueryField<
  'getActiveSubscriptions'
> = async (subscriptionIds) => {
  try {
    // Get all available purchases first
    const allPurchases = await getAvailablePurchases();

    // For the critical bug fix: this function was previously returning ALL purchases
    // Now we properly filter for subscriptions only

    // In production with real data, Android subscription filtering is done via platform-specific calls
    // But for backward compatibility and test support, we also check platform-specific fields

    // Since expirationDateIOS and subscriptionGroupIdIOS are not available in NitroPurchase,
    // we need to rely on other indicators or assume all purchases are subscriptions
    // when called from getActiveSubscriptions
    const purchases = allPurchases;

    // Filter for subscriptions and map to ActiveSubscription format
    const subscriptions = purchases
      .filter((purchase) => {
        // Filter by subscription IDs if provided
        if (subscriptionIds && subscriptionIds.length > 0) {
          return subscriptionIds.includes(purchase.productId);
        }
        return true;
      })
      .map((purchase): ActiveSubscription => {
        // Safe access to platform-specific fields with type guards
        const expirationDateIOS =
          'expirationDateIOS' in purchase
            ? ((purchase as PurchaseIOS).expirationDateIOS ?? null)
            : null;

        const environmentIOS =
          'environmentIOS' in purchase
            ? ((purchase as PurchaseIOS).environmentIOS ?? null)
            : null;

        const autoRenewingAndroid =
          'autoRenewingAndroid' in purchase || 'isAutoRenewing' in purchase
            ? ((purchase as PurchaseAndroid).autoRenewingAndroid ??
              (purchase as PurchaseAndroid).isAutoRenewing) // deprecated - use isAutoRenewing instead
            : null;

        // 🆕 Extract renewalInfoIOS if available
        const renewalInfoIOS =
          'renewalInfoIOS' in purchase
            ? ((purchase as PurchaseIOS).renewalInfoIOS ?? null)
            : null;

        return {
          productId: purchase.productId,
          isActive: true, // If it's in availablePurchases, it's active
          // Backend validation fields - use transactionId ?? id for proper field mapping
          transactionId: purchase.transactionId ?? purchase.id,
          purchaseToken: purchase.purchaseToken,
          transactionDate: purchase.transactionDate,
          // Platform-specific fields
          expirationDateIOS,
          autoRenewingAndroid,
          environmentIOS,
          renewalInfoIOS,
          // Convenience fields
          willExpireSoon: false, // Would need to calculate based on expiration date
          daysUntilExpirationIOS:
            expirationDateIOS != null
              ? Math.ceil(
                  (expirationDateIOS - Date.now()) / (1000 * 60 * 60 * 24),
                )
              : null,
        };
      });

    return subscriptions;
  } catch (error) {
    RnIapConsole.error('Failed to get active subscriptions:', error);
    const errorJson = parseErrorStringToJsonObj(error);
    throw new Error(errorJson.message);
  }
};

/**
 * Check if the user has any active subscriptions (OpenIAP compliant)
 * Returns true if the user has at least one active subscription, false otherwise.
 * If subscriptionIds is provided, only checks for those specific subscriptions.
 *
 * @param subscriptionIds - Optional array of subscription IDs to check
 * @returns Promise<boolean> - True if there are active subscriptions
 */
export const hasActiveSubscriptions: QueryField<
  'hasActiveSubscriptions'
> = async (subscriptionIds) => {
  try {
    const activeSubscriptions = await getActiveSubscriptions(subscriptionIds);
    return activeSubscriptions.length > 0;
  } catch (error) {
    // If there's an error getting subscriptions, return false
    RnIapConsole.warn('Error checking active subscriptions:', error);
    return false;
  }
};

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

// ============================================================================
// Internal Helpers
// ============================================================================

type NitroDiscountOfferRecord = NonNullable<
  NonNullable<NitroPurchaseRequest['ios']>['withOffer']
>;

const toDiscountOfferRecordIOS = (
  offer: DiscountOfferInputIOS | null | undefined,
): NitroDiscountOfferRecord | undefined => {
  if (!offer) {
    return undefined;
  }
  return {
    identifier: offer.identifier,
    keyIdentifier: offer.keyIdentifier,
    nonce: offer.nonce,
    signature: offer.signature,
    timestamp: String(offer.timestamp),
  };
};

const toNitroProductType = (
  type?: ProductTypeInput | ProductQueryType | null,
): 'inapp' | 'subs' | 'all' => {
  if (type === 'subs') {
    return 'subs';
  }
  if (type === 'all') {
    return 'all';
  }
  if (type === 'inapp') {
    RnIapConsole.warn(LEGACY_INAPP_WARNING);
    return 'inapp';
  }
  return 'inapp';
};

const isSubscriptionQuery = (type?: ProductQueryType | null): boolean =>
  type === 'subs';

const normalizeProductQueryType = (
  type?: ProductQueryType | string | null,
): ProductQueryType => {
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
      RnIapConsole.warn(LEGACY_INAPP_WARNING);
      return 'in-app';
    }
    if (normalized === 'in-app') {
      return 'in-app';
    }
  }
  return 'in-app';
};

// ============================================================================
// ALTERNATIVE BILLING APIs
// ============================================================================

// ------------------------------
// Android Alternative Billing
// ------------------------------

/**
 * Check if alternative billing is available for this user/device (Android only).
 * Step 1 of alternative billing flow.
 *
 * @returns Promise<boolean> - true if available, false otherwise
 * @throws Error if billing client not ready
 * @platform Android
 *
 * @example
 * ```typescript
 * const isAvailable = await checkAlternativeBillingAvailabilityAndroid();
 * if (isAvailable) {
 *   // Proceed with alternative billing flow
 * }
 * ```
 */
export const checkAlternativeBillingAvailabilityAndroid: MutationField<
  'checkAlternativeBillingAvailabilityAndroid'
> = async () => {
  if (Platform.OS !== 'android') {
    throw new Error('Alternative billing is only supported on Android');
  }
  try {
    return await IAP.instance.checkAlternativeBillingAvailabilityAndroid();
  } catch (error) {
    RnIapConsole.error(
      'Failed to check alternative billing availability:',
      error,
    );
    throw error;
  }
};

/**
 * Show alternative billing information dialog to user (Android only).
 * Step 2 of alternative billing flow.
 * Must be called BEFORE processing payment in your payment system.
 *
 * @returns Promise<boolean> - true if user accepted, false if user canceled
 * @throws Error if billing client not ready
 * @platform Android
 *
 * @example
 * ```typescript
 * const userAccepted = await showAlternativeBillingDialogAndroid();
 * if (userAccepted) {
 *   // Process payment in your payment system
 *   const success = await processCustomPayment();
 *   if (success) {
 *     // Create reporting token
 *     const token = await createAlternativeBillingTokenAndroid();
 *     // Send token to your backend for Google Play reporting
 *   }
 * }
 * ```
 */
export const showAlternativeBillingDialogAndroid: MutationField<
  'showAlternativeBillingDialogAndroid'
> = async () => {
  if (Platform.OS !== 'android') {
    throw new Error('Alternative billing is only supported on Android');
  }
  try {
    return await IAP.instance.showAlternativeBillingDialogAndroid();
  } catch (error) {
    RnIapConsole.error('Failed to show alternative billing dialog:', error);
    throw error;
  }
};

/**
 * Create external transaction token for Google Play reporting (Android only).
 * Step 3 of alternative billing flow.
 * Must be called AFTER successful payment in your payment system.
 * Token must be reported to Google Play backend within 24 hours.
 *
 * @param sku - Optional product SKU that was purchased
 * @returns Promise<string | null> - Token string or null if creation failed
 * @throws Error if billing client not ready
 * @platform Android
 *
 * @example
 * ```typescript
 * const token = await createAlternativeBillingTokenAndroid('premium_subscription');
 * if (token) {
 *   // Send token to your backend
 *   await fetch('/api/report-transaction', {
 *     method: 'POST',
 *     body: JSON.stringify({ token, sku: 'premium_subscription' })
 *   });
 * }
 * ```
 */
export const createAlternativeBillingTokenAndroid: MutationField<
  'createAlternativeBillingTokenAndroid'
> = async (sku?: string) => {
  if (Platform.OS !== 'android') {
    throw new Error('Alternative billing is only supported on Android');
  }
  try {
    return await IAP.instance.createAlternativeBillingTokenAndroid(sku ?? null);
  } catch (error) {
    RnIapConsole.error('Failed to create alternative billing token:', error);
    throw error;
  }
};

// ------------------------------
// iOS External Purchase
// ------------------------------

/**
 * Check if the device can present an external purchase notice sheet (iOS 18.2+).
 *
 * @returns Promise<boolean> - true if notice sheet can be presented
 * @platform iOS
 *
 * @example
 * ```typescript
 * const canPresent = await canPresentExternalPurchaseNoticeIOS();
 * if (canPresent) {
 *   // Present notice before external purchase
 *   const result = await presentExternalPurchaseNoticeSheetIOS();
 * }
 * ```
 */
export const canPresentExternalPurchaseNoticeIOS: QueryField<
  'canPresentExternalPurchaseNoticeIOS'
> = async () => {
  if (Platform.OS !== 'ios') {
    return false;
  }
  try {
    return await IAP.instance.canPresentExternalPurchaseNoticeIOS();
  } catch (error) {
    RnIapConsole.error(
      'Failed to check external purchase notice availability:',
      error,
    );
    return false;
  }
};

/**
 * Present an external purchase notice sheet to inform users about external purchases (iOS 18.2+).
 * This must be called before opening an external purchase link.
 *
 * @returns Promise<ExternalPurchaseNoticeResultIOS> - Result with action and error if any
 * @platform iOS
 *
 * @example
 * ```typescript
 * const result = await presentExternalPurchaseNoticeSheetIOS();
 * if (result.result === 'continue') {
 *   // User chose to continue, open external purchase link
 *   await presentExternalPurchaseLinkIOS('https://your-website.com/purchase');
 * }
 * ```
 */
export const presentExternalPurchaseNoticeSheetIOS: MutationField<
  'presentExternalPurchaseNoticeSheetIOS'
> = async () => {
  if (Platform.OS !== 'ios') {
    throw new Error('External purchase is only supported on iOS');
  }
  try {
    return (await IAP.instance.presentExternalPurchaseNoticeSheetIOS()) as any;
  } catch (error) {
    RnIapConsole.error(
      'Failed to present external purchase notice sheet:',
      error,
    );
    throw error;
  }
};

/**
 * Present an external purchase link to redirect users to your website (iOS 16.0+).
 *
 * @param url - The external purchase URL to open
 * @returns Promise<ExternalPurchaseLinkResultIOS> - Result with success status and error if any
 * @platform iOS
 *
 * @example
 * ```typescript
 * const result = await presentExternalPurchaseLinkIOS('https://your-website.com/purchase');
 * if (result.success) {
 *   console.log('User completed external purchase');
 * }
 * ```
 */
export const presentExternalPurchaseLinkIOS: MutationField<
  'presentExternalPurchaseLinkIOS'
> = async (url) => {
  if (Platform.OS !== 'ios') {
    throw new Error('External purchase is only supported on iOS');
  }
  try {
    return (await IAP.instance.presentExternalPurchaseLinkIOS(url)) as any;
  } catch (error) {
    RnIapConsole.error('Failed to present external purchase link:', error);
    throw error;
  }
};
