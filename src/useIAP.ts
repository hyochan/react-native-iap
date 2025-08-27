import {
  endConnection,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  promotedProductListenerIOS,
  getProducts,
  getAvailablePurchases,
  getPurchaseHistories,
  finishTransaction as finishTransactionInternal,
  requestPurchase as requestPurchaseInternal,
  requestProducts,
  validateReceipt as validateReceiptInternal,
  getActiveSubscriptions,
  hasActiveSubscriptions,
  type ActiveSubscription,
} from './';
import { sync } from './modules/ios';
import { useCallback, useEffect, useState, useRef } from 'react';
import type {
  Product,
  ProductPurchase,
  Purchase,
  PurchaseError,
  PurchaseResult,
  SubscriptionProduct,
  SubscriptionPurchase,
  RequestPurchaseProps,
  RequestSubscriptionProps,
} from './types';
import { Platform } from 'react-native';

type UseIap = {
  connected: boolean;
  products: Product[];
  promotedProductsIOS: ProductPurchase[];
  promotedProductIdIOS?: string;
  subscriptions: SubscriptionProduct[];
  purchaseHistories: ProductPurchase[];
  availablePurchases: ProductPurchase[];
  currentPurchase?: ProductPurchase;
  currentPurchaseError?: PurchaseError;
  promotedProductIOS?: Product;
  activeSubscriptions: ActiveSubscription[];
  clearCurrentPurchase: () => void;
  clearCurrentPurchaseError: () => void;
  finishTransaction: ({
    purchase,
    isConsumable,
  }: {
    purchase: Purchase;
    isConsumable?: boolean;
  }) => Promise<PurchaseResult | boolean>;
  getAvailablePurchases: (skus?: string[]) => Promise<void>;
  getPurchaseHistories: (skus: string[]) => Promise<void>;
  requestProducts: (params: {
    skus: string[];
    type?: 'inapp' | 'subs';
  }) => Promise<void>;
  /**
   * @deprecated Use requestProducts({ skus, type: 'inapp' }) instead. This method will be removed in version 3.0.0.
   * Note: This method internally uses requestProducts, so no deprecation warning is shown.
   */
  getProducts: (skus: string[]) => Promise<void>;
  /**
   * @deprecated Use requestProducts({ skus, type: 'subs' }) instead. This method will be removed in version 3.0.0.
   * Note: This method internally uses requestProducts, so no deprecation warning is shown.
   */
  getSubscriptions?: (skus: string[]) => Promise<void>;
  requestPurchase: (params: {
    request: RequestPurchaseProps | RequestSubscriptionProps;
    type?: 'inapp' | 'subs';
  }) => Promise<
    | ProductPurchase
    | SubscriptionPurchase
    | ProductPurchase[]
    | SubscriptionPurchase[]
    | void
  >;
  validateReceipt: (
    sku: string,
    androidOptions?: {
      packageName: string;
      productToken: string;
      accessToken: string;
      isSub?: boolean;
    }
  ) => Promise<any>;
  restorePurchases: () => Promise<void>; // 구매 복원 함수 추가
  getActiveSubscriptions: (
    subscriptionIds?: string[]
  ) => Promise<ActiveSubscription[]>;
  hasActiveSubscriptions: (subscriptionIds?: string[]) => Promise<boolean>;
};

export interface UseIAPOptions {
  onPurchaseSuccess?: (
    purchase: ProductPurchase | SubscriptionPurchase
  ) => void;
  onPurchaseError?: (error: PurchaseError) => void;
  onSyncError?: (error: Error) => void;
  shouldAutoSyncPurchases?: boolean; // New option to control auto-syncing
  onPromotedProductIOS?: (product: Product) => void;
}

