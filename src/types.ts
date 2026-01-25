// ============================================================================
// AUTO-GENERATED TYPES — DO NOT EDIT DIRECTLY
// Run `bun run generate:types` after updating any *.graphql schema file.
// ============================================================================

export interface ActiveSubscription {
  autoRenewingAndroid?: (boolean | null);
  basePlanIdAndroid?: (string | null);
  /**
   * The current plan identifier. This is:
   * - On Android: the basePlanId (e.g., "premium", "premium-year")
   * - On iOS: the productId (e.g., "com.example.premium_monthly", "com.example.premium_yearly")
   * This provides a unified way to identify which specific plan/tier the user is subscribed to.
   */
  currentPlanId?: (string | null);
  daysUntilExpirationIOS?: (number | null);
  environmentIOS?: (string | null);
  expirationDateIOS?: (number | null);
  isActive: boolean;
  productId: string;
  purchaseToken?: (string | null);
  /** Required for subscription upgrade/downgrade on Android */
  purchaseTokenAndroid?: (string | null);
  /**
   * Renewal information from StoreKit 2 (iOS only). Contains details about subscription renewal status,
   * pending upgrades/downgrades, and auto-renewal preferences.
   */
  renewalInfoIOS?: (RenewalInfoIOS | null);
  transactionDate: number;
  transactionId: string;
  /**
   * @deprecated iOS only - use daysUntilExpirationIOS instead.
   * Whether the subscription will expire soon (within 7 days).
   * Consider using daysUntilExpirationIOS for more precise control.
   */
  willExpireSoon?: (boolean | null);
}

/**
 * Alternative billing mode for Android
 * Controls which billing system is used
 * @deprecated Use enableBillingProgramAndroid with BillingProgramAndroid instead.
 * Use USER_CHOICE_BILLING for user choice billing, EXTERNAL_OFFER for alternative only.
 */
export type AlternativeBillingModeAndroid = 'none' | 'user-choice' | 'alternative-only';

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

/**
 * Billing program types for external content links, external offers, and external payments (Android)
 * Available in Google Play Billing Library 8.2.0+, EXTERNAL_PAYMENTS added in 8.3.0
 */
export type BillingProgramAndroid = 'unspecified' | 'user-choice-billing' | 'external-content-link' | 'external-offer' | 'external-payments';

/**
 * Result of checking billing program availability (Android)
 * Available in Google Play Billing Library 8.2.0+
 */
export interface BillingProgramAvailabilityResultAndroid {
  /** The billing program that was checked */
  billingProgram: BillingProgramAndroid;
  /** Whether the billing program is available for the user */
  isAvailable: boolean;
}

/**
 * Reporting details for transactions made outside of Google Play Billing (Android)
 * Contains the external transaction token needed for reporting
 * Available in Google Play Billing Library 8.2.0+
 */
export interface BillingProgramReportingDetailsAndroid {
  /** The billing program that the reporting details are associated with */
  billingProgram: BillingProgramAndroid;
  /**
   * External transaction token used to report transactions made outside of Google Play Billing.
   * This token must be used when reporting the external transaction to Google.
   */
  externalTransactionToken: string;
}

/**
 * Extended billing result with sub-response code (Android)
 * Available in Google Play Billing Library 8.0.0+
 */
export interface BillingResultAndroid {
  /** Debug message from the billing library */
  debugMessage?: (string | null);
  /** The response code from the billing operation */
  responseCode: number;
  /**
   * Sub-response code for more granular error information (8.0+).
   * Provides additional context when responseCode indicates an error.
   */
  subResponseCode?: (SubResponseCodeAndroid | null);
}

export interface DeepLinkOptions {
  /** Android package name to target (required on Android) */
  packageNameAndroid?: (string | null);
  /** Android SKU to open (required on Android) */
  skuAndroid?: (string | null);
}

/**
 * Launch mode for developer billing option (Android)
 * Determines how the external payment URL is launched
 * Available in Google Play Billing Library 8.3.0+
 */
export type DeveloperBillingLaunchModeAndroid = 'unspecified' | 'launch-in-external-browser-or-app' | 'caller-will-launch-link';

/**
 * Parameters for developer billing option in purchase flow (Android)
 * Used with BillingFlowParams to enable external payments flow
 * Available in Google Play Billing Library 8.3.0+
 */
export interface DeveloperBillingOptionParamsAndroid {
  /** The billing program (should be EXTERNAL_PAYMENTS for external payments flow) */
  billingProgram: BillingProgramAndroid;
  /** The launch mode for the external payment link */
  launchMode: DeveloperBillingLaunchModeAndroid;
  /** The URI where the external payment will be processed */
  linkUri: string;
}

/**
 * Details provided when user selects developer billing option (Android)
 * Received via DeveloperProvidedBillingListener callback
 * Available in Google Play Billing Library 8.3.0+
 */
export interface DeveloperProvidedBillingDetailsAndroid {
  /**
   * External transaction token used to report transactions made through developer billing.
   * This token must be used when reporting the external transaction to Google Play.
   * Must be reported within 24 hours of the transaction.
   */
  externalTransactionToken: string;
}

/**
 * Discount amount details for one-time purchase offers (Android)
 * Available in Google Play Billing Library 7.0+
 */
export interface DiscountAmountAndroid {
  /** Discount amount in micro-units (1,000,000 = 1 unit of currency) */
  discountAmountMicros: string;
  /** Formatted discount amount with currency sign (e.g., "$4.99") */
  formattedDiscountAmount: string;
}

/**
 * Discount display information for one-time purchase offers (Android)
 * Available in Google Play Billing Library 7.0+
 */
export interface DiscountDisplayInfoAndroid {
  /**
   * Absolute discount amount details
   * Only returned for fixed amount discounts
   */
  discountAmount?: (DiscountAmountAndroid | null);
  /**
   * Percentage discount (e.g., 33 for 33% off)
   * Only returned for percentage-based discounts
   */
  percentageDiscount?: (number | null);
}

/**
 * Discount information returned from the store.
 * @deprecated Use the standardized SubscriptionOffer type instead for cross-platform compatibility.
 * @see https://openiap.dev/docs/types#subscription-offer
 */
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

/**
 * Standardized one-time product discount offer.
 * Provides a unified interface for one-time purchase discounts across platforms.
 *
 * Currently supported on Android (Google Play Billing 7.0+).
 * iOS does not support one-time purchase discounts in the same way.
 *
 * @see https://openiap.dev/docs/features/discount
 */
export interface DiscountOffer {
  /** Currency code (ISO 4217, e.g., "USD") */
  currency: string;
  /**
   * [Android] Fixed discount amount in micro-units.
   * Only present for fixed amount discounts.
   */
  discountAmountMicrosAndroid?: (string | null);
  /** Formatted display price string (e.g., "$4.99") */
  displayPrice: string;
  /** [Android] Formatted discount amount string (e.g., "$5.00 OFF"). */
  formattedDiscountAmountAndroid?: (string | null);
  /**
   * [Android] Original full price in micro-units before discount.
   * Divide by 1,000,000 to get the actual price.
   * Use for displaying strikethrough original price.
   */
  fullPriceMicrosAndroid?: (string | null);
  /**
   * Unique identifier for the offer.
   * - iOS: Not applicable (one-time discounts not supported)
   * - Android: offerId from ProductAndroidOneTimePurchaseOfferDetail
   */
  id?: (string | null);
  /**
   * [Android] Limited quantity information.
   * Contains maximumQuantity and remainingQuantity.
   */
  limitedQuantityInfoAndroid?: (LimitedQuantityInfoAndroid | null);
  /** [Android] List of tags associated with this offer. */
  offerTagsAndroid?: (string[] | null);
  /**
   * [Android] Offer token required for purchase.
   * Must be passed to requestPurchase() when purchasing with this offer.
   */
  offerTokenAndroid?: (string | null);
  /**
   * [Android] Percentage discount (e.g., 33 for 33% off).
   * Only present for percentage-based discounts.
   */
  percentageDiscountAndroid?: (number | null);
  /**
   * [Android] Pre-order details if this is a pre-order offer.
   * Available in Google Play Billing Library 8.1.0+
   */
  preorderDetailsAndroid?: (PreorderDetailsAndroid | null);
  /** Numeric price value */
  price: number;
  /** [Android] Rental details if this is a rental offer. */
  rentalDetailsAndroid?: (RentalDetailsAndroid | null);
  /** Type of discount offer */
  type: DiscountOfferType;
  /**
   * [Android] Valid time window for the offer.
   * Contains startTimeMillis and endTimeMillis.
   */
  validTimeWindowAndroid?: (ValidTimeWindowAndroid | null);
}

