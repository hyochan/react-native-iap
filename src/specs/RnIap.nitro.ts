import type {HybridObject} from 'react-native-nitro-modules';

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║                      NITRO MODULE CONSTRAINTS                            ║
// ╠══════════════════════════════════════════════════════════════════════════╣
// ║ Nitro Modules (react-native-nitro-modules) has specific limitations      ║
// ║ when generating C++/Swift/Kotlin bridge code from TypeScript types:      ║
// ║                                                                          ║
// ║ 1. UNION TYPES REQUIRE 2+ VALUES                                         ║
// ║    - Single-value unions like `type Foo = 'bar'` cause codegen errors    ║
// ║    - Error: "String literal 'x' cannot be represented in C++ because     ║
// ║      it is ambiguous between a string and a discriminating union enum"   ║
// ║    - Solution: Add a fallback value (e.g., 'unspecified') to make 2+     ║
// ║                                                                          ║
// ║ 2. TYPES MUST BE DEFINED IN THIS FILE OR IMPORTED AS `type`              ║
// ║    - Nitro codegen reads this file to generate native bridge code        ║
// ║    - Interface types from types.ts can be imported and used directly     ║
// ║    - Union types with 2+ values can be imported from types.ts            ║
// ║    - Single-value unions must be redefined locally with extra values     ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// NOTE: This Nitro spec re-exports types from the generated schema (src/types.ts)
// via type aliases to avoid duplicating structure. Nitro's codegen expects the
// canonical `Nitro*` names defined here, so we keep the aliases rather than
// removing the types entirely.
import type {
  ActiveSubscription,
  AndroidSubscriptionOfferInput,
  DeepLinkOptions,
  InitConnectionConfig,
  ExternalPurchaseCustomLinkNoticeResultIOS,
  ExternalPurchaseCustomLinkTokenResultIOS,
  // ExternalPurchaseCustomLinkTokenTypeIOS has 2 values ('acquisition' | 'services')
  // so it can be imported directly from types.ts
  ExternalPurchaseCustomLinkTokenTypeIOS,
  ExternalPurchaseLinkResultIOS,
  ExternalPurchaseNoticeResultIOS,
  MutationFinishTransactionArgs,
  ProductCommon,
  PromotionalOfferJwsInputIOS,
  PurchaseCommon,
  PurchaseOptions,
  VerifyPurchaseAppleOptions,
  VerifyPurchaseGoogleOptions,
  VerifyPurchaseHorizonOptions,
  VerifyPurchaseResultAndroid,
  RequestPurchaseIosProps,
  RequestPurchaseResult,
  RequestSubscriptionAndroidProps,
  UserChoiceBillingDetails,
  PaymentModeIOS,
  SubscriptionProductReplacementParamsAndroid,
  WinBackOfferInputIOS,
} from '../types';

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║                    LOCAL TYPE DEFINITIONS FOR NITRO                      ║
// ╠══════════════════════════════════════════════════════════════════════════╣
// ║ Types below are defined locally because:                                 ║
// ║ - GQL-generated type has only 1 value (Nitro requires 2+), OR            ║
// ║ - Nitro codegen needs the type defined in this file for bridge gen       ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ExternalPurchaseCustomLinkNoticeTypeIOS (iOS 18.1+)
// GQL type: 'browser' (1 value) → Nitro requires 2+ values
// Added 'unspecified' as fallback to satisfy Nitro constraint
export type ExternalPurchaseCustomLinkNoticeTypeIOS = 'browser' | 'unspecified';

// Platform identifier for cross-platform purchase/product data
// Defined locally for Nitro codegen (not in GQL schema)
export type IapPlatform = 'ios' | 'android';

// IAPKit purchase state enum for receipt verification
// Defined locally for Nitro codegen (IAPKit-specific, not in GQL schema)
export type IapkitPurchaseState =
  | 'entitled'
  | 'pending-acknowledgment'
  | 'pending'
  | 'canceled'
  | 'expired'
  | 'ready-to-consume'
  | 'consumed'
  | 'unknown'
  | 'inauthentic';

// Store identifier for purchase origin
// Defined locally for Nitro codegen (not in GQL schema)
export type IapStore = 'unknown' | 'apple' | 'google' | 'horizon';

// Purchase verification provider selection
// Defined locally for Nitro codegen (not in GQL schema)
export type PurchaseVerificationProvider = 'iapkit' | 'none';

// Billing Programs API (Android)
// GQL type exists but defined locally for Nitro codegen consistency
// Android 8.2.0+, 8.3.0+ for external-payments, 7.0+ for user-choice-billing
export type BillingProgramAndroid =
  | 'unspecified'
  | 'external-content-link'
  | 'external-offer'
  | 'external-payments'
  | 'user-choice-billing';

