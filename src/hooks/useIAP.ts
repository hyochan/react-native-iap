// External dependencies
import {useCallback, useEffect, useState, useRef} from 'react';
import {Platform} from 'react-native';
import {RnIapConsole} from '../utils/debug';

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
  verifyPurchase as verifyPurchaseTopLevel,
  verifyPurchaseWithProvider as verifyPurchaseWithProviderTopLevel,
  getActiveSubscriptions,
  hasActiveSubscriptions,
  restorePurchases as restorePurchasesTopLevel,
  getPromotedProductIOS,
  requestPurchaseOnPromotedProductIOS,
  checkAlternativeBillingAvailabilityAndroid,
  showAlternativeBillingDialogAndroid,
  createAlternativeBillingTokenAndroid,
  userChoiceBillingListenerAndroid,
} from '../';

// Types
import {ErrorCode} from '../types';
import type {
  ProductQueryType,
  RequestPurchaseProps,
  RequestPurchaseResult,
  AlternativeBillingModeAndroid,
  BillingProgramAndroid,
  UserChoiceBillingDetails,
  VerifyPurchaseProps,
  VerifyPurchaseResult,
  VerifyPurchaseWithProviderProps,
  VerifyPurchaseWithProviderResult,
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
  /**
   * @deprecated Use `verifyPurchase` instead. This function will be removed in a future version.
   */
  validateReceipt: (
    options: VerifyPurchaseProps,
  ) => Promise<VerifyPurchaseResult>;
  /** Verify purchase with the configured providers */
  verifyPurchase: (
    options: VerifyPurchaseProps,
  ) => Promise<VerifyPurchaseResult>;
  /** Verify purchase with a specific provider (e.g., IAPKit) */
  verifyPurchaseWithProvider: (
    options: VerifyPurchaseWithProviderProps,
  ) => Promise<VerifyPurchaseWithProviderResult>;
  restorePurchases: () => Promise<void>;
  getPromotedProductIOS: () => Promise<Product | null>;
  requestPurchaseOnPromotedProductIOS: () => Promise<boolean>;
  getActiveSubscriptions: (
    subscriptionIds?: string[],
  ) => Promise<ActiveSubscription[]>;
  hasActiveSubscriptions: (subscriptionIds?: string[]) => Promise<boolean>;
  // Alternative billing (Android)
  checkAlternativeBillingAvailabilityAndroid?: () => Promise<boolean>;
  showAlternativeBillingDialogAndroid?: () => Promise<boolean>;
  createAlternativeBillingTokenAndroid?: (
    sku?: string,
  ) => Promise<string | null>;
};

