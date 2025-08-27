import { Platform, NativeModules } from 'react-native';
import { IapModule } from './IapModule';
import type { Iap as IapInterface } from './Iap.nitro';
import type { NitroPurchase, NitroPurchaseError } from './types/NitroTypes';

// Initialize the Android native module to ensure context is available
if (Platform.OS === 'android' && NativeModules.IapModule) {
  NativeModules.IapModule.initializeModule();
}

import type {
  Product,
  ProductPurchase,
  Purchase,
  PurchaseError,
  PurchaseResult,
  SubscriptionProduct,
  SubscriptionPurchase,
  PurchaseRequest,
  RequestSubscriptionAndroidProps,
  RequestSubscriptionIosProps,
  SubscriptionProductAndroid,
  SubscriptionProductIOS,
} from './types';

export * from './types';
// Re-export modules but avoid duplicates
export {
  // Android-specific exports
  isProductAndroid,
  deepLinkToSubscriptionsAndroid,
  validateReceiptAndroid,
  acknowledgePurchaseAndroid,
  consumeProductAndroid,
} from './modules/android';
export {
  // iOS-specific exports
  isProductIOS,
  sync,
  isEligibleForIntroOffer,
  subscriptionStatus,
  currentEntitlement,
  latestTransaction,
  beginRefundRequest,
  showManageSubscriptions,
  getReceiptIos,
  isTransactionVerified,
  getTransactionJws,
  getAppTransactionIOS,
  validateReceiptIOS,
  presentCodeRedemptionSheet,
  clearTransaction,
  getPendingTransactions,
} from './modules/ios';
export * from './useIAP';
export * from './utils/errorMapping';

// Export subscription helpers
export {
  getActiveSubscriptions,
  hasActiveSubscriptions,
  type ActiveSubscription,
} from './helpers/subscription';

// Re-export IapModule for backward compatibility
export { IapModule };

// Export Iap as the main module
export const Iap = IapModule;

// Get the native constant value
export const PI = IapModule?.PI || 3.14159;

export enum IapEvent {
  PurchaseUpdated = 'purchase-updated',
  PurchaseError = 'purchase-error',
  /** @deprecated Use PurchaseUpdated instead. This will be removed in a future version. */
  TransactionIapUpdated = 'iap-transaction-updated',
  PromotedProductIOS = 'promoted-product-ios',
}

export function setValueAsync(value: string) {
  return IapModule.setValueAsync(value);
}

// Event listener management
class IapEventManager {
  private purchaseUpdateCallbacks: Set<(purchase: Purchase) => void> =
    new Set();
  private purchaseErrorCallbacks: Set<(error: PurchaseError) => void> =
    new Set();
  private isListeningToPurchaseUpdates = false;
  private isListeningToPurchaseErrors = false;

  constructor(private iapModule: IapInterface) {}

  addListener(eventName: string, listener: (...args: any[]) => void) {
    if (eventName === IapEvent.PurchaseUpdated) {
      this.purchaseUpdateCallbacks.add(
        listener as (purchase: Purchase) => void
      );
      if (!this.isListeningToPurchaseUpdates) {
        this.iapModule.listenToPurchaseUpdates((purchase: NitroPurchase) => {
          // Convert NitroPurchase to Purchase for compatibility
          const convertedPurchase = {
            ...purchase,
            platform: (purchase.platform || Platform.OS) as 'ios' | 'android',
          } as unknown as Purchase;
          this.purchaseUpdateCallbacks.forEach((cb) => cb(convertedPurchase));
        });
        this.isListeningToPurchaseUpdates = true;
      }
    } else if (eventName === IapEvent.PurchaseError) {
      this.purchaseErrorCallbacks.add(
        listener as (error: PurchaseError) => void
      );
      if (!this.isListeningToPurchaseErrors) {
        this.iapModule.listenToPurchaseErrors((error: NitroPurchaseError) => {
          // Convert NitroPurchaseError to PurchaseError for compatibility
          const convertedError = error as unknown as PurchaseError;
          this.purchaseErrorCallbacks.forEach((cb) => cb(convertedError));
        });
        this.isListeningToPurchaseErrors = true;
      }
    }

    return {
      remove: () => {
        this.removeListener(eventName, listener);
      },
    };
  }