// Developer Billing Launch Mode (Android 8.3.0+)
// Defined locally for Nitro codegen
export type DeveloperBillingLaunchModeAndroid =
  | 'unspecified'
  | 'launch-in-external-browser-or-app'
  | 'caller-will-launch-link';

// External Link Launch Mode (Android 8.2.0+)
// Defined locally for Nitro codegen
export type ExternalLinkLaunchModeAndroid =
  | 'unspecified'
  | 'launch-in-external-browser-or-app'
  | 'caller-will-launch-link';

// External Link Type (Android 8.2.0+)
// Defined locally for Nitro codegen
export type ExternalLinkTypeAndroid =
  | 'unspecified'
  | 'link-to-digital-content-offer'
  | 'link-to-app-download';

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║                                  PARAMS                                  ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// Receipt validation parameters (platform-specific)

export interface NitroReceiptValidationAppleOptions {
  sku: VerifyPurchaseAppleOptions['sku'];
}

export interface NitroReceiptValidationGoogleOptions {
  accessToken: VerifyPurchaseGoogleOptions['accessToken'];
  isSub?: VerifyPurchaseGoogleOptions['isSub'];
  packageName: VerifyPurchaseGoogleOptions['packageName'];
  purchaseToken: VerifyPurchaseGoogleOptions['purchaseToken'];
  sku: VerifyPurchaseGoogleOptions['sku'];
}

export interface NitroReceiptValidationHorizonOptions {
  accessToken: VerifyPurchaseHorizonOptions['accessToken'];
  sku: VerifyPurchaseHorizonOptions['sku'];
  userId: VerifyPurchaseHorizonOptions['userId'];
}

export interface NitroReceiptValidationParams {
  apple?: NitroReceiptValidationAppleOptions | null;
  google?: NitroReceiptValidationGoogleOptions | null;
  horizon?: NitroReceiptValidationHorizonOptions | null;
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
  /**
   * Advanced commerce data for StoreKit 2's Product.PurchaseOption.custom API.
   * Used to pass attribution data (campaign tokens, affiliate IDs) during purchases.
   * Data is formatted as JSON: {"signatureInfo": {"token": "<value>"}}
   * @platform iOS
   */
  advancedCommerceData?: RequestPurchaseIosProps['advancedCommerceData'];
  /**
   * Override introductory offer eligibility (iOS 15+, WWDC 2025).
   * Set to true to indicate the user is eligible for introductory offer,
   * or false to indicate they are not. When nil, the system determines eligibility.
   * Back-deployed to iOS 15.
   * @platform iOS
   */
  introductoryOfferEligibility?: boolean | null;
  /**
   * JWS promotional offer (iOS 15+, WWDC 2025).
   * New signature format using compact JWS string for promotional offers.
   * Back-deployed to iOS 15.
   * @platform iOS
   */
  promotionalOfferJWS?: PromotionalOfferJwsInputIOS | null;
  /**
   * Win-back offer to apply (iOS 18+).
   * Used to re-engage churned subscribers with a discount or free trial.
   * @platform iOS
   */
  winBackOffer?: WinBackOfferInputIOS | null;
}

export interface NitroRequestPurchaseAndroid {
  skus: RequestSubscriptionAndroidProps['skus'];
  obfuscatedAccountId?: RequestSubscriptionAndroidProps['obfuscatedAccountId'];
  obfuscatedProfileId?: RequestSubscriptionAndroidProps['obfuscatedProfileId'];
  isOfferPersonalized?: RequestSubscriptionAndroidProps['isOfferPersonalized'];
  /**
   * Offer token for one-time purchase discounts (7.0+).
   * Pass the offerToken from oneTimePurchaseOfferDetailsAndroid or discountOffers
   * to apply a discount offer to the purchase.
   */
  offerToken?: string | null;
  subscriptionOffers?: AndroidSubscriptionOfferInput[] | null;
  /** @deprecated Use subscriptionProductReplacementParams instead for item-level replacement (8.1.0+) */
  replacementMode?: RequestSubscriptionAndroidProps['replacementMode'];
  purchaseToken?: RequestSubscriptionAndroidProps['purchaseToken'];
  /**
   * Product-level replacement parameters (8.1.0+)
   * Use this instead of replacementMode for item-level replacement
   */
  subscriptionProductReplacementParams?: SubscriptionProductReplacementParamsAndroid | null;
}

