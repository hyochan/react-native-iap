import type {HybridObject} from 'react-native-nitro-modules';
// NOTE: This Nitro spec re-exports types from the generated schema (src/types.ts)
// via type aliases to avoid duplicating structure. Nitro's codegen expects the
// canonical `Nitro*` names defined here, so we keep the aliases rather than
// removing the types entirely.
import type {
  AndroidSubscriptionOfferInput,
  DeepLinkOptions,
  MutationFinishTransactionArgs,
  ProductCommon,
  PurchaseCommon,
  PurchaseOptions,
  ReceiptValidationAndroidOptions,
  ReceiptValidationProps,
  ReceiptValidationResultAndroid,
  RequestPurchaseIosProps,
  RequestPurchaseResult,
  RequestSubscriptionAndroidProps,
} from '../types';

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║                                  PARAMS                                  ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// Receipt validation parameters

export interface NitroReceiptValidationAndroidOptions {
  accessToken: ReceiptValidationAndroidOptions['accessToken'];
  isSub?: ReceiptValidationAndroidOptions['isSub'];
  packageName: ReceiptValidationAndroidOptions['packageName'];
  productToken: ReceiptValidationAndroidOptions['productToken'];
}

export interface NitroReceiptValidationParams {
  sku: ReceiptValidationProps['sku'];
  androidOptions?: NitroReceiptValidationAndroidOptions | null;
}

// Purchase request parameters

/**
 * iOS-specific purchase request parameters
 */
export interface NitroRequestPurchaseIos {
  sku: RequestPurchaseIosProps['sku'];
  andDangerouslyFinishTransactionAutomatically?: RequestPurchaseIosProps['andDangerouslyFinishTransactionAutomatically'];
  appAccountToken?: RequestPurchaseIosProps['appAccountToken'];
  quantity?: RequestPurchaseIosProps['quantity'];
  withOffer?: Record<string, string> | null;
}

export interface NitroRequestPurchaseAndroid {
  skus: RequestSubscriptionAndroidProps['skus'];
  obfuscatedAccountIdAndroid?: RequestSubscriptionAndroidProps['obfuscatedAccountIdAndroid'];
  obfuscatedProfileIdAndroid?: RequestSubscriptionAndroidProps['obfuscatedProfileIdAndroid'];
  isOfferPersonalized?: RequestSubscriptionAndroidProps['isOfferPersonalized'];
  subscriptionOffers?: AndroidSubscriptionOfferInput[] | null;
  replacementModeAndroid?: RequestSubscriptionAndroidProps['replacementModeAndroid'];
  purchaseTokenAndroid?: RequestSubscriptionAndroidProps['purchaseTokenAndroid'];
}

export interface NitroPurchaseRequest {
  ios?: NitroRequestPurchaseIos | null;
  android?: NitroRequestPurchaseAndroid | null;
}

// Available purchases parameters

/**
 * iOS-specific options for getting available purchases
 */
export interface NitroAvailablePurchasesIosOptions extends PurchaseOptions {
  alsoPublishToEventListener?: boolean | null;
  onlyIncludeActiveItems?: boolean | null;
}

type NitroAvailablePurchasesAndroidType = 'inapp' | 'subs';

export interface NitroAvailablePurchasesAndroidOptions {
  type?: NitroAvailablePurchasesAndroidType;
}

export interface NitroAvailablePurchasesOptions {
  ios?: NitroAvailablePurchasesIosOptions | null;
  android?: NitroAvailablePurchasesAndroidOptions | null;
}

// Transaction finish parameters

/**
 * iOS-specific parameters for finishing a transaction
 */
export interface NitroFinishTransactionIosParams {
  transactionId: string;
}

/**
 * Android-specific parameters for finishing a transaction
 */
export interface NitroFinishTransactionAndroidParams {
  purchaseToken: string;
  isConsumable?: MutationFinishTransactionArgs['isConsumable'];
}

/**
 * Unified finish transaction parameters with platform-specific options
 */
export interface NitroFinishTransactionParams {
  ios?: NitroFinishTransactionIosParams | null;
  android?: NitroFinishTransactionAndroidParams | null;
}

