import { Platform } from 'react-native';
import { IapModule } from '../IapModule';
import type { ProductStatusIOS, Product, PurchaseError } from '../types';
import type { Purchase, AppTransactionIOS } from '../types';

// Type guards
export function isProductIOS<T extends { platform?: string }>(
  item: unknown
): item is T & { platform: 'ios' } {
  return (
    item != null &&
    typeof item === 'object' &&
    'platform' in item &&
    item.platform === 'ios'
  );
}

// Functions
/**
 * Sync state with Appstore (iOS only)
 * https://developer.apple.com/documentation/storekit/appstore/3791906-sync
 */
export const sync = (): Promise<boolean> => {
  if (Platform.OS !== 'ios') {
    throw new Error('This method is only available on iOS');
  }
  return IapModule.sync();
};

/**
 * Check if user is eligible for intro offer
 */
export const isEligibleForIntroOffer = (groupID: string): Promise<boolean> => {
  if (Platform.OS !== 'ios') {
    throw new Error('This method is only available on iOS');
  }
  return IapModule.isEligibleForIntroOffer(groupID);
};

/**
 * Get subscription status
 */
export const subscriptionStatus = (
  sku: string
): Promise<ProductStatusIOS[] | null> => {
  if (Platform.OS !== 'ios') {
    throw new Error('This method is only available on iOS');
  }
  return IapModule.subscriptionStatus(sku);
};

/**
 * Get current entitlement
 */
export const currentEntitlement = (
  sku: string
): Promise<ProductStatusIOS | null> => {
  if (Platform.OS !== 'ios') {
    throw new Error('This method is only available on iOS');
  }
  return IapModule.currentEntitlement(sku);
};

/**
 * Get latest transaction
 */
export const latestTransaction = (
  sku: string
): Promise<ProductStatusIOS | null> => {
  if (Platform.OS !== 'ios') {
    throw new Error('This method is only available on iOS');
  }
  return IapModule.latestTransaction(sku);
};

/**
 * Begin refund request
 */
export const beginRefundRequest = (sku: string): Promise<string | null> => {
  if (Platform.OS !== 'ios') {
    throw new Error('This method is only available on iOS');
  }
  return IapModule.beginRefundRequest(sku);
};

/**
 * Shows the system UI for managing subscriptions.
 * When the user changes subscription renewal status, the system will emit events to
 * purchaseUpdatedListener and transactionUpdatedIos listeners.
 * @returns {Promise<boolean>}
 */
export const showManageSubscriptions = (): Promise<boolean> => {
  if (Platform.OS !== 'ios') {
    throw new Error('This method is only available on iOS');
  }
  return IapModule.showManageSubscriptions();
};

/**
 * Get the receipt data from the iOS device.
 * This returns the base64 encoded receipt data which can be sent to your server
 * for verification with Apple's server.
 *
 * NOTE: For proper security, always verify receipts on your server using
 * Apple's verifyReceipt endpoint, not directly from the app.
 *
 * @returns {Promise<string | null>} Base64 encoded receipt data
 */
export const getReceiptIos = (): Promise<string | null> => {
  if (Platform.OS !== 'ios') {
    throw new Error('This method is only available on iOS');
  }
  return IapModule.getReceiptData();
};

/**
 * Check if a transaction is verified through StoreKit 2.
 * StoreKit 2 performs local verification of transaction JWS signatures.
 *
 * @param {string} sku The product's SKU (on iOS)
 * @returns {Promise<boolean>} True if the transaction is verified
 */
export const isTransactionVerified = (sku: string): Promise<boolean> => {
  if (Platform.OS !== 'ios') {
    throw new Error('This method is only available on iOS');
  }
  return IapModule.isTransactionVerified(sku);
};

/**
 * Get the JWS representation of a purchase for server-side verification.
 * The JWS (JSON Web Signature) can be verified on your server using Apple's public keys.
 *
 * @param {string} sku The product's SKU (on iOS)
 * @returns {Promise<string | null>} JWS representation of the transaction
 */
export const getTransactionJws = (sku: string): Promise<string | null> => {
  if (Platform.OS !== 'ios') {
    throw new Error('This method is only available on iOS');
  }
  return IapModule.getTransactionJws(sku);
};

/**
 * Get app transaction for iOS to verify original purchase.
 * Available in iOS 16.0+
 *
 * @returns Promise resolving to app transaction details or null
 * @throws Error if called on non-iOS platform
 *
 * @platform iOS
 * @since iOS 16.0
 */
