/**
 * Main types file that combines all platform-specific and common types
 * This file maintains compatibility with expo-iap types
 */

// ============================================================================
// Base Types
// ============================================================================

export type ProductType = 'inapp' | 'subs';
export type DevicePlatform = 'ios' | 'android';

export type IosPlatform = { platform: 'ios' };
export type AndroidPlatform = { platform: 'android' };

// ============================================================================
// Error Types (from Iap.types.ts)
// ============================================================================

export enum ErrorCode {
  E_UNKNOWN = 'E_UNKNOWN',
  E_USER_CANCELLED = 'E_USER_CANCELLED',
  E_DEVELOPER_ERROR = 'E_DEVELOPER_ERROR',
  E_ITEM_UNAVAILABLE = 'E_ITEM_UNAVAILABLE',
  E_REMOTE_ERROR = 'E_REMOTE_ERROR',
  E_NETWORK_ERROR = 'E_NETWORK_ERROR',
  E_SERVICE_ERROR = 'E_SERVICE_ERROR',
  E_RECEIPT_FAILED = 'E_RECEIPT_FAILED',
  E_RECEIPT_FINISHED_FAILED = 'E_RECEIPT_FINISHED_FAILED',
  E_NOT_PREPARED = 'E_NOT_PREPARED',
  E_NOT_ENDED = 'E_NOT_ENDED',
  E_ALREADY_OWNED = 'E_ALREADY_OWNED',
  E_DEFERRED_PAYMENT = 'E_DEFERRED_PAYMENT',
  E_TRANSACTION_VALIDATION_FAILED = 'E_TRANSACTION_VALIDATION_FAILED',
  E_PENDING = 'E_PENDING',
  E_INTERRUPTED = 'E_INTERRUPTED',
  E_IAP_NOT_AVAILABLE = 'E_IAP_NOT_AVAILABLE',
}

export interface PurchaseError {
  code: string;
  message: string;
  productId?: string;
}

// ============================================================================
// Receipt Types
// ============================================================================

export interface ReceiptAndroid {
  startTimeMillis?: number;
  expiryTimeMillis?: number;
  autoRenewing?: boolean;
  priceCurrencyCode?: string;
  priceAmountMicros?: number;
  countryCode?: string;
  developerPayload?: string;
  orderId?: string;
  purchaseType?: number;
  acknowledgementState?: number;
  kind?: string;
}

// ============================================================================
// iOS Types (Extended)
// ============================================================================

export type SubscriptionIosPeriod = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | '';
export type PaymentMode = '' | 'FREETRIAL' | 'PAYASYOUGO' | 'PAYUPFRONT';

export interface SubscriptionInfoIos {
  readonly introductoryOffer?: SubscriptionOfferIos;
  readonly promotionalOffers?: SubscriptionOfferIos[];
  readonly subscriptionGroupID: string;
  readonly subscriptionPeriod: SubscriptionIosPeriod;
}

export interface SubscriptionOfferIos {
  readonly displayPrice: string;
  readonly id: string;
  readonly paymentMode: PaymentMode;
  readonly period: SubscriptionIosPeriod;
  readonly periodCount: number;
  readonly price: number;
  readonly type: 'introductory' | 'promotional';
}

export interface DiscountIos {
  readonly identifier: string;
  readonly type: string;
  readonly numberOfPeriods: string;
  readonly price: string;
  readonly localizedPrice: string;
  readonly paymentMode: PaymentMode;
  readonly subscriptionPeriod: string;
}

export interface RenewalInfoIos {
  readonly jsonRepresentation?: string;
  readonly willAutoRenew: boolean;
  readonly autoRenewPreference?: string;
}

export interface TransactionInfoIos {
  readonly jsonRepresentation?: string;
  readonly transactionId: string;
  readonly productId: string;
  readonly purchaseDate: number;
  readonly quantity: number;
  readonly storefront: string;
  readonly storefrontId: string;
  readonly transactionReason: string;
  readonly environment: string;
  readonly originalTransactionId?: string;
  readonly expiresDate?: number;
  readonly originalPurchaseDate?: number;
  readonly isUpgraded?: boolean;
  readonly offerType?: string;
  readonly offerIdentifier?: string;
  readonly revocationDate?: number;
  readonly revocationReason?: string;
  readonly appAccountToken?: string;
  readonly webOrderLineItemId?: string;
  readonly type?:
    | 'Auto-Renewable Subscription'
    | 'Non-Consumable'
    | 'Consumable'
    | 'Non-Renewing Subscription';
  readonly subscriptionGroupIdentifier?: string;
  readonly price?: number;
  readonly currency?: string;
}

