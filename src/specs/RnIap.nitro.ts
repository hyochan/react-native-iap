import type { HybridObject } from 'react-native-nitro-modules'

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║                                  PARAMS                                  ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// Receipt validation parameters

/**
 * Android-specific receipt validation options
 */
export interface NitroAndroidReceiptValidationOptions {
  packageName: string
  productToken: string
  accessToken: string
  isSub?: boolean
}

/**
 * Receipt validation parameters
 */
export interface NitroReceiptValidationParams {
  sku: string
  androidOptions?: NitroAndroidReceiptValidationOptions
}

// Purchase request parameters

/**
 * iOS-specific purchase request parameters
 */
interface NitroRequestPurchaseIos {
  sku: string
  andDangerouslyFinishTransactionAutomatically?: boolean
  appAccountToken?: string
  quantity?: number
  withOffer?: Record<string, string>
}

/**
 * Android subscription offer structure
 */
interface NitroSubscriptionOffer {
  sku: string
  offerToken: string
}

/**
 * Android-specific purchase request parameters
 */
interface NitroRequestPurchaseAndroid {
  skus: string[]
  obfuscatedAccountIdAndroid?: string
  obfuscatedProfileIdAndroid?: string
  isOfferPersonalized?: boolean
  subscriptionOffers?: NitroSubscriptionOffer[]
  replacementModeAndroid?: number
  purchaseTokenAndroid?: string
}

/**
 * Unified purchase request with platform-specific options
 */
interface NitroPurchaseRequest {
  ios?: NitroRequestPurchaseIos
  android?: NitroRequestPurchaseAndroid
}

// Available purchases parameters

/**
 * iOS-specific options for getting available purchases
 */
interface NitroAvailablePurchasesIosOptions {
  alsoPublishToEventListener?: boolean // @deprecated Use alsoPublishToEventListenerIOS
  onlyIncludeActiveItems?: boolean // @deprecated Use onlyIncludeActiveItemsIOS
  alsoPublishToEventListenerIOS?: boolean
  onlyIncludeActiveItemsIOS?: boolean
}

/**
 * Android-specific options for getting available purchases
 */
interface NitroAvailablePurchasesAndroidOptions {
  type?: string // 'inapp' or 'subs'
}

/**
 * Unified available purchases options with platform-specific parameters
 */
interface NitroAvailablePurchasesOptions {
  ios?: NitroAvailablePurchasesIosOptions
  android?: NitroAvailablePurchasesAndroidOptions
}

// Transaction finish parameters

/**
 * iOS-specific parameters for finishing a transaction
 */
interface NitroFinishTransactionIosParams {
  transactionId: string
}

/**
 * Android-specific parameters for finishing a transaction
 */
interface NitroFinishTransactionAndroidParams {
  purchaseToken: string
  isConsumable?: boolean
}

/**
 * Unified finish transaction parameters with platform-specific options
 */
interface NitroFinishTransactionParams {
  ios?: NitroFinishTransactionIosParams
  android?: NitroFinishTransactionAndroidParams
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║                                  TYPES                                   ║
// ╚══════════════════════════════════════════════════════════════════════════╝

/**
 * Subscription renewal information (iOS only)
 */
export interface NitroSubscriptionRenewalInfo {
  autoRenewStatus: boolean
  autoRenewPreference?: string
  expirationReason?: number
  gracePeriodExpirationDate?: number
  currentProductID?: string
  platform: string
}

/**
 * Subscription status information (iOS only)
 */
export interface NitroSubscriptionStatus {
  state: number
  platform: string
  renewalInfo?: NitroSubscriptionRenewalInfo
}

/**
 * Purchase result structure for Android operations
 */
export interface NitroPurchaseResult {
  responseCode: number
  debugMessage?: string
  code: string
  message: string
  purchaseToken?: string
}

/**
 * iOS receipt validation result
 */
export interface NitroReceiptValidationResultIOS {
  isValid: boolean
  receiptData: string
  jwsRepresentation: string
  latestTransaction?: NitroPurchase
}

/**
 * Android receipt validation result
 */
export interface NitroReceiptValidationResultAndroid {
  autoRenewing: boolean
  betaProduct: boolean
  cancelDate: number | null
  cancelReason: string
  deferredDate: number | null
  deferredSku: number | null
  freeTrialEndDate: number
  gracePeriodEndDate: number
  parentProductId: string
  productId: string
  productType: string
  purchaseDate: number
  quantity: number
  receiptId: string
  renewalDate: number
  term: string
  termSku: string
  testTransaction: boolean
}

/**
 * Purchase data structure returned from native
 */
export interface NitroPurchase {
  // Common fields
  id: string
  productId: string
  transactionDate: number
  purchaseToken?: string
  platform: string
  quantity: number
  purchaseState: string
  isAutoRenewing: boolean