/**
 * iOS DiscountOffer (output type).
 * @deprecated Use the standardized SubscriptionOffer type instead for cross-platform compatibility.
 * @see https://openiap.dev/docs/types#subscription-offer
 */
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

/**
 * Discount offer type enumeration.
 * Categorizes the type of discount or promotional offer.
 */
export type DiscountOfferType = 'introductory' | 'promotional' | 'one-time';

export interface EntitlementIOS {
  jsonRepresentation: string;
  sku: string;
  transactionId: string;
}

export enum ErrorCode {
  ActivityUnavailable = 'activity-unavailable',
  AlreadyOwned = 'already-owned',
  AlreadyPrepared = 'already-prepared',
  BillingResponseJsonParseError = 'billing-response-json-parse-error',
  BillingUnavailable = 'billing-unavailable',
  ConnectionClosed = 'connection-closed',
  DeferredPayment = 'deferred-payment',
  DeveloperError = 'developer-error',
  EmptySkuList = 'empty-sku-list',
  FeatureNotSupported = 'feature-not-supported',
  IapNotAvailable = 'iap-not-available',
  InitConnection = 'init-connection',
  Interrupted = 'interrupted',
  ItemNotOwned = 'item-not-owned',
  ItemUnavailable = 'item-unavailable',
  NetworkError = 'network-error',
  NotEnded = 'not-ended',
  NotPrepared = 'not-prepared',
  Pending = 'pending',
  PurchaseError = 'purchase-error',
  PurchaseVerificationFailed = 'purchase-verification-failed',
  PurchaseVerificationFinishFailed = 'purchase-verification-finish-failed',
  PurchaseVerificationFinished = 'purchase-verification-finished',
  QueryProduct = 'query-product',
  ReceiptFailed = 'receipt-failed',
  ReceiptFinished = 'receipt-finished',
  ReceiptFinishedFailed = 'receipt-finished-failed',
  RemoteError = 'remote-error',
  ServiceDisconnected = 'service-disconnected',
  ServiceError = 'service-error',
  SkuNotFound = 'sku-not-found',
  SkuOfferMismatch = 'sku-offer-mismatch',
  SyncError = 'sync-error',
  TransactionValidationFailed = 'transaction-validation-failed',
  Unknown = 'unknown',
  UserCancelled = 'user-cancelled',
  UserError = 'user-error'
}

/**
 * Launch mode for external link flow (Android)
 * Determines how the external URL is launched
 * Available in Google Play Billing Library 8.2.0+
 */
export type ExternalLinkLaunchModeAndroid = 'unspecified' | 'launch-in-external-browser-or-app' | 'caller-will-launch-link';

/**
 * Link type for external link flow (Android)
 * Specifies the type of external link destination
 * Available in Google Play Billing Library 8.2.0+
 */
export type ExternalLinkTypeAndroid = 'unspecified' | 'link-to-digital-content-offer' | 'link-to-app-download';

/**
 * External offer availability result (Android)
 * @deprecated Use BillingProgramAvailabilityResultAndroid with isBillingProgramAvailableAsync instead
 * Available in Google Play Billing Library 6.2.0+, deprecated in 8.2.0
 */
export interface ExternalOfferAvailabilityResultAndroid {
  /** Whether external offers are available for the user */
  isAvailable: boolean;
}

/**
 * External offer reporting details (Android)
 * @deprecated Use BillingProgramReportingDetailsAndroid with createBillingProgramReportingDetailsAsync instead
 * Available in Google Play Billing Library 6.2.0+, deprecated in 8.2.0
 */
export interface ExternalOfferReportingDetailsAndroid {
  /** External transaction token for reporting external offer transactions */
  externalTransactionToken: string;
}

/** Result of showing ExternalPurchaseCustomLink notice (iOS 18.1+). */
export interface ExternalPurchaseCustomLinkNoticeResultIOS {
  /** Whether the user chose to continue to external purchase */
  continued: boolean;
  /** Optional error message if the presentation failed */
  error?: (string | null);
}

/**
 * Notice types for ExternalPurchaseCustomLink (iOS 18.1+).
 * Determines the style of disclosure notice to display.
 * Reference: https://developer.apple.com/documentation/storekit/externalpurchasecustomlink/noticetype
 */
export type ExternalPurchaseCustomLinkNoticeTypeIOS = 'browser';

/** Result of requesting an ExternalPurchaseCustomLink token (iOS 18.1+). */
export interface ExternalPurchaseCustomLinkTokenResultIOS {
  /** Optional error message if token retrieval failed */
  error?: (string | null);
  /**
   * The external purchase token string.
   * Report this token to Apple's External Purchase Server API.
   */
  token?: (string | null);
}

/**
 * Token types for ExternalPurchaseCustomLink (iOS 18.1+).
 * Used to request different types of external purchase tokens for reporting to Apple.
 * Reference: https://developer.apple.com/documentation/storekit/externalpurchasecustomlink/token(for:)
 */
export type ExternalPurchaseCustomLinkTokenTypeIOS = 'acquisition' | 'services';

/** Result of presenting an external purchase link */
export interface ExternalPurchaseLinkResultIOS {
  /** Optional error message if the presentation failed */
  error?: (string | null);
  /** Whether the user completed the external purchase flow */
  success: boolean;
}

/** User actions on external purchase notice sheet (iOS 17.4+) */
export type ExternalPurchaseNoticeAction = 'continue' | 'dismissed';

/**
 * Result of presenting external purchase notice sheet (iOS 17.4+)
 * Returns the token when user continues to external purchase.
 */
export interface ExternalPurchaseNoticeResultIOS {
  /** Optional error message if the presentation failed */
  error?: (string | null);
  /**
   * External purchase token returned when user continues (iOS 17.4+).
   * This token should be reported to Apple's External Purchase Server API.
   * Only present when result is Continue.
   */
  externalPurchaseToken?: (string | null);
  /** Notice result indicating user action */
  result: ExternalPurchaseNoticeAction;
}

export type FetchProductsResult = ProductOrSubscription[] | Product[] | ProductSubscription[] | null;

export type IapEvent = 'purchase-updated' | 'purchase-error' | 'promoted-product-ios' | 'user-choice-billing-android' | 'developer-provided-billing-android';

export type IapPlatform = 'ios' | 'android';

export type IapStore = 'unknown' | 'apple' | 'google' | 'horizon';

/** Unified purchase states from IAPKit verification response. */
export type IapkitPurchaseState = 'entitled' | 'pending-acknowledgment' | 'pending' | 'canceled' | 'expired' | 'ready-to-consume' | 'consumed' | 'unknown' | 'inauthentic';

/** Connection initialization configuration */
export interface InitConnectionConfig {
  /**
   * Alternative billing mode for Android
   * If not specified, defaults to NONE (standard Google Play billing)
   * @deprecated Use enableBillingProgramAndroid instead.
   * Use USER_CHOICE_BILLING for user choice billing, EXTERNAL_OFFER for alternative only.
   */
  alternativeBillingModeAndroid?: (AlternativeBillingModeAndroid | null);
  /**
   * Enable a specific billing program for Android (7.0+)
   * When set, enables the specified billing program for external transactions.
   * - USER_CHOICE_BILLING: User can select between Google Play or alternative (7.0+)
   * - EXTERNAL_CONTENT_LINK: Link to external content (8.2.0+)
   * - EXTERNAL_OFFER: External offers for digital content (8.2.0+)
   * - EXTERNAL_PAYMENTS: Developer provided billing, Japan only (8.3.0+)
   */
  enableBillingProgramAndroid?: (BillingProgramAndroid | null);
}

/**
 * Parameters for launching an external link (Android)
 * Used with launchExternalLink to initiate external offer or app install flows
 * Available in Google Play Billing Library 8.2.0+
 */
export interface LaunchExternalLinkParamsAndroid {
  /** The billing program (EXTERNAL_CONTENT_LINK or EXTERNAL_OFFER) */
  billingProgram: BillingProgramAndroid;
  /** The external link launch mode */
  launchMode: ExternalLinkLaunchModeAndroid;
  /** The type of the external link */
  linkType: ExternalLinkTypeAndroid;
  /** The URI where the content will be accessed from */
  linkUri: string;
}

/**
 * Limited quantity information for one-time purchase offers (Android)
 * Available in Google Play Billing Library 7.0+
 */
export interface LimitedQuantityInfoAndroid {
  /** Maximum quantity a user can purchase */
  maximumQuantity: number;
  /** Remaining quantity the user can still purchase */
  remainingQuantity: number;
}