export interface NitroDeepLinkOptionsAndroid {
  skuAndroid?: DeepLinkOptions['skuAndroid'];
  packageNameAndroid?: DeepLinkOptions['packageNameAndroid'];
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║                                  TYPES                                   ║
// ╚══════════════════════════════════════════════════════════════════════════╝

/**
 * Subscription renewal information (iOS only)
 */
export interface NitroSubscriptionRenewalInfo {
  autoRenewStatus: boolean;
  autoRenewPreference?: string | null;
  expirationReason?: number | null;
  gracePeriodExpirationDate?: number | null;
  currentProductID?: string | null;
  platform: string;
}

/**
 * Subscription status information (iOS only)
 */
export interface NitroSubscriptionStatus {
  state: number;
  platform: string;
  renewalInfo?: NitroSubscriptionRenewalInfo | null;
}

/**
 * Purchase result structure for Android operations
 */
export interface NitroPurchaseResult {
  responseCode: number;
  debugMessage?: string;
  code: string;
  message: string;
  purchaseToken?: string;
}

export interface NitroReceiptValidationResultIOS {
  isValid: boolean;
  receiptData: string;
  jwsRepresentation: string;
  latestTransaction?: NitroPurchase | null;
}

export interface NitroReceiptValidationResultAndroid {
  autoRenewing: ReceiptValidationResultAndroid['autoRenewing'];
  betaProduct: ReceiptValidationResultAndroid['betaProduct'];
  cancelDate: ReceiptValidationResultAndroid['cancelDate'];
  cancelReason: ReceiptValidationResultAndroid['cancelReason'];
  deferredDate: ReceiptValidationResultAndroid['deferredDate'];
  deferredSku: ReceiptValidationResultAndroid['deferredSku'];
  freeTrialEndDate: ReceiptValidationResultAndroid['freeTrialEndDate'];
  gracePeriodEndDate: ReceiptValidationResultAndroid['gracePeriodEndDate'];
  parentProductId: ReceiptValidationResultAndroid['parentProductId'];
  productId: ReceiptValidationResultAndroid['productId'];
  productType: ReceiptValidationResultAndroid['productType'];
  purchaseDate: ReceiptValidationResultAndroid['purchaseDate'];
  quantity: ReceiptValidationResultAndroid['quantity'];
  receiptId: ReceiptValidationResultAndroid['receiptId'];
  renewalDate: ReceiptValidationResultAndroid['renewalDate'];
  term: ReceiptValidationResultAndroid['term'];
  termSku: ReceiptValidationResultAndroid['termSku'];
  testTransaction: ReceiptValidationResultAndroid['testTransaction'];
}

export interface NitroPurchase {
  id: PurchaseCommon['id'];
  productId: PurchaseCommon['productId'];
  transactionDate: PurchaseCommon['transactionDate'];
  purchaseToken?: PurchaseCommon['purchaseToken'];
  platform: PurchaseCommon['platform'];
  quantity: PurchaseCommon['quantity'];
  purchaseState: PurchaseCommon['purchaseState'];
  isAutoRenewing: PurchaseCommon['isAutoRenewing'];
  quantityIOS?: number | null;
  originalTransactionDateIOS?: number | null;
  originalTransactionIdentifierIOS?: string | null;
  appAccountToken?: string | null;
  purchaseTokenAndroid?: string | null;
  dataAndroid?: string | null;
  signatureAndroid?: string | null;
  autoRenewingAndroid?: boolean | null;
  purchaseStateAndroid?: number | null;
  isAcknowledgedAndroid?: boolean | null;
  packageNameAndroid?: string | null;
  obfuscatedAccountIdAndroid?: string | null;
  obfuscatedProfileIdAndroid?: string | null;
}

export interface NitroProduct {
  id: ProductCommon['id'];
  title: ProductCommon['title'];
  description: ProductCommon['description'];
  type: string;
  displayName?: ProductCommon['displayName'];
  displayPrice?: ProductCommon['displayPrice'];
  currency?: ProductCommon['currency'];
  price?: ProductCommon['price'];
  platform: ProductCommon['platform'];
  // iOS specific fields
  typeIOS?: string | null;
  isFamilyShareableIOS?: boolean | null;
  jsonRepresentationIOS?: string | null;
  introductoryPriceIOS?: string | null;
  introductoryPriceAsAmountIOS?: number | null;
  introductoryPriceNumberOfPeriodsIOS?: number | null;
  introductoryPricePaymentModeIOS?: string | null;
  introductoryPriceSubscriptionPeriodIOS?: string | null;
  subscriptionPeriodNumberIOS?: number | null;
  subscriptionPeriodUnitIOS?: string | null;
  // Android specific fields
  originalPriceAndroid?: string | null;
  originalPriceAmountMicrosAndroid?: number | null;
  introductoryPriceCyclesAndroid?: number | null;
  introductoryPricePeriodAndroid?: string | null;
  introductoryPriceValueAndroid?: number | null;
  subscriptionPeriodAndroid?: string | null;
  freeTrialPeriodAndroid?: string | null;
  subscriptionOfferDetailsAndroid?: string | null;
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║                             MAIN INTERFACE                               ║
// ╚══════════════════════════════════════════════════════════════════════════╝

/**
 * Main RnIap HybridObject interface for native bridge
 */
export interface RnIap extends HybridObject<{ios: 'swift'; android: 'kotlin'}> {
  // Connection methods