export function useIAP(options?: UseIAPOptions): UseIap {
  // Remove debug logging to reduce noise
  // console.log('[useIAP] Hook called at', new Date().toISOString());

  const [connected, setConnected] = useState<boolean>(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [promotedProductsIOS] = useState<ProductPurchase[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionProduct[]>([]);
  const [purchaseHistories, setPurchaseHistories] = useState<ProductPurchase[]>(
    []
  );
  const [availablePurchases, setAvailablePurchases] = useState<
    ProductPurchase[]
  >([]);
  const [currentPurchase, setCurrentPurchase] = useState<ProductPurchase>();
  const [promotedProductIOS, setPromotedProductIOS] = useState<Product>();
  const [currentPurchaseError, setCurrentPurchaseError] =
    useState<PurchaseError>();
  const [promotedProductIdIOS] = useState<string>();
  const [activeSubscriptions, setActiveSubscriptions] = useState<
    ActiveSubscription[]
  >([]);

  const optionsRef = useRef<UseIAPOptions | undefined>(options);

  // Helper function to merge arrays with duplicate checking
  const mergeWithDuplicateCheck = useCallback(
    <T>(
      existingItems: T[],
      newItems: T[],
      getKey: (item: T) => string
    ): T[] => {
      const merged = [...existingItems];
      newItems.forEach((newItem) => {
        const isDuplicate = merged.some(
          (existingItem) => getKey(existingItem) === getKey(newItem)
        );
        if (!isDuplicate) {
          merged.push(newItem);
        }
      });
      return merged;
    },
    []
  );

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const subscriptionsRef = useRef<{
    purchaseUpdate?: { remove: () => void };
    purchaseError?: { remove: () => void };
    promotedProductsIOS?: { remove: () => void };
    promotedProductIOS?: { remove: () => void };
  }>({});

  const subscriptionsRefState = useRef<SubscriptionProduct[]>([]);

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
        const result = await getProducts(skus);
        setProducts((prevProducts) =>
          mergeWithDuplicateCheck(prevProducts, result, (product) => product.id)
        );
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    },
    [mergeWithDuplicateCheck]
  );

  const requestProductsInternal = useCallback(
    async (params: {
      skus: string[];
      type?: 'inapp' | 'subs';
    }): Promise<void> => {
      console.log('[useIAP] requestProductsInternal called with:', params);
      try {
        const result = await requestProducts(params);
        console.log('[useIAP] Products received:', result);

        if (params.type === 'subs') {
          console.log('[useIAP] Setting subscriptions state with:', result);
          setSubscriptions((prevSubscriptions) =>
            mergeWithDuplicateCheck(
              prevSubscriptions,
              result as SubscriptionProduct[],
              (subscription) => subscription.id
            )
          );
        } else {
          console.log('[useIAP] Setting products state with:', result);
          setProducts((prevProducts) =>
            mergeWithDuplicateCheck(
              prevProducts,
              result as Product[],
              (product) => product.id
            )
          );
        }
      } catch (error) {
        console.error('[useIAP] Error fetching products:', error);
      }
    },
    [mergeWithDuplicateCheck]
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
    []
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
    []
  );

  const getAvailablePurchasesInternal = useCallback(
    async (_skus?: string[]): Promise<void> => {
      try {
        // Note: _skus parameter is for future compatibility, currently ignored
        const result = await getAvailablePurchases();
        setAvailablePurchases(result);
      } catch (error) {
        console.error('Error fetching available purchases:', error);
      }
    },
    []
  );

  const getPurchaseHistoriesInternal = useCallback(async (): Promise<void> => {
    setPurchaseHistories(await getPurchaseHistories());
  }, []);

  const finishTransaction = useCallback(
    async ({
      purchase,
      isConsumable,
    }: {
      purchase: Purchase;
      isConsumable?: boolean;
    }): Promise<PurchaseResult | boolean> => {
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
    ]
  );

  const requestPurchaseWithReset = useCallback(
    async (params: {
      request: RequestPurchaseProps | RequestSubscriptionProps;
      type?: 'inapp' | 'subs';
    }) => {
      console.log('[useIAP] requestPurchaseWithReset called with:', params);
      clearCurrentPurchase();
      clearCurrentPurchaseError();

      try {
        // Pass the params directly to requestPurchaseInternal
        console.log('[useIAP] Calling requestPurchaseInternal with:', params);
        const result = await requestPurchaseInternal(params);
        console.log('[useIAP] requestPurchaseInternal result:', result);
        return result;
      } catch (error) {
        console.error('[useIAP] requestPurchaseInternal error:', error);
        throw error;
      }
    },
    [clearCurrentPurchase, clearCurrentPurchaseError]
  );

  const restorePurchases = useCallback(async (): Promise<void> => {
    try {
      if (Platform.OS === 'ios') {
        await sync().catch((error) => {
          if (optionsRef.current?.onSyncError) {
            optionsRef.current.onSyncError(error);
          } else {
            console.warn('Error restoring purchases:', error);
          }
        });
      }
      await getAvailablePurchasesInternal([]);
    } catch (error) {
      console.warn('Failed to restore purchases:', error);
    }
  }, [getAvailablePurchasesInternal]);

  const validateReceipt = useCallback(
    async (
      sku: string,
      androidOptions?: {
        packageName: string;
        productToken: string;
        accessToken: string;
        isSub?: boolean;
      }
    ) => {
      return validateReceiptInternal(sku, androidOptions);
    },
    []
  );

  useEffect(() => {
    // Initialize connection
    initConnection()
      .then((result) => {
        setConnected(result);

        if (result) {
          subscriptionsRef.current.purchaseUpdate = purchaseUpdatedListener(
            async (purchase: Purchase | SubscriptionPurchase) => {
              setCurrentPurchaseError(undefined);
              setCurrentPurchase({
                ...purchase,
                platform: Platform.OS as 'ios' | 'android',
              });

              if ('expirationDate' in purchase) {
                // Inline the refresh logic to avoid dependency issues
                try {
                  const currentSubs = subscriptionsRefState.current;
                  if (currentSubs.some((sub) => sub.id === purchase.id)) {
                    await requestProducts({
                      skus: [purchase.id],
                      type: 'subs',
                    });
                    await getAvailablePurchases();
                  }
                } catch (error) {
                  console.warn('Failed to refresh subscription status:', error);
                }
              }

              if (optionsRef.current?.onPurchaseSuccess) {
                optionsRef.current.onPurchaseSuccess(purchase);
              }
            }
          );

          subscriptionsRef.current.purchaseError = purchaseErrorListener(
            (error: PurchaseError) => {
              setCurrentPurchase(undefined);
              setCurrentPurchaseError(error);

              if (optionsRef.current?.onPurchaseError) {
                optionsRef.current.onPurchaseError(error);
              }
            }
          );

          if (Platform.OS === 'ios') {
            // iOS promoted products listener
            subscriptionsRef.current.promotedProductsIOS =
              promotedProductListenerIOS((product: Product) => {
                setPromotedProductIOS(product);

                if (optionsRef.current?.onPromotedProductIOS) {
                  optionsRef.current.onPromotedProductIOS(product);
                }
              });
          }
        }
      })
      .catch((error) => {
        console.error('[useIAP] Error during initialization:', error);
      });

    const currentSubscriptions = subscriptionsRef.current;

    return () => {
      currentSubscriptions.purchaseUpdate?.remove();
      currentSubscriptions.purchaseError?.remove();
      currentSubscriptions.promotedProductsIOS?.remove();
      currentSubscriptions.promotedProductIOS?.remove();
      endConnection();
      setConnected(false);
    };
  }, []); // Remove all dependencies to run only once on mount

  return {
    connected,
    products,
    promotedProductsIOS,
    promotedProductIdIOS,
    subscriptions,
    purchaseHistories,
    availablePurchases,
    currentPurchase,
    currentPurchaseError,
    promotedProductIOS,
    activeSubscriptions,
    clearCurrentPurchase,
    clearCurrentPurchaseError,
    finishTransaction,
    getAvailablePurchases: getAvailablePurchasesInternal,
    getPurchaseHistories: getPurchaseHistoriesInternal,
    requestProducts: requestProductsInternal,
    requestPurchase: requestPurchaseWithReset,
    validateReceipt,
    restorePurchases,
    getProducts: getProductsInternal,
    getActiveSubscriptions: getActiveSubscriptionsInternal,
    hasActiveSubscriptions: hasActiveSubscriptionsInternal,
  };
}
