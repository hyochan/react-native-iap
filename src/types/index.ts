import type {
  AmazonModuleProps,
  AndroidModuleProps,
  IosModuleProps,
} from '../modules';
import type {IosModulePropsSk2} from '../modules/iosSk2';

import type * as Apple from './apple';

export type Sku = string;

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
  productIds?: string[];
  title: string;
  description: string;
  price: string;
  currency: string;
  localizedPrice: string;
  originalPrice?: string;
  countryCode?: string;
}

export interface ProductPurchase {
  productId: string;
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
}

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

declare module 'react-native' {
  interface NativeModulesStatic {
    RNIapIos: IosModuleProps;
    RNIapIosSk2: IosModulePropsSk2;
    RNIapModule: AndroidModuleProps;
    RNIapAmazonModule: AmazonModuleProps;
  }
}