export interface Mutation {
  /** Acknowledge a non-consumable purchase or subscription */
  acknowledgePurchaseAndroid: Promise<boolean>;
  /** Initiate a refund request for a product (iOS 15+) */
  beginRefundRequestIOS?: Promise<(string | null)>;
  /**
   * Check if alternative billing is available for this user/device
   * Step 1 of alternative billing flow
   *
   * Returns true if available, false otherwise
   * Throws OpenIapError.NotPrepared if billing client not ready
   */
  checkAlternativeBillingAvailabilityAndroid: Promise<boolean>;
  /** Clear pending transactions from the StoreKit payment queue */
  clearTransactionIOS: Promise<boolean>;
  /** Consume a purchase token so it can be repurchased */
  consumePurchaseAndroid: Promise<boolean>;
  /**
   * Create external transaction token for Google Play reporting
   * Step 3 of alternative billing flow
   * Must be called AFTER successful payment in your payment system
   * Token must be reported to Google Play backend within 24 hours
   *
   * Returns token string, or null if creation failed
   * Throws OpenIapError.NotPrepared if billing client not ready
   */
  createAlternativeBillingTokenAndroid?: Promise<(string | null)>;
  /**
   * Create reporting details for a billing program
   * Replaces the deprecated createExternalOfferReportingDetailsAsync API
   *
   * Available in Google Play Billing Library 8.2.0+
   * Returns external transaction token needed for reporting external transactions
   * Throws OpenIapError.NotPrepared if billing client not ready
   */
  createBillingProgramReportingDetailsAndroid: Promise<BillingProgramReportingDetailsAndroid>;
  /** Open the native subscription management surface */
  deepLinkToSubscriptions: Promise<void>;
  /** Close the platform billing connection */
  endConnection: Promise<boolean>;
  /** Finish a transaction after validating receipts */
  finishTransaction: Promise<void>;
  /** Establish the platform billing connection */
  initConnection: Promise<boolean>;
  /**
   * Check if a billing program is available for the current user
   * Replaces the deprecated isExternalOfferAvailableAsync API
   *
   * Available in Google Play Billing Library 8.2.0+
   * Returns availability result with isAvailable flag
   * Throws OpenIapError.NotPrepared if billing client not ready
   */
  isBillingProgramAvailableAndroid: Promise<BillingProgramAvailabilityResultAndroid>;
  /**
   * Launch external link flow for external billing programs
   * Replaces the deprecated showExternalOfferInformationDialog API
   *
   * Available in Google Play Billing Library 8.2.0+
   * Shows Play Store dialog and optionally launches external URL
   * Throws OpenIapError.NotPrepared if billing client not ready
   */
  launchExternalLinkAndroid: Promise<boolean>;
  /** Present the App Store code redemption sheet */
  presentCodeRedemptionSheetIOS: Promise<boolean>;
  /** Present external purchase custom link with StoreKit UI */
  presentExternalPurchaseLinkIOS: Promise<ExternalPurchaseLinkResultIOS>;
  /**
   * Present external purchase notice sheet (iOS 17.4+).
   * Uses ExternalPurchase.presentNoticeSheet() which returns a token when user continues.
   * Reference: https://developer.apple.com/documentation/storekit/externalpurchase/presentnoticesheet()
   */
  presentExternalPurchaseNoticeSheetIOS: Promise<ExternalPurchaseNoticeResultIOS>;
  /** Initiate a purchase flow; rely on events for final state */
  requestPurchase?: Promise<(Purchase | Purchase[] | null)>;
  /**
   * Purchase the promoted product surfaced by the App Store.
   *
   * @deprecated Use promotedProductListenerIOS to receive the productId,
   * then call requestPurchase with that SKU instead. In StoreKit 2,
   * promoted products can be purchased directly via the standard purchase flow.
   * @deprecated Use promotedProductListenerIOS + requestPurchase instead
   */
  requestPurchaseOnPromotedProductIOS: Promise<boolean>;
  /** Restore completed purchases across platforms */
  restorePurchases: Promise<void>;
  /**
   * Show alternative billing information dialog to user
   * Step 2 of alternative billing flow
   * Must be called BEFORE processing payment in your payment system
   *
   * Returns true if user accepted, false if user canceled
   * Throws OpenIapError.NotPrepared if billing client not ready
   */
  showAlternativeBillingDialogAndroid: Promise<boolean>;
  /**
   * Show ExternalPurchaseCustomLink notice sheet (iOS 18.1+).
   * Displays the system disclosure notice sheet for custom external purchase links.
   * Call this after a deliberate customer interaction before linking out to external purchases.
   * Reference: https://developer.apple.com/documentation/storekit/externalpurchasecustomlink/shownotice(type:)
   */
  showExternalPurchaseCustomLinkNoticeIOS: Promise<ExternalPurchaseCustomLinkNoticeResultIOS>;
  /** Open subscription management UI and return changed purchases (iOS 15+) */
  showManageSubscriptionsIOS: Promise<PurchaseIOS[]>;
  /** Force a StoreKit sync for transactions (iOS 15+) */
  syncIOS: Promise<boolean>;
  /**
   * Validate purchase receipts with the configured providers
   * @deprecated Use verifyPurchase
   */
  validateReceipt: Promise<VerifyPurchaseResult>;
  /** Verify purchases with the configured providers */
  verifyPurchase: Promise<VerifyPurchaseResult>;
  /** Verify purchases with a specific provider (e.g., IAPKit) */
  verifyPurchaseWithProvider: Promise<VerifyPurchaseWithProviderResult>;
}



export type MutationAcknowledgePurchaseAndroidArgs = string;

export type MutationBeginRefundRequestIosArgs = string;

export type MutationConsumePurchaseAndroidArgs = string;

export type MutationCreateBillingProgramReportingDetailsAndroidArgs = BillingProgramAndroid;

export type MutationDeepLinkToSubscriptionsArgs = (DeepLinkOptions | null) | undefined;

export interface MutationFinishTransactionArgs {
  isConsumable?: (boolean | null);
  purchase: PurchaseInput;
}


export type MutationInitConnectionArgs = (InitConnectionConfig | null) | undefined;

export type MutationIsBillingProgramAvailableAndroidArgs = BillingProgramAndroid;

export type MutationLaunchExternalLinkAndroidArgs = LaunchExternalLinkParamsAndroid;

export type MutationPresentExternalPurchaseLinkIosArgs = string;

export type MutationRequestPurchaseArgs =
  | {
      /** Per-platform purchase request props */
      request: RequestPurchasePropsByPlatforms;
      type: 'in-app';
      /** Use alternative billing (Google Play alternative billing, Apple external purchase link) */
      useAlternativeBilling?: boolean | null;
    }
  | {
      /** Per-platform subscription request props */
      request: RequestSubscriptionPropsByPlatforms;
      type: 'subs';
      /** Use alternative billing (Google Play alternative billing, Apple external purchase link) */
      useAlternativeBilling?: boolean | null;
    };


export type MutationShowExternalPurchaseCustomLinkNoticeIosArgs = ExternalPurchaseCustomLinkNoticeTypeIOS;

export type MutationValidateReceiptArgs = VerifyPurchaseProps;

export type MutationVerifyPurchaseArgs = VerifyPurchaseProps;

export type MutationVerifyPurchaseWithProviderArgs = VerifyPurchaseWithProviderProps;

/**
 * Payment mode for subscription offers.
 * Determines how the user pays during the offer period.
 */
export type PaymentMode = 'free-trial' | 'pay-as-you-go' | 'pay-up-front' | 'unknown';

export type PaymentModeIOS = 'empty' | 'free-trial' | 'pay-as-you-go' | 'pay-up-front';

/**
 * Pre-order details for one-time purchase products (Android)
 * Available in Google Play Billing Library 8.1.0+
 */