  removeListener(eventName: string, listener: (...args: any[]) => void) {
    if (eventName === IapEvent.PurchaseUpdated) {
      this.purchaseUpdateCallbacks.delete(
        listener as (purchase: Purchase) => void
      );
      if (
        this.purchaseUpdateCallbacks.size === 0 &&
        this.isListeningToPurchaseUpdates
      ) {
        this.iapModule.removePurchaseUpdateListener();
        this.isListeningToPurchaseUpdates = false;
      }
    } else if (eventName === IapEvent.PurchaseError) {
      this.purchaseErrorCallbacks.delete(
        listener as (error: PurchaseError) => void
      );
      if (
        this.purchaseErrorCallbacks.size === 0 &&
        this.isListeningToPurchaseErrors
      ) {
        this.iapModule.removePurchaseErrorListener();
        this.isListeningToPurchaseErrors = false;
      }
    }
  }
}

// Create the event manager instance
let eventManager: IapEventManager | null = null;

// Lazy initialization to avoid immediate module access
const getEventManager = () => {
  if (!eventManager) {
    eventManager = new IapEventManager(IapModule);
  }
  return eventManager;
};

// Export emitter for backward compatibility
export const emitter = {
  addListener: (eventName: string, listener: (...args: any[]) => void) => {
    return getEventManager().addListener(eventName, listener);
  },
  removeListener: (eventName: string, listener: (...args: any[]) => void) => {
    getEventManager().removeListener(eventName, listener);
  },
};

export const purchaseUpdatedListener = (
  listener: (event: Purchase) => void
) => {
  const emitterSubscription = emitter.addListener(
    IapEvent.PurchaseUpdated,
    listener
  );
  return emitterSubscription;
};

export const purchaseErrorListener = (
  listener: (error: PurchaseError) => void
) => {
  return emitter.addListener(IapEvent.PurchaseError, listener);
};

/**
 * iOS-only listener for App Store promoted product events.
 * This fires when a user taps on a promoted product in the App Store.
 *
 * @param listener - Callback function that receives the promoted product details
 * @returns EventSubscription that can be used to unsubscribe
 *
 * @example
 * ```typescript
 * const subscription = promotedProductListenerIOS((product) => {
 *   console.log('Promoted product:', product);
 *   // Handle the promoted product
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
) => {
  if (Platform.OS !== 'ios') {
    console.warn(
      'promotedProductListenerIOS: This listener is only available on iOS'
    );
    return { remove: () => {} };
  }
  return emitter.addListener(IapEvent.PromotedProductIOS, listener);
};

export function initConnection() {
  return IapModule.initConnection();
}

export const getProducts = async (skus: string[]): Promise<Product[]> => {
  console.warn(
    "`getProducts` is deprecated. Use `requestProducts({ skus, type: 'inapp' })` instead. This function will be removed in version 3.0.0."
  );
  if (!skus?.length) {
    return Promise.reject(new Error('"skus" is required'));
  }

  if (Platform.OS === 'ios') {
    const rawItems = await IapModule.getItems(skus);
    return rawItems.map((item) => ({
      ...item,
      platform: 'ios' as const,
    })) as Product[];
  } else if (Platform.OS === 'android') {
    const products = await IapModule.getItemsByType('inapp', skus);
    return products.map((item) => ({
      ...item,
      platform: 'android' as const,
    })) as Product[];
  }
  return Promise.reject(new Error('Unsupported Platform'));
};

export const getSubscriptions = async (
  skus: string[]
): Promise<SubscriptionProduct[]> => {
  console.warn(
    "`getSubscriptions` is deprecated. Use `requestProducts({ skus, type: 'subs' })` instead. This function will be removed in version 3.0.0."
  );
  if (!skus?.length) {
    return Promise.reject(new Error('"skus" is required'));
  }

  if (Platform.OS === 'ios') {
    const rawItems = await IapModule.getItems(skus);
    return rawItems.map((item) => ({
      ...item,
      platform: 'ios' as const,
    })) as SubscriptionProductIOS[];
  } else if (Platform.OS === 'android') {
    const rawItems = await IapModule.getItemsByType('subs', skus);
    return rawItems.map((item) => ({
      ...item,
      platform: 'android' as const,
    })) as unknown as SubscriptionProductAndroid[];
  }
  return Promise.reject(new Error('Unsupported Platform'));
};

export async function endConnection(): Promise<boolean> {
  return IapModule.endConnection();
}

/**
 * Request products with unified API (v2.7.0+)
 *
 * @param params - Product request configuration
 * @param params.skus - Array of product SKUs to fetch
 * @param params.type - Type of products: 'inapp' for regular products (default) or 'subs' for subscriptions
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
}): Promise<Product[] | SubscriptionProduct[]> => {
  console.log('[requestProducts] Called with:', { skus, type });

  if (!skus?.length) {
    throw new Error('No SKUs provided');
  }

  if (Platform.OS === 'ios') {
    console.log(
      '[requestProducts] iOS: Calling IapModule.getItems with:',
      skus
    );
    const rawItems = await IapModule.getItems(skus);
    console.log('[requestProducts] iOS: Raw items received:', rawItems);

    const filteredItems = rawItems.map((item: any) => ({
      ...item,
      platform: 'ios' as const,
    }));

    console.log('[requestProducts] iOS: Filtered items:', filteredItems);

    if (type === 'subs') {
      return filteredItems as unknown as SubscriptionProduct[];
    }
    return filteredItems as Product[];
  }

  if (Platform.OS === 'android') {
    const items = await IapModule.getItemsByType(type, skus);
    const filteredItems = items.map((item: any) => ({
      ...item,
      platform: 'android' as const,
    }));

    if (type === 'subs') {
      return filteredItems as unknown as SubscriptionProduct[];
    }
    return filteredItems as Product[];
  }

  throw new Error('Unsupported platform');
};

/**
 * @deprecated Use `getPurchaseHistories` instead. This function will be removed in version 3.0.0.
 */
