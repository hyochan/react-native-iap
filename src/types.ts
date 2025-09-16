// ============================================================================
// AUTO-GENERATED TYPES — DO NOT EDIT DIRECTLY
// Run `npm run generate` after updating any *.graphql schema file.
// ============================================================================

export interface ActiveSubscription {
  autoRenewingAndroid?: boolean | null;
  daysUntilExpirationIOS?: number | null;
  environmentIOS?: string | null;
  expirationDateIOS?: number | null;
  isActive: boolean;
  productId: string;
  purchaseToken?: string | null;
  transactionDate: number;
  transactionId: string;
  willExpireSoon?: boolean | null;
}

export interface AndroidSubscriptionOfferInput {
  /** Offer token */
  offerToken: string;
  /** Product SKU */
  sku: string;
}

export interface AppTransaction {
  appId: number;
  appTransactionId?: string | null;
  appVersion: string;
  appVersionId: number;
  bundleId: string;
  deviceVerification: string;
  deviceVerificationNonce: string;
  environment: string;
  originalAppVersion: string;
  originalPlatform?: string | null;
  originalPurchaseDate: number;
  preorderDate?: number | null;
  signedDate: number;
}

export interface DeepLinkOptions {
  /** Android package name to target (required on Android) */
  packageNameAndroid?: string | null;
  /** Android SKU to open (required on Android) */
  skuAndroid?: string | null;
}

export interface DiscountIos {
  identifier: string;
  localizedPrice?: string | null;
  numberOfPeriods: number;
  paymentMode: PaymentModeIos;
  price: string;
  priceAmount: number;
  subscriptionPeriod: string;
  type: string;
}

export interface DiscountOfferIos {
  /** Discount identifier */
  identifier: string;
  /** Key identifier for validation */
  keyIdentifier: string;
  /** Cryptographic nonce */
  nonce: string;
  /** Signature for validation */
  signature: string;
  /** Timestamp of discount offer */
  timestamp: number;
}

export interface DiscountOfferInputIos {
  /** Discount identifier */
  identifier: string;
  /** Key identifier for validation */
  keyIdentifier: string;
  /** Cryptographic nonce */
  nonce: string;
  /** Signature for validation */
  signature: string;
  /** Timestamp of discount offer */
  timestamp: number;
}

export interface EntitlementIos {
  jsonRepresentation: string;
  sku: string;
  transactionId: string;
}

export enum ErrorCode {
  ActivityUnavailable = 'ACTIVITY_UNAVAILABLE',
  AlreadyOwned = 'ALREADY_OWNED',
  AlreadyPrepared = 'ALREADY_PREPARED',
  BillingResponseJsonParseError = 'BILLING_RESPONSE_JSON_PARSE_ERROR',
  BillingUnavailable = 'BILLING_UNAVAILABLE',
  ConnectionClosed = 'CONNECTION_CLOSED',
  DeferredPayment = 'DEFERRED_PAYMENT',
  DeveloperError = 'DEVELOPER_ERROR',
  EmptySkuList = 'EMPTY_SKU_LIST',
  FeatureNotSupported = 'FEATURE_NOT_SUPPORTED',
  IapNotAvailable = 'IAP_NOT_AVAILABLE',
  InitConnection = 'INIT_CONNECTION',
  Interrupted = 'INTERRUPTED',
  ItemNotOwned = 'ITEM_NOT_OWNED',
  ItemUnavailable = 'ITEM_UNAVAILABLE',
  NetworkError = 'NETWORK_ERROR',
  NotEnded = 'NOT_ENDED',
  NotPrepared = 'NOT_PREPARED',
  Pending = 'PENDING',
  PurchaseError = 'PURCHASE_ERROR',
  QueryProduct = 'QUERY_PRODUCT',
  ReceiptFailed = 'RECEIPT_FAILED',
  ReceiptFinished = 'RECEIPT_FINISHED',
  ReceiptFinishedFailed = 'RECEIPT_FINISHED_FAILED',
  RemoteError = 'REMOTE_ERROR',
  ServiceDisconnected = 'SERVICE_DISCONNECTED',
  ServiceError = 'SERVICE_ERROR',
  SkuNotFound = 'SKU_NOT_FOUND',
  SkuOfferMismatch = 'SKU_OFFER_MISMATCH',
  SyncError = 'SYNC_ERROR',
  TransactionValidationFailed = 'TRANSACTION_VALIDATION_FAILED',
  Unknown = 'UNKNOWN',
  UserCancelled = 'USER_CANCELLED',
  UserError = 'USER_ERROR',
}