export interface PreorderDetailsAndroid {
  /**
   * Pre-order presale end time in milliseconds since epoch.
   * This is when the presale period ends and the product will be released.
   */
  preorderPresaleEndTimeMillis: string;
  /**
   * Pre-order release time in milliseconds since epoch.
   * This is when the product will be available to users who pre-ordered.
   */
  preorderReleaseTimeMillis: string;
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

export type Product = ProductAndroid | ProductIOS;

export interface ProductAndroid extends ProductCommon {
  currency: string;
  debugDescription?: (string | null);
  description: string;
  /**
   * Standardized discount offers for one-time products.
   * Cross-platform type with Android-specific fields using suffix.
   * @see https://openiap.dev/docs/types#discount-offer
   */
  discountOffers?: (DiscountOffer[] | null);
  displayName?: (string | null);
  displayPrice: string;
  id: string;
  nameAndroid: string;
  /**
   * One-time purchase offer details including discounts (Android)
   * Returns all eligible offers. Available in Google Play Billing Library 7.0+
   * @deprecated Use discountOffers instead for cross-platform compatibility.
   * @deprecated Use discountOffers instead
   */
  oneTimePurchaseOfferDetailsAndroid?: (ProductAndroidOneTimePurchaseOfferDetail[] | null);
  platform: 'android';
  price?: (number | null);
  /**
   * Product-level status code indicating fetch result (Android 8.0+)
   * OK = product fetched successfully
   * NOT_FOUND = SKU doesn't exist
   * NO_OFFERS_AVAILABLE = user not eligible for any offers
   * Available in Google Play Billing Library 8.0.0+
   */
  productStatusAndroid?: (ProductStatusAndroid | null);
  /**
   * @deprecated Use subscriptionOffers instead for cross-platform compatibility.
   * @deprecated Use subscriptionOffers instead
   */
  subscriptionOfferDetailsAndroid?: (ProductSubscriptionAndroidOfferDetails[] | null);
  /**
   * Standardized subscription offers.
   * Cross-platform type with Android-specific fields using suffix.
   * @see https://openiap.dev/docs/types#subscription-offer
   */
  subscriptionOffers?: (SubscriptionOffer[] | null);
  title: string;
  type: 'in-app';
}

/**
 * One-time purchase offer details (Android).
 * Available in Google Play Billing Library 7.0+
 * @deprecated Use the standardized DiscountOffer type instead for cross-platform compatibility.
 * @see https://openiap.dev/docs/types#discount-offer
 */
export interface ProductAndroidOneTimePurchaseOfferDetail {
  /**
   * Discount display information
   * Only available for discounted offers
   */
  discountDisplayInfo?: (DiscountDisplayInfoAndroid | null);
  formattedPrice: string;
  /**
   * Full (non-discounted) price in micro-units
   * Only available for discounted offers
   */
  fullPriceMicros?: (string | null);
  /** Limited quantity information */
  limitedQuantityInfo?: (LimitedQuantityInfoAndroid | null);
  /** Offer ID */
  offerId?: (string | null);
  /** List of offer tags */
  offerTags: string[];
  /** Offer token for use in BillingFlowParams when purchasing */
  offerToken: string;
  /**
   * Pre-order details for products available for pre-order
   * Available in Google Play Billing Library 8.1.0+
   */
  preorderDetailsAndroid?: (PreorderDetailsAndroid | null);
  priceAmountMicros: string;
  priceCurrencyCode: string;
  /** Rental details for rental offers */
  rentalDetailsAndroid?: (RentalDetailsAndroid | null);
  /** Valid time window for the offer */
  validTimeWindow?: (ValidTimeWindowAndroid | null);
}

export interface ProductCommon {
  currency: string;
  debugDescription?: (string | null);
  description: string;
  displayName?: (string | null);
  displayPrice: string;
  id: string;
  platform: 'android' | 'ios';
  price?: (number | null);
  title: string;
  type: 'in-app' | 'subs';
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
  platform: 'ios';
  price?: (number | null);
  /**
   * @deprecated Use subscriptionOffers instead for cross-platform compatibility.
   * @deprecated Use subscriptionOffers instead
   */
  subscriptionInfoIOS?: (SubscriptionInfoIOS | null);
  /**
   * Standardized subscription offers.
   * Cross-platform type with iOS-specific fields using suffix.
   * Note: iOS does not support one-time product discounts.
   * @see https://openiap.dev/docs/types#subscription-offer
   */
  subscriptionOffers?: (SubscriptionOffer[] | null);
  title: string;
  type: 'in-app';
  typeIOS: ProductTypeIOS;
}

export type ProductOrSubscription = Product | ProductSubscription;

export type ProductQueryType = 'in-app' | 'subs' | 'all';

export interface ProductRequest {
  skus: string[];
  type?: (ProductQueryType | null);
}

/**
 * Status code for individual products returned from queryProductDetailsAsync (Android)
 * Prior to 8.0, products that couldn't be fetched were simply not returned.
 * With 8.0+, these products are returned with a status code explaining why.
 * Available in Google Play Billing Library 8.0.0+
 */
export type ProductStatusAndroid = 'ok' | 'not-found' | 'no-offers-available' | 'unknown';

export type ProductSubscription = ProductSubscriptionAndroid | ProductSubscriptionIOS;

export interface ProductSubscriptionAndroid extends ProductCommon {
  currency: string;
  debugDescription?: (string | null);
  description: string;
  /**
   * Standardized discount offers for one-time products.
   * Cross-platform type with Android-specific fields using suffix.
   * @see https://openiap.dev/docs/types#discount-offer
   */
  discountOffers?: (DiscountOffer[] | null);
  displayName?: (string | null);
  displayPrice: string;
  id: string;
  nameAndroid: string;
  /**
   * One-time purchase offer details including discounts (Android)
   * Returns all eligible offers. Available in Google Play Billing Library 7.0+
   * @deprecated Use discountOffers instead for cross-platform compatibility.
   * @deprecated Use discountOffers instead
   */
  oneTimePurchaseOfferDetailsAndroid?: (ProductAndroidOneTimePurchaseOfferDetail[] | null);
  platform: 'android';
  price?: (number | null);
  /**
   * Product-level status code indicating fetch result (Android 8.0+)
   * OK = product fetched successfully
   * NOT_FOUND = SKU doesn't exist
   * NO_OFFERS_AVAILABLE = user not eligible for any offers
   * Available in Google Play Billing Library 8.0.0+
   */
  productStatusAndroid?: (ProductStatusAndroid | null);
  /**
   * @deprecated Use subscriptionOffers instead for cross-platform compatibility.
   * @deprecated Use subscriptionOffers instead
   */
  subscriptionOfferDetailsAndroid: ProductSubscriptionAndroidOfferDetails[];
  /**
   * Standardized subscription offers.
   * Cross-platform type with Android-specific fields using suffix.
   * @see https://openiap.dev/docs/types#subscription-offer
   */
  subscriptionOffers: SubscriptionOffer[];
  title: string;
  type: 'subs';
}

/**
 * Subscription offer details (Android).
 * @deprecated Use the standardized SubscriptionOffer type instead for cross-platform compatibility.
 * @see https://openiap.dev/docs/types#subscription-offer
 */
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
  /**
   * @deprecated Use subscriptionOffers instead for cross-platform compatibility.
   * @deprecated Use subscriptionOffers instead
   */
  discountsIOS?: (DiscountIOS[] | null);
  displayName?: (string | null);
  displayNameIOS: string;
  displayPrice: string;
  id: string;
  introductoryPriceAsAmountIOS?: (string | null);
  introductoryPriceIOS?: (string | null);
  introductoryPriceNumberOfPeriodsIOS?: (string | null);
  introductoryPricePaymentModeIOS: PaymentModeIOS;
  introductoryPriceSubscriptionPeriodIOS?: (SubscriptionPeriodIOS | null);
  isFamilyShareableIOS: boolean;
  jsonRepresentationIOS: string;
  platform: 'ios';
  price?: (number | null);
  /**
   * @deprecated Use subscriptionOffers instead for cross-platform compatibility.
   * @deprecated Use subscriptionOffers instead
   */
  subscriptionInfoIOS?: (SubscriptionInfoIOS | null);
  /**
   * Standardized subscription offers.
   * Cross-platform type with iOS-specific fields using suffix.
   * @see https://openiap.dev/docs/types#subscription-offer
   */
  subscriptionOffers?: (SubscriptionOffer[] | null);
  subscriptionPeriodNumberIOS?: (string | null);
  subscriptionPeriodUnitIOS?: (SubscriptionPeriodIOS | null);
  title: string;
  type: 'subs';
  typeIOS: ProductTypeIOS;
}

export type ProductType = 'in-app' | 'subs';

export type ProductTypeIOS = 'consumable' | 'non-consumable' | 'auto-renewable-subscription' | 'non-renewing-subscription';

/**
 * JWS promotional offer input for iOS 15+ (StoreKit 2, WWDC 2025).
 * New signature format using compact JWS string for promotional offers.
 * This provides a simpler alternative to the legacy signature-based promotional offers.
 * Back-deployed to iOS 15.
 */
export interface PromotionalOfferJwsInputIOS {
  /**
   * Compact JWS string signed by your server.
   * The JWS should contain the promotional offer signature data.
   * Format: header.payload.signature (base64url encoded)
   */
  jws: string;
  /** The promotional offer identifier from App Store Connect */
  offerId: string;
}

