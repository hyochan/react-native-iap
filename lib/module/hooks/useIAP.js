"use strict";

// External dependencies
import { useCallback, useEffect, useState, useRef } from 'react';
import { Platform } from 'react-native';
import { RnIapConsole } from "../utils/debug.js";

// Internal modules
import { initConnection, purchaseErrorListener, purchaseUpdatedListener, promotedProductListenerIOS, getAvailablePurchases, finishTransaction as finishTransactionInternal, requestPurchase as requestPurchaseInternal, fetchProducts, validateReceipt as validateReceiptInternal, verifyPurchase as verifyPurchaseTopLevel, verifyPurchaseWithProvider as verifyPurchaseWithProviderTopLevel, getActiveSubscriptions, hasActiveSubscriptions, restorePurchases as restorePurchasesTopLevel, getPromotedProductIOS, requestPurchaseOnPromotedProductIOS, checkAlternativeBillingAvailabilityAndroid, showAlternativeBillingDialogAndroid, createAlternativeBillingTokenAndroid, userChoiceBillingListenerAndroid } from "../index.js";

// Types
import { ErrorCode } from "../types.js";
import { normalizeErrorCodeFromNative } from "../utils/errorMapping.js";

// Types for event subscriptions

/**
 * React Hook for managing In-App Purchases.
 * See documentation at https://react-native-iap.hyo.dev/docs/hooks/useIAP
 */