export interface ProductPurchaseIos {
  readonly id: string;
  readonly productId: string; // The product ID that was purchased
  readonly transactionId?: string;
  readonly transactionDate: number;
  readonly transactionReceipt: string;
  readonly originalTransactionDate?: string;
  readonly originalTransactionIdentifier?: string;
  readonly verificationResultIOS?: string;
  readonly transactionInfoJsonRepresentation?: string;
  readonly appAccountToken?: string;
  readonly renewalInfo?: RenewalInfoIos;
  readonly transactionInfo?: TransactionInfoIos;
}

export interface AppTransactionIOS {
  appTransactionId?: string; // Only available in iOS 18.4+
  originalPlatform?: string; // Only available in iOS 18.4+
  bundleId: string;
  appVersion: string;
  originalAppVersion: string;
  originalPurchaseDate: string;
  deviceVerification: string;
  deviceVerificationNonce: string;
  signedDate: string;
}

// ============================================================================
// Android Types (Extended)
// ============================================================================

export interface OneTimePurchaseOfferDetailsAndroid {
  readonly priceCurrencyCode: string;
  readonly formattedPrice: string;
  readonly priceAmountMicros: string;
}

export interface PricingPhasesAndroid {
  readonly pricingPhaseList: import('./IapAndroid.types').PricingPhaseAndroid[];
}

export interface SubscriptionOfferDetailAndroid {
  readonly basePlanId: string;
  readonly offerId: string;
  readonly offerToken: string;
  readonly offerTags: string[];
  readonly pricingPhases: PricingPhasesAndroid;
}

// ============================================================================
// Unified Types
// ============================================================================

import type {
  ProductPurchaseAndroid,
  SubscriptionProductAndroid,
  ProductAndroid,
} from './IapAndroid.types';
import type { ProductIOS, SubscriptionProductIOS } from './IapIos.types';

// Extend Android purchase type for cross-platform unions
export type ProductPurchaseAndroidExtended = ProductPurchaseAndroid & {
  readonly id: string;
  readonly productId: string; // The product ID that was purchased
  readonly transactionId?: string;
  readonly transactionDate: number;
  readonly transactionReceipt: string;
  readonly productIds?: string[];
  // Keep these optional to remain compatible with the base type.
  readonly purchaseToken?: string;
  readonly dataAndroid?: string;
  readonly packageNameAndroid?: string;
  readonly developerPayloadAndroid?: string;
  readonly accountIdentifiersAndroid?: {
    obfuscatedAccountId?: string;
    obfuscatedProfileId?: string;
  };
  readonly receipt?: ReceiptAndroid;
};

export type Product =
  | (ProductAndroid & AndroidPlatform)
  | (ProductIOS & IosPlatform);

export type SubscriptionProduct =
  | (SubscriptionProductAndroid & AndroidPlatform)
  | (SubscriptionProductIOS & IosPlatform);

// Union type for platform-specific purchase types
export type Purchase =
  | (ProductPurchaseAndroidExtended & AndroidPlatform)
  | (ProductPurchaseIos & IosPlatform);

// Union type for platform-specific subscription purchase types
export type SubscriptionPurchase =
  | (ProductPurchaseAndroidExtended &
      AndroidPlatform & { autoRenewingAndroid: boolean })
  | (ProductPurchaseIos & IosPlatform);

export type ProductPurchase = Purchase;

export type PurchaseResult =
  | ProductPurchase
  | SubscriptionPurchase
  | null
  | void;

// ============================================================================
// Request Types (from RequestTypes.ts)
// ============================================================================

/**
 * iOS-specific purchase request parameters
 */
export interface RequestPurchaseIosProps {
  readonly sku: string;
  readonly andDangerouslyFinishTransactionAutomatically?: boolean;
  readonly andDangerouslyFinishTransactionAutomaticallyIOS?: boolean; // Legacy alias
  readonly appAccountToken?: string;
  readonly quantity?: number;
  readonly withOffer?: any; // PaymentDiscount type
}

/**
 * Android-specific purchase request parameters
 */