export type Purchase = PurchaseAndroid | PurchaseIOS;

export interface PurchaseAndroid extends PurchaseCommon {
  autoRenewingAndroid?: (boolean | null);
  currentPlanId?: (string | null);
  dataAndroid?: (string | null);
  developerPayloadAndroid?: (string | null);
  id: string;
  ids?: (string[] | null);
  isAcknowledgedAndroid?: (boolean | null);
  isAutoRenewing: boolean;
  /**
   * Whether the subscription is suspended (Android)
   * A suspended subscription means the user's payment method failed and they need to fix it.
   * Users should be directed to the subscription center to resolve the issue.
   * Do NOT grant entitlements for suspended subscriptions.
   * Available in Google Play Billing Library 8.1.0+
   */
  isSuspendedAndroid?: (boolean | null);
  obfuscatedAccountIdAndroid?: (string | null);
  obfuscatedProfileIdAndroid?: (string | null);
  packageNameAndroid?: (string | null);
  /** @deprecated Use store instead */
  platform: IapPlatform;
  productId: string;
  purchaseState: PurchaseState;
  purchaseToken?: (string | null);
  quantity: number;
  signatureAndroid?: (string | null);
  /** Store where purchase was made */
  store: IapStore;
  transactionDate: number;
  transactionId?: (string | null);
}

export interface PurchaseCommon {
  /**
   * The current plan identifier. This is:
   * - On Android: the basePlanId (e.g., "premium", "premium-year")
   * - On iOS: the productId (e.g., "com.example.premium_monthly", "com.example.premium_yearly")
   * This provides a unified way to identify which specific plan/tier the user is subscribed to.
   */
  currentPlanId?: (string | null);
  id: string;
  ids?: (string[] | null);
  isAutoRenewing: boolean;
  /** @deprecated Use store instead */
  platform: IapPlatform;
  productId: string;
  purchaseState: PurchaseState;
  /** Unified purchase token (iOS JWS, Android purchaseToken) */
  purchaseToken?: (string | null);
  quantity: number;
  /** Store where purchase was made */
  store: IapStore;
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
  currentPlanId?: (string | null);
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
  /** @deprecated Use store instead */
  platform: IapPlatform;
  productId: string;
  purchaseState: PurchaseState;
  purchaseToken?: (string | null);
  quantity: number;
  quantityIOS?: (number | null);
  reasonIOS?: (string | null);
  reasonStringRepresentationIOS?: (string | null);
  renewalInfoIOS?: (RenewalInfoIOS | null);
  revocationDateIOS?: (number | null);
  revocationReasonIOS?: (string | null);
  /** Store where purchase was made */
  store: IapStore;
  storefrontCountryCodeIOS?: (string | null);
  subscriptionGroupIdIOS?: (string | null);
  transactionDate: number;
  transactionId: string;
  transactionReasonIOS?: (string | null);
  webOrderLineItemIdIOS?: (string | null);
}

export type PurchaseInput = Purchase;

export interface PurchaseOfferIOS {
  id: string;
  paymentMode: string;
  type: string;
}

export interface PurchaseOptions {
  /** Also emit results through the iOS event listeners */
  alsoPublishToEventListenerIOS?: (boolean | null);
  /**
   * Include suspended subscriptions in the result (Android 8.1+).
   * Suspended subscriptions have isSuspendedAndroid=true and should NOT be granted entitlements.
   * Users should be directed to the subscription center to resolve payment issues.
   * Default: false (only active subscriptions are returned)
   */
  includeSuspendedAndroid?: (boolean | null);
  /** Limit to currently active items on iOS */
  onlyIncludeActiveItemsIOS?: (boolean | null);
}

export type PurchaseState = 'pending' | 'purchased' | 'unknown';

export type PurchaseVerificationProvider = 'iapkit';

export interface Query {
  /**
   * Check if external purchase notice sheet can be presented (iOS 17.4+)
   * Uses ExternalPurchase.canPresent
   */
  canPresentExternalPurchaseNoticeIOS: Promise<boolean>;
  /** Get current StoreKit 2 entitlements (iOS 15+) */
  currentEntitlementIOS?: Promise<(PurchaseIOS | null)>;
  /** Retrieve products or subscriptions from the store */
  fetchProducts: Promise<(ProductOrSubscription[] | Product[] | ProductSubscription[] | null)>;
  /** Get active subscriptions (filters by subscriptionIds when provided) */
  getActiveSubscriptions: Promise<ActiveSubscription[]>;
  /** Fetch the current app transaction (iOS 16+) */
  getAppTransactionIOS?: Promise<(AppTransaction | null)>;
  /** Get all available purchases for the current user */
  getAvailablePurchases: Promise<Purchase[]>;
  /**
   * Get external purchase token for reporting to Apple (iOS 18.1+).
   * Use this token with Apple's External Purchase Server API to report transactions.
   * Reference: https://developer.apple.com/documentation/storekit/externalpurchasecustomlink/token(for:)
   */
  getExternalPurchaseCustomLinkTokenIOS: Promise<ExternalPurchaseCustomLinkTokenResultIOS>;
  /** Retrieve all pending transactions in the StoreKit queue */
  getPendingTransactionsIOS: Promise<PurchaseIOS[]>;
  /** Get the currently promoted product (iOS 11+) */
  getPromotedProductIOS?: Promise<(ProductIOS | null)>;
  /** Get base64-encoded receipt data for validation */
  getReceiptDataIOS?: Promise<(string | null)>;
  /** Get the current storefront country code */
  getStorefront: Promise<string>;
  /**
   * Get the current App Store storefront country code
   * @deprecated Use getStorefront
   */
  getStorefrontIOS: Promise<string>;
  /** Get the transaction JWS (StoreKit 2) */
  getTransactionJwsIOS?: Promise<(string | null)>;
  /** Check whether the user has active subscriptions */
  hasActiveSubscriptions: Promise<boolean>;
  /**
   * Check if app is eligible for ExternalPurchaseCustomLink API (iOS 18.1+).
   * Returns true if the app can use custom external purchase links.
   * Reference: https://developer.apple.com/documentation/storekit/externalpurchasecustomlink/iseligible
   */
  isEligibleForExternalPurchaseCustomLinkIOS: Promise<boolean>;
  /** Check introductory offer eligibility for a subscription group */
  isEligibleForIntroOfferIOS: Promise<boolean>;
  /** Verify a StoreKit 2 transaction signature */
  isTransactionVerifiedIOS: Promise<boolean>;
  /** Get the latest transaction for a product using StoreKit 2 */
  latestTransactionIOS?: Promise<(PurchaseIOS | null)>;
  /** Get StoreKit 2 subscription status details (iOS 15+) */
  subscriptionStatusIOS: Promise<SubscriptionStatusIOS[]>;
  /**
   * Validate a receipt for a specific product
   * @deprecated Use verifyPurchase
   */
  validateReceiptIOS: Promise<VerifyPurchaseResultIOS>;
}



export type QueryCurrentEntitlementIosArgs = string;

export type QueryFetchProductsArgs = ProductRequest;

export type QueryGetActiveSubscriptionsArgs = (string[] | null) | undefined;

export type QueryGetAvailablePurchasesArgs = (PurchaseOptions | null) | undefined;

export type QueryGetExternalPurchaseCustomLinkTokenIosArgs = ExternalPurchaseCustomLinkTokenTypeIOS;

export type QueryGetTransactionJwsIosArgs = string;

export type QueryHasActiveSubscriptionsArgs = (string[] | null) | undefined;

export type QueryIsEligibleForIntroOfferIosArgs = string;

export type QueryIsTransactionVerifiedIosArgs = string;

export type QueryLatestTransactionIosArgs = string;

export type QuerySubscriptionStatusIosArgs = string;

export type QueryValidateReceiptIosArgs = VerifyPurchaseProps;

export interface RefundResultIOS {
  message?: (string | null);
  status: string;
}

/**
 * Subscription renewal information from Product.SubscriptionInfo.RenewalInfo
 * https://developer.apple.com/documentation/storekit/product/subscriptioninfo/renewalinfo
 */
