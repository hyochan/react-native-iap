import type {
  AmazonModuleProps,
  AndroidModuleProps,
  IosModuleProps,
} from '../modules';
import type {IosModulePropsSk2} from '../modules/iosSk2';

import type * as Apple from './apple';

export type Sku = string;

// Platform discrimination types
export type IosPlatform = {platform: 'ios'};
export type AndroidPlatform = {platform: 'android'};
export type AmazonPlatform = {platform: 'amazon'};

export type ProrationModesAmazon = '' | 'DEFERRED' | 'IMMEDIATE';

export enum ReplacementModesAndroid {
  UNKNOWN_REPLACEMENT_MODE = 0,
  WITH_TIME_PRORATION = 1,
  CHARGE_PRORATED_PRICE = 2,
  WITHOUT_PRORATION = 3,
  CHARGE_FULL_PRICE = 5,
  DEFERRED = 6,
}

export enum PurchaseStateAndroid {
  UNSPECIFIED_STATE = 0,
  PURCHASED = 1,
  PENDING = 2,
}

export const PROMOTED_PRODUCT = 'iap-promoted-product';

export enum InstallSourceAndroid {
  NOT_SET = 0,
  GOOGLE_PLAY = 1,
  AMAZON = 2,
}

export enum ProductType {
  /** Subscription */
  subs = 'subs',

  /** Subscription */
  sub = 'sub',

  /** Consumable */
  inapp = 'inapp',

  /** Consumable */
  iap = 'iap',
}

export enum TransactionReason {
  PURCHASE = 'PURCHASE',
  RENEWAL = 'RENEWAL',
}

export interface ProductCommon {
  type: 'subs' | 'sub' | 'inapp' | 'iap';
  productId: string; //iOS
  id?: string; // Alias for productId (expo-iap compatibility)
  productIds?: string[];
  title: string;
  description: string;
  price: string;
  currency: string;
  localizedPrice: string;
  displayPrice?: string; // Alias for localizedPrice (expo-iap compatibility)
  originalPrice?: string;
  countryCode?: string;
}

export interface ProductPurchase {
  productId: string;
  id?: string; // Alias for productId (expo-iap compatibility)
  ids?: string[]; // For Android multi-purchase support
  transactionId?: string;
  transactionDate: number;
  transactionReceipt: string;
  purchaseToken?: string;
  //iOS
  quantityIOS?: number;
  originalTransactionDateIOS?: number;
  originalTransactionIdentifierIOS?: string;
  verificationResultIOS?: string;
  appAccountToken?: string;
  appTransactionID?: string;
  jwsRepresentationIos?: string;
  environmentIos?: string; // iOS 16+
  storefrontCountryCodeIos?: string; // iOS 17+
  reasonIos?: string; // iOS 17+
  offerIos?: {
    // iOS 17.2+
    id: string;
    type: string;
    paymentMode: string;
  };
  priceIos?: number; // iOS 15.4+
  currencyIos?: string; // iOS 15.4+
  // Additional iOS fields from expo-iap
  expirationDateIos?: number;
  webOrderLineItemIdIos?: number;
  appBundleIdIos?: string;
  productTypeIos?: string;
  subscriptionGroupIdIos?: string;
  isUpgradedIos?: boolean;
  ownershipTypeIos?: string;
  reasonStringRepresentationIos?: string;
  transactionReasonIOS?: TransactionReason | string;
  revocationDateIos?: number;
  revocationReasonIos?: string;
  //Android
  productIds?: string[];
  dataAndroid?: string;
  signatureAndroid?: string;
  autoRenewingAndroid?: boolean;
  purchaseStateAndroid?: PurchaseStateAndroid;
  isAcknowledgedAndroid?: boolean;
  packageNameAndroid?: string;
  developerPayloadAndroid?: string;
  obfuscatedAccountIdAndroid?: string;
  obfuscatedProfileIdAndroid?: string;
  //Amazon
  userIdAmazon?: string;
  userMarketplaceAmazon?: string;
  userJsonAmazon?: string;
  isCanceledAmazon?: boolean;
}