export const getAppTransactionIOS = (): Promise<AppTransactionIOS | null> => {
  if (Platform.OS !== 'ios') {
    return Promise.resolve(null);
  }
  return IapModule.getAppTransaction();
};

/**
 * Validate receipt for iOS using StoreKit 2's built-in verification.
 * Returns receipt data and verification information to help with server-side validation.
 *
 * NOTE: For proper security, Apple recommends verifying receipts on your server using
 * the verifyReceipt endpoint rather than relying solely on client-side verification.
 *
 * @param {string} sku The product's SKU (on iOS)
 * @returns {Promise<any>}
 */
export const validateReceiptIOS = async (
  sku: string
): Promise<ProductStatusIOS> => {
  if (Platform.OS !== 'ios') {
    throw new Error('This method is only available on iOS');
  }

  const result = await IapModule.validateReceiptIOS(sku);
  return result;
};

/**
 * Present code redemption sheet (iOS only)
 */
export const presentCodeRedemptionSheet = (): Promise<boolean> => {
  if (Platform.OS !== 'ios') {
    throw new Error('This method is only available on iOS');
  }
  return IapModule.presentCodeRedemptionSheet();
};

/**
 * Clear all transactions (iOS only)
 */
export const clearTransaction = (): Promise<void> => {
  if (Platform.OS !== 'ios') {
    throw new Error('This method is only available on iOS');
  }
  return IapModule.clearTransaction();
};

/**
 * Clear all transactions (iOS only) - alias
 */
export const clearTransactionIOS = clearTransaction;

/**
 * Get pending transactions (iOS only)
 */
export const getPendingTransactions = async (): Promise<Purchase[]> => {
  if (Platform.OS !== 'ios') {
    throw new Error('This method is only available on iOS');
  }
  const transactions = await IapModule.getPendingTransactions();
  // Convert NitroPurchase[] to Purchase[]
  return transactions.map((t) => ({
    ...t,
    platform: 'ios' as const,
  })) as unknown as Purchase[];
};

// Aliases for iOS functions to match expo-iap API
export const transactionUpdatedIOS = (
  _listener: (event: { transaction?: Purchase; error?: PurchaseError }) => void
) => {
  // Note: In react-native-iap, listener management is handled by the event manager in index.tsx
  // This is provided for API compatibility with expo-iap
  return {
    remove: () => {
      // Listener removal is managed centrally
    },
  };
};

export const syncIOS = sync;
export const isEligibleForIntroOfferIOS = isEligibleForIntroOffer;
export const subscriptionStatusIOS = subscriptionStatus;
export const currentEntitlementIOS = currentEntitlement;
export const latestTransactionIOS = latestTransaction;
export const beginRefundRequestIOS = beginRefundRequest;
export const showManageSubscriptionsIOS = showManageSubscriptions;
export const getReceiptIOS = getReceiptIos;
export const isTransactionVerifiedIOS = isTransactionVerified;
export const getTransactionJwsIOS = getTransactionJws;
export const presentCodeRedemptionSheetIOS = presentCodeRedemptionSheet;

/**
 * Get promoted product (iOS only)
 * @returns Promise resolving to promoted product or null
 */
export const getPromotedProductIOS = async (): Promise<Product | null> => {
  if (Platform.OS !== 'ios') {
    console.warn('getPromotedProductIOS: This method is only available on iOS');
    return null;
  }
  // This feature is not yet implemented in react-native-iap
  // Promoted products are handled through the promotedProductListenerIOS event
  console.warn(
    'getPromotedProductIOS: Use promotedProductListenerIOS event instead'
  );
  return null;
};

/**
 * Buy promoted product (iOS only)
 * @returns Promise resolving to purchase
 */
export const buyPromotedProductIOS = async (): Promise<Purchase | null> => {
  if (Platform.OS !== 'ios') {
    console.warn('buyPromotedProductIOS: This method is only available on iOS');
    return null;
  }
  // This feature is not yet implemented in react-native-iap
  // Use regular requestPurchase with the promoted product SKU
  console.warn(
    'buyPromotedProductIOS: Use requestPurchase with the promoted product SKU instead'
  );
  return null;
};

/**
 * Get storefront country code (iOS only)
 * Returns the current App Store storefront country code (e.g., "US", "GB")
 *
 * @returns Promise resolving to storefront country code
 * @throws Error if called on non-iOS platform
 *
 * @platform iOS
 */
export const getStorefrontIOS = async (): Promise<string> => {
  if (Platform.OS !== 'ios') {
    throw new Error('This method is only available on iOS');
  }
  return IapModule.getStorefront();
};

export const getStorefront = getStorefrontIOS;