export interface NitroPurchaseRequest {
  /** @deprecated Use apple instead */
  ios?: NitroRequestPurchaseIos | null;
  /** @deprecated Use google instead */
  android?: NitroRequestPurchaseAndroid | null;
  /** Apple-specific purchase parameters */
  apple?: NitroRequestPurchaseIos | null;
  /** Google-specific purchase parameters */
  google?: NitroRequestPurchaseAndroid | null;
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
  /**
   * Include suspended subscriptions in the result (Android 8.1+).
   * Suspended subscriptions have isSuspendedAndroid=true and should NOT be granted entitlements.
   * Users should be directed to the subscription center to resolve payment issues.
   * Default: false (only active subscriptions are returned)
   */
  includeSuspended?: boolean | null;
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

/**
 * Parameters for launching an external link (Android 8.2.0+)
 */
export interface NitroLaunchExternalLinkParamsAndroid {
  /** The billing program (external-content-link or external-offer) */
  billingProgram: BillingProgramAndroid;
  /** The external link launch mode */
  launchMode: ExternalLinkLaunchModeAndroid;
  /** The type of the external link */
  linkType: ExternalLinkTypeAndroid;
  /** The URI where the content will be accessed from */
  linkUri: string;
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
  autoRenewing: VerifyPurchaseResultAndroid['autoRenewing'];
  betaProduct: VerifyPurchaseResultAndroid['betaProduct'];
  cancelDate: VerifyPurchaseResultAndroid['cancelDate'];
  cancelReason: VerifyPurchaseResultAndroid['cancelReason'];
  deferredDate: VerifyPurchaseResultAndroid['deferredDate'];
  deferredSku: VerifyPurchaseResultAndroid['deferredSku'];
  freeTrialEndDate: VerifyPurchaseResultAndroid['freeTrialEndDate'];
  gracePeriodEndDate: VerifyPurchaseResultAndroid['gracePeriodEndDate'];
  parentProductId: VerifyPurchaseResultAndroid['parentProductId'];
  productId: VerifyPurchaseResultAndroid['productId'];
  productType: VerifyPurchaseResultAndroid['productType'];
  purchaseDate: VerifyPurchaseResultAndroid['purchaseDate'];
  quantity: VerifyPurchaseResultAndroid['quantity'];
  receiptId: VerifyPurchaseResultAndroid['receiptId'];
  renewalDate: VerifyPurchaseResultAndroid['renewalDate'];
  term: VerifyPurchaseResultAndroid['term'];
  termSku: VerifyPurchaseResultAndroid['termSku'];
  testTransaction: VerifyPurchaseResultAndroid['testTransaction'];
}

// VerifyPurchaseWithProvider types

export interface NitroVerifyPurchaseWithIapkitAppleProps {
  /** The JWS token returned with the purchase response. */
  jws: string;
}

export interface NitroVerifyPurchaseWithIapkitGoogleProps {
  /** The token provided to the user's device when the product or subscription was purchased. */
  purchaseToken: string;
}

export interface NitroVerifyPurchaseWithIapkitProps {
  apiKey?: string | null;
  apple?: NitroVerifyPurchaseWithIapkitAppleProps | null;
  google?: NitroVerifyPurchaseWithIapkitGoogleProps | null;
}

export interface NitroVerifyPurchaseWithProviderProps {
  iapkit?: NitroVerifyPurchaseWithIapkitProps | null;
  provider: PurchaseVerificationProvider;
}

export interface NitroVerifyPurchaseWithIapkitResult {
  isValid: boolean;
  state: IapkitPurchaseState;
  store: IapStore;
}

export interface NitroVerifyPurchaseWithProviderError {
  code?: string | null;
  message: string;
}

export interface NitroVerifyPurchaseWithProviderResult {
  iapkit?: NitroVerifyPurchaseWithIapkitResult | null;
  errors?: NitroVerifyPurchaseWithProviderError[] | null;
  provider: PurchaseVerificationProvider;
}

/**
 * Result of checking billing program availability (Android 8.2.0+)
 */
export interface NitroBillingProgramAvailabilityResultAndroid {
  /** The billing program that was checked */
  billingProgram: BillingProgramAndroid;
  /** Whether the billing program is available for the user */
  isAvailable: boolean;
}

/**
 * Reporting details for external transactions (Android 8.2.0+)
 */
export interface NitroBillingProgramReportingDetailsAndroid {
  /** The billing program that the reporting details are associated with */
  billingProgram: BillingProgramAndroid;
  /** External transaction token used to report transactions to Google */
  externalTransactionToken: string;
}

/**
 * Details provided when user selects developer billing option (Android 8.3.0+)
 * Received via DeveloperProvidedBillingListener callback in External Payments flow
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
 */
export interface NitroDiscountAmountAndroid {
  discountAmountMicros: string;
  formattedDiscountAmount: string;
}

/**
 * Discount display information for one-time purchase offers (Android)
 */
export interface NitroDiscountDisplayInfoAndroid {
  discountAmount?: NitroDiscountAmountAndroid | null;
  percentageDiscount?: number | null;
}

/**
 * Limited quantity information for one-time purchase offers (Android)
 */
export interface NitroLimitedQuantityInfoAndroid {
  maximumQuantity: number;
  remainingQuantity: number;
}

/**
 * Pre-order details for one-time purchase products (Android)
 */
export interface NitroPreorderDetailsAndroid {
  preorderPresaleEndTimeMillis: string;
  preorderReleaseTimeMillis: string;
}

/**
 * Rental details for one-time purchase products (Android)
 */
export interface NitroRentalDetailsAndroid {
  rentalExpirationPeriod?: string | null;
  rentalPeriod: string;
}

/**
 * Valid time window for when an offer is available (Android)
 */
export interface NitroValidTimeWindowAndroid {
  endTimeMillis: string;
  startTimeMillis: string;
}

/**
 * Android one-time purchase offer details
 * Available in Google Play Billing Library 7.0+
 */
export interface NitroOneTimePurchaseOfferDetail {
  discountDisplayInfo?: NitroDiscountDisplayInfoAndroid | null;
  formattedPrice: string;
  fullPriceMicros?: string | null;
  limitedQuantityInfo?: NitroLimitedQuantityInfoAndroid | null;
  offerId?: string | null;
  offerTags: string[];
  offerToken: string;
  preorderDetailsAndroid?: NitroPreorderDetailsAndroid | null;
  priceAmountMicros: string;
  priceCurrencyCode: string;
  rentalDetailsAndroid?: NitroRentalDetailsAndroid | null;
  validTimeWindow?: NitroValidTimeWindowAndroid | null;
}

export interface NitroPurchase {
  id: PurchaseCommon['id'];
  productId: PurchaseCommon['productId'];
  transactionDate: PurchaseCommon['transactionDate'];
  purchaseToken?: PurchaseCommon['purchaseToken'];
  /** @deprecated Use store instead */
  platform: IapPlatform;
  /** Store where purchase was made */
  store: IapStore;
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
  isSuspendedAndroid?: boolean | null;
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
  platform: IapPlatform;
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
  // Cross-platform standardized offer fields (JSON serialized)
  /** Standardized subscription offers (JSON string) - cross-platform */
  subscriptionOffers?: string | null;
  /** Standardized discount offers for one-time purchases (JSON string) - cross-platform */
  discountOffers?: string | null;
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
  oneTimePurchaseOfferDetailsAndroid?: NitroOneTimePurchaseOfferDetail[] | null;
  /**
   * Product-level status code indicating fetch result (Android 8.0+)
   * OK = product fetched successfully
   * NOT_FOUND = SKU doesn't exist
   * NO_OFFERS_AVAILABLE = user not eligible for any offers
   * Available in Google Play Billing Library 8.0.0+
   */
  productStatusAndroid?: string | null;
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
   * Check if there are any active subscriptions
   * @param subscriptionIds - Optional array of subscription IDs to filter
   * @returns Promise<boolean> - True if there are active subscriptions
   */
  hasActiveSubscriptions(subscriptionIds?: string[]): Promise<boolean>;

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
   * @deprecated Use `verifyPurchase` instead. This function will be removed in a future version.
   * @param params - Receipt validation parameters including SKU and platform-specific options
   * @returns Promise<NitroReceiptValidationResultIOS | NitroReceiptValidationResultAndroid> - Platform-specific validation result
   */
  validateReceipt(
    params: NitroReceiptValidationParams,
  ): Promise<
    NitroReceiptValidationResultIOS | NitroReceiptValidationResultAndroid
  >;