export interface PurchaseResult {
  responseCode?: number;
  debugMessage?: string;
  code?: string;
  message?: string;
  purchaseToken?: string;
}

export interface SubscriptionPurchase extends ProductPurchase {
  autoRenewingAndroid?: boolean;
  originalTransactionDateIOS?: number;
  originalTransactionIdentifierIOS?: string;
  verificationResultIOS?: string;
  transactionReasonIOS?: TransactionReason | string;
}

// New discriminated union type matching expo-iap
export type PurchaseWithPlatform =
  | ((ProductPurchase & {productIds?: string[]}) & AndroidPlatform)
  | ((ProductPurchase & {quantityIOS?: number}) & IosPlatform)
  | ((ProductPurchase & {userIdAmazon?: string}) & AmazonPlatform)
  | SubscriptionPurchase;

// For backward compatibility, keep the original Purchase type
export type Purchase = ProductPurchase | SubscriptionPurchase;

export interface Discount {
  identifier: string;
  type: string;
  numberOfPeriods: string;
  price: string;
  localizedPrice: string;
  paymentMode: '' | 'FREETRIAL' | 'PAYASYOUGO' | 'PAYUPFRONT';
  subscriptionPeriod: string;
}

export interface ProductAndroid extends ProductCommon {
  type: 'inapp' | 'iap';
  name?: string;
  oneTimePurchaseOfferDetails?: {
    priceCurrencyCode: string;
    formattedPrice: string;
    priceAmountMicros: string;
  };
}
export interface ProductIOS extends ProductCommon {
  type: 'inapp' | 'iap';
  // iOS specific fields from expo-iap
  displayName?: string;
  isFamilyShareable?: boolean;
  jsonRepresentation?: string;
  subscription?: any; // SubscriptionInfo type
}

// Legacy type for backward compatibility
export type ProductLegacy = ProductAndroid & ProductIOS;

// New discriminated union type matching expo-iap
export type ProductWithPlatform =
  | (ProductAndroid & AndroidPlatform)
  | (ProductIOS & IosPlatform);

// For backward compatibility, keep the original Product type
export type Product = ProductAndroid & ProductIOS;

/**
 * Can be used to distinguish the different platforms' subscription information
 */
export enum SubscriptionPlatform {
  android = 'android',
  amazon = 'amazon',
  ios = 'ios',
}

/** Android Billing v5 type */
export interface SubscriptionAndroid {
  platform: SubscriptionPlatform.android;
  productType: 'subs';
  name: string;
  title: string;
  description: string;
  productId: string;
  subscriptionOfferDetails: SubscriptionOfferAndroid[];
}

export interface SubscriptionOfferAndroid {
  basePlanId: string;
  offerId: string | null;
  offerToken: string;
  pricingPhases: {
    pricingPhaseList: PricingPhaseAndroid[];
  };
  offerTags: string[];
}

export interface PricingPhaseAndroid {
  formattedPrice: string;
  priceCurrencyCode: string;
  /**
   * P1W, P1M, P1Y
   */
  billingPeriod: string;
  billingCycleCount: number;
  priceAmountMicros: string;
  recurrenceMode: number;
}

/**
 * TODO: As of 2022-10-10, this typing is not verified against the real
 * Amazon API. Please update this if you have a more accurate type.
 */
export interface SubscriptionAmazon extends ProductCommon {
  platform: SubscriptionPlatform.amazon;
  type: 'subs';

  productType?: string;
  name?: string;
}