export interface RenewalInfoIOS {
  autoRenewPreference?: (string | null);
  /**
   * When subscription expires due to cancellation/billing issue
   * Possible values: "VOLUNTARY", "BILLING_ERROR", "DID_NOT_AGREE_TO_PRICE_INCREASE", "PRODUCT_NOT_AVAILABLE", "UNKNOWN"
   */
  expirationReason?: (string | null);
  /**
   * Grace period expiration date (milliseconds since epoch)
   * When set, subscription is in grace period (billing issue but still has access)
   */
  gracePeriodExpirationDate?: (number | null);
  /**
   * True if subscription failed to renew due to billing issue and is retrying
   * Note: Not directly available in RenewalInfo, available in Status
   */
  isInBillingRetry?: (boolean | null);
  jsonRepresentation?: (string | null);
  /**
   * Product ID that will be used on next renewal (when user upgrades/downgrades)
   * If set and different from current productId, subscription will change on expiration
   */
  pendingUpgradeProductId?: (string | null);
  /**
   * User's response to subscription price increase
   * Possible values: "AGREED", "PENDING", null (no price increase)
   */
  priceIncreaseStatus?: (string | null);
  /**
   * Expected renewal date (milliseconds since epoch)
   * For active subscriptions, when the next renewal/charge will occur
   */
  renewalDate?: (number | null);
  /** Offer ID applied to next renewal (promotional offer, subscription offer code, etc.) */
  renewalOfferId?: (string | null);
  /**
   * Type of offer applied to next renewal
   * Possible values: "PROMOTIONAL", "SUBSCRIPTION_OFFER_CODE", "WIN_BACK", etc.
   */
  renewalOfferType?: (string | null);
  willAutoRenew: boolean;
}

/**
 * Rental details for one-time purchase products that can be rented (Android)
 * Available in Google Play Billing Library 7.0+
 */
export interface RentalDetailsAndroid {
  /**
   * Rental expiration period in ISO 8601 format
   * Time after rental period ends when user can still extend
   */
  rentalExpirationPeriod?: (string | null);
  /** Rental period in ISO 8601 format (e.g., P7D for 7 days) */
  rentalPeriod: string;
}

export interface RequestPurchaseAndroidProps {
  /**
   * Developer billing option parameters for external payments flow (8.3.0+).
   * When provided, the purchase flow will show a side-by-side choice between
   * Google Play Billing and the developer's external payment option.
   */
  developerBillingOption?: (DeveloperBillingOptionParamsAndroid | null);
  /**
   * Personalized offer flag.
   * When true, indicates the price was customized for this user.
   */
  isOfferPersonalized?: (boolean | null);
  /** Obfuscated account ID */
  obfuscatedAccountId?: (string | null);
  /** Obfuscated profile ID */
  obfuscatedProfileId?: (string | null);
  /**
   * Offer token for one-time purchase discounts (7.0+).
   * Pass the offerToken from oneTimePurchaseOfferDetailsAndroid or discountOffers
   * to apply a discount offer to the purchase.
   */
  offerToken?: (string | null);
  /** List of product SKUs */
  skus: string[];
}

export interface RequestPurchaseIosProps {
  /**
   * Advanced commerce data token (iOS 15+).
   * Used with StoreKit 2's Product.PurchaseOption.custom API for passing
   * campaign tokens, affiliate IDs, or other attribution data.
   * The data is formatted as JSON: {"signatureInfo": {"token": "<value>"}}
   */
  advancedCommerceData?: (string | null);
  /** Auto-finish transaction (dangerous) */
  andDangerouslyFinishTransactionAutomatically?: (boolean | null);
  /** App account token for user tracking */
  appAccountToken?: (string | null);
  /** Purchase quantity */
  quantity?: (number | null);
  /** Product SKU */
  sku: string;
  /**
   * Promotional offer to apply (subscriptions only, ignored for one-time purchases).
   * iOS only supports promotional offers for auto-renewable subscriptions.
   */
  withOffer?: (DiscountOfferInputIOS | null);
}

export type RequestPurchaseProps =
  | {
      /** Per-platform purchase request props */
      request: RequestPurchasePropsByPlatforms;
      type: 'in-app';
      /** Use alternative billing (Google Play alternative billing, Apple external purchase link) */
      useAlternativeBilling?: boolean | null;
    }
  | {
      /** Per-platform subscription request props */
      request: RequestSubscriptionPropsByPlatforms;
      type: 'subs';
      /** Use alternative billing (Google Play alternative billing, Apple external purchase link) */
      useAlternativeBilling?: boolean | null;
    };

/**
 * Platform-specific purchase request parameters.
 *
 * Note: "Platforms" refers to the SDK/OS level (apple, google), not the store.
 * - apple: Always targets App Store
 * - google: Targets Play Store by default, or Horizon when built with horizon flavor
 *   (determined at build time, not runtime)
 */
export interface RequestPurchasePropsByPlatforms {
  /** @deprecated Use google instead */
  android?: (RequestPurchaseAndroidProps | null);
  /** Apple-specific purchase parameters */
  apple?: (RequestPurchaseIosProps | null);
  /** Google-specific purchase parameters */
  google?: (RequestPurchaseAndroidProps | null);
  /** @deprecated Use apple instead */
  ios?: (RequestPurchaseIosProps | null);
}

export type RequestPurchaseResult = Purchase | Purchase[] | null;

export interface RequestSubscriptionAndroidProps {
  /**
   * Developer billing option parameters for external payments flow (8.3.0+).
   * When provided, the purchase flow will show a side-by-side choice between
   * Google Play Billing and the developer's external payment option.
   */
  developerBillingOption?: (DeveloperBillingOptionParamsAndroid | null);
  /**
   * Personalized offer flag.
   * When true, indicates the price was customized for this user.
   */
  isOfferPersonalized?: (boolean | null);
  /** Obfuscated account ID */
  obfuscatedAccountId?: (string | null);
  /** Obfuscated profile ID */
  obfuscatedProfileId?: (string | null);
  /** Purchase token for upgrades/downgrades */
  purchaseToken?: (string | null);
  /**
   * Replacement mode for subscription changes
   * @deprecated Use subscriptionProductReplacementParams instead for item-level replacement (8.1.0+)
   */
  replacementMode?: (number | null);
  /** List of subscription SKUs */
  skus: string[];
  /** Subscription offers */
  subscriptionOffers?: (AndroidSubscriptionOfferInput[] | null);
  /**
   * Product-level replacement parameters (8.1.0+)
   * Use this instead of replacementMode for item-level replacement
   */
  subscriptionProductReplacementParams?: (SubscriptionProductReplacementParamsAndroid | null);
}

export interface RequestSubscriptionIosProps {
  /**
   * Advanced commerce data token (iOS 15+).
   * Used with StoreKit 2's Product.PurchaseOption.custom API for passing
   * campaign tokens, affiliate IDs, or other attribution data.
   * The data is formatted as JSON: {"signatureInfo": {"token": "<value>"}}
   */
  advancedCommerceData?: (string | null);
  andDangerouslyFinishTransactionAutomatically?: (boolean | null);
  appAccountToken?: (string | null);
  /**
   * Override introductory offer eligibility (iOS 15+, WWDC 2025).
   * Set to true to indicate the user is eligible for introductory offer,
   * or false to indicate they are not. When nil, the system determines eligibility.
   * Back-deployed to iOS 15.
   */
  introductoryOfferEligibility?: (boolean | null);
  /**
   * JWS promotional offer (iOS 15+, WWDC 2025).
   * New signature format using compact JWS string for promotional offers.
   * Back-deployed to iOS 15.
   */
  promotionalOfferJWS?: (PromotionalOfferJwsInputIOS | null);
  quantity?: (number | null);
  sku: string;
  /**
   * Win-back offer to apply (iOS 18+)
   * Used to re-engage churned subscribers with a discount or free trial.
   * The offer is available when the customer is eligible and can be discovered
   * via StoreKit Message (automatic) or subscription offer APIs.
   */
  winBackOffer?: (WinBackOfferInputIOS | null);
  /**
   * Promotional offer to apply for subscription purchases.
   * Requires server-signed offer with nonce, timestamp, keyId, and signature.
   */
  withOffer?: (DiscountOfferInputIOS | null);
}

/**
 * Platform-specific subscription request parameters.
 *
 * Note: "Platforms" refers to the SDK/OS level (apple, google), not the store.
 * - apple: Always targets App Store
 * - google: Targets Play Store by default, or Horizon when built with horizon flavor
 *   (determined at build time, not runtime)
 */
export interface RequestSubscriptionPropsByPlatforms {
  /** @deprecated Use google instead */
  android?: (RequestSubscriptionAndroidProps | null);
  /** Apple-specific subscription parameters */
  apple?: (RequestSubscriptionIosProps | null);
  /** Google-specific subscription parameters */
  google?: (RequestSubscriptionAndroidProps | null);
  /** @deprecated Use apple instead */
  ios?: (RequestSubscriptionIosProps | null);
}

export interface RequestVerifyPurchaseWithIapkitAppleProps {
  /** The JWS token returned with the purchase response. */
  jws: string;
}