  /**
   * Verify purchase with a specific provider (e.g., IAPKit)
   *
   * This function allows you to verify purchases using external verification
   * services like IAPKit, which provide additional validation and security.
   *
   * @param params - Verification options including provider and credentials
   * @returns Promise<NitroVerifyPurchaseWithProviderResult> - Provider-specific verification result
   */
  verifyPurchaseWithProvider(
    params: NitroVerifyPurchaseWithProviderProps,
  ): Promise<NitroVerifyPurchaseWithProviderResult>;

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

  /**
   * Add a listener for developer provided billing events (Android 8.3.0+ only).
   * Fires when a user selects developer billing in the External Payments flow.
   *
   * External Payments is part of Google Play Billing Library 8.3.0+ and allows
   * showing a side-by-side choice between Google Play Billing and developer's
   * external payment option directly in the purchase flow. (Japan only)
   *
   * @param listener - Function to call when user chooses developer billing
   * @platform Android
   * @since Billing Library 8.3.0+
   */
  addDeveloperProvidedBillingListenerAndroid(
    listener: (details: DeveloperProvidedBillingDetailsAndroid) => void,
  ): void;

  /**
   * Remove a developer provided billing listener (Android only).
   *
   * @param listener - Function to remove from listeners
   * @platform Android
   * @since Billing Library 8.3.0+
   */
  removeDeveloperProvidedBillingListenerAndroid(
    listener: (details: DeveloperProvidedBillingDetailsAndroid) => void,
  ): void;

