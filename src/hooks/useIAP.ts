// External dependencies
import {useCallback, useEffect, useState, useRef} from 'react';
import {Platform} from 'react-native';

// Internal modules
import {
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  promotedProductListenerIOS,
  getAvailablePurchases,
  finishTransaction as finishTransactionInternal,
  requestPurchase as requestPurchaseInternal,
  fetchProducts,
  validateReceipt as validateReceiptInternal,
  getActiveSubscriptions,
  hasActiveSubscriptions,
  restorePurchases as restorePurchasesTopLevel,
  getPromotedProductIOS,
  requestPurchaseOnPromotedProductIOS,
} from '../';

// Types
import {ProductQueryType, ErrorCode} from '../types';
import type {
  ActiveSubscription,
  Product,
  Purchase,
  PurchaseError,
  ProductSubscription,
  PurchaseParams,
} from '../types';
import type {FinishTransactionParams} from '../';
import type {NitroPurchaseResult} from '../specs/RnIap.nitro';
import {normalizeErrorCodeFromNative} from '../utils/errorMapping';

// Types for event subscriptions
interface EventSubscription {
  remove(): void;
}

type UseIap = {
  connected: boolean;
  products: Product[];
  promotedProductsIOS: Purchase[];
  promotedProductIdIOS?: string;
  subscriptions: ProductSubscription[];
  availablePurchases: Purchase[];
  currentPurchase?: Purchase;
  currentPurchaseError?: PurchaseError;
  promotedProductIOS?: Product;
  activeSubscriptions: ActiveSubscription[];
  clearCurrentPurchase: () => void;
  clearCurrentPurchaseError: () => void;
  finishTransaction: ({
    purchase,
    isConsumable,
  }: FinishTransactionParams) => Promise<NitroPurchaseResult | boolean>;
  getAvailablePurchases: (skus?: string[]) => Promise<void>;
  fetchProducts: (params: {
    skus: string[];
    type?: ProductQueryType | null;
  }) => Promise<void>;
  /**
   * @deprecated Use fetchProducts({ skus, type: 'inapp' }) instead. This method will be removed in version 3.0.0.
   * Note: This method internally uses fetchProducts, so no deprecation warning is shown.
   */
  getProducts: (skus: string[]) => Promise<void>;
  /**
   * @deprecated Use fetchProducts({ skus, type: 'subs' }) instead. This method will be removed in version 3.0.0.
   * Note: This method internally uses fetchProducts, so no deprecation warning is shown.
   */
  getSubscriptions: (skus: string[]) => Promise<void>;
  requestPurchase: (params: PurchaseParams) => Promise<any>;
  validateReceipt: (
    sku: string,
    androidOptions?: {
      packageName: string;
      productToken: string;
      accessToken: string;
      isSub?: boolean;
    },
  ) => Promise<any>;
  restorePurchases: () => Promise<void>;
  getPromotedProductIOS: () => Promise<Product | null>;
  requestPurchaseOnPromotedProductIOS: () => Promise<void>;
  getActiveSubscriptions: (
    subscriptionIds?: string[],
  ) => Promise<ActiveSubscription[]>;
  hasActiveSubscriptions: (subscriptionIds?: string[]) => Promise<boolean>;
};

export interface UseIapOptions {
  onPurchaseSuccess?: (purchase: Purchase) => void;
  onPurchaseError?: (error: PurchaseError) => void;
  onSyncError?: (error: Error) => void;
  shouldAutoSyncPurchases?: boolean; // New option to control auto-syncing
  onPromotedProductIOS?: (product: Product) => void;
}

/**
 * React Hook for managing In-App Purchases.
 * See documentation at https://react-native-iap.hyo.dev/docs/hooks/useIAP
 */
