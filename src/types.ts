// ============================================================================
// CORE TYPES
// ============================================================================
//
// ⚠️  IMPORTANT: DO NOT MODIFY THIS FILE
//
// This types.ts file is based on the original react-native-iap library
// and maintains backward compatibility for existing users.
//
// Any changes to these types could break existing applications.
// New Nitro-specific types are defined in src/specs/RnIap.nitro.ts
//
// ============================================================================

export type ChangeEventPayload = {
  value: string
}

// iOS detailed product types (4 types)
export enum ProductTypeIOS {
  consumable = 'consumable',
  nonConsumable = 'nonConsumable',
  autoRenewableSubscription = 'autoRenewableSubscription',
  nonRenewingSubscription = 'nonRenewingSubscription',
}

// ============================================================================
// COMMON TYPES (Base types shared across all platforms)
// ============================================================================

/**
 * Base product information shared across all platforms
 */
export type ProductCommon = {
  /** Product identifier (SKU) */
  id: string
  /** Product title displayed to users */
  title: string
  /** Product description */
  description: string
  /** Product type: 'inapp' or 'subs' for Android compatibility */
  type: 'inapp' | 'subs' // Note: this is the actual product type, not for filtering
  /** Display name for the product */
  displayName?: string
  /** Formatted price string for display (e.g., "$9.99") */
  displayPrice: string
  /** Currency code (e.g., "USD", "EUR") */
  currency: string
  /** Raw price value as number */
  price?: number
  /** Debug description for development */
  debugDescription?: string
  /** Platform identifier ('ios' or 'android') */
  platform?: string
}

/**
 * Base purchase information shared across all platforms
 * Represents both consumables, non-consumables, and subscriptions
 */
export type PurchaseCommon = {
  /** Transaction identifier - used by finishTransaction */
  id: string
  /** Product identifier - which product was purchased */
  productId: string
  /** Product identifiers for purchases that include multiple products */
  ids?: string[]
  /** @deprecated - use id instead */
  transactionId?: string
  /** Transaction timestamp in milliseconds */
  transactionDate: number
  /** Transaction receipt for validation */
  transactionReceipt: string
  /** Unified purchase token (jwsRepresentation for iOS, purchaseToken for Android) */
  purchaseToken?: string
  /** Platform identifier ('ios' or 'android') */
  platform?: string
  /** Purchase quantity (defaults to 1) */
  quantity: number
  /** Purchase state (common field) */
  purchaseState: PurchaseState
  /** Auto-renewable subscription flag (common field) */
  isAutoRenewing: boolean
}

export enum PurchaseState {
  pending = 'pending',
  purchased = 'purchased',
  failed = 'failed',
  restored = 'restored', // iOS only
  deferred = 'deferred', // iOS only
  unknown = 'unknown',
}

export type ProductSubscriptionCommon = ProductCommon & {
  type: 'subs'
}

// ============================================================================
// PLATFORM TYPES
// ============================================================================

export type IosPlatform = { platform: 'ios' }
export type AndroidPlatform = { platform: 'android' }

// ============================================================================
// IOS TYPES
// ============================================================================

type SubscriptionIosPeriod = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | ''
type PaymentMode = '' | 'FREETRIAL' | 'PAYASYOUGO' | 'PAYUPFRONT'

type SubscriptionOffer = {
  displayPrice: string
  id: string
  paymentMode: PaymentMode
  period: {
    unit: SubscriptionIosPeriod
    value: number
  }
  periodCount: number
  price: number
  type: 'introductory' | 'promotional'
}

type SubscriptionInfo = {
  introductoryOffer?: SubscriptionOffer
  promotionalOffers?: SubscriptionOffer[]
  subscriptionGroupId: string
  subscriptionPeriod: {
    unit: SubscriptionIosPeriod
    value: number
  }
}

export type Discount = {
  identifier: string
  type: string
  numberOfPeriods: string
  price: string
  localizedPrice: string
  paymentMode: PaymentMode
  subscriptionPeriod: string
}

export type ProductIOS = ProductCommon & {
  displayNameIOS: string
  isFamilyShareableIOS: boolean
  jsonRepresentationIOS: string
  platform: 'ios'
  subscriptionInfoIOS?: SubscriptionInfo
  typeIOS: ProductTypeIOS // Detailed iOS product type
  // deprecated fields
  displayName?: string
  isFamilyShareable?: boolean
  jsonRepresentation?: string
  subscription?: SubscriptionInfo
  introductoryPriceNumberOfPeriodsIOS?: string
  introductoryPriceSubscriptionPeriodIOS?: SubscriptionIosPeriod
}