  // iOS specific fields
  quantityIOS?: number
  originalTransactionDateIOS?: number
  originalTransactionIdentifierIOS?: string
  appAccountToken?: string

  // Android specific fields
  purchaseTokenAndroid?: string
  dataAndroid?: string
  signatureAndroid?: string
  autoRenewingAndroid?: boolean
  purchaseStateAndroid?: number
  isAcknowledgedAndroid?: boolean
  packageNameAndroid?: string
  obfuscatedAccountIdAndroid?: string
  obfuscatedProfileIdAndroid?: string
}

/**
 * Product data structure returned from native
 */
export interface NitroProduct {
  // Common fields
  id: string
  title: string
  description: string
  type: string
  displayName?: string
  displayPrice?: string
  currency?: string
  price?: number
  platform: string

  // iOS specific fields
  typeIOS?: string
  isFamilyShareableIOS?: boolean
  jsonRepresentationIOS?: string
  subscriptionPeriodUnitIOS?: string
  subscriptionPeriodNumberIOS?: number
  introductoryPriceIOS?: string
  introductoryPriceAsAmountIOS?: number
  introductoryPricePaymentModeIOS?: string
  introductoryPriceNumberOfPeriodsIOS?: number
  introductoryPriceSubscriptionPeriodIOS?: string

  // Android specific fields
  originalPriceAndroid?: string
  originalPriceAmountMicrosAndroid?: number
  introductoryPriceValueAndroid?: number
  introductoryPriceCyclesAndroid?: number
  introductoryPricePeriodAndroid?: string
  subscriptionPeriodAndroid?: string
  freeTrialPeriodAndroid?: string
  subscriptionOfferDetailsAndroid?: string // Android subscription offer details as JSON string
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║                             MAIN INTERFACE                               ║
// ╚══════════════════════════════════════════════════════════════════════════╝

/**
 * Main RnIap HybridObject interface for native bridge
 */
export interface RnIap
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  // Connection methods

  /**
   * Initialize connection to the store
   * @returns Promise<boolean> - true if connection successful
   */
  initConnection(): Promise<boolean>

  /**
   * End connection to the store
   * @returns Promise<boolean> - true if disconnection successful
   */
  endConnection(): Promise<boolean>

  // Product methods

  /**
   * Fetch products from the store
   * @param skus - Array of product SKUs to fetch
   * @param type - Type of products: 'inapp' or 'subs'
   * @returns Promise<NitroProduct[]> - Array of products from the store
   */
  fetchProducts(skus: string[], type: string): Promise<NitroProduct[]>

  // Purchase methods (unified)

  /**
   * Request a purchase (unified method for both platforms)
   * ⚠️ Important: This is an event-based operation, not promise-based.
   * Listen for events through purchaseUpdatedListener or purchaseErrorListener.
   * @param request - Platform-specific purchase request parameters
   * @returns Promise<void> - Always returns void, listen for events instead
   */
  requestPurchase(request: NitroPurchaseRequest): Promise<void>

  /**
   * Get available purchases (unified method for both platforms)
   * @param options - Platform-specific options for getting available purchases
   * @returns Promise<NitroPurchase[]> - Array of available purchases
   */
  getAvailablePurchases(
    options?: NitroAvailablePurchasesOptions
  ): Promise<NitroPurchase[]>

  /**
   * Finish a transaction (unified method for both platforms)
   * @param params - Platform-specific transaction finish parameters
   * @returns Promise<NitroPurchaseResult | boolean> - Result (Android) or success flag (iOS)
   */
  finishTransaction(
    params: NitroFinishTransactionParams
  ): Promise<NitroPurchaseResult | boolean>

  // Event listener methods

  /**
   * Add a listener for purchase updates
   * @param listener - Function to call when a purchase is updated
   */
  addPurchaseUpdatedListener(listener: (purchase: NitroPurchase) => void): void

  /**
   * Add a listener for purchase errors
   * @param listener - Function to call when a purchase error occurs
   */
  addPurchaseErrorListener(listener: (error: NitroPurchaseResult) => void): void

  /**
   * Remove a purchase updated listener
   * @param listener - Function to remove from listeners
   */
  removePurchaseUpdatedListener(
    listener: (purchase: NitroPurchase) => void
  ): void

  /**
   * Remove a purchase error listener
   * @param listener - Function to remove from listeners
   */
  removePurchaseErrorListener(
    listener: (error: NitroPurchaseResult) => void
  ): void

  /**
   * Add a listener for iOS promoted product events
   * @param listener - Function to call when a promoted product is selected in the App Store
   * @platform iOS
   */
  addPromotedProductListenerIOS(listener: (product: NitroProduct) => void): void

