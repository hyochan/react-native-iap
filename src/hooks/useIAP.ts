import {useCallback, useEffect, useRef} from 'react';
import {Platform} from 'react-native';

import {
  finishTransaction as iapFinishTransaction,
  getAvailablePurchases as iapGetAvailablePurchases,
  getProducts as iapGetProducts,
  getPurchaseHistory as iapGetPurchaseHistory,
  getSubscriptions as iapGetSubscriptions,
  requestPurchase as iapRequestPurchase,
  requestSubscription as iapRequestSubscription,
} from '../iap';
import {sync, validateReceiptIos} from '../modules/iosSk2';
import type {PurchaseError} from '../purchaseError';
import type {Product, Purchase, PurchaseResult, Subscription} from '../types';

import {useIAPContext} from './withIAPContext';

export interface UseIAPOptions {
  onPurchaseSuccess?: (purchase: Purchase) => void;
  onPurchaseError?: (error: PurchaseError) => void;
  onSyncError?: (error: Error) => void;
  shouldAutoSyncPurchases?: boolean;
}

type IAP_STATUS = {
  connected: boolean;
  products: Product[];
  promotedProductsIOS: Product[];
  subscriptions: Subscription[];
  purchaseHistory: Purchase[];
  availablePurchases: Purchase[];
  currentPurchase?: Purchase;
  currentPurchaseError?: PurchaseError;
  initConnectionError?: Error;
  clearCurrentPurchase: () => void;
  clearCurrentPurchaseError: () => void;
  finishTransaction: ({
    purchase,
    isConsumable,
    developerPayloadAndroid,
  }: {
    purchase: Purchase;
    isConsumable?: boolean;
    developerPayloadAndroid?: string;
  }) => Promise<string | boolean | PurchaseResult | void>;
  getAvailablePurchases: () => Promise<void>;
  getPurchaseHistory: () => Promise<void>;
  getProducts: ({skus}: {skus: string[]}) => Promise<void>;
  getSubscriptions: ({skus}: {skus: string[]}) => Promise<void>;
  requestPurchase: typeof iapRequestPurchase;
  requestSubscription: typeof iapRequestSubscription;
  restorePurchases: () => Promise<void>;
  validateReceipt: (
    sku: string,
    androidOptions?: {
      packageName: string;
      productToken: string;
      accessToken: string;
      isSub?: boolean;
    },
  ) => Promise<any>;
};