export type ProductSubscriptionIOS = ProductIOS & {
  discountsIOS?: Discount[]
  introductoryPriceIOS?: string
  introductoryPriceAsAmountIOS?: string
  introductoryPricePaymentModeIOS?: PaymentMode
  introductoryPriceNumberOfPeriodsIOS?: string
  introductoryPriceSubscriptionPeriodIOS?: SubscriptionIosPeriod
  platform: 'ios'
  subscriptionPeriodNumberIOS?: string
  subscriptionPeriodUnitIOS?: SubscriptionIosPeriod
  // deprecated
  discounts?: Discount[]
  introductoryPrice?: string
}

export type PurchaseIOS = PurchaseCommon & {
  platform: 'ios'
  quantityIOS?: number
  originalTransactionDateIOS?: number
  originalTransactionIdentifierIOS?: string
  appAccountToken?: string
  // iOS additional fields from StoreKit 2
  expirationDateIOS?: number
  webOrderLineItemIdIOS?: number
  environmentIOS?: string
  storefrontCountryCodeIOS?: string
  appBundleIdIOS?: string
  productTypeIOS?: string
  subscriptionGroupIdIOS?: string
  isUpgradedIOS?: boolean
  ownershipTypeIOS?: string
  reasonIOS?: string
  reasonStringRepresentationIOS?: string
  transactionReasonIOS?: 'PURCHASE' | 'RENEWAL' | string
  revocationDateIOS?: number
  revocationReasonIOS?: string
  offerIOS?: {
    id: string
    type: string
    paymentMode: string
  }
  // Price locale fields
  currencyCodeIOS?: string
  currencySymbolIOS?: string
  countryCodeIOS?: string
  /**
   * @deprecated Use `purchaseToken` instead. This field will be removed in a future version.
   * iOS 15+ JWS representation is now available through the `purchaseToken` field.
   */
  jwsRepresentationIOS?: string
}

// ============================================================================
// ANDROID TYPES
// ============================================================================

type ProductAndroidOneTimePurchaseOfferDetail = {
  priceCurrencyCode: string
  formattedPrice: string
  priceAmountMicros: string
}

type PricingPhaseAndroid = {
  formattedPrice: string
  priceCurrencyCode: string
  billingPeriod: string // P1W, P1M, P1Y
  billingCycleCount: number
  priceAmountMicros: string
  recurrenceMode: number
}

type PricingPhasesAndroid = {
  pricingPhaseList: PricingPhaseAndroid[]
}

type ProductSubscriptionAndroidOfferDetail = {
  basePlanId: string
  offerId: string
  offerToken: string
  offerTags: string[]
  pricingPhases: PricingPhasesAndroid
}

type ProductSubscriptionAndroidOfferDetails = {
  basePlanId: string
  offerId: string | null
  offerToken: string
  pricingPhases: PricingPhasesAndroid
  offerTags: string[]
}

export type ProductAndroid = ProductCommon & {
  nameAndroid: string
  oneTimePurchaseOfferDetailsAndroid?: ProductAndroidOneTimePurchaseOfferDetail
  platform: 'android'
  subscriptionOfferDetailsAndroid?: ProductSubscriptionAndroidOfferDetail[]
  // deprecated fields
  name?: string
  oneTimePurchaseOfferDetails?: ProductAndroidOneTimePurchaseOfferDetail
  subscriptionOfferDetails?: ProductSubscriptionAndroidOfferDetail[]
}

export type ProductSubscriptionAndroid = ProductAndroid & {
  subscriptionOfferDetailsAndroid: ProductSubscriptionAndroidOfferDetails[]
  // deprecated
  subscriptionOfferDetails?: ProductSubscriptionAndroidOfferDetails[]
}

export type PurchaseAndroid = PurchaseCommon & {
  platform: 'android'
  /**
   * @deprecated Use `purchaseToken` instead. This field will be removed in a future version.
   */
  purchaseTokenAndroid?: string
  dataAndroid?: string
  signatureAndroid?: string
  /** @deprecated Use the common `isAutoRenewing` field instead */
  autoRenewingAndroid?: boolean
  isAcknowledgedAndroid?: boolean
  packageNameAndroid?: string
  developerPayloadAndroid?: string
  obfuscatedAccountIdAndroid?: string
  obfuscatedProfileIdAndroid?: string
}