export interface FetchProductsResult {
  products?: Product[] | null;
  subscriptions?: ProductSubscription[] | null;
}

export enum IapEvent {
  PromotedProductIos = 'PROMOTED_PRODUCT_IOS',
  PurchaseError = 'PURCHASE_ERROR',
  PurchaseUpdated = 'PURCHASE_UPDATED',
}

export interface Mutation {
  _placeholder?: boolean | null;
  /** Acknowledge a non-consumable purchase or subscription */
  acknowledgePurchaseAndroid: Promise<VoidResult>;
  /** Initiate a refund request for a product (iOS 15+) */
  beginRefundRequestIOS: Promise<RefundResultIos>;
  /** Clear pending transactions from the StoreKit payment queue */
  clearTransactionIOS: Promise<VoidResult>;
  /** Consume a purchase token so it can be repurchased */
  consumePurchaseAndroid: Promise<VoidResult>;
  /** Open the native subscription management surface */
  deepLinkToSubscriptions: Promise<VoidResult>;
  /** Close the platform billing connection */
  endConnection: Promise<boolean>;
  /** Finish a transaction after validating receipts */
  finishTransaction: Promise<VoidResult>;
  /** Establish the platform billing connection */
  initConnection: Promise<boolean>;
  /** Present the App Store code redemption sheet */
  presentCodeRedemptionSheetIOS: Promise<VoidResult>;
  /** Initiate a purchase flow; rely on events for final state */
  requestPurchase?: Promise<RequestPurchaseResult | null>;
  /** Purchase the promoted product surfaced by the App Store */
  requestPurchaseOnPromotedProductIOS: Promise<PurchaseIos>;
  /** Restore completed purchases across platforms */
  restorePurchases: Promise<VoidResult>;
  /** Open subscription management UI and return changed purchases (iOS 15+) */
  showManageSubscriptionsIOS: Promise<PurchaseIos[]>;
  /** Force a StoreKit sync for transactions (iOS 15+) */
  syncIOS: Promise<VoidResult>;
  /** Validate purchase receipts with the configured providers */
  validateReceipt: Promise<ReceiptValidationResult>;
}

export interface MutationAcknowledgePurchaseAndroidArgs {
  purchaseToken: string;
}

export interface MutationBeginRefundRequestIosArgs {
  sku: string;
}

export interface MutationConsumePurchaseAndroidArgs {
  purchaseToken: string;
}

export interface MutationDeepLinkToSubscriptionsArgs {
  options?: DeepLinkOptions | null;
}

export interface MutationFinishTransactionArgs {
  isConsumable?: boolean | null;
  purchase: PurchaseInput;
}

export interface MutationRequestPurchaseArgs {
  params: PurchaseParams;
}

export interface MutationValidateReceiptArgs {
  options: ReceiptValidationProps;
}

export enum PaymentModeIos {
  Empty = 'EMPTY',
  FreeTrial = 'FREE_TRIAL',
  PayAsYouGo = 'PAY_AS_YOU_GO',
  PayUpFront = 'PAY_UP_FRONT',
}

export enum Platform {
  Android = 'ANDROID',
  Ios = 'IOS',
}

export interface PricingPhaseAndroid {
  billingCycleCount: number;
  billingPeriod: string;
  formattedPrice: string;
  priceAmountMicros: string;
  priceCurrencyCode: string;
  recurrenceMode: number;
}

export interface PricingPhasesAndroid {
  pricingPhaseList: PricingPhaseAndroid[];
}

export type Product = ProductAndroid | ProductIos;

