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
import {ErrorCode} from '../types';
import type {
  ProductQueryType,
  RequestPurchaseProps,
  RequestPurchaseResult,
} from '../types';
import type {
  ActiveSubscription,
  Product,
  Purchase,
  PurchaseError,
  ProductSubscription,
} from '../types';
import type {MutationFinishTransactionArgs} from '../types';
import {normalizeErrorCodeFromNative} from '../utils/errorMapping';

// Types for event subscriptions
interface EventSubscription {
  remove(): void;
}

type UseIap = {
  connected: boolean;
  products: Product[];
  subscriptions: ProductSubscription[];
  availablePurchases: Purchase[];
  promotedProductIOS?: Product;
  activeSubscriptions: ActiveSubscription[];
  finishTransaction: (args: MutationFinishTransactionArgs) => Promise<void>;
  getAvailablePurchases: (skus?: string[]) => Promise<void>;
  fetchProducts: (params: {
    skus: string[];
    type?: ProductQueryType | null;
  }) => Promise<void>;
  requestPurchase: (
    params: RequestPurchaseProps,
  ) => Promise<RequestPurchaseResult | null>;
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
  requestPurchaseOnPromotedProductIOS: () => Promise<boolean>;
  getActiveSubscriptions: (
    subscriptionIds?: string[],
  ) => Promise<ActiveSubscription[]>;
  hasActiveSubscriptions: (subscriptionIds?: string[]) => Promise<boolean>;
};

export interface UseIapOptions {
  onPurchaseSuccess?: (purchase: Purchase) => void;
  onPurchaseError?: (error: PurchaseError) => void;
  onPromotedProductIOS?: (product: Product) => void;
}

/**
 * React Hook for managing In-App Purchases.
 * See documentation at https://react-native-iap.hyo.dev/docs/hooks/useIAP
 */
export function useIAP(options?: UseIapOptions): UseIap {
  const [connected, setConnected] = useState<boolean>(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [subscriptions, setSubscriptions] = useState<ProductSubscription[]>([]);
  const [availablePurchases, setAvailablePurchases] = useState<Purchase[]>([]);
  const [promotedProductIOS, setPromotedProductIOS] = useState<Product>();
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
    promotedProductIOS?: EventSubscription;
  }>({});

  const subscriptionsRefState = useRef<ProductSubscription[]>([]);

  useEffect(() => {
    subscriptionsRefState.current = subscriptions;
  }, [subscriptions]);

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
        const requestType = params.type ?? 'in-app';
        const result = await fetchProducts({
          skus: params.skus,
          type: requestType,
        });
        const items = (result ?? []) as (Product | ProductSubscription)[];

        if (requestType === 'subs') {
          const newSubscriptions = items.filter(
            (item): item is ProductSubscription => item.type === 'subs',
          );
          setSubscriptions((prevSubscriptions: ProductSubscription[]) =>
            mergeWithDuplicateCheck(
              prevSubscriptions,
              newSubscriptions,
              (subscription: ProductSubscription) => subscription.id,
            ),
          );
          return;
        }

        if (requestType === 'all') {
          const newProducts = items.filter(
            (item): item is Product => item.type === 'in-app',
          );
          const newSubscriptions = items.filter(
            (item): item is ProductSubscription => item.type === 'subs',
          );

          setProducts((prevProducts: Product[]) =>
            mergeWithDuplicateCheck(
              prevProducts,
              newProducts,
              (product: Product) => product.id,
            ),
          );
          setSubscriptions((prevSubscriptions: ProductSubscription[]) =>
            mergeWithDuplicateCheck(
              prevSubscriptions,
              newSubscriptions,
              (subscription: ProductSubscription) => subscription.id,
            ),
          );
          return;
        }

        const newProducts = items.filter(
          (item): item is Product => item.type === 'in-app',
        );
        setProducts((prevProducts: Product[]) =>
          mergeWithDuplicateCheck(
            prevProducts,
            newProducts,
            (product: Product) => product.id,
          ),
        );
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
    async (args: MutationFinishTransactionArgs): Promise<void> => {
      try {
        await finishTransactionInternal(args);
      } catch (err) {
        throw err;
      }
    },
    [],
  );

  const requestPurchase = useCallback(
    (requestObj: RequestPurchaseProps) => requestPurchaseInternal(requestObj),
    [],
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
      return validateReceiptInternal({
        sku,
        androidOptions,
      });
    },
    [],
  );

  const initIapWithSubscriptions = useCallback(async (): Promise<void> => {
    // Register listeners BEFORE initConnection to avoid race condition
    subscriptionsRef.current.purchaseUpdate = purchaseUpdatedListener(
      async (purchase: Purchase) => {
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
      if (optionsRef.current?.onPurchaseError) {
        optionsRef.current.onPurchaseError(mappedError);
      }
    });

    if (Platform.OS === 'ios') {
      // iOS promoted products listener
      subscriptionsRef.current.promotedProductIOS = promotedProductListenerIOS(
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
      subscriptionsRef.current.purchaseUpdate = undefined;
      return;
    }
  }, [getActiveSubscriptionsInternal, getAvailablePurchasesInternal]);

  useEffect(() => {
    initIapWithSubscriptions();
    const currentSubscriptions = subscriptionsRef.current;

    return () => {
      currentSubscriptions.purchaseUpdate?.remove();
      currentSubscriptions.purchaseError?.remove();
      currentSubscriptions.promotedProductIOS?.remove();
      // Keep connection alive across screens to avoid race conditions
      setConnected(false);
    };
  }, [initIapWithSubscriptions]);

  return {
    connected,
    products,
    subscriptions,
    finishTransaction,
    availablePurchases,
    promotedProductIOS,
    activeSubscriptions,
    getAvailablePurchases: getAvailablePurchasesInternal,
    fetchProducts: fetchProductsInternal,
    requestPurchase,
    validateReceipt,
    restorePurchases: async () => {
      try {
        await restorePurchasesTopLevel();
        await getAvailablePurchasesInternal();
      } catch (e) {
        console.warn('Failed to restore purchases:', e);
      }
    },
    getPromotedProductIOS,
    requestPurchaseOnPromotedProductIOS,
    getActiveSubscriptions: getActiveSubscriptionsInternal,
    hasActiveSubscriptions: hasActiveSubscriptionsInternal,
  };
}