export interface RequestVerifyPurchaseWithIapkitGoogleProps {
  /** The token provided to the user's device when the product or subscription was purchased. */
  purchaseToken: string;
}

/**
 * Platform-specific verification parameters for IAPKit.
 *
 * - apple: Verifies via App Store (JWS token)
 * - google: Verifies via Play Store (purchase token)
 */
export interface RequestVerifyPurchaseWithIapkitProps {
  /** API key used for the Authorization header (Bearer {apiKey}). */
  apiKey?: (string | null);
  /** Apple App Store verification parameters. */
  apple?: (RequestVerifyPurchaseWithIapkitAppleProps | null);
  /** Google Play Store verification parameters. */
  google?: (RequestVerifyPurchaseWithIapkitGoogleProps | null);
}

export interface RequestVerifyPurchaseWithIapkitResult {
  /** Whether the purchase is valid (not falsified). */
  isValid: boolean;
  /** The current state of the purchase. */
  state: IapkitPurchaseState;
  store: IapStore;
}

/**
 * Sub-response codes for more granular purchase error information (Android)
 * Available in Google Play Billing Library 8.0.0+
 */
export type SubResponseCodeAndroid = 'no-applicable-sub-response-code' | 'payment-declined-due-to-insufficient-funds' | 'user-ineligible';

export interface Subscription {
  /**
   * Fires when a user selects developer billing in the External Payments flow (Android only)
   * Triggered when the user chooses to pay via the developer's external payment option
   * instead of Google Play Billing in the side-by-side choice dialog.
   * Contains the externalTransactionToken needed to report the transaction.
   * Available in Google Play Billing Library 8.3.0+
   */
  developerProvidedBillingAndroid: DeveloperProvidedBillingDetailsAndroid;
  /** Fires when the App Store surfaces a promoted product (iOS only) */
  promotedProductIOS: string;
  /** Fires when a purchase fails or is cancelled */
  purchaseError: PurchaseError;
  /** Fires when a purchase completes successfully or a pending purchase resolves */
  purchaseUpdated: Purchase;
  /**
   * Fires when a user selects alternative billing in the User Choice Billing dialog (Android only)
   * Only triggered when the user selects alternative billing instead of Google Play billing
   */
  userChoiceBillingAndroid: UserChoiceBillingDetails;
}


export interface SubscriptionInfoIOS {
  introductoryOffer?: (SubscriptionOfferIOS | null);
  promotionalOffers?: (SubscriptionOfferIOS[] | null);
  subscriptionGroupId: string;
  subscriptionPeriod: SubscriptionPeriodValueIOS;
}

/**
 * Standardized subscription discount/promotional offer.
 * Provides a unified interface for subscription offers across iOS and Android.
 *
 * Both platforms support subscription offers with different implementations:
 * - iOS: Introductory offers, promotional offers with server-side signatures
 * - Android: Offer tokens with pricing phases
 *
 * @see https://openiap.dev/docs/types/ios#discount-offer
 * @see https://openiap.dev/docs/types/android#subscription-offer
 */
export interface SubscriptionOffer {
  /**
   * [Android] Base plan identifier.
   * Identifies which base plan this offer belongs to.
   */
  basePlanIdAndroid?: (string | null);
  /** Currency code (ISO 4217, e.g., "USD") */
  currency?: (string | null);
  /** Formatted display price string (e.g., "$9.99/month") */
  displayPrice: string;
  /**
   * Unique identifier for the offer.
   * - iOS: Discount identifier from App Store Connect
   * - Android: offerId from ProductSubscriptionAndroidOfferDetails
   */
  id: string;
  /**
   * [iOS] Key identifier for signature validation.
   * Used with server-side signature generation for promotional offers.
   */
  keyIdentifierIOS?: (string | null);
  /** [iOS] Localized price string. */
  localizedPriceIOS?: (string | null);
  /**
   * [iOS] Cryptographic nonce (UUID) for signature validation.
   * Must be generated server-side for each purchase attempt.
   */
  nonceIOS?: (string | null);
  /** [iOS] Number of billing periods for this discount. */
  numberOfPeriodsIOS?: (number | null);
  /** [Android] List of tags associated with this offer. */
  offerTagsAndroid?: (string[] | null);
  /**
   * [Android] Offer token required for purchase.
   * Must be passed to requestPurchase() when purchasing with this offer.
   */
  offerTokenAndroid?: (string | null);
  /** Payment mode during the offer period */
  paymentMode?: (PaymentMode | null);
  /** Subscription period for this offer */
  period?: (SubscriptionPeriod | null);
  /** Number of periods the offer applies */
  periodCount?: (number | null);
  /** Numeric price value */
  price: number;
  /**
   * [Android] Pricing phases for this subscription offer.
   * Contains detailed pricing information for each phase (trial, intro, regular).
   */
  pricingPhasesAndroid?: (PricingPhasesAndroid | null);
  /**
   * [iOS] Server-generated signature for promotional offer validation.
   * Required when applying promotional offers on iOS.
   */
  signatureIOS?: (string | null);
  /**
   * [iOS] Timestamp when the signature was generated.
   * Used for signature validation.
   */
  timestampIOS?: (number | null);
  /** Type of subscription offer (Introductory or Promotional) */
  type: DiscountOfferType;
}

/**
 * iOS subscription offer details.
 * @deprecated Use the standardized SubscriptionOffer type instead for cross-platform compatibility.
 * @see https://openiap.dev/docs/types#subscription-offer
 */
export interface SubscriptionOfferIOS {
  displayPrice: string;
  id: string;
  paymentMode: PaymentModeIOS;
  period: SubscriptionPeriodValueIOS;
  periodCount: number;
  price: number;
  type: SubscriptionOfferTypeIOS;
}

export type SubscriptionOfferTypeIOS = 'introductory' | 'promotional' | 'win-back';

/** Subscription period value combining unit and count. */
export interface SubscriptionPeriod {
  /** The period unit (day, week, month, year) */
  unit: SubscriptionPeriodUnit;
  /** The number of units (e.g., 1 for monthly, 3 for quarterly) */
  value: number;
}

export type SubscriptionPeriodIOS = 'day' | 'week' | 'month' | 'year' | 'empty';

/** Subscription period unit for cross-platform use. */
export type SubscriptionPeriodUnit = 'day' | 'week' | 'month' | 'year' | 'unknown';

export interface SubscriptionPeriodValueIOS {
  unit: SubscriptionPeriodIOS;
  value: number;
}

/**
 * Product-level subscription replacement parameters (Android)
 * Used with setSubscriptionProductReplacementParams in BillingFlowParams.ProductDetailsParams
 * Available in Google Play Billing Library 8.1.0+
 */
export interface SubscriptionProductReplacementParamsAndroid {
  /** The old product ID that needs to be replaced */
  oldProductId: string;
  /** The replacement mode for this product change */
  replacementMode: SubscriptionReplacementModeAndroid;
}

/**
 * Replacement mode for subscription changes (Android)
 * These modes determine how the subscription replacement affects billing.
 * Available in Google Play Billing Library 8.1.0+
 */
export type SubscriptionReplacementModeAndroid = 'unknown-replacement-mode' | 'with-time-proration' | 'charge-prorated-price' | 'charge-full-price' | 'without-proration' | 'deferred' | 'keep-existing';

export interface SubscriptionStatusIOS {
  renewalInfo?: (RenewalInfoIOS | null);
  state: string;
}

/**
 * User Choice Billing event details (Android)
 * Fired when a user selects alternative billing in the User Choice Billing dialog
 */
export interface UserChoiceBillingDetails {
  /** Token that must be reported to Google Play within 24 hours */
  externalTransactionToken: string;
  /** List of product IDs selected by the user */
  products: string[];
}

/**
 * Valid time window for when an offer is available (Android)
 * Available in Google Play Billing Library 7.0+
 */
export interface ValidTimeWindowAndroid {
  /** End time in milliseconds since epoch */
  endTimeMillis: string;
  /** Start time in milliseconds since epoch */
  startTimeMillis: string;
}

/**
 * Apple App Store verification parameters.
 * Used for server-side receipt validation via App Store Server API.
 */
export interface VerifyPurchaseAppleOptions {
  /** Product SKU to validate */
  sku: string;
}

/**
 * Google Play Store verification parameters.
 * Used for server-side receipt validation via Google Play Developer API.
 *
 * ⚠️ SECURITY: Contains sensitive tokens (accessToken, purchaseToken). Do not log or persist this data.
 */