  /**
   * Initialize connection to the store
   * @returns Promise<boolean> - true if connection successful
   */
  initConnection(): Promise<boolean>;

  /**
   * End connection to the store
   * @returns Promise<boolean> - true if disconnection successful
   */
  endConnection(): Promise<boolean>;

  // Product methods

  /**
   * Fetch products from the store
   * @param skus - Array of product SKUs to fetch
   * @param type - Type of products: 'inapp' or 'subs'
   * @returns Promise<NitroProduct[]> - Array of products from the store
   */
  fetchProducts(skus: string[], type: string): Promise<NitroProduct[]>;

  // Purchase methods (unified)

  /**
   * Request a purchase (unified method for both platforms)
   * ⚠️ Important: This is an event-based operation, not promise-based.
   * Listen for events through purchaseUpdatedListener or purchaseErrorListener.
   * @param request - Platform-specific purchase request parameters
   * @returns Promise<void> - Always returns void, listen for events instead
   */
  requestPurchase(
    request: NitroPurchaseRequest,
  ): Promise<RequestPurchaseResult>;

  /**
   * Get available purchases (unified method for both platforms)
   * @param options - Platform-specific options for getting available purchases
   * @returns Promise<NitroPurchase[]> - Array of available purchases
   */
  getAvailablePurchases(
    options?: NitroAvailablePurchasesOptions,
  ): Promise<NitroPurchase[]>;

  /**
   * Finish a transaction (unified method for both platforms)
   * @param params - Platform-specific transaction finish parameters
   * @returns Promise<NitroPurchaseResult | boolean> - Result (Android) or success flag (iOS)
   */
  finishTransaction(
    params: NitroFinishTransactionParams,
  ): Promise<NitroPurchaseResult | boolean>;

  // Event listener methods

  /**
   * Add a listener for purchase updates
   * @param listener - Function to call when a purchase is updated
   */
  addPurchaseUpdatedListener(listener: (purchase: NitroPurchase) => void): void;

  /**
   * Add a listener for purchase errors
   * @param listener - Function to call when a purchase error occurs
   */
  addPurchaseErrorListener(
    listener: (error: NitroPurchaseResult) => void,
  ): void;

  /**
   * Remove a purchase updated listener
   * @param listener - Function to remove from listeners
   */
  removePurchaseUpdatedListener(
    listener: (purchase: NitroPurchase) => void,
  ): void;

  /**
   * Remove a purchase error listener
   * @param listener - Function to remove from listeners
   */
  removePurchaseErrorListener(
    listener: (error: NitroPurchaseResult) => void,
  ): void;

  /**
   * Add a listener for iOS promoted product events
   * @param listener - Function to call when a promoted product is selected in the App Store
   * @platform iOS
   */
  addPromotedProductListenerIOS(
    listener: (product: NitroProduct) => void,
  ): void;

  /**
   * Remove a promoted product listener
   * @param listener - Function to remove from listeners
   * @platform iOS
   */
  removePromotedProductListenerIOS(
    listener: (product: NitroProduct) => void,
  ): void;

  /**
   * Get the storefront identifier for the user's App Store account (iOS only)
   * @returns Promise<string> - The storefront identifier (e.g., 'USA' for United States)
   * @platform iOS
   */
  getStorefrontIOS(): Promise<string>;

  /**
   * Get the original app transaction ID if the app was purchased from the App Store (iOS only)
   * @returns Promise<string | null> - The original app transaction ID or null if not purchased
   * @platform iOS
   */
  getAppTransactionIOS(): Promise<string | null>;

  /**
   * Request the promoted product from the App Store (iOS only)
   * @returns Promise<NitroProduct | null> - The promoted product or null if none available
   * @platform iOS
   */
  requestPromotedProductIOS(): Promise<NitroProduct | null>;

  /**
   * Retrieve the currently promoted product without initiating a purchase flow (iOS only)
   * @returns Promise<NitroProduct | null> - The promoted product or null if none available
   * @platform iOS
   */
  getPromotedProductIOS(): Promise<NitroProduct | null>;

  /**
   * Buy the promoted product from the App Store (iOS only)
   * @returns Promise<void>
   * @platform iOS
   */
  buyPromotedProductIOS(): Promise<void>;

