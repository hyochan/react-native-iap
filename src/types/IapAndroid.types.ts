/**
 * Android-specific types
 */

export interface ProductAndroid {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly type: 'inapp' | 'subs';
  readonly displayName?: string;
  readonly displayPrice: string;
  readonly currency: string;
  readonly price?: number;
  readonly name: string;
  readonly oneTimePurchaseOfferDetails?: {
    formattedPrice: string;
    priceAmountMicros: string;
    priceCurrencyCode: string;
  };
  readonly subscriptionOfferDetails?: string[];
  readonly platform: 'android';
}

export interface SubscriptionOfferAndroid {
  readonly basePlanId: string;
  readonly offerId?: string | null;
  readonly offerToken: string;
  readonly offerTags: string[];
  readonly pricingPhases: PricingPhaseAndroid[];
}

export interface PricingPhaseAndroid {
  readonly formattedPrice: string;
  readonly priceCurrencyCode: string;
  readonly billingPeriod?: string;
  readonly billingCycleCount?: number;
  readonly priceAmountMicros?: string;
  readonly recurrenceMode?: number;
}

export interface SubscriptionProductAndroid {
  readonly id: string;
  readonly subscriptionOfferDetails: SubscriptionOfferAndroid[];
  readonly name?: string;
  readonly title?: string;
  readonly description?: string;
  readonly productType?: 'subs';
  readonly productId?: string;
  readonly platform: 'android';
}

export interface ProductPurchaseAndroid {
  purchaseTokenAndroid?: string;
  purchaseStateAndroid?: number;
  signatureAndroid?: string;
  dataAndroid?: string;
  originalJsonAndroid?: string;
  isAcknowledgedAndroid?: boolean;
  autoRenewingAndroid?: boolean;
}

export interface RequestPurchaseAndroidProps {
  skus: string[];
  obfuscatedAccountIdAndroid?: string;
  obfuscatedProfileIdAndroid?: string;
  isOfferPersonalized?: boolean;
}

export interface RequestSubscriptionAndroidProps {
  skus: string[];
  obfuscatedAccountIdAndroid?: string;
  obfuscatedProfileIdAndroid?: string;
  isOfferPersonalized?: boolean;
  subscriptionOffers: {
    sku: string;
    offerToken: string;
    basePlanId?: string;
  }[];
  replacementModeAndroid?: number;
  purchaseTokenAndroid?: string;
}