export interface VerifyPurchaseGoogleOptions {
  /**
   * Google OAuth2 access token for API authentication.
   * ⚠️ Sensitive: Do not log this value.
   */
  accessToken: string;
  /** Whether this is a subscription purchase (affects API endpoint used) */
  isSub?: (boolean | null);
  /** Android package name (e.g., com.example.app) */
  packageName: string;
  /**
   * Purchase token from the purchase response.
   * ⚠️ Sensitive: Do not log this value.
   */
  purchaseToken: string;
  /** Product SKU to validate */
  sku: string;
}

/**
 * Meta Horizon (Quest) verification parameters.
 * Used for server-side entitlement verification via Meta's S2S API.
 * POST https://graph.oculus.com/$APP_ID/verify_entitlement
 *
 * ⚠️ SECURITY: Contains sensitive token (accessToken). Do not log or persist this data.
 */
export interface VerifyPurchaseHorizonOptions {
  /**
   * Access token for Meta API authentication (OC|$APP_ID|$APP_SECRET or User Access Token).
   * ⚠️ Sensitive: Do not log this value.
   */
  accessToken: string;
  /** The SKU for the add-on item, defined in Meta Developer Dashboard */
  sku: string;
  /** The user ID of the user whose purchase you want to verify */
  userId: string;
}

/**
 * Platform-specific purchase verification parameters.
 *
 * - apple: Verifies via App Store Server API
 * - google: Verifies via Google Play Developer API
 * - horizon: Verifies via Meta's S2S API (verify_entitlement endpoint)
 */
export interface VerifyPurchaseProps {
  /** Apple App Store verification parameters. */
  apple?: (VerifyPurchaseAppleOptions | null);
  /** Google Play Store verification parameters. */
  google?: (VerifyPurchaseGoogleOptions | null);
  /** Meta Horizon (Quest) verification parameters. */
  horizon?: (VerifyPurchaseHorizonOptions | null);
}

export type VerifyPurchaseResult = VerifyPurchaseResultAndroid | VerifyPurchaseResultHorizon | VerifyPurchaseResultIOS;

export interface VerifyPurchaseResultAndroid {
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

/**
 * Result from Meta Horizon verify_entitlement API.
 * Returns verification status and grant time for the entitlement.
 */
export interface VerifyPurchaseResultHorizon {
  /** Unix timestamp (seconds) when the entitlement was granted. */
  grantTime?: (number | null);
  /** Whether the entitlement verification succeeded. */
  success: boolean;
}

export interface VerifyPurchaseResultIOS {
  /** Whether the receipt is valid */
  isValid: boolean;
  /** JWS representation */
  jwsRepresentation: string;
  /** Latest transaction if available */
  latestTransaction?: (Purchase | null);
  /** Receipt data string */
  receiptData: string;
}

export interface VerifyPurchaseWithProviderError {
  code?: (string | null);
  message: string;
}

export interface VerifyPurchaseWithProviderProps {
  iapkit?: (RequestVerifyPurchaseWithIapkitProps | null);
  provider: PurchaseVerificationProvider;
}

export interface VerifyPurchaseWithProviderResult {
  /** Error details if verification failed */
  errors?: (VerifyPurchaseWithProviderError[] | null);
  /** IAPKit verification result */
  iapkit?: (RequestVerifyPurchaseWithIapkitResult | null);
  provider: PurchaseVerificationProvider;
}

export type VoidResult = void;

/**
 * Win-back offer input for iOS 18+ (StoreKit 2)
 * Win-back offers are used to re-engage churned subscribers.
 * The offer is automatically presented via StoreKit Message when eligible,
 * or can be applied programmatically during purchase.
 */
export interface WinBackOfferInputIOS {
  /** The win-back offer ID from App Store Connect */
  offerId: string;
}
// -- Query helper types (auto-generated)
export type QueryArgsMap = {
  canPresentExternalPurchaseNoticeIOS: never;
  currentEntitlementIOS: QueryCurrentEntitlementIosArgs;
  fetchProducts: QueryFetchProductsArgs;
  getActiveSubscriptions: QueryGetActiveSubscriptionsArgs;
  getAppTransactionIOS: never;
  getAvailablePurchases: QueryGetAvailablePurchasesArgs;
  getExternalPurchaseCustomLinkTokenIOS: QueryGetExternalPurchaseCustomLinkTokenIosArgs;
  getPendingTransactionsIOS: never;
  getPromotedProductIOS: never;
  getReceiptDataIOS: never;
  getStorefront: never;
  getStorefrontIOS: never;
  getTransactionJwsIOS: QueryGetTransactionJwsIosArgs;
  hasActiveSubscriptions: QueryHasActiveSubscriptionsArgs;
  isEligibleForExternalPurchaseCustomLinkIOS: never;
  isEligibleForIntroOfferIOS: QueryIsEligibleForIntroOfferIosArgs;
  isTransactionVerifiedIOS: QueryIsTransactionVerifiedIosArgs;
  latestTransactionIOS: QueryLatestTransactionIosArgs;
  subscriptionStatusIOS: QuerySubscriptionStatusIosArgs;
  validateReceiptIOS: QueryValidateReceiptIosArgs;
};

export type QueryField<K extends keyof Query> =
  QueryArgsMap[K] extends never
    ? () => NonNullable<Query[K]>
    : undefined extends QueryArgsMap[K]
      ? (args?: QueryArgsMap[K]) => NonNullable<Query[K]>
      : (args: QueryArgsMap[K]) => NonNullable<Query[K]>;

export type QueryFieldMap = {
  [K in keyof Query]?: QueryField<K>;
};
// -- End query helper types

// -- Mutation helper types (auto-generated)
export type MutationArgsMap = {
  acknowledgePurchaseAndroid: MutationAcknowledgePurchaseAndroidArgs;
  beginRefundRequestIOS: MutationBeginRefundRequestIosArgs;
  checkAlternativeBillingAvailabilityAndroid: never;
  clearTransactionIOS: never;
  consumePurchaseAndroid: MutationConsumePurchaseAndroidArgs;
  createAlternativeBillingTokenAndroid: never;
  createBillingProgramReportingDetailsAndroid: MutationCreateBillingProgramReportingDetailsAndroidArgs;
  deepLinkToSubscriptions: MutationDeepLinkToSubscriptionsArgs;
  endConnection: never;
  finishTransaction: MutationFinishTransactionArgs;
  initConnection: MutationInitConnectionArgs;
  isBillingProgramAvailableAndroid: MutationIsBillingProgramAvailableAndroidArgs;
  launchExternalLinkAndroid: MutationLaunchExternalLinkAndroidArgs;
  presentCodeRedemptionSheetIOS: never;
  presentExternalPurchaseLinkIOS: MutationPresentExternalPurchaseLinkIosArgs;
  presentExternalPurchaseNoticeSheetIOS: never;
  requestPurchase: MutationRequestPurchaseArgs;
  requestPurchaseOnPromotedProductIOS: never;
  restorePurchases: never;
  showAlternativeBillingDialogAndroid: never;
  showExternalPurchaseCustomLinkNoticeIOS: MutationShowExternalPurchaseCustomLinkNoticeIosArgs;
  showManageSubscriptionsIOS: never;
  syncIOS: never;
  validateReceipt: MutationValidateReceiptArgs;
  verifyPurchase: MutationVerifyPurchaseArgs;
  verifyPurchaseWithProvider: MutationVerifyPurchaseWithProviderArgs;
};

export type MutationField<K extends keyof Mutation> =
  MutationArgsMap[K] extends never
    ? () => NonNullable<Mutation[K]>
    : undefined extends MutationArgsMap[K]
      ? (args?: MutationArgsMap[K]) => NonNullable<Mutation[K]>
      : (args: MutationArgsMap[K]) => NonNullable<Mutation[K]>;

export type MutationFieldMap = {
  [K in keyof Mutation]?: MutationField<K>;
};
// -- End mutation helper types

// -- Subscription helper types (auto-generated)
export type SubscriptionArgsMap = {
  developerProvidedBillingAndroid: never;
  promotedProductIOS: never;
  purchaseError: never;
  purchaseUpdated: never;
  userChoiceBillingAndroid: never;
};

export type SubscriptionField<K extends keyof Subscription> =
  SubscriptionArgsMap[K] extends never
    ? () => NonNullable<Subscription[K]>
    : undefined extends SubscriptionArgsMap[K]
      ? (args?: SubscriptionArgsMap[K]) => NonNullable<Subscription[K]>
      : (args: SubscriptionArgsMap[K]) => NonNullable<Subscription[K]>;

export type SubscriptionFieldMap = {
  [K in keyof Subscription]?: SubscriptionField<K>;
};
// -- End subscription helper types