export interface ProductAndroid extends ProductCommon {
  currency: string;
  debugDescription?: string | null;
  description: string;
  displayName?: string | null;
  displayPrice: string;
  id: string;
  nameAndroid: string;
  oneTimePurchaseOfferDetailsAndroid?: ProductAndroidOneTimePurchaseOfferDetail | null;
  platform: Platform;
  price?: number | null;
  subscriptionOfferDetailsAndroid?:
    | ProductSubscriptionAndroidOfferDetails[]
    | null;
  title: string;
  type: ProductType;
}

export interface ProductAndroidOneTimePurchaseOfferDetail {
  formattedPrice: string;
  priceAmountMicros: string;
  priceCurrencyCode: string;
}

export interface ProductCommon {
  currency: string;
  debugDescription?: string | null;
  description: string;
  displayName?: string | null;
  displayPrice: string;
  id: string;
  platform: Platform;
  price?: number | null;
  title: string;
  type: ProductType;
}

export interface ProductIos extends ProductCommon {
  currency: string;
  debugDescription?: string | null;
  description: string;
  displayName?: string | null;
  displayNameIOS: string;
  displayPrice: string;
  id: string;
  isFamilyShareableIOS: boolean;
  jsonRepresentationIOS: string;
  platform: Platform;
  price?: number | null;
  subscriptionInfoIOS?: SubscriptionInfoIos | null;
  title: string;
  type: ProductType;
  typeIOS: ProductTypeIos;
}

export enum ProductQueryType {
  All = 'ALL',
  InApp = 'IN_APP',
  Subs = 'SUBS',
}

export interface ProductRequest {
  skus: string[];
  type?: ProductQueryType | null;
}

export type ProductSubscription =
  | ProductSubscriptionAndroid
  | ProductSubscriptionIos;

export interface ProductSubscriptionAndroid extends ProductCommon {
  currency: string;
  debugDescription?: string | null;
  description: string;
  displayName?: string | null;
  displayPrice: string;
  id: string;
  nameAndroid: string;
  oneTimePurchaseOfferDetailsAndroid?: ProductAndroidOneTimePurchaseOfferDetail | null;
  platform: Platform;
  price?: number | null;
  subscriptionOfferDetailsAndroid: ProductSubscriptionAndroidOfferDetails[];
  title: string;
  type: ProductType;
}

export interface ProductSubscriptionAndroidOfferDetails {
  basePlanId: string;
  offerId?: string | null;
  offerTags: string[];
  offerToken: string;
  pricingPhases: PricingPhasesAndroid;
}

export interface ProductSubscriptionIos extends ProductCommon {
  currency: string;
  debugDescription?: string | null;
  description: string;
  discountsIOS?: DiscountIos[] | null;
  displayName?: string | null;
  displayNameIOS: string;
  displayPrice: string;
  id: string;
  introductoryPriceAsAmountIOS?: string | null;
  introductoryPriceIOS?: string | null;
  introductoryPriceNumberOfPeriodsIOS?: string | null;
  introductoryPricePaymentModeIOS?: PaymentModeIos | null;
  introductoryPriceSubscriptionPeriodIOS?: SubscriptionPeriodIos | null;
  isFamilyShareableIOS: boolean;
  jsonRepresentationIOS: string;
  platform: Platform;
  price?: number | null;
  subscriptionInfoIOS?: SubscriptionInfoIos | null;
  subscriptionPeriodNumberIOS?: string | null;
  subscriptionPeriodUnitIOS?: SubscriptionPeriodIos | null;
  title: string;
  type: ProductType;
  typeIOS: ProductTypeIos;
}

export enum ProductType {
  InApp = 'IN_APP',
  Subs = 'SUBS',
}

export enum ProductTypeIos {
  AutoRenewableSubscription = 'AUTO_RENEWABLE_SUBSCRIPTION',
  Consumable = 'CONSUMABLE',
  NonConsumable = 'NON_CONSUMABLE',
  NonRenewingSubscription = 'NON_RENEWING_SUBSCRIPTION',
}

