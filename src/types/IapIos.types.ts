/**
 * iOS-specific types
 */

export interface ProductIOS {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly type: 'inapp' | 'subs';
  readonly displayName: string;
  readonly displayPrice: string;
  readonly currency: string;
  readonly price?: number;
  readonly isFamilyShareable: boolean;
  readonly jsonRepresentation: string;
  readonly subscription: string;
  readonly introductoryPriceNumberOfPeriodsIOS?: string;
  readonly introductoryPriceSubscriptionPeriodIOS?: string;
  readonly platform: 'ios';
}

export interface SubscriptionOffer {
  readonly id?: string;
  readonly displayPrice: string;
  readonly price: number;
  readonly period: string;
  readonly periodCount: number;
  readonly paymentMode: string;
  readonly type: string;
}

export interface SubscriptionProductIOS extends ProductIOS {
  readonly subscriptionGroupID?: string;
  readonly subscriptionPeriod?: string;
  readonly introductoryOffer?: SubscriptionOffer;
  readonly promotionalOffers?: SubscriptionOffer[];
}

export interface PaymentDiscount {
  readonly identifier: string;
  readonly keyIdentifier: string;
  readonly nonce: string;
  readonly signature: string;
  readonly timestamp: number;
}

export interface OfferParams {
  readonly identifier?: string;
  readonly keyIdentifier?: string;
  readonly nonce?: string;
  readonly signature?: string;
  readonly timestamp?: number;
}

export interface RequestPurchaseIosProps {
  sku: string;
  andDangerouslyFinishTransactionAutomaticallyIOS?: boolean;
  /**
   * Unified prop name for auto-finishing transactions.
   * Alias for andDangerouslyFinishTransactionAutomaticallyIOS.
   */
  andDangerouslyFinishTransactionAutomatically?: boolean;
  appAccountToken?: string;
  quantity?: number;
  withOffer?: OfferParams;
}

export interface RequestSubscriptionIosProps extends RequestPurchaseIosProps {}

export interface TransactionEvent {
  transaction?: string;
  error?: string;
}

export interface ProductStatusIOS {
  state: string;
  productId: string;
  transactionId: string;
  purchaseDate: number;
  expirationDate?: number;
}