export function useIAP(options) {
  const [connected, setConnected] = useState(false);
  const [products, setProducts] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [availablePurchases, setAvailablePurchases] = useState([]);
  const [promotedProductIOS, setPromotedProductIOS] = useState();
  const [activeSubscriptions, setActiveSubscriptions] = useState([]);
  const optionsRef = useRef(options);
  const connectedRef = useRef(false);

  // Helper function to merge arrays with duplicate checking
  const mergeWithDuplicateCheck = useCallback((existingItems, newItems, getKey) => {
    const merged = [...existingItems];
    newItems.forEach(newItem => {
      const isDuplicate = merged.some(existingItem => getKey(existingItem) === getKey(newItem));
      if (!isDuplicate) {
        merged.push(newItem);
      }
    });
    return merged;
  }, []);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);
  useEffect(() => {
    connectedRef.current = connected;
  }, [connected]);
  const subscriptionsRef = useRef({});
  const subscriptionsRefState = useRef([]);
  useEffect(() => {
    subscriptionsRefState.current = subscriptions;
  }, [subscriptions]);
  const fetchProductsInternal = useCallback(async params => {
    if (!connectedRef.current) {
      RnIapConsole.warn('[useIAP] fetchProducts called before connection; skipping');
      return;
    }
    try {
      const requestType = params.type ?? 'in-app';
      RnIapConsole.debug('[useIAP] Calling fetchProducts with:', {
        skus: params.skus,
        type: requestType
      });
      const result = await fetchProducts({
        skus: params.skus,
        type: requestType
      });
      RnIapConsole.debug('[useIAP] fetchProducts result:', result);
      const items = result ?? [];

      // fetchProducts already returns properly filtered results based on type
      if (requestType === 'subs') {
        // All items are already subscriptions
        setSubscriptions(prevSubscriptions => mergeWithDuplicateCheck(prevSubscriptions, items, subscription => subscription.id));
        return;
      }
      if (requestType === 'all') {
        // fetchProducts already properly separates products and subscriptions
        const newProducts = items.filter(item => item.type === 'in-app');
        const newSubscriptions = items.filter(item => item.type === 'subs');
        setProducts(prevProducts => mergeWithDuplicateCheck(prevProducts, newProducts, product => product.id));
        setSubscriptions(prevSubscriptions => mergeWithDuplicateCheck(prevSubscriptions, newSubscriptions, subscription => subscription.id));
        return;
      }

      // For 'in-app' type, all items are already products
      setProducts(prevProducts => mergeWithDuplicateCheck(prevProducts, items, product => product.id));
    } catch (error) {
      RnIapConsole.error('Error fetching products:', error);
    }
  }, [mergeWithDuplicateCheck]);
  const getAvailablePurchasesInternal = useCallback(async _skus => {
    try {
      const result = await getAvailablePurchases({
        alsoPublishToEventListenerIOS: false,
        onlyIncludeActiveItemsIOS: true
      });
      setAvailablePurchases(result);
    } catch (error) {
      RnIapConsole.error('Error fetching available purchases:', error);
    }
  }, []);
  const getActiveSubscriptionsInternal = useCallback(async subscriptionIds => {
    try {
      const result = await getActiveSubscriptions(subscriptionIds);
      setActiveSubscriptions(result);
      return result;
    } catch (error) {
      RnIapConsole.error('Error getting active subscriptions:', error);
      // Don't clear existing activeSubscriptions on error - preserve current state
      // This prevents the UI from showing empty state when there are temporary network issues
      return [];
    }
  }, []);
  const hasActiveSubscriptionsInternal = useCallback(async subscriptionIds => {
    try {
      return await hasActiveSubscriptions(subscriptionIds);
    } catch (error) {
      RnIapConsole.error('Error checking active subscriptions:', error);
      return false;
    }
  }, []);
  const finishTransaction = useCallback(async args => {
    // Directly delegate to root API finishTransaction without catching errors.
    // This allows the root API's error handling logic to work correctly, including:
    // - iOS: treating "Transaction not found" as success (already-finished transactions)
    // - Proper validation and error messages for required fields
    // Users should handle errors in their onPurchaseSuccess callback if needed.
    await finishTransactionInternal(args);
  }, []);
  const requestPurchase = useCallback(requestObj => requestPurchaseInternal(requestObj), []);

  // No local restorePurchases; use the top-level helper via returned API

  const validateReceipt = useCallback(async options => validateReceiptInternal(options), []);
  const verifyPurchase = useCallback(async options => {
    return verifyPurchaseTopLevel(options);
  }, []);
  const verifyPurchaseWithProvider = useCallback(async options => {
    return verifyPurchaseWithProviderTopLevel(options);
  }, []);
  const initIapWithSubscriptions = useCallback(async () => {
    // Register listeners BEFORE initConnection to avoid race condition
    subscriptionsRef.current.purchaseUpdate = purchaseUpdatedListener(async purchase => {
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
    });
    subscriptionsRef.current.purchaseError = purchaseErrorListener(error => {
      const mappedError = {
        code: normalizeErrorCodeFromNative(error.code),
        message: error.message,
        productId: undefined
      };
      // Ignore init error until connected
      if (mappedError.code === ErrorCode.InitConnection && !connectedRef.current) {
        return;
      }
      if (optionsRef.current?.onPurchaseError) {
        optionsRef.current.onPurchaseError(mappedError);
      }
    });
    if (Platform.OS === 'ios') {
      // iOS promoted products listener
      subscriptionsRef.current.promotedProductIOS = promotedProductListenerIOS(product => {
        setPromotedProductIOS(product);
        if (optionsRef.current?.onPromotedProductIOS) {
          optionsRef.current.onPromotedProductIOS(product);
        }
      });
    }

    // Add user choice billing listener for Android (if provided)
    if (Platform.OS === 'android' && optionsRef.current?.onUserChoiceBillingAndroid) {
      subscriptionsRef.current.userChoiceBillingAndroid = userChoiceBillingListenerAndroid(details => {
        if (optionsRef.current?.onUserChoiceBillingAndroid) {
          optionsRef.current.onUserChoiceBillingAndroid(details);
        }
      });
    }

    // Initialize connection with config
    // Prefer enableBillingProgramAndroid over deprecated alternativeBillingModeAndroid
    let config;
    if (Platform.OS === 'android') {
      if (optionsRef.current?.enableBillingProgramAndroid) {
        config = {
          enableBillingProgramAndroid: optionsRef.current.enableBillingProgramAndroid
        };
      } else if (optionsRef.current?.alternativeBillingModeAndroid) {
        // Deprecated: use alternativeBillingModeAndroid for backwards compatibility
        config = {
          alternativeBillingModeAndroid: optionsRef.current.alternativeBillingModeAndroid
        };
      }
    }
    const result = await initConnection(config);
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
      } catch (e) {
        RnIapConsole.warn('Failed to restore purchases:', e);
      }
    },
    getPromotedProductIOS,
    requestPurchaseOnPromotedProductIOS,
    getActiveSubscriptions: getActiveSubscriptionsInternal,
    hasActiveSubscriptions: hasActiveSubscriptionsInternal,
    // Alternative billing (Android only)
    ...(Platform.OS === 'android' ? {
      checkAlternativeBillingAvailabilityAndroid,
      showAlternativeBillingDialogAndroid,
      createAlternativeBillingTokenAndroid
    } : {})
  };
}
//# sourceMappingURL=useIAP.js.map