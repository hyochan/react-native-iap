// ============================================================================
// AUTO-GENERATED TYPES — DO NOT EDIT DIRECTLY
// Run `bun run generate:types` after updating any *.graphql schema file.
// ============================================================================

export interface ActiveSubscription {
  autoRenewingAndroid?: (boolean | null);
  daysUntilExpirationIOS?: (number | null);
  environmentIOS?: (string | null);
  expirationDateIOS?: (number | null);
  isActive: boolean;
  productId: string;
  purchaseToken?: (string | null);
  transactionDate: number;
  transactionId: string;
  willExpireSoon?: (boolean | null);
}

export interface AndroidSubscriptionOfferInput {
  /** Offer token */
  offerToken: string;
  /** Product SKU */
  sku: string;
}

export interface AppTransaction {
  appId: number;
  appTransactionId?: (string | null);
  appVersion: string;
  appVersionId: number;
  bundleId: string;
  deviceVerification: string;
  deviceVerificationNonce: string;
  environment: string;
  originalAppVersion: string;
  originalPlatform?: (string | null);
  originalPurchaseDate: number;
  preorderDate?: (number | null);
  signedDate: number;
}

export interface DeepLinkOptions {
  /** Android package name to target (required on Android) */
  packageNameAndroid?: (string | null);
  /** Android SKU to open (required on Android) */
  skuAndroid?: (string | null);
}

export interface DiscountIOS {
  identifier: string;
  localizedPrice?: (string | null);
  numberOfPeriods: number;
  paymentMode: PaymentModeIOS;
  price: string;
  priceAmount: number;
  subscriptionPeriod: string;
  type: string;
}

