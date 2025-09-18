// External dependencies
import {Platform} from 'react-native';
// Side-effect import ensures Nitro installs its dispatcher before IAP is used (no-op in tests)
import 'react-native-nitro-modules';
import {NitroModules} from 'react-native-nitro-modules';

// Internal modules
import type {
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
import {normalizeErrorCodeFromNative} from './utils/errorMapping';
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
      console.error(
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
      console.warn(
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
      console.warn(
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
    console.warn(
      'promotedProductListenerIOS: This listener is only available on iOS',
    );
    return {remove: () => {}};
  }

  const wrappedListener: NitroPromotedProductListener = (nitroProduct) => {
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

  promotedProductListenerMap.set(listener, wrappedListener);
  let attached = false;
  try {
    IAP.instance.addPromotedProductListenerIOS(wrappedListener);
    attached = true;
  } catch (e) {
    const msg = toErrorMessage(e);
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
        console.warn(
          `[fetchProducts] Some products failed validation: ${nitroProducts.length - validProducts.length} invalid`,
        );
      }
      return validProducts.map(convertNitroProductToProduct);
    };

    if (normalizedType === 'all') {
      const converted = await fetchAndConvert('all');
      const productItems = converted.filter(
        (item): item is Product => item.type === 'in-app',
      );
      const subscriptionItems = converted
        .filter((item) => item.type === 'subs')
        .map(convertProductToProductSubscription);

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
    console.error('[fetchProducts] Failed:', error);
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
        console.warn(
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
        console.warn(
          `[getAvailablePurchases] Some Android purchases failed validation: ${allNitroPurchases.length - validPurchases.length} invalid`,
        );
      }

      return validPurchases.map(convertNitroPurchaseToPurchase);
    } else {
      throw new Error('Unsupported platform');
    }
  } catch (error) {
    console.error('Failed to get available purchases:', error);
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
    const nitroProduct = await IAP.instance.requestPromotedProductIOS();
    if (!nitroProduct) {
      return null;
    }
    const converted = convertNitroProductToProduct(nitroProduct);
    return converted.platform === 'ios' ? (converted as ProductIOS) : null;
  } catch (error) {
    console.error('[getPromotedProductIOS] Failed:', error);
    const errorJson = parseErrorStringToJsonObj(error);
    throw new Error(errorJson.message);
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
    console.error('Failed to get storefront:', error);
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
    console.error('Failed to get app transaction:', error);
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
    console.error('[subscriptionStatusIOS] Failed:', error);
    const errorJson = parseErrorStringToJsonObj(error);
    throw new Error(errorJson.message);
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
    console.error('[currentEntitlementIOS] Failed:', error);
    const errorJson = parseErrorStringToJsonObj(error);
    throw new Error(errorJson.message);
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
    console.error('[latestTransactionIOS] Failed:', error);
    const errorJson = parseErrorStringToJsonObj(error);
    throw new Error(errorJson.message);
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
    console.error('[getPendingTransactionsIOS] Failed:', error);
    const errorJson = parseErrorStringToJsonObj(error);
    throw new Error(errorJson.message);
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
    console.error('[showManageSubscriptionsIOS] Failed:', error);
    const errorJson = parseErrorStringToJsonObj(error);
    throw new Error(errorJson.message);
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
    console.error('[isEligibleForIntroOfferIOS] Failed:', error);
    const errorJson = parseErrorStringToJsonObj(error);
    throw new Error(errorJson.message);
  }
};

export const getReceiptDataIOS: QueryField<'getReceiptDataIOS'> = async () => {
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

export const isTransactionVerifiedIOS: QueryField<
  'isTransactionVerifiedIOS'
> = async (sku) => {
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

export const getTransactionJwsIOS: QueryField<'getTransactionJwsIOS'> = async (
  sku,
) => {
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

// ------------------------------
// Mutation API
// ------------------------------

/**
 * Initialize connection to the store
 */
export const initConnection: MutationField<'initConnection'> = async () => {
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
export const endConnection: MutationField<'endConnection'> = async () => {
  try {
    if (!iapRef) return true;
    return await IAP.instance.endConnection();
  } catch (error) {
    console.error('Failed to end IAP connection:', error);
    throw error;
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
    console.error('Failed to restore purchases:', error);
    throw error;
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
    console.error('Failed to request purchase:', error);
    throw error;
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
    console.error('Failed to finish transaction:', error);
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
    console.error('Failed to acknowledge purchase Android:', error);
    throw error;
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
    console.error('Failed to consume purchase Android:', error);
    throw error;
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
export const syncIOS: MutationField<'syncIOS'> = async () => {
  if (Platform.OS !== 'ios') {
    throw new Error('syncIOS is only available on iOS');
  }

  try {
    const result = await IAP.instance.syncIOS();
    return Boolean(result);
  } catch (error) {
    console.error('[syncIOS] Failed:', error);
    const errorJson = parseErrorStringToJsonObj(error);
    throw new Error(errorJson.message);
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
    console.error('[presentCodeRedemptionSheetIOS] Failed:', error);
    const errorJson = parseErrorStringToJsonObj(error);
    throw new Error(errorJson.message);
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
    console.error('[requestPurchaseOnPromotedProductIOS] Failed:', error);
    throw error;
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
      await IAP.instance.showManageSubscriptionsIOS();
    } catch (error) {
      console.warn('[deepLinkToSubscriptions] Failed on iOS:', error);
    }
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
    console.warn(LEGACY_INAPP_WARNING);
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
      console.warn(LEGACY_INAPP_WARNING);
      return 'in-app';
    }
    if (normalized === 'in-app') {
      return 'in-app';
    }
  }
  return 'in-app';
};