export interface UseIapOptions {
  onPurchaseSuccess?: (purchase: Purchase) => void;
  onPurchaseError?: (error: PurchaseError) => void;
  /** Callback for non-purchase errors (fetchProducts, getAvailablePurchases, etc.) */
  onError?: (error: Error) => void;
  onPromotedProductIOS?: (product: Product) => void;
  onUserChoiceBillingAndroid?: (details: UserChoiceBillingDetails) => void;
  /**
   * @deprecated Use enableBillingProgramAndroid instead.
   * - 'user-choice' → 'user-choice-billing'
   * - 'alternative-only' → 'external-offer'
   */
  alternativeBillingModeAndroid?: AlternativeBillingModeAndroid;
  /**
   * Enable a specific billing program for Android (8.2.0+)
   * Use 'user-choice-billing' for User Choice Billing (7.0+).
   * Use 'external-offer' for External Offer program.
   * Use 'external-payments' for Developer Provided Billing (Japan only, 8.3.0+).
   */
  enableBillingProgramAndroid?: BillingProgramAndroid;
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
    userChoiceBillingAndroid?: EventSubscription;
  }>({});

  const subscriptionsRefState = useRef<ProductSubscription[]>([]);

  useEffect(() => {
    subscriptionsRefState.current = subscriptions;
  }, [subscriptions]);

  // Helper function to invoke onError callback
  const invokeOnError = useCallback((error: unknown) => {
    if (optionsRef.current?.onError) {
      optionsRef.current.onError(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }, []);

  const fetchProductsInternal = useCallback(
    async (params: {
      skus: string[];
      type?: ProductQueryType | null;
    }): Promise<void> => {
      if (!connectedRef.current) {
        RnIapConsole.warn(
          '[useIAP] fetchProducts called before connection; skipping',
        );
        return;
      }
      try {
        const requestType = params.type ?? 'in-app';
        RnIapConsole.debug('[useIAP] Calling fetchProducts with:', {
          skus: params.skus,
          type: requestType,
        });
        const result = await fetchProducts({
          skus: params.skus,
          type: requestType,
        });
        RnIapConsole.debug('[useIAP] fetchProducts result:', result);
        const items = (result ?? []) as (Product | ProductSubscription)[];

        // fetchProducts already returns properly filtered results based on type
        if (requestType === 'subs') {
          // All items are already subscriptions
          setSubscriptions((prevSubscriptions: ProductSubscription[]) =>
            mergeWithDuplicateCheck(
              prevSubscriptions,
              items as ProductSubscription[],
              (subscription: ProductSubscription) => subscription.id,
            ),
          );
          return;
        }

        if (requestType === 'all') {
          // fetchProducts already properly separates products and subscriptions
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

        // For 'in-app' type, all items are already products
        setProducts((prevProducts: Product[]) =>
          mergeWithDuplicateCheck(
            prevProducts,
            items as Product[],
            (product: Product) => product.id,
          ),
        );
      } catch (error) {
        RnIapConsole.error('Error fetching products:', error);
        invokeOnError(error);
      }
    },
    [mergeWithDuplicateCheck, invokeOnError],
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
        RnIapConsole.error('Error fetching available purchases:', error);
        invokeOnError(error);
      }
    },
    [invokeOnError],
  );

  const getActiveSubscriptionsInternal = useCallback(
    async (subscriptionIds?: string[]): Promise<ActiveSubscription[]> => {
      try {
        const result = await getActiveSubscriptions(subscriptionIds);
        setActiveSubscriptions(result);
        return result;
      } catch (error) {
        RnIapConsole.error('Error getting active subscriptions:', error);
        invokeOnError(error);
        return [];
      }
    },
    [invokeOnError],
  );

  const hasActiveSubscriptionsInternal = useCallback(
    async (subscriptionIds?: string[]): Promise<boolean> => {
      try {
        return await hasActiveSubscriptions(subscriptionIds);
      } catch (error) {
        RnIapConsole.error('Error checking active subscriptions:', error);
        invokeOnError(error);
        return false;
      }
    },
    [invokeOnError],
  );

  const finishTransaction = useCallback(
    async (args: MutationFinishTransactionArgs): Promise<void> => {
      // Directly delegate to root API finishTransaction without catching errors.
      // This allows the root API's error handling logic to work correctly, including:
      // - iOS: treating "Transaction not found" as success (already-finished transactions)
      // - Proper validation and error messages for required fields
      // Users should handle errors in their onPurchaseSuccess callback if needed.
      await finishTransactionInternal(args);
    },
    [],
  );

  const requestPurchase = useCallback(
    (requestObj: RequestPurchaseProps) => requestPurchaseInternal(requestObj),
    [],
  );

  // No local restorePurchases; use the top-level helper via returned API

  const validateReceipt = useCallback(
    async (options: VerifyPurchaseProps): Promise<VerifyPurchaseResult> =>
      validateReceiptInternal(options),
    [],
  );

  const verifyPurchase = useCallback(
    async (options: VerifyPurchaseProps): Promise<VerifyPurchaseResult> => {
      return verifyPurchaseTopLevel(options);
    },
    [],
  );

  const verifyPurchaseWithProvider = useCallback(
    async (
      options: VerifyPurchaseWithProviderProps,
    ): Promise<VerifyPurchaseWithProviderResult> => {
      return verifyPurchaseWithProviderTopLevel(options);
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
          RnIapConsole.warn('[useIAP] post-purchase refresh failed:', e);
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

    // Add user choice billing listener for Android (if provided)
    if (
      Platform.OS === 'android' &&
      optionsRef.current?.onUserChoiceBillingAndroid
    ) {
      subscriptionsRef.current.userChoiceBillingAndroid =
        userChoiceBillingListenerAndroid((details) => {
          if (optionsRef.current?.onUserChoiceBillingAndroid) {
            optionsRef.current.onUserChoiceBillingAndroid(details);
          }
        });
    }

    // Initialize connection with config
    // Prefer enableBillingProgramAndroid over deprecated alternativeBillingModeAndroid
    let config:
      | {
          enableBillingProgramAndroid?: BillingProgramAndroid;
          alternativeBillingModeAndroid?: AlternativeBillingModeAndroid;
        }
      | undefined;

    if (Platform.OS === 'android') {
      if (optionsRef.current?.enableBillingProgramAndroid) {
        config = {
          enableBillingProgramAndroid:
            optionsRef.current.enableBillingProgramAndroid,
        };
      } else if (optionsRef.current?.alternativeBillingModeAndroid) {
        // Deprecated: use alternativeBillingModeAndroid for backwards compatibility
        config = {
          alternativeBillingModeAndroid:
            optionsRef.current.alternativeBillingModeAndroid,
        };
      }
    }

    try {
      const result = await initConnection(config);
      setConnected(result);
      if (!result) {
        // Clean up some listeners but leave purchaseError for potential retries
        subscriptionsRef.current.purchaseUpdate?.remove();
        subscriptionsRef.current.purchaseUpdate = undefined;
      }
    } catch (error) {
      RnIapConsole.error('initConnection failed:', error);
      invokeOnError(error);
      // Clean up listeners on error
      subscriptionsRef.current.purchaseUpdate?.remove();
      subscriptionsRef.current.promotedProductIOS?.remove();
      subscriptionsRef.current.purchaseUpdate = undefined;
      subscriptionsRef.current.promotedProductIOS = undefined;
    }
  }, [
    getActiveSubscriptionsInternal,
    getAvailablePurchasesInternal,
    invokeOnError,
  ]);

  useEffect(() => {
    initIapWithSubscriptions();
    const currentSubscriptions = subscriptionsRef.current;

    return () => {
      currentSubscriptions.purchaseUpdate?.remove();
      currentSubscriptions.purchaseError?.remove();
      currentSubscriptions.promotedProductIOS?.remove();
      currentSubscriptions.userChoiceBillingAndroid?.remove();
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
    verifyPurchase,
    verifyPurchaseWithProvider,
    restorePurchases: async () => {
      try {
        await restorePurchasesTopLevel();
        await getAvailablePurchasesInternal();
      } catch (error) {
        RnIapConsole.warn('Failed to restore purchases:', error);
        invokeOnError(error);
      }
    },
    getPromotedProductIOS,
    requestPurchaseOnPromotedProductIOS,
    getActiveSubscriptions: getActiveSubscriptionsInternal,
    hasActiveSubscriptions: hasActiveSubscriptionsInternal,
    // Alternative billing (Android only)
    ...(Platform.OS === 'android'
      ? {
          checkAlternativeBillingAvailabilityAndroid,
          showAlternativeBillingDialogAndroid,
          createAlternativeBillingTokenAndroid,
        }
      : {}),
  };
}