export type Purchase = PurchaseAndroid | PurchaseIos;

export interface PurchaseAndroid extends PurchaseCommon {
  autoRenewingAndroid?: boolean | null;
  dataAndroid?: string | null;
  developerPayloadAndroid?: string | null;
  id: string;
  ids?: string[] | null;
  isAcknowledgedAndroid?: boolean | null;
  isAutoRenewing: boolean;
  obfuscatedAccountIdAndroid?: string | null;
  obfuscatedProfileIdAndroid?: string | null;
  packageNameAndroid?: string | null;
  platform: Platform;
  productId: string;
  purchaseState: PurchaseState;
  purchaseToken?: string | null;
  quantity: number;
  signatureAndroid?: string | null;
  transactionDate: number;
}

export interface PurchaseCommon {
  id: string;
  ids?: string[] | null;
  isAutoRenewing: boolean;
  platform: Platform;
  productId: string;
  purchaseState: PurchaseState;
  /** Unified purchase token (iOS JWS, Android purchaseToken) */
  purchaseToken?: string | null;
  quantity: number;
  transactionDate: number;
}

export interface PurchaseError {
  code: ErrorCode;
  message: string;
  productId?: string | null;
}

export interface PurchaseIos extends PurchaseCommon {
  appAccountToken?: string | null;
  appBundleIdIOS?: string | null;
  countryCodeIOS?: string | null;
  currencyCodeIOS?: string | null;
  currencySymbolIOS?: string | null;
  environmentIOS?: string | null;
  expirationDateIOS?: number | null;
  id: string;
  ids?: string[] | null;
  isAutoRenewing: boolean;
  isUpgradedIOS?: boolean | null;
  offerIOS?: PurchaseOfferIos | null;
  originalTransactionDateIOS?: number | null;
  originalTransactionIdentifierIOS?: string | null;
  ownershipTypeIOS?: string | null;
  platform: Platform;
  productId: string;
  purchaseState: PurchaseState;
  purchaseToken?: string | null;
  quantity: number;
  quantityIOS?: number | null;
  reasonIOS?: string | null;
  reasonStringRepresentationIOS?: string | null;
  revocationDateIOS?: number | null;
  revocationReasonIOS?: string | null;
  storefrontCountryCodeIOS?: string | null;
  subscriptionGroupIdIOS?: string | null;
  transactionDate: number;
  transactionReasonIOS?: string | null;
  webOrderLineItemIdIOS?: string | null;
}

export interface PurchaseInput {
  id: string;
  ids?: string[] | null;
  isAutoRenewing: boolean;
  platform: Platform;
  productId: string;
  purchaseState: PurchaseState;
  purchaseToken?: string | null;
  quantity: number;
  transactionDate: number;
}

export interface PurchaseOfferIos {
  id: string;
  paymentMode: string;
  type: string;
}

export interface PurchaseOptions {
  /** Also emit results through the iOS event listeners */
  alsoPublishToEventListenerIOS?: boolean | null;
  /** Limit to currently active items on iOS */
  onlyIncludeActiveItemsIOS?: boolean | null;
}

export interface PurchaseParams {
  /** Per-platform purchase request props */
  requestPurchase?: RequestPurchasePropsByPlatforms | null;
  /** Per-platform subscription request props */
  requestSubscription?: RequestSubscriptionPropsByPlatforms | null;
  /** Explicit purchase type hint (defaults to in-app) */
  type?: ProductQueryType | null;
}

export enum PurchaseState {
  Deferred = 'DEFERRED',
  Failed = 'FAILED',
  Pending = 'PENDING',
  Purchased = 'PURCHASED',
  Restored = 'RESTORED',
  Unknown = 'UNKNOWN',
}

