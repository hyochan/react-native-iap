import type {HybridObject} from 'react-native-nitro-modules';
// NOTE: This Nitro spec re-exports types from the generated schema (src/types.ts)
// via type aliases to avoid duplicating structure. Nitro's codegen expects the
// canonical `Nitro*` names defined here, so we keep the aliases rather than
// removing the types entirely.
import type {
  ActiveSubscription,
  AndroidSubscriptionOfferInput,
  DeepLinkOptions,
  InitConnectionConfig,
  ExternalPurchaseLinkResultIOS,
  ExternalPurchaseNoticeResultIOS,
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
  UserChoiceBillingDetails,
  PaymentModeIOS,
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

/**
 * Android one-time purchase offer details
 */
export interface NitroOneTimePurchaseOfferDetail {
  formattedPrice: string;
  priceAmountMicros: string;
  priceCurrencyCode: string;
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
  // iOS specific fields
  quantityIOS?: number | null;
  originalTransactionDateIOS?: number | null;
  originalTransactionIdentifierIOS?: string | null;
  appAccountToken?: string | null;
  appBundleIdIOS?: string | null;
  countryCodeIOS?: string | null;
  currencyCodeIOS?: string | null;
  currencySymbolIOS?: string | null;
  environmentIOS?: string | null;
  expirationDateIOS?: number | null;
  isUpgradedIOS?: boolean | null;
  offerIOS?: string | null;
  ownershipTypeIOS?: string | null;
  reasonIOS?: string | null;
  reasonStringRepresentationIOS?: string | null;
  revocationDateIOS?: number | null;
  revocationReasonIOS?: string | null;
  storefrontCountryCodeIOS?: string | null;
  subscriptionGroupIdIOS?: string | null;
  transactionReasonIOS?: string | null;
  webOrderLineItemIdIOS?: string | null;
  renewalInfoIOS?: NitroRenewalInfoIOS | null;
  // Android specific fields
  purchaseTokenAndroid?: string | null;
  dataAndroid?: string | null;
  signatureAndroid?: string | null;
  autoRenewingAndroid?: boolean | null;
  purchaseStateAndroid?: number | null;
  isAcknowledgedAndroid?: boolean | null;
  packageNameAndroid?: string | null;
  obfuscatedAccountIdAndroid?: string | null;
  obfuscatedProfileIdAndroid?: string | null;
  developerPayloadAndroid?: string | null;
}

/**
 * Active subscription with renewalInfoIOS included
 */
export interface NitroActiveSubscription {
  productId: ActiveSubscription['productId'];
  isActive: ActiveSubscription['isActive'];
  transactionId: ActiveSubscription['transactionId'];
  purchaseToken?: ActiveSubscription['purchaseToken'];
  transactionDate: ActiveSubscription['transactionDate'];
  // iOS specific fields
  expirationDateIOS?: ActiveSubscription['expirationDateIOS'];
  environmentIOS?: ActiveSubscription['environmentIOS'];
  willExpireSoon?: ActiveSubscription['willExpireSoon'];
  daysUntilExpirationIOS?: ActiveSubscription['daysUntilExpirationIOS'];
  renewalInfoIOS?: NitroRenewalInfoIOS | null; // 🆕 Key field for upgrade/downgrade detection
  // Android specific fields
  autoRenewingAndroid?: ActiveSubscription['autoRenewingAndroid'];
  basePlanIdAndroid?: ActiveSubscription['basePlanIdAndroid'];
  currentPlanId?: ActiveSubscription['currentPlanId'];
  purchaseTokenAndroid?: ActiveSubscription['purchaseTokenAndroid'];
}

/**
 * Renewal information from StoreKit 2 (iOS only)
 * Must match RenewalInfoIOS from types.ts
 */
export interface NitroRenewalInfoIOS {
  willAutoRenew: boolean;
  autoRenewPreference?: string | null;
  pendingUpgradeProductId?: string | null;
  renewalDate?: number | null;
  expirationReason?: string | null;
  isInBillingRetry?: boolean | null;
  gracePeriodExpirationDate?: number | null;
  priceIncreaseStatus?: string | null;
  renewalOfferType?: string | null;
  renewalOfferId?: string | null;
  jsonRepresentation?: string | null;
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
  discountsIOS?: string | null;
  introductoryPriceIOS?: string | null;
  introductoryPriceAsAmountIOS?: number | null;
  introductoryPriceNumberOfPeriodsIOS?: number | null;
  introductoryPricePaymentModeIOS: PaymentModeIOS;
  introductoryPriceSubscriptionPeriodIOS?: string | null;
  subscriptionPeriodNumberIOS?: number | null;
  subscriptionPeriodUnitIOS?: string | null;
  // Android specific fields
  nameAndroid?: string | null;
  originalPriceAndroid?: string | null;
  originalPriceAmountMicrosAndroid?: number | null;
  introductoryPriceCyclesAndroid?: number | null;
  introductoryPricePeriodAndroid?: string | null;
  introductoryPriceValueAndroid?: number | null;
  subscriptionPeriodAndroid?: string | null;
  freeTrialPeriodAndroid?: string | null;
  subscriptionOfferDetailsAndroid?: string | null;
  oneTimePurchaseOfferDetailsAndroid?: NitroOneTimePurchaseOfferDetail | null;
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
   * @param config - Optional configuration including alternative billing mode for Android
   * @returns Promise<boolean> - true if connection successful
   */
  initConnection(config?: InitConnectionConfig | null): Promise<boolean>;

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
   * Get active subscriptions with renewalInfoIOS included
   * @param subscriptionIds - Optional array of subscription IDs to filter
   * @returns Promise<NitroActiveSubscription[]> - Array of active subscriptions with renewalInfoIOS
   */
  getActiveSubscriptions(
    subscriptionIds?: string[],
  ): Promise<NitroActiveSubscription[]>;

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
   *
   * ⚠️ **IMPORTANT**: iOS receipts are cumulative and contain ALL transactions for the app,
   * not just the most recent one. The receipt data does not change between purchases.
   *
   * **For individual purchase validation, use `getTransactionJwsIOS(productId)` instead.**
   *
   * This returns the App Store Receipt, which:
   * - Contains all purchase history for the app
   * - Does not update immediately after finishTransaction()
   * - May be unavailable immediately after purchase (throws receipt-failed error)
   * - Requires parsing to extract specific transactions
   *
   * @returns Promise<string> - Base64 encoded receipt data containing all app transactions
   * @throws {Error} receipt-failed if receipt is not available (e.g., immediately after purchase)
   * @platform iOS
   * @see getTransactionJwsIOS for validating individual transactions (recommended)
   */
  getReceiptDataIOS(): Promise<string>;

  /**
   * Alias for getReceiptDataIOS maintained for compatibility (iOS only)
   *
   * ⚠️ **IMPORTANT**: iOS receipts are cumulative and contain ALL transactions.
   * For individual purchase validation, use `getTransactionJwsIOS(productId)` instead.
   *
   * @returns Promise<string> - Base64 encoded receipt data containing all app transactions
   * @platform iOS
   * @see getReceiptDataIOS for full documentation
   * @see getTransactionJwsIOS for validating individual transactions (recommended)
   */
  getReceiptIOS(): Promise<string>;

  /**
   * Request a refreshed receipt from the App Store (iOS only)
   *
   * This calls syncIOS() to refresh the receipt from Apple's servers, then returns it.
   *
   * ⚠️ **IMPORTANT**: iOS receipts are cumulative and contain ALL transactions.
   * For individual purchase validation, use `getTransactionJwsIOS(productId)` instead.
   *
   * @returns Promise<string> - Updated Base64 encoded receipt data containing all app transactions
   * @platform iOS
   * @see getTransactionJwsIOS for validating individual transactions (recommended)
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
   * Get transaction JWS (JSON Web Signature) representation for a specific product (iOS only)
   *
   * ✅ **RECOMMENDED** for validating individual purchases with your backend.
   *
   * This returns a unique, cryptographically signed token for the specific transaction,
   * unlike `getReceiptDataIOS()` which returns ALL transactions.
   *
   * Benefits:
   * - Contains ONLY the requested transaction (not all historical purchases)
   * - Cryptographically signed by Apple (can be verified)
   * - Available immediately after purchase
   * - Simpler to validate on your backend
   *
   * @param sku - The product SKU/ID to get the transaction JWS for
   * @returns Promise<string | null> - JWS string for the transaction, or null if not found
   * @platform iOS
   * @example
   * ```typescript
   * const jws = await getTransactionJwsIOS('com.example.product');
   * // Send jws to your backend for validation
   * ```
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
   * Get the storefront country/region code for the current user.
   * @returns Promise<string> - The storefront country code (e.g., "USA")
   * @platform ios | android
   */
  getStorefront(): Promise<string>;

  /**
   * Deep link to Play Store subscription management (Android)
   * @platform Android
   */
  deepLinkToSubscriptionsAndroid?(
    options: NitroDeepLinkOptionsAndroid,
  ): Promise<void>;

  // ╔════════════════════════════════════════════════════════════════════════╗
  // ║                    ALTERNATIVE BILLING (Android)                       ║
  // ╚════════════════════════════════════════════════════════════════════════╝

  /**
   * Check if alternative billing is available for this user/device (Android only).
   * Step 1 of alternative billing flow.
   *
   * @returns Promise<boolean> - true if available, false otherwise
   * @throws Error if billing client not ready
   * @platform Android
   */
  checkAlternativeBillingAvailabilityAndroid(): Promise<boolean>;

  /**
   * Show alternative billing information dialog to user (Android only).
   * Step 2 of alternative billing flow.
   * Must be called BEFORE processing payment in your payment system.
   *
   * @returns Promise<boolean> - true if user accepted, false if user canceled
   * @throws Error if billing client not ready
   * @platform Android
   */
  showAlternativeBillingDialogAndroid(): Promise<boolean>;

  /**
   * Create external transaction token for Google Play reporting (Android only).
   * Step 3 of alternative billing flow.
   * Must be called AFTER successful payment in your payment system.
   * Token must be reported to Google Play backend within 24 hours.
   *
   * @param sku - Optional product SKU that was purchased
   * @returns Promise<string | null> - Token string or null if creation failed
   * @throws Error if billing client not ready
   * @platform Android
   */
  createAlternativeBillingTokenAndroid(
    sku?: string | null,
  ): Promise<string | null>;

  /**
   * Add a listener for user choice billing events (Android only).
   * Fires when a user selects alternative billing in the User Choice Billing dialog.
   *
   * @param listener - Function to call when user chooses alternative billing
   * @platform Android
   */
  addUserChoiceBillingListenerAndroid(
    listener: (details: UserChoiceBillingDetails) => void,
  ): void;

  /**
   * Remove a user choice billing listener (Android only).
   *
   * @param listener - Function to remove from listeners
   * @platform Android
   */
  removeUserChoiceBillingListenerAndroid(
    listener: (details: UserChoiceBillingDetails) => void,
  ): void;

  // ╔════════════════════════════════════════════════════════════════════════╗
  // ║                EXTERNAL PURCHASE LINKS (iOS 16.0+)                     ║
  // ╚════════════════════════════════════════════════════════════════════════╝

  /**
   * Check if the device can present an external purchase notice sheet (iOS 18.2+).
   *
   * @returns Promise<boolean> - true if notice sheet can be presented
   * @platform iOS
   */
  canPresentExternalPurchaseNoticeIOS(): Promise<boolean>;

  /**
   * Present an external purchase notice sheet to inform users about external purchases (iOS 18.2+).
   * This must be called before opening an external purchase link.
   *
   * @returns Promise<ExternalPurchaseNoticeResultIOS> - Result with action and error if any
   * @platform iOS
   */
  presentExternalPurchaseNoticeSheetIOS(): Promise<ExternalPurchaseNoticeResultIOS>;

  /**
   * Present an external purchase link to redirect users to your website (iOS 16.0+).
   *
   * @param url - The external purchase URL to open
   * @returns Promise<ExternalPurchaseLinkResultIOS> - Result with success status and error if any
   * @platform iOS
   */
  presentExternalPurchaseLinkIOS(
    url: string,
  ): Promise<ExternalPurchaseLinkResultIOS>;
}