export const getPurchaseHistory = async ({
  alsoPublishToEventListener = false,
  onlyIncludeActiveItems = false,
}: {
  alsoPublishToEventListener?: boolean;
  onlyIncludeActiveItems?: boolean;
} = {}): Promise<Purchase[]> => {
  console.warn(
    '`getPurchaseHistory` is deprecated. Use `getPurchaseHistories` instead. This function will be removed in version 3.0.0.'
  );
  return getPurchaseHistories({
    alsoPublishToEventListener,
    onlyIncludeActiveItems,
  });
};

export const getPurchaseHistories = ({
  alsoPublishToEventListener = false,
  onlyIncludeActiveItems = false,
}: {
  alsoPublishToEventListener?: boolean;
  onlyIncludeActiveItems?: boolean;
} = {}): Promise<Purchase[]> =>
  (
    Platform.select({
      ios: async () => {
        const items = await IapModule.getAvailableItems(
          alsoPublishToEventListener,
          onlyIncludeActiveItems
        );
        return items.map((item) => ({
          ...item,
          platform: 'ios' as const,
        })) as Purchase[];
      },
      android: async () => {
        // getPurchaseHistoryByType was removed in Google Play Billing Library v8
        // Android doesn't provide purchase history anymore, only active purchases
        console.warn(
          'getPurchaseHistories is not supported on Android with Google Play Billing Library v8. Use getAvailablePurchases instead to get active purchases.'
        );
        return [];
      },
    }) || (() => Promise.resolve([]))
  )();