// ============================================================================
// TYPE ALIASES
// ============================================================================

// Legacy naming for backward compatibility
export type ProductPurchaseIOS = PurchaseIOS
export type ProductPurchaseAndroid = PurchaseAndroid

// Legacy naming for backward compatibility
export type SubscriptionProductIOS = ProductSubscriptionIOS
export type SubscriptionProductAndroid = ProductSubscriptionAndroid

// ============================================================================
// UNION TYPES
// ============================================================================

// Product Union Types
export type Product =
  | (ProductAndroid & AndroidPlatform)
  | (ProductIOS & IosPlatform)

export type SubscriptionProduct =
  | (ProductSubscriptionAndroid & AndroidPlatform)
  | (ProductSubscriptionIOS & IosPlatform)

// Purchase Union Types
/**
 * Regular product purchase (consumable or non-consumable)
 * Both types appear in getAvailablePurchases until finishTransaction is called
 */
export type ProductPurchase =
  | (PurchaseAndroid & AndroidPlatform)
  | (PurchaseIOS & IosPlatform)

/**
 * Active subscription purchase
 * Appears in getAvailablePurchases while subscription is active
 */
export type SubscriptionPurchase =
  | (PurchaseAndroid & AndroidPlatform & { autoRenewingAndroid: boolean })
  | (PurchaseIOS & IosPlatform)

/**
 * Combined purchase type that includes all purchase types
 * Used as return type for getAvailablePurchases
 */
export type Purchase =
  | (PurchaseAndroid & AndroidPlatform)
  | (PurchaseIOS & IosPlatform)

// ============================================================================
// REQUEST TYPES
// ============================================================================

// Product request parameters for fetching products from the store
export interface ProductRequest {
  /** Product SKUs to fetch */
  skus: string[]
  /** Filter type: "inapp" (default), "subs", or "all" */
  type?: 'inapp' | 'subs' | 'all'
}

// iOS-specific purchase request parameters
export interface RequestPurchaseIosProps {
  readonly sku: string
  readonly andDangerouslyFinishTransactionAutomatically?: boolean
  readonly appAccountToken?: string
  readonly quantity?: number
  readonly withOffer?: DiscountOffer
}

// Android-specific purchase request parameters
export interface RequestPurchaseAndroidProps {
  readonly skus: string[]
  readonly obfuscatedAccountIdAndroid?: string
  readonly obfuscatedProfileIdAndroid?: string
  readonly isOfferPersonalized?: boolean
}

// Android-specific subscription request parameters
export interface RequestSubscriptionAndroidProps
  extends RequestPurchaseAndroidProps {
  readonly purchaseTokenAndroid?: string
  readonly replacementModeAndroid?: number
  readonly subscriptionOffers: {
    sku: string
    offerToken: string
  }[]
}

// Platform-specific request structures
export interface RequestPurchasePropsByPlatforms {
  readonly ios?: RequestPurchaseIosProps
  readonly android?: RequestPurchaseAndroidProps
}

export interface RequestSubscriptionPropsByPlatforms {
  readonly ios?: RequestPurchaseIosProps
  readonly android?: RequestSubscriptionAndroidProps
}

// Modern request types (v2.7.0+)
export type RequestPurchaseProps = RequestPurchasePropsByPlatforms
export type RequestSubscriptionProps = RequestSubscriptionPropsByPlatforms

// ============================================================================
// ERROR TYPES
// ============================================================================