  // ╔════════════════════════════════════════════════════════════════════════╗
  // ║                 BILLING PROGRAMS API (Android 8.2.0+)                  ║
  // ╚════════════════════════════════════════════════════════════════════════╝

  /**
   * Enable a billing program before initConnection (Android only).
   * Must be called BEFORE initConnection() to configure the BillingClient.
   *
   * @param program - The billing program to enable
   * @platform Android
   * @since Billing Library 8.2.0+
   */
  enableBillingProgramAndroid(program: BillingProgramAndroid): void;

  /**
   * Check if a billing program is available for this user/device (Android only).
   *
   * @param program - The billing program to check
   * @returns Promise with availability result
   * @platform Android
   * @since Billing Library 8.2.0+
   */
  isBillingProgramAvailableAndroid(
    program: BillingProgramAndroid,
  ): Promise<NitroBillingProgramAvailabilityResultAndroid>;

  /**
   * Create billing program reporting details for external transactions (Android only).
   * Used to get the external transaction token needed for reporting to Google.
   *
   * @param program - The billing program to create reporting details for
   * @returns Promise with reporting details including external transaction token
   * @platform Android
   * @since Billing Library 8.2.0+
   */
  createBillingProgramReportingDetailsAndroid(
    program: BillingProgramAndroid,
  ): Promise<NitroBillingProgramReportingDetailsAndroid>;

  /**
   * Launch external link for external offers or app download (Android only).
   *
   * @param params - Parameters for launching the external link
   * @returns Promise<boolean> - true if user accepted, false otherwise
   * @platform Android
   * @since Billing Library 8.2.0+
   */
  launchExternalLinkAndroid(
    params: NitroLaunchExternalLinkParamsAndroid,
  ): Promise<boolean>;

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

  // ╔════════════════════════════════════════════════════════════════════════╗
  // ║            EXTERNAL PURCHASE CUSTOM LINK (iOS 18.1+)                   ║
  // ╚════════════════════════════════════════════════════════════════════════╝

  /**
   * Check if app is eligible for ExternalPurchaseCustomLink API (iOS 18.1+).
   * Returns true if the app can use custom external purchase links.
   *
   * @returns Promise<boolean> - true if eligible
   * @platform iOS
   * @see https://developer.apple.com/documentation/storekit/externalpurchasecustomlink/iseligible
   */
  isEligibleForExternalPurchaseCustomLinkIOS(): Promise<boolean>;

  /**
   * Get external purchase token for reporting to Apple (iOS 18.1+).
   * Use this token with Apple's External Purchase Server API to report transactions.
   *
   * @param tokenType - Token type: 'acquisition' (new customers) or 'services' (existing customers)
   * @returns Promise<ExternalPurchaseCustomLinkTokenResultIOS> - Result with token string or error
   * @platform iOS
   * @see https://developer.apple.com/documentation/storekit/externalpurchasecustomlink/token(for:)
   */
  getExternalPurchaseCustomLinkTokenIOS(
    tokenType: ExternalPurchaseCustomLinkTokenTypeIOS,
  ): Promise<ExternalPurchaseCustomLinkTokenResultIOS>;

  /**
   * Show ExternalPurchaseCustomLink notice sheet (iOS 18.1+).
   * Displays the system disclosure notice sheet for custom external purchase links.
   * Call this after a deliberate customer interaction before linking out to external purchases.
   *
   * @param noticeType - Notice type: 'browser' (external purchases displayed in browser)
   * @returns Promise<ExternalPurchaseCustomLinkNoticeResultIOS> - Result with continued status and error if any
   * @platform iOS
   * @see https://developer.apple.com/documentation/storekit/externalpurchasecustomlink/shownotice(type:)
   */
  showExternalPurchaseCustomLinkNoticeIOS(
    noticeType: ExternalPurchaseCustomLinkNoticeTypeIOS,
  ): Promise<ExternalPurchaseCustomLinkNoticeResultIOS>;
}