export const getAvailablePurchases = async ({
  alsoPublishToEventListener = false,
  onlyIncludeActiveItems = true,
}: {
  alsoPublishToEventListener?: boolean;
  onlyIncludeActiveItems?: boolean;
} = {}): Promise<Purchase[]> => {
  if (Platform.OS === 'ios') {
    const items = await IapModule.getAvailableItems(
      alsoPublishToEventListener,
      onlyIncludeActiveItems
    );
    return items.map((item) => ({
      ...item,
      platform: 'ios' as const,
    })) as Purchase[];
  } else if (Platform.OS === 'android') {
    const products = await IapModule.getAvailableItemsByType('inapp');
    const subscriptions = await IapModule.getAvailableItemsByType('subs');
    const allItems = products.concat(subscriptions);
    return allItems.map((item) => {
      // Parse Android subscription data from dataAndroid field
      let autoRenewingAndroid: boolean | undefined;
      if (item.dataAndroid || item.transactionReceipt) {
        try {
          const purchaseData = JSON.parse(
            item.dataAndroid || item.transactionReceipt
          );
          if ('autoRenewing' in purchaseData) {
            autoRenewingAndroid = purchaseData.autoRenewing;
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }

      return {
        ...item,
        platform: 'android' as const,
        ...(autoRenewingAndroid !== undefined && { autoRenewingAndroid }),
      };
    }) as Purchase[];
  }
  return [] as Purchase[];
};

// Helper to normalize request props to platform-specific format (expo-iap compatible)
const normalizeRequestProps = (
  request: any,
  platform: 'ios' | 'android'
): any => {
  // Check if request uses new expo-iap format with ios/android fields
  if (typeof request === 'object' && request !== null) {
    if ('ios' in request || 'android' in request) {
      // New format: { ios: {...}, android: {...} }
      return platform === 'ios' ? request.ios : request.android;
    }
  }
  // Old format: direct properties
  return request;
};

export const requestPurchase = (
  requestObj: PurchaseRequest | { request: any; type?: 'inapp' | 'subs' }
): Promise<
  | ProductPurchase
  | SubscriptionPurchase
  | ProductPurchase[]
  | SubscriptionPurchase[]
  | void
> => {
  console.log('[index.tsx] requestPurchase called with:', requestObj);
  const { request, type = 'inapp' } = requestObj;

  if (Platform.OS === 'ios') {
    const normalizedRequest = normalizeRequestProps(request, 'ios');
    console.log(
      '[index.tsx] iOS platform, normalized request:',
      normalizedRequest
    );

    if (!normalizedRequest?.sku) {
      throw new Error(
        'Invalid request for iOS. The `sku` property is required and must be a string.'
      );
    }

    const { sku, appAccountToken, quantity, withOffer } = normalizedRequest;
    console.log('[index.tsx] iOS purchase params:', {
      sku,
      appAccountToken,
      quantity,
      withOffer,
    });

    // Back-compat: accept unified prop name without platform suffix
    const finishAutomatically =
      normalizedRequest.andDangerouslyFinishTransactionAutomatically ??
      normalizedRequest.andDangerouslyFinishTransactionAutomaticallyIOS ??
      false;

    return (async () => {
      console.log('[index.tsx] Calling IapModule.buyProduct with:', {
        sku,
        finishAutomatically,
        appAccountToken,
        quantity: quantity ?? -1,
        withOffer,
      });

      const purchase = await IapModule.buyProduct(
        sku,
        finishAutomatically,
        appAccountToken,
        quantity ?? -1,
        withOffer
      );

      console.log('[index.tsx] IapModule.buyProduct returned:', purchase);

      const purchaseWithPlatform: ProductPurchase = {
        ...purchase,
        platform: 'ios' as const,
      };
      return type === 'inapp'
        ? purchaseWithPlatform
        : ({
            ...purchaseWithPlatform,
            autoRenewingAndroid: false,
          } as SubscriptionPurchase);
    })();
  }

  if (Platform.OS === 'android') {
    const normalizedRequest = normalizeRequestProps(request, 'android');
    console.log(
      '[index.tsx] Android platform, normalized request:',
      normalizedRequest
    );

    if (!normalizedRequest?.skus?.length) {
      throw new Error(
        'Invalid request for Android. The `skus` property is required and must be a non-empty array.'
      );
    }

    if (type === 'inapp') {
      const {
        skus,
        obfuscatedAccountIdAndroid,
        obfuscatedProfileIdAndroid,
        isOfferPersonalized,
      } = normalizedRequest;

      return (async () => {
        const purchases = await IapModule.buyItemByType({
          skus,
          obfuscatedAccountIdAndroid,
          obfuscatedProfileIdAndroid,
          isOfferPersonalized: isOfferPersonalized ?? false,
        });
        return purchases.map((item) => ({
          ...item,
          platform: 'android' as const,
        }));
      })();
    }

    if (type === 'subs') {
      const {
        skus,
        obfuscatedAccountIdAndroid,
        obfuscatedProfileIdAndroid,
        isOfferPersonalized,
        subscriptionOffers = [],
        replacementModeAndroid = -1,
        purchaseTokenAndroid,
        purchaseToken,
      } = normalizedRequest;

      return (async () => {
        // For subscriptions, pass the additional fields as part of the base RequestPurchaseAndroidProps
        // The native implementation will handle these appropriately
        const purchases = await IapModule.buyItemByType({
          skus,
          obfuscatedAccountIdAndroid,
          obfuscatedProfileIdAndroid,
          isOfferPersonalized: isOfferPersonalized ?? false,
          // Pass subscription-specific fields through the same interface
          // Native code will check for these and handle accordingly
          subscriptionOffers: subscriptionOffers as any,
          replacementModeAndroid: replacementModeAndroid as any,
          purchaseTokenAndroid: (purchaseTokenAndroid || purchaseToken) as any,
        } as any);
        return purchases.map((item) => ({
          ...item,
          platform: 'android' as const,
          autoRenewingAndroid: true,
        })) as SubscriptionPurchase[];
      })();
    }

    throw new Error(
      "Invalid request for Android: Expected a 'RequestPurchaseAndroidProps' object with a valid 'skus' array or a 'RequestSubscriptionAndroidProps' object with 'skus' and 'subscriptionOffers'."
    );
  }

  return Promise.resolve(); // Fallback for unsupported platforms
};

/**
 * @deprecated Use `requestPurchase({ request, type: 'subs' })` instead. This method will be removed in version 3.0.0+.
 */
export const requestSubscription = async (
  request: RequestSubscriptionAndroidProps | RequestSubscriptionIosProps
): Promise<SubscriptionPurchase | SubscriptionPurchase[] | null | void> => {
  console.warn(
    "`requestSubscription` is deprecated. Use `requestPurchase({ request, type: 'subs' })` instead. This method will be removed in version 3.0.0+."
  );
  return (await requestPurchase({ request, type: 'subs' })) as
    | SubscriptionPurchase
    | SubscriptionPurchase[]
    | null
    | void;
};

export const finishTransaction = async ({
  purchase,
  isConsumable,
}: {
  purchase: Purchase;
  isConsumable?: boolean;
}): Promise<PurchaseResult | boolean> => {
  console.log(
    '[finishTransaction] Called with purchase:',
    purchase,
    'isConsumable:',
    isConsumable
  );

  if (Platform.OS === 'ios') {
    const transactionId = purchase.transactionId;
    if (!transactionId) {
      return Promise.reject(
        new Error('transactionId required to finish iOS transaction')
      );
    }
    await IapModule.finishTransaction(transactionId);
    return true;
  } else if (Platform.OS === 'android') {
    // Try to get token from various possible sources
    // First check if NitroPurchase has purchaseToken directly
    let token = (purchase as any).purchaseToken;

    if (!token) {
      // Try legacy fields
      token =
        ('purchaseTokenAndroid' in purchase
          ? (purchase as any).purchaseTokenAndroid
          : undefined) ??
        ('purchaseToken' in purchase &&
        typeof (purchase as any).purchaseToken === 'string'
          ? (purchase as any).purchaseToken
          : undefined);
    }

    // If not found, try to parse from dataAndroid
    if (!token && 'dataAndroid' in purchase && (purchase as any).dataAndroid) {
      try {
        const data = JSON.parse((purchase as any).dataAndroid);
        token = data.purchaseToken;
        console.log(
          '[finishTransaction] Extracted token from dataAndroid:',
          token
        );
      } catch (e) {
        console.error('[finishTransaction] Failed to parse dataAndroid:', e);
      }
    }

    // If still not found, try to parse from transactionReceipt (originalJson)
    if (!token && purchase.transactionReceipt) {
      try {
        const receiptData = JSON.parse(purchase.transactionReceipt);
        token = receiptData.purchaseToken;
        console.log(
          '[finishTransaction] Extracted token from transactionReceipt:',
          token
        );
      } catch (e) {
        console.error(
          '[finishTransaction] Failed to parse transactionReceipt:',
          e
        );
      }
    }

    console.log(
      '[finishTransaction] Android - token:',
      token,
      'isConsumable:',
      isConsumable
    );

    if (!token) {
      return Promise.reject(
        new Error('purchaseToken is required to finish transaction')
      );
    }
    if (isConsumable) {
      console.log('[finishTransaction] Consuming product with token:', token);
      await IapModule.consumeProduct(token);
      console.log('[finishTransaction] Product consumed successfully');
      return true;
    } else {
      console.log(
        '[finishTransaction] Acknowledging purchase with token:',
        token
      );
      await IapModule.acknowledgePurchase(token);
      console.log('[finishTransaction] Purchase acknowledged successfully');
      return true;
    }
  }
  return Promise.reject(new Error('Unsupported Platform'));
};

/**
 * Retrieves the current storefront information from iOS App Store
 *
 * @returns Promise resolving to the storefront country code
 * @throws Error if called on non-iOS platform
 *
 * @example
 * ```typescript
 * const storefront = await getStorefrontIOS();
 * console.log(storefront); // 'US'
 * ```
 *
 * @platform iOS
 */
export const getStorefrontIOS = (): Promise<string> => {
  if (Platform.OS !== 'ios') {
    console.warn('getStorefrontIOS: This method is only available on iOS');
    return Promise.resolve('');
  }
  // Note: This functionality needs to be added to the native iOS implementation
  // For now, we'll use getPlatform as a placeholder
  return Promise.resolve('US'); // Default fallback
};

/**
 * @deprecated Use `getStorefrontIOS` instead. This function will be removed in version 3.0.0.
 */
export const getStorefront = (): Promise<string> => {
  console.warn(
    '`getStorefront` is deprecated. Use `getStorefrontIOS` instead. This function will be removed in version 3.0.0.'
  );
  return getStorefrontIOS();
};

/**
 * Deeplinks to native interface that allows users to manage their subscriptions
 * @param options.skuAndroid - Required for Android to locate specific subscription (ignored on iOS)
 * @param options.packageNameAndroid - Required for Android to identify your app (ignored on iOS)
 *
 * @returns Promise that resolves when the deep link is successfully opened
 *
 * @throws {Error} When called on unsupported platform or when required Android parameters are missing
 *
 * @example
 * import { deepLinkToSubscriptions } from 'react-native-iap';
 *
 * // Works on both iOS and Android
 * await deepLinkToSubscriptions({
 *   skuAndroid: 'your_subscription_sku',
 *   packageNameAndroid: 'com.example.app'
 * });
 */
export const deepLinkToSubscriptions = async (options: {
  skuAndroid?: string;
  packageNameAndroid?: string;
}): Promise<void> => {
  if (Platform.OS === 'ios') {
    const { showManageSubscriptions } = await import('./modules/ios');
    return showManageSubscriptions().then(() => {});
  }

  if (Platform.OS === 'android') {
    if (!options.skuAndroid) {
      return Promise.reject(
        new Error(
          'skuAndroid is required to locate subscription in Android Store'
        )
      );
    }
    if (!options.packageNameAndroid) {
      return Promise.reject(
        new Error(
          'packageNameAndroid is required to identify your app in Android Store'
        )
      );
    }
    const { deepLinkToSubscriptionsAndroid } = await import(
      './modules/android'
    );
    return deepLinkToSubscriptionsAndroid({
      sku: options.skuAndroid,
    });
  }

  return Promise.reject(new Error(`Unsupported platform: ${Platform.OS}`));
};

/**
 * Internal receipt validation function (NOT RECOMMENDED for production use)
 *
 * WARNING: This function performs client-side validation which is NOT secure.
 * For production apps, always validate receipts on your secure server:
 * - iOS: Send receipt data to Apple's verification endpoint from your server
 * - Android: Use Google Play Developer API with service account credentials
 */
export const validateReceipt = async (
  sku: string,
  androidOptions?: {
    packageName: string;
    productToken: string;
    accessToken: string;
    isSub?: boolean;
  }
): Promise<any> => {
  if (Platform.OS === 'ios') {
    const { validateReceiptIOS } = await import('./modules/ios');
    return await validateReceiptIOS(sku);
  } else if (Platform.OS === 'android') {
    if (
      !androidOptions ||
      !androidOptions.packageName ||
      !androidOptions.productToken ||
      !androidOptions.accessToken
    ) {
      throw new Error(
        'Android validation requires packageName, productToken, and accessToken'
      );
    }
    const { validateReceiptAndroid } = await import('./modules/android');
    return await validateReceiptAndroid({
      packageName: androidOptions.packageName,
      productId: sku,
      productToken: androidOptions.productToken,
      accessToken: androidOptions.accessToken,
      isSub: androidOptions.isSub,
    });
  } else {
    throw new Error('Platform not supported');
  }
};