export enum ErrorCode {
  E_UNKNOWN = 'E_UNKNOWN',
  E_USER_CANCELLED = 'E_USER_CANCELLED',
  E_USER_ERROR = 'E_USER_ERROR',
  E_ITEM_UNAVAILABLE = 'E_ITEM_UNAVAILABLE',
  E_REMOTE_ERROR = 'E_REMOTE_ERROR',
  E_NETWORK_ERROR = 'E_NETWORK_ERROR',
  E_SERVICE_ERROR = 'E_SERVICE_ERROR',
  E_RECEIPT_FAILED = 'E_RECEIPT_FAILED',
  E_RECEIPT_FINISHED_FAILED = 'E_RECEIPT_FINISHED_FAILED',
  E_NOT_PREPARED = 'E_NOT_PREPARED',
  E_NOT_ENDED = 'E_NOT_ENDED',
  E_ALREADY_OWNED = 'E_ALREADY_OWNED',
  E_DEVELOPER_ERROR = 'E_DEVELOPER_ERROR',
  E_BILLING_RESPONSE_JSON_PARSE_ERROR = 'E_BILLING_RESPONSE_JSON_PARSE_ERROR',
  E_DEFERRED_PAYMENT = 'E_DEFERRED_PAYMENT',
  E_INTERRUPTED = 'E_INTERRUPTED',
  E_IAP_NOT_AVAILABLE = 'E_IAP_NOT_AVAILABLE',
  E_PURCHASE_ERROR = 'E_PURCHASE_ERROR',
  E_SYNC_ERROR = 'E_SYNC_ERROR',
  E_TRANSACTION_VALIDATION_FAILED = 'E_TRANSACTION_VALIDATION_FAILED',
  E_ACTIVITY_UNAVAILABLE = 'E_ACTIVITY_UNAVAILABLE',
  E_ALREADY_PREPARED = 'E_ALREADY_PREPARED',
  E_PENDING = 'E_PENDING',
  E_CONNECTION_CLOSED = 'E_CONNECTION_CLOSED',
  E_INIT_CONNECTION = 'E_INIT_CONNECTION',
  E_SERVICE_DISCONNECTED = 'E_SERVICE_DISCONNECTED',
  E_QUERY_PRODUCT = 'E_QUERY_PRODUCT',
  E_SKU_NOT_FOUND = 'E_SKU_NOT_FOUND',
  E_SKU_OFFER_MISMATCH = 'E_SKU_OFFER_MISMATCH',
  E_ITEM_NOT_OWNED = 'E_ITEM_NOT_OWNED',
  E_BILLING_UNAVAILABLE = 'E_BILLING_UNAVAILABLE',
  E_FEATURE_NOT_SUPPORTED = 'E_FEATURE_NOT_SUPPORTED',
  E_EMPTY_SKU_LIST = 'E_EMPTY_SKU_LIST',
}

export type PurchaseResult = {
  responseCode?: number
  debugMessage?: string
  code?: string
  message?: string
  /**
   * @deprecated Use `purchaseToken` instead. This field will be removed in a future version.
   */
  purchaseTokenAndroid?: string
  purchaseToken?: string
}

// Additional iOS types
export type DiscountOffer = {
  identifier: string
  keyIdentifier: string
  nonce: string
  signature: string
  timestamp: number
}

export type AppTransactionIOS = {
  appTransactionId?: string
  originalPlatform?: string
  bundleId: string
  appVersion: string
  originalAppVersion: string
  originalPurchaseDate: number
  deviceVerification: string
  deviceVerificationNonce: string
  environment: string
  signedDate: number
  appId?: number
  appVersionId?: number
  preorderDate?: number
}

// ============================================================================
// METHOD OPTIONS TYPES
// ============================================================================

/**
 * Options for getAvailablePurchases and getPurchaseHistories methods
 */
export interface PurchaseOptions {
  /** Whether to also publish purchases to event listener */
  alsoPublishToEventListenerIOS?: boolean
  /** Whether to only include active items (subscriptions that are still active) */
  onlyIncludeActiveItemsIOS?: boolean
}

/**
 * Parameters for finishTransaction method
 */
export interface FinishTransactionParams {
  /** The purchase to finish/consume */
  purchase: Purchase
  /**
   * Whether this is a consumable product that should be consumed.
   * - Set to true for consumable products (e.g., "20 credits", "100 coins")
   * - Set to false (or omit) for non-consumable products (e.g., "remove ads", "premium features")
   * - Do NOT set to true for subscriptions - they are managed automatically
   * Note: On iOS, this flag doesn't affect behavior as StoreKit handles this automatically.
   * On Android, consumables must be consumed to allow repurchase.
   */
  isConsumable?: boolean
}

// ============================================================================
// IAP CONTEXT INTERFACE
// ============================================================================

/**
 * Main IAP context interface providing all in-app purchase functionality
 */
export interface IapContext {
  /** Current list of available products */
  products: Product[]
  /** Current list of available subscription products */
  subscriptions: SubscriptionProduct[]
  /**
   * List of available purchases (includes all types):
   * - Consumables: Not yet consumed/finished
   * - Non-consumables: Not yet finished
   * - Subscriptions: Currently active
   */
  availablePurchases: Purchase[]
  /** Currently promoted product (iOS only) */
  promotedProduct?: Product
  /** Current purchase being processed */
  currentPurchase?: Purchase
  /** Purchase error if any */
  purchaseError?: PurchaseError