export interface Query {
  _placeholder?: boolean | null;
  /** Get current StoreKit 2 entitlements (iOS 15+) */
  currentEntitlementIOS: Promise<EntitlementIos[]>;
  /** Retrieve products or subscriptions from the store */
  fetchProducts: Promise<FetchProductsResult>;
  /** Get active subscriptions (filters by subscriptionIds when provided) */
  getActiveSubscriptions: Promise<ActiveSubscription[]>;
  /** Fetch the current app transaction (iOS 16+) */
  getAppTransactionIOS?: Promise<AppTransaction | null>;
  /** Get all available purchases for the current user */
  getAvailablePurchases: Promise<Purchase[]>;
  /** Retrieve all pending transactions in the StoreKit queue */
  getPendingTransactionsIOS: Promise<PurchaseIos[]>;
  /** Get the currently promoted product (iOS 11+) */
  getPromotedProductIOS?: Promise<ProductIos | null>;
  /** Get base64-encoded receipt data for validation */
  getReceiptDataIOS: Promise<string>;
  /** Get the current App Store storefront country code */
  getStorefrontIOS: Promise<string>;
  /** Get the transaction JWS (StoreKit 2) */
  getTransactionJwsIOS: Promise<string>;
  /** Check whether the user has active subscriptions */
  hasActiveSubscriptions: Promise<boolean>;
  /** Check introductory offer eligibility for specific products */
  isEligibleForIntroOfferIOS: Promise<boolean>;
  /** Verify a StoreKit 2 transaction signature */
  isTransactionVerifiedIOS: Promise<boolean>;
  /** Get the latest transaction for a product using StoreKit 2 */
  latestTransactionIOS?: Promise<PurchaseIos | null>;
  /** Get StoreKit 2 subscription status details (iOS 15+) */
  subscriptionStatusIOS: Promise<SubscriptionStatusIos[]>;
}

export interface QueryCurrentEntitlementIosArgs {
  skus?: string[] | null;
}

export interface QueryFetchProductsArgs {
  params: ProductRequest;
}

export interface QueryGetActiveSubscriptionsArgs {
  subscriptionIds?: string[] | null;
}

export interface QueryGetAvailablePurchasesArgs {
  options?: PurchaseOptions | null;
}

export interface QueryGetTransactionJwsIosArgs {
  transactionId: string;
}

export interface QueryHasActiveSubscriptionsArgs {
  subscriptionIds?: string[] | null;
}

export interface QueryIsEligibleForIntroOfferIosArgs {
  productIds: string[];
}

export interface QueryIsTransactionVerifiedIosArgs {
  transactionId: string;
}

export interface QueryLatestTransactionIosArgs {
  sku: string;
}

export interface QuerySubscriptionStatusIosArgs {
  skus?: string[] | null;
}

export interface ReceiptValidationAndroidOptions {
  accessToken: string;
  isSub?: boolean | null;
  packageName: string;
  productToken: string;
}

export interface ReceiptValidationProps {
  /** Android-specific validation options */
  androidOptions?: ReceiptValidationAndroidOptions | null;
  /** Product SKU to validate */
  sku: string;
}

export type ReceiptValidationResult =
  | ReceiptValidationResultAndroid
  | ReceiptValidationResultIos;

export interface ReceiptValidationResultAndroid {
  autoRenewing: boolean;
  betaProduct: boolean;
  cancelDate?: number | null;
  cancelReason?: string | null;
  deferredDate?: number | null;
  deferredSku?: number | null;
  freeTrialEndDate: number;
  gracePeriodEndDate: number;
  parentProductId: string;
  productId: string;
  productType: string;
  purchaseDate: number;
  quantity: number;
  receiptId: string;
  renewalDate: number;
  term: string;
  termSku: string;
  testTransaction: boolean;
}

export interface ReceiptValidationResultIos {
  /** Whether the receipt is valid */
  isValid: boolean;
  /** JWS representation */
  jwsRepresentation: string;
  /** Latest transaction if available */
  latestTransaction?: Purchase | null;
  /** Receipt data string */
  receiptData: string;
}

export interface RefundResultIos {
  message?: string | null;
  status: string;
}

export interface RenewalInfoIos {
  autoRenewPreference?: string | null;
  jsonRepresentation?: string | null;
  willAutoRenew: boolean;
}