export function useIAP(options?: UseIapOptions): UseIap {
  const [connected, setConnected] = useState<boolean>(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [promotedProductsIOS] = useState<Purchase[]>([]);
  const [subscriptions, setSubscriptions] = useState<ProductSubscription[]>([]);
  const [availablePurchases, setAvailablePurchases] = useState<Purchase[]>([]);
  const [currentPurchase, setCurrentPurchase] = useState<Purchase>();
  const [promotedProductIOS, setPromotedProductIOS] = useState<Product>();
  const [currentPurchaseError, setCurrentPurchaseError] =
    useState<PurchaseError>();
  const [promotedProductIdIOS] = useState<string>();
  const [activeSubscriptions, setActiveSubscriptions] = useState<
    ActiveSubscription[]
  >([]);

  const optionsRef = useRef<UseIapOptions | undefined>(options);
  const connectedRef = useRef<boolean>(false);

  // Helper function to merge arrays with duplicate checking
  const mergeWithDuplicateCheck = useCallback(
    <T>(
      existingItems: T[],
      newItems: T[],
      getKey: (item: T) => string,
    ): T[] => {
      const merged = [...existingItems];
      newItems.forEach((newItem) => {
        const isDuplicate = merged.some(
          (existingItem) => getKey(existingItem) === getKey(newItem),
        );
        if (!isDuplicate) {
          merged.push(newItem);
        }
      });
      return merged;
    },
    [],
  );

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    connectedRef.current = connected;
  }, [connected]);

  const subscriptionsRef = useRef<{
    purchaseUpdate?: EventSubscription;
    purchaseError?: EventSubscription;
    promotedProductsIOS?: EventSubscription;
    promotedProductIOS?: EventSubscription;
  }>({});

  const subscriptionsRefState = useRef<ProductSubscription[]>([]);

  useEffect(() => {
    subscriptionsRefState.current = subscriptions;
  }, [subscriptions]);

  const clearCurrentPurchase = useCallback(() => {
    setCurrentPurchase(undefined);
  }, []);

  const clearCurrentPurchaseError = useCallback(() => {
    setCurrentPurchaseError(undefined);
  }, []);

  const getProductsInternal = useCallback(
    async (skus: string[]): Promise<void> => {
      try {
        const result = await fetchProducts({
          skus,
          type: ProductQueryType.InApp,
        });
        setProducts((prevProducts: Product[]) =>
          mergeWithDuplicateCheck(
            prevProducts,
            result as Product[],
            (product: Product) => product.id,
          ),
        );
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    },
    [mergeWithDuplicateCheck],
  );

  const getSubscriptionsInternal = useCallback(
    async (skus: string[]): Promise<void> => {
      try {
        const result = await fetchProducts({
          skus,
          type: ProductQueryType.Subs,
        });
        setSubscriptions((prevSubscriptions: ProductSubscription[]) =>
          mergeWithDuplicateCheck(
            prevSubscriptions,
            result as ProductSubscription[],
            (subscription: ProductSubscription) => subscription.id,
          ),
        );
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
      }
    },
    [mergeWithDuplicateCheck],
  );

  const fetchProductsInternal = useCallback(
    async (params: {
      skus: string[];
      type?: ProductQueryType | null;
    }): Promise<void> => {
      if (!connectedRef.current) {
        console.warn(
          '[useIAP] fetchProducts called before connection; skipping',
        );
        return;
      }
      try {
        const result = await fetchProducts(params);
        if (params.type === ProductQueryType.Subs) {
          setSubscriptions((prevSubscriptions: ProductSubscription[]) =>
            mergeWithDuplicateCheck(
              prevSubscriptions,
              result as ProductSubscription[],
              (subscription: ProductSubscription) => subscription.id,
            ),
          );
        } else {
          setProducts((prevProducts: Product[]) =>
            mergeWithDuplicateCheck(
              prevProducts,
              result as Product[],
              (product: Product) => product.id,
            ),
          );
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    },
    [mergeWithDuplicateCheck],
  );

  const getAvailablePurchasesInternal = useCallback(
    async (_skus?: string[]): Promise<void> => {
      try {
        const result = await getAvailablePurchases({
          alsoPublishToEventListenerIOS: false,
          onlyIncludeActiveItemsIOS: true,
        });
        setAvailablePurchases(result);
      } catch (error) {
        console.error('Error fetching available purchases:', error);
      }
    },
    [],
  );

  const getActiveSubscriptionsInternal = useCallback(
    async (subscriptionIds?: string[]): Promise<ActiveSubscription[]> => {
      try {
        const result = await getActiveSubscriptions(subscriptionIds);
        setActiveSubscriptions(result);
        return result;
      } catch (error) {
        console.error('Error getting active subscriptions:', error);
        // Don't clear existing activeSubscriptions on error - preserve current state
        // This prevents the UI from showing empty state when there are temporary network issues
        return [];
      }
    },
    [],
  );

  const hasActiveSubscriptionsInternal = useCallback(
    async (subscriptionIds?: string[]): Promise<boolean> => {
      try {
        return await hasActiveSubscriptions(subscriptionIds);
      } catch (error) {
        console.error('Error checking active subscriptions:', error);
        return false;
      }
    },
    [],
  );

  const finishTransaction = useCallback(
    async ({
      purchase,
      isConsumable,
    }: {
      purchase: Purchase;
      isConsumable?: boolean;
    }): Promise<NitroPurchaseResult | boolean> => {
      try {
        return await finishTransactionInternal({
          purchase,
          isConsumable,
        });
      } catch (err) {
        throw err;
      } finally {
        if (purchase.id === currentPurchase?.id) {
          clearCurrentPurchase();
        }
        if (purchase.id === currentPurchaseError?.productId) {
          clearCurrentPurchaseError();
        }
      }
    },
    [
      currentPurchase?.id,
      currentPurchaseError?.productId,
      clearCurrentPurchase,
      clearCurrentPurchaseError,
    ],
  );

  const requestPurchaseWithReset = useCallback(
    async (requestObj: PurchaseParams) => {
      clearCurrentPurchase();
      clearCurrentPurchaseError();

      try {
        return await requestPurchaseInternal(requestObj);
      } catch (error) {
        throw error;
      }
    },
    [clearCurrentPurchase, clearCurrentPurchaseError],
  );

  // No local restorePurchases; use the top-level helper via returned API

  const validateReceipt = useCallback(
    async (
      sku: string,
      androidOptions?: {
        packageName: string;
        productToken: string;
        accessToken: string;
        isSub?: boolean;
      },
    ) => {
      return validateReceiptInternal(sku, androidOptions);
    },
    [],
  );

  const initIapWithSubscriptions = useCallback(async (): Promise<void> => {
    // Register listeners BEFORE initConnection to avoid race condition
    subscriptionsRef.current.purchaseUpdate = purchaseUpdatedListener(
      async (purchase: Purchase) => {
        setCurrentPurchaseError(undefined);
        setCurrentPurchase(purchase);
        // Always refresh subscription state after a purchase event
        try {
          await getActiveSubscriptionsInternal();
          await getAvailablePurchasesInternal();
        } catch (e) {
          console.warn('[useIAP] post-purchase refresh failed:', e);
        }
        if (optionsRef.current?.onPurchaseSuccess) {
          optionsRef.current.onPurchaseSuccess(purchase);
        }
      },
    );

    subscriptionsRef.current.purchaseError = purchaseErrorListener((error) => {
      const mappedError: PurchaseError = {
        code: normalizeErrorCodeFromNative(error.code),
        message: error.message,
        productId: undefined,
      };
      // Ignore init error until connected
      if (
        mappedError.code === ErrorCode.InitConnection &&
        !connectedRef.current
      ) {
        return;
      }
      setCurrentPurchase(undefined);
      setCurrentPurchaseError(mappedError);
      if (optionsRef.current?.onPurchaseError) {
        optionsRef.current.onPurchaseError(mappedError);
      }
    });

    if (Platform.OS === 'ios') {
      subscriptionsRef.current.promotedProductsIOS = promotedProductListenerIOS(
        (product: Product) => {
          setPromotedProductIOS(product);
          if (optionsRef.current?.onPromotedProductIOS) {
            optionsRef.current.onPromotedProductIOS(product);
          }
        },
      );
    }

    const result = await initConnection();
    setConnected(result);
    if (!result) {
      // Clean up some listeners but leave purchaseError for potential retries
      subscriptionsRef.current.purchaseUpdate?.remove();
      subscriptionsRef.current.promotedProductsIOS?.remove();
      subscriptionsRef.current.purchaseUpdate = undefined;
      subscriptionsRef.current.promotedProductsIOS = undefined;
      return;
    }
  }, [getActiveSubscriptionsInternal, getAvailablePurchasesInternal]);

  useEffect(() => {
    initIapWithSubscriptions();
    const currentSubscriptions = subscriptionsRef.current;

    return () => {
      currentSubscriptions.purchaseUpdate?.remove();
      currentSubscriptions.purchaseError?.remove();
      currentSubscriptions.promotedProductsIOS?.remove();
      currentSubscriptions.promotedProductIOS?.remove();
      // Keep connection alive across screens to avoid race conditions
      setConnected(false);
    };
  }, [initIapWithSubscriptions]);

  return {
    connected,
    products,
    promotedProductsIOS,
    promotedProductIdIOS,
    subscriptions,
    finishTransaction,
    availablePurchases,
    currentPurchase,
    currentPurchaseError,
    promotedProductIOS,
    activeSubscriptions,
    clearCurrentPurchase,
    clearCurrentPurchaseError,
    getAvailablePurchases: getAvailablePurchasesInternal,
    fetchProducts: fetchProductsInternal,
    requestPurchase: requestPurchaseWithReset,
    validateReceipt,
    restorePurchases: async () => {
      try {
        const purchases = await restorePurchasesTopLevel({
          alsoPublishToEventListenerIOS: false,
          onlyIncludeActiveItemsIOS: true,
        });
        setAvailablePurchases(purchases);
      } catch (e) {
        console.warn('Failed to restore purchases:', e);
      }
    },
    getProducts: getProductsInternal,
    getSubscriptions: getSubscriptionsInternal,
    getPromotedProductIOS,
    requestPurchaseOnPromotedProductIOS,
    getActiveSubscriptions: getActiveSubscriptionsInternal,
    hasActiveSubscriptions: hasActiveSubscriptionsInternal,
  };
}