export interface RequestPurchaseAndroidProps {
  readonly skus: string[];
  readonly obfuscatedAccountIdAndroid?: string;
  readonly obfuscatedProfileIdAndroid?: string;
  readonly isOfferPersonalized?: boolean;
}

/**
 * Android-specific subscription request parameters
 */
export interface RequestSubscriptionAndroidProps
  extends RequestPurchaseAndroidProps {
  readonly purchaseTokenAndroid?: string;
  readonly purchaseToken?: string; // Alias for compatibility
  readonly replacementModeAndroid?: number;
  readonly subscriptionOffers?: {
    sku: string;
    offerToken: string;
  }[];
}

/**
 * iOS-specific subscription request parameters
 */
export interface RequestSubscriptionIosProps extends RequestPurchaseIosProps {
  // iOS subscriptions use the same props as regular purchases
}

/**
 * Modern platform-specific request structure (expo-iap v2.7.0+ compatible)
 * Allows clear separation of iOS and Android parameters
 */
export interface RequestPurchaseProps {
  readonly ios?: RequestPurchaseIosProps;
  readonly android?: RequestPurchaseAndroidProps;
}

/**
 * Modern platform-specific subscription request structure (expo-iap v2.7.0+ compatible)
 */
export interface RequestSubscriptionProps {
  readonly ios?: RequestSubscriptionIosProps;
  readonly android?: RequestSubscriptionAndroidProps;
}

/**
 * Combined request type for internal use
 */
export type PurchaseRequestInternal = {
  request: RequestPurchaseProps | RequestSubscriptionProps;
  type?: 'inapp' | 'subs';
};

// Define discriminated union for purchase requests
export type PurchaseRequest =
  | {
      request: RequestPurchaseIosProps | RequestPurchaseAndroidProps;
      type?: 'inapp';
    }
  | {
      request: RequestSubscriptionAndroidProps | RequestSubscriptionIosProps;
      type: 'subs';
    };

// ============================================================================
// Feature Types (Android)
// ============================================================================

export enum FeatureTypeAndroid {
  IN_APP_MESSAGING = 'IN_APP_MESSAGING',
  SUBSCRIPTIONS = 'SUBSCRIPTIONS',
  SUBSCRIPTIONS_UPDATE = 'SUBSCRIPTIONS_UPDATE',
  PRICE_CHANGE_CONFIRMATION = 'PRICE_CHANGE_CONFIRMATION',
}

export interface SubscriptionOfferInfo {
  readonly sku: string;
  readonly offerToken: string;
}

export enum ReplacementModesAndroid {
  UNKNOWN_REPLACEMENT_MODE = 0,
  WITH_TIME_PRORATION = 1,
  CHARGE_PRORATED_PRICE = 2,
  WITHOUT_PRORATION = 3,
  CHARGE_FULL_PRICE = 5,
  DEFERRED = 6,
}

// ============================================================================
// Active Subscription Types
// ============================================================================

export interface ActiveSubscription {
  id: string;
  isActive: boolean;
  expirationDate?: number;
  autoRenewing?: boolean;
  purchaseDate?: number;
  originalPurchaseDate?: number;
  platform?: DevicePlatform;
}

// ============================================================================
// Legacy Type Aliases
// ============================================================================

/**
 * Legacy base Product type (from Iap.types.ts)
 */
export interface NitroProduct {
  readonly id: string;
  readonly displayName?: string;
  readonly displayPrice?: string;
  readonly price?: number;
  readonly currency?: string;
  readonly description?: string;
  readonly title?: string;
  readonly type?: string;
  readonly localizedPrice?: string;
  readonly platform?: DevicePlatform;
  readonly isFamilyShareable?: boolean;
  readonly jsonRepresentation?: string;
  readonly subscription?: string;
}

/**
 * Legacy base Purchase type (from Iap.types.ts)
 */
export interface NitroPurchase {
  id: string;
  transactionId?: string;
  transactionDate: number;
  transactionReceipt: string;
  platform?: DevicePlatform;
  dataAndroid?: string;
  autoRenewingAndroid?: boolean;
  // iOS subscription fields
  expirationDateIOS?: number;
  environmentIOS?: string;
  originalTransactionDateIOS?: number;
  originalTransactionIdentifierIOS?: string;
}

// Re-export all platform-specific types
export * from './IapAndroid.types';
export * from './IapIos.types';