export interface RequestPurchaseAndroidProps {
  /** Personalized offer flag */
  isOfferPersonalized?: boolean | null;
  /** Obfuscated account ID */
  obfuscatedAccountIdAndroid?: string | null;
  /** Obfuscated profile ID */
  obfuscatedProfileIdAndroid?: string | null;
  /** List of product SKUs */
  skus: string[];
}

export interface RequestPurchaseIosProps {
  /** Auto-finish transaction (dangerous) */
  andDangerouslyFinishTransactionAutomatically?: boolean | null;
  /** App account token for user tracking */
  appAccountToken?: string | null;
  /** Purchase quantity */
  quantity?: number | null;
  /** Product SKU */
  sku: string;
  /** Discount offer to apply */
  withOffer?: DiscountOfferInputIos | null;
}

export interface RequestPurchaseProps {
  /** Android-specific purchase parameters */
  android?: RequestPurchaseAndroidProps | null;
  /** iOS-specific purchase parameters */
  ios?: RequestPurchaseIosProps | null;
}

export interface RequestPurchasePropsByPlatforms {
  /** Android-specific purchase parameters */
  android?: RequestPurchaseAndroidProps | null;
  /** iOS-specific purchase parameters */
  ios?: RequestPurchaseIosProps | null;
}

export interface RequestPurchaseResult {
  purchase?: Purchase | null;
  purchases?: Purchase[] | null;
}

export interface RequestSubscriptionAndroidProps {
  /** Personalized offer flag */
  isOfferPersonalized?: boolean | null;
  /** Obfuscated account ID */
  obfuscatedAccountIdAndroid?: string | null;
  /** Obfuscated profile ID */
  obfuscatedProfileIdAndroid?: string | null;
  /** Purchase token for upgrades/downgrades */
  purchaseTokenAndroid?: string | null;
  /** Replacement mode for subscription changes */
  replacementModeAndroid?: number | null;
  /** List of subscription SKUs */
  skus: string[];
  /** Subscription offers */
  subscriptionOffers?: AndroidSubscriptionOfferInput[] | null;
}

export interface RequestSubscriptionIosProps {
  andDangerouslyFinishTransactionAutomatically?: boolean | null;
  appAccountToken?: string | null;
  quantity?: number | null;
  sku: string;
  withOffer?: DiscountOfferInputIos | null;
}

export interface RequestSubscriptionPropsByPlatforms {
  /** Android-specific subscription parameters */
  android?: RequestSubscriptionAndroidProps | null;
  /** iOS-specific subscription parameters */
  ios?: RequestSubscriptionIosProps | null;
}

export interface Subscription {
  _placeholder?: boolean | null;
  /** Fires when the App Store surfaces a promoted product (iOS only) */
  promotedProductIOS: string;
  /** Fires when a purchase fails or is cancelled */
  purchaseError: PurchaseError;
  /** Fires when a purchase completes successfully or a pending purchase resolves */
  purchaseUpdated: Purchase;
}

export interface SubscriptionInfoIos {
  introductoryOffer?: SubscriptionOfferIos | null;
  promotionalOffers?: SubscriptionOfferIos[] | null;
  subscriptionGroupId: string;
  subscriptionPeriod: SubscriptionPeriodValueIos;
}

export interface SubscriptionOfferIos {
  displayPrice: string;
  id: string;
  paymentMode: PaymentModeIos;
  period: SubscriptionPeriodValueIos;
  periodCount: number;
  price: number;
  type: SubscriptionOfferTypeIos;
}

export enum SubscriptionOfferTypeIos {
  Introductory = 'INTRODUCTORY',
  Promotional = 'PROMOTIONAL',
}

export enum SubscriptionPeriodIos {
  Day = 'DAY',
  Empty = 'EMPTY',
  Month = 'MONTH',
  Week = 'WEEK',
  Year = 'YEAR',
}

export interface SubscriptionPeriodValueIos {
  unit: SubscriptionPeriodIos;
  value: number;
}

export interface SubscriptionStatusIos {
  renewalInfo?: RenewalInfoIos | null;
  state: string;
}

export interface VoidResult {
  success: boolean;
}