  // Connection methods
  /** Initialize connection to the store */
  initConnection(): Promise<boolean>
  /** End connection to the store */
  endConnection(): Promise<boolean>
  /** Sync purchases (iOS only) */
  sync(): Promise<void>

  // Product methods
  /**
   * Fetch products from the store
   * @param params.skus - Array of product SKUs to fetch
   * @param params.type - Type of products: 'inapp' for regular products, 'subs' for subscriptions, 'all' to fetch both. Defaults to 'inapp'
   */
  fetchProducts(params: {
    skus: string[]
    type?: 'inapp' | 'subs' | 'all' // Defaults to 'inapp'
  }): Promise<Product[] | SubscriptionProduct[]>

  // Purchase methods
  /**
   * Request a purchase for products or subscriptions
   * @param params.request - Platform-specific purchase parameters
   * @param params.type - Type of purchase: 'inapp' for products or 'subs' for subscriptions
   */
  requestPurchase(params: {
    request: RequestPurchaseProps | RequestSubscriptionProps
    type?: 'inapp' | 'subs' // defaults to 'inapp'
  }): Promise<Purchase | Purchase[] | void>
  /**
   * Finish a transaction and consume if applicable.
   * IMPORTANT: Every purchase must be finished to complete the transaction.
   * - For consumables: Set isConsumable=true to allow repurchase
   * - For non-consumables & subscriptions: Set isConsumable=false or omit
   */
  finishTransaction(
    params: FinishTransactionParams
  ): Promise<PurchaseResult | boolean>

  // Purchase history methods
  /**
   * Get all available purchases for the current user.
   * Returns:
   * - Consumables that haven't been consumed (finished with isConsumable=true)
   * - Non-consumables that haven't been finished
   * - Active subscriptions
   */
  getAvailablePurchases(options?: PurchaseOptions): Promise<Purchase[]>

  // Receipt validation
  /** Validate a receipt (server-side validation recommended) */
  validateReceipt(
    sku: string,
    androidOptions?: {
      packageName: string
      productToken: string
      accessToken: string
      isSub?: boolean
    }
  ): Promise<ReceiptValidationResult>
}

/**
 * Purchase error type
 */
export interface PurchaseError {
  /** Error code constant */
  code: string
  /** Human-readable error message */
  message: string
  /** Related product SKU */
  productId?: string
}

/**
 * Validation options for receipt validation
 */
export interface ReceiptValidationProps {
  /** Product SKU to validate */
  sku: string
  /** Android-specific validation options */
  androidOptions?: {
    packageName: string
    productToken: string
    accessToken: string
    isSub?: boolean
  }
}

/**
 * iOS receipt validation result
 */
export interface ReceiptValidationResultIOS {
  /** Whether the receipt is valid */
  isValid: boolean
  /** Receipt data string */
  receiptData: string
  /** JWS representation */
  jwsRepresentation: string
  /** Latest transaction if available */
  latestTransaction?: Purchase
}

/**
 * Android receipt validation result
 */
export interface ReceiptValidationResultAndroid {
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
  productType: 'inapp' | 'subs'
  purchaseDate: number
  quantity: number
  receiptId: string
  renewalDate: number
  term: string
  termSku: string
  testTransaction: boolean
}

/**
 * Receipt validation result from receipt validation
 */
export type ReceiptValidationResult =
  | ReceiptValidationResultAndroid
  | ReceiptValidationResultIOS

/**
 * Represents an active subscription with platform-specific details
 */
export interface ActiveSubscription {
  /** Product identifier (SKU) of the subscription */
  productId: string
  /** Whether the subscription is currently active */
  isActive: boolean
  /** Transaction identifier for backend validation */
  transactionId: string
  /** JWT token (iOS) or purchase token (Android) for backend validation */
  purchaseToken?: string
  /** Transaction timestamp */
  transactionDate: number
  /** iOS: Subscription expiration date */
  expirationDateIOS?: Date
  /** @deprecated Use the common `isAutoRenewing` field instead */
  autoRenewingAndroid?: boolean
  /** iOS: Environment where the subscription was purchased (Production/Sandbox) */
  environmentIOS?: string
  /** Whether the subscription will expire soon (typically within 7 days) */
  willExpireSoon?: boolean
  /** iOS: Number of days until the subscription expires */
  daysUntilExpirationIOS?: number
}