  /**
   * Remove a promoted product listener
   * @param listener - Function to remove from listeners
   * @platform iOS
   */
  removePromotedProductListenerIOS(
    listener: (product: NitroProduct) => void
  ): void

  /**
   * Get the storefront identifier for the user's App Store account (iOS only)
   * @returns Promise<string> - The storefront identifier (e.g., 'USA' for United States)
   * @platform iOS
   */
  getStorefrontIOS(): Promise<string>

  /**
   * Get the original app transaction ID if the app was purchased from the App Store (iOS only)
   * @returns Promise<string | null> - The original app transaction ID or null if not purchased
   * @platform iOS
   */
  getAppTransactionIOS(): Promise<string | null>

  /**
   * Request the promoted product from the App Store (iOS only)
   * @returns Promise<NitroProduct | null> - The promoted product or null if none available
   * @platform iOS
   */
  requestPromotedProductIOS(): Promise<NitroProduct | null>

  /**
   * Buy the promoted product from the App Store (iOS only)
   * @returns Promise<void>
   * @platform iOS
   */
  buyPromotedProductIOS(): Promise<void>

  /**
   * Present the code redemption sheet for offer codes (iOS only)
   * @returns Promise<boolean> - True if the sheet was presented successfully
   * @platform iOS
   */
  presentCodeRedemptionSheetIOS(): Promise<boolean>

  /**
   * Clear unfinished transactions (iOS only)
   * @returns Promise<void>
   * @platform iOS
   */
  clearTransactionIOS(): Promise<void>

  /**
   * Begin a refund request for a product (iOS 15+ only)
   * @param sku - The product SKU to refund
   * @returns Promise<string | null> - The refund status or null if not available
   * @platform iOS
   */
  beginRefundRequestIOS(sku: string): Promise<string | null>

  /**
   * Get subscription status for a product (iOS only)
   * @param sku - The product SKU
   * @returns Promise<NitroSubscriptionStatus[] | null> - Array of subscription status objects
   * @platform iOS
   */
  subscriptionStatusIOS(sku: string): Promise<NitroSubscriptionStatus[] | null>

  /**
   * Get current entitlement for a product (iOS only)
   * @param sku - The product SKU
   * @returns Promise<NitroPurchase | null> - Current entitlement or null
   * @platform iOS
   */
  currentEntitlementIOS(sku: string): Promise<NitroPurchase | null>

  /**
   * Get latest transaction for a product (iOS only)
   * @param sku - The product SKU
   * @returns Promise<NitroPurchase | null> - Latest transaction or null
   * @platform iOS
   */
  latestTransactionIOS(sku: string): Promise<NitroPurchase | null>

  /**
   * Get pending transactions (iOS only)
   * @returns Promise<NitroPurchase[]> - Array of pending transactions
   * @platform iOS
   */
  getPendingTransactionsIOS(): Promise<NitroPurchase[]>

  /**
   * Sync with the App Store (iOS only)
   * @returns Promise<boolean> - Success flag
   * @platform iOS
   */
  syncIOS(): Promise<boolean>

  /**
   * Show manage subscriptions screen (iOS only)
   * @returns Promise<NitroPurchase[]> - Array of updated subscriptions with renewal info
   * @platform iOS
   */
  showManageSubscriptionsIOS(): Promise<NitroPurchase[]>

  /**
   * Check if user is eligible for intro offer (iOS only)
   * @param groupID - The subscription group ID
   * @returns Promise<boolean> - Eligibility status
   * @platform iOS
   */
  isEligibleForIntroOfferIOS(groupID: string): Promise<boolean>

  /**
   * Get receipt data (iOS only)
   * @returns Promise<string> - Base64 encoded receipt data
   * @platform iOS
   */
  getReceiptDataIOS(): Promise<string>

  /**
   * Check if transaction is verified (iOS only)
   * @param sku - The product SKU
   * @returns Promise<boolean> - Verification status
   * @platform iOS
   */
  isTransactionVerifiedIOS(sku: string): Promise<boolean>

  /**
   * Get transaction JWS representation (iOS only)
   * @param sku - The product SKU
   * @returns Promise<string | null> - JWS representation or null
   * @platform iOS
   */
  getTransactionJwsIOS(sku: string): Promise<string | null>

  /**
   * Validate a receipt on the appropriate platform
   * @param params - Receipt validation parameters including SKU and platform-specific options
   * @returns Promise<NitroReceiptValidationResultIOS | NitroReceiptValidationResultAndroid> - Platform-specific validation result
   */
  validateReceipt(
    params: NitroReceiptValidationParams
  ): Promise<
    NitroReceiptValidationResultIOS | NitroReceiptValidationResultAndroid
  >
}