export interface DiscountOfferIOS {
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

export interface DiscountOfferInputIOS {
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

export interface EntitlementIOS {
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
  UserError = 'USER_ERROR'
}

export interface FetchProductsResult {
  products?: (Product[] | null);
  subscriptions?: (ProductSubscription[] | null);
}

export type IapEvent = 'promoted-product-ios' | 'purchase-error' | 'purchase-updated';

export type IapPlatform = 'android' | 'ios';

export interface Mutation {
  /** Acknowledge a non-consumable purchase or subscription */
  acknowledgePurchaseAndroid: Promise<VoidResult>;
  /** Initiate a refund request for a product (iOS 15+) */
  beginRefundRequestIOS: Promise<RefundResultIOS>;
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
  requestPurchase?: Promise<(RequestPurchaseResult | null)>;
  /** Purchase the promoted product surfaced by the App Store */
  requestPurchaseOnPromotedProductIOS: Promise<PurchaseIOS>;
  /** Restore completed purchases across platforms */
  restorePurchases: Promise<VoidResult>;
  /** Open subscription management UI and return changed purchases (iOS 15+) */
  showManageSubscriptionsIOS: Promise<PurchaseIOS[]>;
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
  options?: (DeepLinkOptions | null);
}


export interface MutationFinishTransactionArgs {
  isConsumable?: (boolean | null);
  purchase: PurchaseInput;
}


export interface MutationRequestPurchaseArgs {
  params: RequestPurchaseProps;
}


export interface MutationValidateReceiptArgs {
  options: ReceiptValidationProps;
}

export type PaymentModeIOS = 'empty' | 'free-trial' | 'pay-as-you-go' | 'pay-up-front';

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

export type Product = ProductAndroid | ProductIOS;

export interface ProductAndroid extends ProductCommon {
  currency: string;
  debugDescription?: (string | null);
  description: string;
  displayName?: (string | null);
  displayPrice: string;
  id: string;
  nameAndroid: string;
  oneTimePurchaseOfferDetailsAndroid?: (ProductAndroidOneTimePurchaseOfferDetail | null);
  platform: IapPlatform;
  price?: (number | null);
  subscriptionOfferDetailsAndroid?: (ProductSubscriptionAndroidOfferDetails[] | null);
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
  debugDescription?: (string | null);
  description: string;
  displayName?: (string | null);
  displayPrice: string;
  id: string;
  platform: IapPlatform;
  price?: (number | null);
  title: string;
  type: ProductType;
}

export interface ProductIOS extends ProductCommon {
  currency: string;
  debugDescription?: (string | null);
  description: string;
  displayName?: (string | null);
  displayNameIOS: string;
  displayPrice: string;
  id: string;
  isFamilyShareableIOS: boolean;
  jsonRepresentationIOS: string;
  platform: IapPlatform;
  price?: (number | null);
  subscriptionInfoIOS?: (SubscriptionInfoIOS | null);
  title: string;
  type: ProductType;
  typeIOS: ProductTypeIOS;
}

export type ProductQueryType = 'all' | 'in-app' | 'subs';

export interface ProductRequest {
  skus: string[];
  type?: (ProductQueryType | null);
}

export type ProductSubscription = ProductSubscriptionAndroid | ProductSubscriptionIOS;

export interface ProductSubscriptionAndroid extends ProductCommon {
  currency: string;
  debugDescription?: (string | null);
  description: string;
  displayName?: (string | null);
  displayPrice: string;
  id: string;
  nameAndroid: string;
  oneTimePurchaseOfferDetailsAndroid?: (ProductAndroidOneTimePurchaseOfferDetail | null);
  platform: IapPlatform;
  price?: (number | null);
  subscriptionOfferDetailsAndroid: ProductSubscriptionAndroidOfferDetails[];
  title: string;
  type: ProductType;
}

export interface ProductSubscriptionAndroidOfferDetails {
  basePlanId: string;
  offerId?: (string | null);
  offerTags: string[];
  offerToken: string;
  pricingPhases: PricingPhasesAndroid;
}

export interface ProductSubscriptionIOS extends ProductCommon {
  currency: string;
  debugDescription?: (string | null);
  description: string;
  discountsIOS?: (DiscountIOS[] | null);
  displayName?: (string | null);
  displayNameIOS: string;
  displayPrice: string;
  id: string;
  introductoryPriceAsAmountIOS?: (string | null);
  introductoryPriceIOS?: (string | null);
  introductoryPriceNumberOfPeriodsIOS?: (string | null);
  introductoryPricePaymentModeIOS?: (PaymentModeIOS | null);
  introductoryPriceSubscriptionPeriodIOS?: (SubscriptionPeriodIOS | null);
  isFamilyShareableIOS: boolean;
  jsonRepresentationIOS: string;
  platform: IapPlatform;
  price?: (number | null);
  subscriptionInfoIOS?: (SubscriptionInfoIOS | null);
  subscriptionPeriodNumberIOS?: (string | null);
  subscriptionPeriodUnitIOS?: (SubscriptionPeriodIOS | null);
  title: string;
  type: ProductType;
  typeIOS: ProductTypeIOS;
}

export type ProductType = 'in-app' | 'subs';

export type ProductTypeIOS = 'auto-renewable-subscription' | 'consumable' | 'non-consumable' | 'non-renewing-subscription';

export type Purchase = PurchaseAndroid | PurchaseIOS;

export interface PurchaseAndroid extends PurchaseCommon {
  autoRenewingAndroid?: (boolean | null);
  dataAndroid?: (string | null);
  developerPayloadAndroid?: (string | null);
  id: string;
  ids?: (string[] | null);
  isAcknowledgedAndroid?: (boolean | null);
  isAutoRenewing: boolean;
  obfuscatedAccountIdAndroid?: (string | null);
  obfuscatedProfileIdAndroid?: (string | null);
  packageNameAndroid?: (string | null);
  platform: IapPlatform;
  productId: string;
  purchaseState: PurchaseState;
  purchaseToken?: (string | null);
  quantity: number;
  signatureAndroid?: (string | null);
  transactionDate: number;
}

export interface PurchaseCommon {
  id: string;
  ids?: (string[] | null);
  isAutoRenewing: boolean;
  platform: IapPlatform;
  productId: string;
  purchaseState: PurchaseState;
  /** Unified purchase token (iOS JWS, Android purchaseToken) */
  purchaseToken?: (string | null);
  quantity: number;
  transactionDate: number;
}

export interface PurchaseError {
  code: ErrorCode;
  message: string;
  productId?: (string | null);
}

export interface PurchaseIOS extends PurchaseCommon {
  appAccountToken?: (string | null);
  appBundleIdIOS?: (string | null);
  countryCodeIOS?: (string | null);
  currencyCodeIOS?: (string | null);
  currencySymbolIOS?: (string | null);
  environmentIOS?: (string | null);
  expirationDateIOS?: (number | null);
  id: string;
  ids?: (string[] | null);
  isAutoRenewing: boolean;
  isUpgradedIOS?: (boolean | null);
  offerIOS?: (PurchaseOfferIOS | null);
  originalTransactionDateIOS?: (number | null);
  originalTransactionIdentifierIOS?: (string | null);
  ownershipTypeIOS?: (string | null);
  platform: IapPlatform;
  productId: string;
  purchaseState: PurchaseState;
  purchaseToken?: (string | null);
  quantity: number;
  quantityIOS?: (number | null);
  reasonIOS?: (string | null);
  reasonStringRepresentationIOS?: (string | null);
  revocationDateIOS?: (number | null);
  revocationReasonIOS?: (string | null);
  storefrontCountryCodeIOS?: (string | null);
  subscriptionGroupIdIOS?: (string | null);
  transactionDate: number;
  transactionReasonIOS?: (string | null);
  webOrderLineItemIdIOS?: (string | null);
}

export interface PurchaseInput {
  id: string;
  ids?: (string[] | null);
  isAutoRenewing: boolean;
  platform: IapPlatform;
  productId: string;
  purchaseState: PurchaseState;
  purchaseToken?: (string | null);
  quantity: number;
  transactionDate: number;
}

export interface PurchaseOfferIOS {
  id: string;
  paymentMode: string;
  type: string;
}

export interface PurchaseOptions {
  /** Also emit results through the iOS event listeners */
  alsoPublishToEventListenerIOS?: (boolean | null);
  /** Limit to currently active items on iOS */
  onlyIncludeActiveItemsIOS?: (boolean | null);
}

export type PurchaseState = 'deferred' | 'failed' | 'pending' | 'purchased' | 'restored' | 'unknown';

export interface Query {
  /** Get current StoreKit 2 entitlements (iOS 15+) */
  currentEntitlementIOS: Promise<EntitlementIOS[]>;
  /** Retrieve products or subscriptions from the store */
  fetchProducts: Promise<FetchProductsResult>;
  /** Get active subscriptions (filters by subscriptionIds when provided) */
  getActiveSubscriptions: Promise<ActiveSubscription[]>;
  /** Fetch the current app transaction (iOS 16+) */
  getAppTransactionIOS?: Promise<(AppTransaction | null)>;
  /** Get all available purchases for the current user */
  getAvailablePurchases: Promise<Purchase[]>;
  /** Retrieve all pending transactions in the StoreKit queue */
  getPendingTransactionsIOS: Promise<PurchaseIOS[]>;
  /** Get the currently promoted product (iOS 11+) */
  getPromotedProductIOS?: Promise<(ProductIOS | null)>;
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
  latestTransactionIOS?: Promise<(PurchaseIOS | null)>;
  /** Get StoreKit 2 subscription status details (iOS 15+) */
  subscriptionStatusIOS: Promise<SubscriptionStatusIOS[]>;
}


export interface QueryCurrentEntitlementIosArgs {
  skus?: (string[] | null);
}


export interface QueryFetchProductsArgs {
  params: ProductRequest;
}


export interface QueryGetActiveSubscriptionsArgs {
  subscriptionIds?: (string[] | null);
}


export interface QueryGetAvailablePurchasesArgs {
  options?: (PurchaseOptions | null);
}


export interface QueryGetTransactionJwsIosArgs {
  transactionId: string;
}


export interface QueryHasActiveSubscriptionsArgs {
  subscriptionIds?: (string[] | null);
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
  skus?: (string[] | null);
}

export interface ReceiptValidationAndroidOptions {
  accessToken: string;
  isSub?: (boolean | null);
  packageName: string;
  productToken: string;
}

export interface ReceiptValidationProps {
  /** Android-specific validation options */
  androidOptions?: (ReceiptValidationAndroidOptions | null);
  /** Product SKU to validate */
  sku: string;
}

export type ReceiptValidationResult = ReceiptValidationResultAndroid | ReceiptValidationResultIOS;

export interface ReceiptValidationResultAndroid {
  autoRenewing: boolean;
  betaProduct: boolean;
  cancelDate?: (number | null);
  cancelReason?: (string | null);
  deferredDate?: (number | null);
  deferredSku?: (string | null);
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

export interface ReceiptValidationResultIOS {
  /** Whether the receipt is valid */
  isValid: boolean;
  /** JWS representation */
  jwsRepresentation: string;
  /** Latest transaction if available */
  latestTransaction?: (Purchase | null);
  /** Receipt data string */
  receiptData: string;
}

export interface RefundResultIOS {
  message?: (string | null);
  status: string;
}

export interface RenewalInfoIOS {
  autoRenewPreference?: (string | null);
  jsonRepresentation?: (string | null);
  willAutoRenew: boolean;
}

export interface RequestPurchaseAndroidProps {
  /** Personalized offer flag */
  isOfferPersonalized?: (boolean | null);
  /** Obfuscated account ID */
  obfuscatedAccountIdAndroid?: (string | null);
  /** Obfuscated profile ID */
  obfuscatedProfileIdAndroid?: (string | null);
  /** List of product SKUs */
  skus: string[];
}

export interface RequestPurchaseIosProps {
  /** Auto-finish transaction (dangerous) */
  andDangerouslyFinishTransactionAutomatically?: (boolean | null);
  /** App account token for user tracking */
  appAccountToken?: (string | null);
  /** Purchase quantity */
  quantity?: (number | null);
  /** Product SKU */
  sku: string;
  /** Discount offer to apply */
  withOffer?: (DiscountOfferInputIOS | null);
}

export type RequestPurchaseProps =
  | {
      /** Per-platform purchase request props */
      request: RequestPurchasePropsByPlatforms;
      type: 'in-app';
    }
  | {
      /** Per-platform subscription request props */
      request: RequestSubscriptionPropsByPlatforms;
      type: 'subs';
    };

export interface RequestPurchasePropsByPlatforms {
  /** Android-specific purchase parameters */
  android?: (RequestPurchaseAndroidProps | null);
  /** iOS-specific purchase parameters */
  ios?: (RequestPurchaseIosProps | null);
}

export interface RequestPurchaseResult {
  purchase?: (Purchase | null);
  purchases?: (Purchase[] | null);
}

export interface RequestSubscriptionAndroidProps {
  /** Personalized offer flag */
  isOfferPersonalized?: (boolean | null);
  /** Obfuscated account ID */
  obfuscatedAccountIdAndroid?: (string | null);
  /** Obfuscated profile ID */
  obfuscatedProfileIdAndroid?: (string | null);
  /** Purchase token for upgrades/downgrades */
  purchaseTokenAndroid?: (string | null);
  /** Replacement mode for subscription changes */
  replacementModeAndroid?: (number | null);
  /** List of subscription SKUs */
  skus: string[];
  /** Subscription offers */
  subscriptionOffers?: (AndroidSubscriptionOfferInput[] | null);
}

export interface RequestSubscriptionIosProps {
  andDangerouslyFinishTransactionAutomatically?: (boolean | null);
  appAccountToken?: (string | null);
  quantity?: (number | null);
  sku: string;
  withOffer?: (DiscountOfferInputIOS | null);
}

export interface RequestSubscriptionPropsByPlatforms {
  /** Android-specific subscription parameters */
  android?: (RequestSubscriptionAndroidProps | null);
  /** iOS-specific subscription parameters */
  ios?: (RequestSubscriptionIosProps | null);
}

export interface Subscription {
  /** Fires when the App Store surfaces a promoted product (iOS only) */
  promotedProductIOS: string;
  /** Fires when a purchase fails or is cancelled */
  purchaseError: PurchaseError;
  /** Fires when a purchase completes successfully or a pending purchase resolves */
  purchaseUpdated: Purchase;
}

export interface SubscriptionInfoIOS {
  introductoryOffer?: (SubscriptionOfferIOS | null);
  promotionalOffers?: (SubscriptionOfferIOS[] | null);
  subscriptionGroupId: string;
  subscriptionPeriod: SubscriptionPeriodValueIOS;
}

export interface SubscriptionOfferIOS {
  displayPrice: string;
  id: string;
  paymentMode: PaymentModeIOS;
  period: SubscriptionPeriodValueIOS;
  periodCount: number;
  price: number;
  type: SubscriptionOfferTypeIOS;
}

export type SubscriptionOfferTypeIOS = 'introductory' | 'promotional';

export type SubscriptionPeriodIOS = 'day' | 'empty' | 'month' | 'week' | 'year';

export interface SubscriptionPeriodValueIOS {
  unit: SubscriptionPeriodIOS;
  value: number;
}

export interface SubscriptionStatusIOS {
  renewalInfo?: (RenewalInfoIOS | null);
  state: string;
}

export interface VoidResult {
  success: boolean;
}