export type SubscriptionIosPeriod = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | '';
export interface SubscriptionIOS extends ProductCommon {
  platform: SubscriptionPlatform.ios;
  type: 'subs';
  discounts?: Discount[];
  introductoryPrice?: string;
  introductoryPriceAsAmountIOS?: string;
  introductoryPricePaymentModeIOS?:
    | ''
    | 'FREETRIAL'
    | 'PAYASYOUGO'
    | 'PAYUPFRONT';
  introductoryPriceNumberOfPeriodsIOS?: string;
  introductoryPriceSubscriptionPeriodIOS?: SubscriptionIosPeriod;

  subscriptionPeriodNumberIOS?: string;
  subscriptionPeriodUnitIOS?: SubscriptionIosPeriod;
}

export type Subscription =
  | SubscriptionAndroid
  | SubscriptionAmazon
  | SubscriptionIOS;

export interface RequestPurchaseBaseAndroid {
  obfuscatedAccountIdAndroid?: string;
  obfuscatedProfileIdAndroid?: string;
  isOfferPersonalized?: boolean; // For AndroidBilling V5 https://developer.android.com/google/play/billing/integrate#personalized-price
}

export interface RequestPurchaseAndroid extends RequestPurchaseBaseAndroid {
  skus: Sku[];
}

export interface RequestPurchaseIOS {
  sku: Sku;
  andDangerouslyFinishTransactionAutomaticallyIOS?: boolean;
  /**
   * UUID representing user account
   */
  appAccountToken?: string;
  quantity?: number;
  withOffer?: Apple.PaymentDiscount;
}

/** As of 2022-10-12, we only use the `sku` field for Amazon purchases */
export type RequestPurchaseAmazon = RequestPurchaseIOS;

export type RequestPurchase =
  | RequestPurchaseAndroid
  | RequestPurchaseAmazon
  | RequestPurchaseIOS;

/**
 * In order to purchase a new subscription, every sku must have a selected offerToken
 * @see SubscriptionAndroid.subscriptionOfferDetails.offerToken
 */
export interface SubscriptionOffer {
  sku: Sku;
  offerToken: string;
}

export interface RequestSubscriptionAndroid extends RequestPurchaseBaseAndroid {
  purchaseTokenAndroid?: string;
  replacementModeAndroid?: ReplacementModesAndroid;
  subscriptionOffers: SubscriptionOffer[];
}

export type RequestSubscriptionIOS = RequestPurchaseIOS;

/** As of 2022-10-12, we only use the `sku` field for Amazon subscriptions */
export interface RequestSubscriptionAmazon extends RequestSubscriptionIOS {
  prorationModeAmazon?: ProrationModesAmazon;
}

export type RequestSubscription =
  | RequestSubscriptionAndroid
  | RequestSubscriptionAmazon
  | RequestSubscriptionIOS;

// Unified request types (expo-iap compatibility)
export interface UnifiedRequestPurchaseProps {
  // Universal properties - works on both platforms
  readonly sku?: string; // Single SKU (iOS native, Android fallback)
  readonly skus?: string[]; // Multiple SKUs (Android native, iOS uses first item)

  // iOS-specific properties (ignored on Android)
  readonly andDangerouslyFinishTransactionAutomaticallyIOS?: boolean;
  readonly appAccountToken?: string;
  readonly quantity?: number;
  readonly withOffer?: Apple.PaymentDiscount;

  // Android-specific properties (ignored on iOS)
  readonly obfuscatedAccountIdAndroid?: string;
  readonly obfuscatedProfileIdAndroid?: string;
  readonly isOfferPersonalized?: boolean;
}

export interface UnifiedRequestSubscriptionProps
  extends UnifiedRequestPurchaseProps {
  // Android subscription-specific properties
  readonly purchaseTokenAndroid?: string;
  readonly replacementModeAndroid?: number;
  readonly subscriptionOffers?: {
    sku: string;
    offerToken: string;
  }[];
}

declare module 'react-native' {
  interface NativeModulesStatic {
    RNIapIos: IosModuleProps;
    RNIapIosSk2: IosModulePropsSk2;
    RNIapModule: AndroidModuleProps;
    RNIapAmazonModule: AmazonModuleProps;
  }
}