  /**
   * Present the code redemption sheet for offer codes (iOS only)
   * @returns Promise<boolean> - True if the sheet was presented successfully
   * @platform iOS
   */
  presentCodeRedemptionSheetIOS(): Promise<boolean>;

  /**
   * Clear unfinished transactions (iOS only)
   * @returns Promise<void>
   * @platform iOS
   */
  clearTransactionIOS(): Promise<void>;

  /**
   * Begin a refund request for a product (iOS 15+ only)
   * @param sku - The product SKU to refund
   * @returns Promise<string | null> - The refund status or null if not available
   * @platform iOS
   */
  beginRefundRequestIOS(sku: string): Promise<string | null>;

  /**
   * Get subscription status for a product (iOS only)
   * @param sku - The product SKU
   * @returns Promise<NitroSubscriptionStatus[] | null> - Array of subscription status objects
   * @platform iOS
   */
  subscriptionStatusIOS(sku: string): Promise<NitroSubscriptionStatus[] | null>;

  /**
   * Get current entitlement for a product (iOS only)
   * @param sku - The product SKU
   * @returns Promise<NitroPurchase | null> - Current entitlement or null
   * @platform iOS
   */
  currentEntitlementIOS(sku: string): Promise<NitroPurchase | null>;

  /**
   * Get latest transaction for a product (iOS only)
   * @param sku - The product SKU
   * @returns Promise<NitroPurchase | null> - Latest transaction or null
   * @platform iOS
   */
  latestTransactionIOS(sku: string): Promise<NitroPurchase | null>;

  /**
   * Get pending transactions (iOS only)
   * @returns Promise<NitroPurchase[]> - Array of pending transactions
   * @platform iOS
   */
  getPendingTransactionsIOS(): Promise<NitroPurchase[]>;

  /**
   * Sync with the App Store (iOS only)
   * @returns Promise<boolean> - Success flag
   * @platform iOS
   */
  syncIOS(): Promise<boolean>;

  /**
   * Show manage subscriptions screen (iOS only)
   * @returns Promise<NitroPurchase[]> - Array of updated subscriptions with renewal info
   * @platform iOS
   */
  showManageSubscriptionsIOS(): Promise<NitroPurchase[]>;

  /**
   * Deep link to the native subscription management UI (iOS only)
   * @returns Promise<boolean> - True if the deep link request succeeded
   * @platform iOS
   */
  deepLinkToSubscriptionsIOS(): Promise<boolean>;

  /**
   * Check if user is eligible for intro offer (iOS only)
   * @param groupID - The subscription group ID
   * @returns Promise<boolean> - Eligibility status
   * @platform iOS
   */
  isEligibleForIntroOfferIOS(groupID: string): Promise<boolean>;

  /**
   * Get receipt data (iOS only)
   * @returns Promise<string> - Base64 encoded receipt data
   * @platform iOS
   */
  getReceiptDataIOS(): Promise<string>;

  /**
   * Alias for getReceiptDataIOS maintained for compatibility (iOS only)
   * @returns Promise<string> - Base64 encoded receipt data
   * @platform iOS
   */
  getReceiptIOS(): Promise<string>;

  /**
   * Request a refreshed receipt from the App Store (iOS only)
   * @returns Promise<string> - Updated Base64 encoded receipt data
   * @platform iOS
   */
  requestReceiptRefreshIOS(): Promise<string>;

  /**
   * Check if transaction is verified (iOS only)
   * @param sku - The product SKU
   * @returns Promise<boolean> - Verification status
   * @platform iOS
   */
  isTransactionVerifiedIOS(sku: string): Promise<boolean>;

  /**
   * Get transaction JWS representation (iOS only)
   * @param sku - The product SKU
   * @returns Promise<string | null> - JWS representation or null
   * @platform iOS
   */
  getTransactionJwsIOS(sku: string): Promise<string | null>;

  /**
   * Validate a receipt on the appropriate platform
   * @param params - Receipt validation parameters including SKU and platform-specific options
   * @returns Promise<NitroReceiptValidationResultIOS | NitroReceiptValidationResultAndroid> - Platform-specific validation result
   */
  validateReceipt(
    params: NitroReceiptValidationParams,
  ): Promise<
    NitroReceiptValidationResultIOS | NitroReceiptValidationResultAndroid
  >;

  /**
   * Get Google Play storefront country code (Android)
   * @platform Android
   */
  getStorefrontAndroid?(): Promise<string>;

  /**
   * Deep link to Play Store subscription management (Android)
   * @platform Android
   */
  deepLinkToSubscriptionsAndroid?(
    options: NitroDeepLinkOptionsAndroid,
  ): Promise<void>;
}