export const useIAP = (options?: UseIAPOptions): IAP_STATUS => {
  const {
    connected,
    products,
    promotedProductsIOS,
    subscriptions,
    purchaseHistory,
    availablePurchases,
    currentPurchase,
    currentPurchaseError,
    initConnectionError,
    setConnected,
    setProducts,
    setSubscriptions,
    setAvailablePurchases,
    setPurchaseHistory,
    setCurrentPurchase,
    setCurrentPurchaseError,
  } = useIAPContext();

  const optionsRef = useRef<UseIAPOptions | undefined>(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

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

  const clearCurrentPurchase = useCallback(() => {
    setCurrentPurchase(undefined);
  }, [setCurrentPurchase]);

  const clearCurrentPurchaseError = useCallback(() => {
    setCurrentPurchaseError(undefined);
  }, [setCurrentPurchaseError]);

  const getProducts = useCallback(
    async ({skus}: {skus: string[]}): Promise<void> => {
      try {
        const result = await iapGetProducts({skus});
        setProducts(
          mergeWithDuplicateCheck(
            products,
            result,
            (product) => (product as Product).productId || '',
          ),
        );
      } catch (error) {
        console.error('Error getting products:', error);
      }
    },
    [setProducts, mergeWithDuplicateCheck, products],
  );

  const getSubscriptions = useCallback(
    async ({skus}: {skus: string[]}): Promise<void> => {
      try {
        const result = await iapGetSubscriptions({skus});
        setSubscriptions(
          mergeWithDuplicateCheck(
            subscriptions,
            result,
            (subscription) => (subscription as Subscription).productId || '',
          ),
        );
      } catch (error) {
        console.error('Error getting subscriptions:', error);
      }
    },
    [setSubscriptions, mergeWithDuplicateCheck, subscriptions],
  );

  const getAvailablePurchases = useCallback(async (): Promise<void> => {
    try {
      const result = await iapGetAvailablePurchases();
      setAvailablePurchases(result);
    } catch (error) {
      console.error('Error getting available purchases:', error);
    }
  }, [setAvailablePurchases]);

  const getPurchaseHistory = useCallback(async (): Promise<void> => {
    try {
      const result = await iapGetPurchaseHistory();
      setPurchaseHistory(result);
    } catch (error) {
      console.error('Error getting purchase history:', error);
    }
  }, [setPurchaseHistory]);

  const finishTransaction = useCallback(
    async ({
      purchase,
      isConsumable,
      developerPayloadAndroid,
    }: {
      purchase: Purchase;
      isConsumable?: boolean;
      developerPayloadAndroid?: string;
    }): Promise<string | boolean | PurchaseResult | void> => {
      try {
        return await iapFinishTransaction({
          purchase,
          isConsumable,
          developerPayloadAndroid,
        });
      } catch (err) {
        throw err;
      } finally {
        if (purchase.productId === currentPurchase?.productId) {
          setCurrentPurchase(undefined);
        }

        if (purchase.productId === currentPurchaseError?.productId) {
          setCurrentPurchaseError(undefined);
        }
      }
    },
    [
      currentPurchase?.productId,
      currentPurchaseError?.productId,
      setCurrentPurchase,
      setCurrentPurchaseError,
    ],
  );

  const restorePurchases = useCallback(async (): Promise<void> => {
    try {
      // Try to sync with store on iOS
      if (
        Platform.OS === 'ios' &&
        optionsRef.current?.shouldAutoSyncPurchases !== false
      ) {
        try {
          await sync();
        } catch (syncError) {
          console.error('Sync error:', syncError);
          optionsRef.current?.onSyncError?.(syncError as Error);
        }
      }

      // Get available purchases
      await getAvailablePurchases();
    } catch (error) {
      console.error('Error restoring purchases:', error);
      throw error;
    }
  }, [getAvailablePurchases]);

  const validateReceipt = useCallback(
    async (
      sku: string,
      androidOptions?: {
        packageName: string;
        productToken: string;
        accessToken: string;
        isSub?: boolean;
      },
    ): Promise<any> => {
      try {
        if (Platform.OS === 'ios') {
          // For iOS, use the new validateReceiptIos function
          const result = await validateReceiptIos(sku);
          return result;
        } else if (Platform.OS === 'android' && androidOptions) {
          // For Android, you would need to implement server-side validation
          // This is a placeholder - Android validation should be done server-side
          console.warn(
            'Android receipt validation should be performed server-side',
          );
          return {
            isValid: false,
            message:
              'Android receipt validation should be performed server-side',
          };
        }

        throw new Error(
          'Invalid platform or missing options for receipt validation',
        );
      } catch (error) {
        console.error('Error validating receipt:', error);
        throw error;
      }
    },
    [],
  );

  // Listen for purchase events and trigger callbacks
  useEffect(() => {
    if (currentPurchase && optionsRef.current?.onPurchaseSuccess) {
      optionsRef.current.onPurchaseSuccess(currentPurchase);
    }
  }, [currentPurchase]);

  useEffect(() => {
    if (currentPurchaseError && optionsRef.current?.onPurchaseError) {
      optionsRef.current.onPurchaseError(currentPurchaseError);
    }
  }, [currentPurchaseError]);

  useEffect(() => {
    setConnected(true);

    return () => {
      setConnected(false);
      setCurrentPurchaseError(undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    connected,
    products,
    promotedProductsIOS,
    subscriptions,
    purchaseHistory,
    availablePurchases,
    currentPurchase,
    currentPurchaseError,
    initConnectionError,
    clearCurrentPurchase,
    clearCurrentPurchaseError,
    finishTransaction,
    getProducts,
    getSubscriptions,
    getAvailablePurchases,
    getPurchaseHistory,
    requestPurchase: iapRequestPurchase,
    requestSubscription: iapRequestSubscription,
    restorePurchases,
    validateReceipt,
  };
};
