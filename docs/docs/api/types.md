import IapKitBanner from "@site/src/uis/IapKitBanner";

# Types

<IapKitBanner />

The react-native-iap type surface is now generated in one place: `src/types.ts`. The file is produced by our GraphQL schema and represents the canonical source for all product, purchase, subscription, and request shapes. After updating any schema definitions, run `bun run generate:types` to refresh the file.

Key runtime helpers that build on these types live alongside them:

- [`src/types.ts`](https://github.com/hyochan/react-native-iap/blob/main/src/types.ts) – auto-generated enums and interfaces
- [`src/utils/errorMapping.ts`](https://github.com/hyochan/react-native-iap/blob/main/src/utils/errorMapping.ts) – typed error helpers (`createPurchaseError`, `ErrorCodeUtils`)
- [`src/helpers/subscription.ts`](https://github.com/hyochan/react-native-iap/blob/main/src/helpers/subscription.ts) – subscription utilities that re-export `ActiveSubscription`

Below is a curated overview of the most commonly used types. Consult [`src/types.ts`](https://github.com/hyochan/react-native-iap/blob/main/src/types.ts) for the full schema.

## Core Type Aliases

```ts
export type IapPlatform = 'android' | 'ios';

export type ProductType = 'in-app' | 'subs';

// Simplified in v14.7.0 - removed unused states
export type PurchaseState =
  | 'pending'
  | 'purchased'
  | 'unknown';
```

:::info PurchaseState Simplified (v14.7.0)
In v14.7.0, `PurchaseState` was simplified to only include states that are actually used:

**Removed states:**
- `failed` - Both platforms return errors instead of Purchase objects on failure
- `restored` - Restored purchases return as `purchased` state
- `deferred` - iOS StoreKit 2 has no deferred state; Android uses `pending`

This aligns with how modern StoreKit 2 and Google Play Billing actually work.
:::

For `ErrorCode` enum and error handling utilities, see [Error Handling](./error-handling).

## Product Types

All products share the generated `ProductCommon` interface. Platform extensions discriminate on the `platform` field via the `IapPlatform` string union.

```ts
export interface ProductCommon {
  id: string;
  title: string;
  description: string;
  type: ProductType;
  displayName?: string | null;
  displayPrice: string;
  currency: string;
  price?: number | null;
  platform: IapPlatform;
}

export interface ProductAndroid extends ProductCommon {
  nameAndroid: string;
  oneTimePurchaseOfferDetailsAndroid?: ProductAndroidOneTimePurchaseOfferDetail[] | null;
  subscriptionOfferDetailsAndroid?:
    | ProductSubscriptionAndroidOfferDetails[]
    | null;
}

export interface ProductIOS extends ProductCommon {
  displayNameIOS: string;
  isFamilyShareableIOS: boolean;
  jsonRepresentationIOS: string;
  typeIOS: ProductTypeIOS;
  subscriptionInfoIOS?: SubscriptionInfoIOS | null;
}

export type Product = ProductAndroid | ProductIOS;
export type ProductSubscription =
  | ProductSubscriptionAndroid
  | ProductSubscriptionIOS;
```

:::tip
The `subscriptionOfferDetailsAndroid` contains `basePlanId`, but this field has limitations when retrieving purchases. See [Android basePlanId Limitation](../guides/subscription-offers#baseplanid-limitation) for details and workarounds.
:::

### Android One-Time Purchase Offer Details (v14.6.0+)

Starting from v14.6.0, `oneTimePurchaseOfferDetailsAndroid` is now an **array** to support Google Play's one-time product discounts (Billing Library 7.0+).

```ts
export interface ProductAndroidOneTimePurchaseOfferDetail {
  formattedPrice: string;
  priceAmountMicros: string;
  priceCurrencyCode: string;
  offerId?: string | null;
  offerToken: string;
  offerTags: string[];
  // Discount fields (Billing Library 7.0+)
  fullPriceMicros?: string | null;
  discountDisplayInfo?: DiscountDisplayInfoAndroid | null;
  limitedQuantityInfo?: LimitedQuantityInfoAndroid | null;
  validTimeWindow?: ValidTimeWindowAndroid | null;
  // Product-specific details
  preorderDetailsAndroid?: PreorderDetailsAndroid | null;
  rentalDetailsAndroid?: RentalDetailsAndroid | null;
}

export interface DiscountDisplayInfoAndroid {
  percentageDiscount?: number | null;
  discountAmount?: DiscountAmountAndroid | null;
}

export interface DiscountAmountAndroid {
  discountAmountMicros: string;
  formattedDiscountAmount: string;
}

export interface LimitedQuantityInfoAndroid {
  maximumQuantity: number;
  remainingQuantity: number;
}

export interface ValidTimeWindowAndroid {
  startTimeMillis: string;
  endTimeMillis: string;
}

export interface PreorderDetailsAndroid {
  preorderReleaseTimeMillis: string;
  preorderPresaleEndTimeMillis: string;
}

export interface RentalDetailsAndroid {
  rentalPeriod: string;
  rentalExpirationPeriod?: string | null;
}
```

### Cross-Platform Offer Types (v14.7.2+)

Starting from v14.7.2, products include **standardized cross-platform offer types** that work consistently across iOS and Android. These new types replace the platform-specific `subscriptionInfoIOS` and `subscriptionOfferDetailsAndroid` with unified structures.

#### SubscriptionOffer

The `subscriptionOffers` field is available on both `ProductIOS` and `ProductAndroid` for subscription products:

```ts
export interface SubscriptionOffer {
  /** Unique identifier for the offer */
  id: string;
  /** Formatted display price (e.g., "$9.99/month" or "Free") */
  displayPrice: string;
  /** Numeric price value */
  price: number;
  /** Type of offer: 'introductory' or 'promotional' */
  type: DiscountOfferType;
  /** Currency code (ISO 4217, e.g., "USD") */
  currency?: string | null;
  /** Payment mode during the offer period */
  paymentMode?: PaymentMode | null;
  /** Subscription period for this offer */
  period?: SubscriptionPeriod | null;
  /** Number of periods the offer applies */
  periodCount?: number | null;
  // iOS-specific fields
  /** [iOS] Key identifier for signature validation */
  keyIdentifierIOS?: string | null;
  /** [iOS] Number of billing periods for this discount */
  numberOfPeriodsIOS?: number | null;
  // Android-specific fields
  /** [Android] Base plan identifier */
  basePlanIdAndroid?: string | null;
  /** [Android] Offer token required for purchase */
  offerTokenAndroid?: string | null;
  /** [Android] List of tags associated with this offer */
  offerTagsAndroid?: string[] | null;
  /** [Android] Pricing phases for this subscription offer */
  pricingPhasesAndroid?: PricingPhasesAndroid | null;
}

export type DiscountOfferType = 'introductory' | 'promotional';
export type PaymentMode = 'free-trial' | 'pay-as-you-go' | 'pay-up-front';

export interface SubscriptionPeriod {
  unit: SubscriptionPeriodUnit;
  value: number;
}

export type SubscriptionPeriodUnit = 'day' | 'week' | 'month' | 'year' | 'unknown';
```

#### DiscountOffer

The `discountOffers` field is available on both platforms for one-time purchase products with discounts:

```ts
export interface DiscountOffer {
  /** Currency code (ISO 4217, e.g., "USD") */
  currency: string;
  /** Formatted display price (e.g., "$4.99") */
  displayPrice: string;
  /** Numeric price value */
  price: number;
  /** Unique identifier for the offer (Android only) */
  id?: string | null;
  // Android-specific fields
  /** [Android] Fixed discount amount in micro-units */
  discountAmountMicrosAndroid?: string | null;
  /** [Android] Formatted discount amount (e.g., "$5.00 OFF") */
  formattedDiscountAmountAndroid?: string | null;
  /** [Android] Original full price in micro-units before discount */
  fullPriceMicrosAndroid?: string | null;
  /** [Android] Offer token required for purchase */
  offerTokenAndroid?: string | null;
  /** [Android] List of tags associated with this offer */
  offerTagsAndroid?: string[] | null;
  /** [Android] Limited quantity information */
  limitedQuantityInfoAndroid?: LimitedQuantityInfoAndroid | null;
  /** [Android] Time window when the offer is valid */
  validTimeWindowAndroid?: ValidTimeWindowAndroid | null;
}
```

#### Usage Example

```tsx
import {fetchProducts} from 'react-native-iap';

const products = await fetchProducts({skus: ['premium_monthly']});

// Access cross-platform subscription offers
products.forEach(product => {
  if (product.subscriptionOffers) {
    product.subscriptionOffers.forEach(offer => {
      console.log(`Offer: ${offer.id}`);
      console.log(`Type: ${offer.type}`); // 'introductory' or 'promotional'
      console.log(`Price: ${offer.displayPrice}`);
      console.log(`Payment Mode: ${offer.paymentMode}`); // 'free-trial', etc.

      // Platform-specific details
      if (offer.offerTokenAndroid) {
        console.log(`Android Token: ${offer.offerTokenAndroid}`);
      }
    });
  }
});
```

:::tip Deprecation Notice
The platform-specific fields `subscriptionInfoIOS` and `subscriptionOfferDetailsAndroid` are now deprecated. Use the unified `subscriptionOffers` and `discountOffers` fields for new implementations.
:::

## Purchase Types

Purchases share the `PurchaseCommon` shape and discriminate on the same `platform` union. Both variants expose the unified `purchaseToken` field for server validation.

```ts
export interface PurchaseCommon {
  id: string;
  productId: string;
  platform: IapPlatform;
  purchaseState: PurchaseState;
  transactionDate: number;
  quantity: number;
  isAutoRenewing: boolean;
  purchaseToken?: string | null;
  ids?: string[] | null;
}

export interface PurchaseAndroid extends PurchaseCommon {
  autoRenewingAndroid?: boolean | null;
  packageNameAndroid?: string | null;
  signatureAndroid?: string | null;
  dataAndroid?: string | null;
  isSuspendedAndroid?: boolean | null; // v14.6.0+ (Billing Library 8.1.0+)
}

export interface PurchaseIOS extends PurchaseCommon {
  // Note: Must be UUID format when set via requestPurchase, or Apple returns null
  appAccountToken?: string | null;
  environmentIOS?: string | null;
  expirationDateIOS?: number | null;
  originalTransactionIdentifierIOS?: string | null;
  offerIOS?: PurchaseOfferIOS | null;
}

export type Purchase = PurchaseAndroid | PurchaseIOS;
```

## Active Subscriptions

`ActiveSubscription` is now part of the generated schema and shared across helpers.

```ts
export interface ActiveSubscription {
  productId: string;
  isActive: boolean;
  transactionId: string;
  transactionDate: number;
  purchaseToken?: string | null;
  autoRenewingAndroid?: boolean | null;
  environmentIOS?: string | null;
  expirationDateIOS?: number | null;
  daysUntilExpirationIOS?: number | null;
  willExpireSoon?: boolean | null;
}
```

The helper `getActiveSubscriptions` in `src/helpers/subscription.ts` converts `Purchase` records into this shape and re-exports the type for convenience.

## Request Parameters

The request types have been harmonised to match the schema definitions.

```ts
export interface RequestPurchasePropsByPlatforms {
  /** Apple-specific purchase parameters */
  apple?: RequestPurchaseIosProps | null;
  /** Google-specific purchase parameters */
  google?: RequestPurchaseAndroidProps | null;
  /** @deprecated Use apple instead */
  ios?: RequestPurchaseIosProps | null;
  /** @deprecated Use google instead */
  android?: RequestPurchaseAndroidProps | null;
}

export interface RequestSubscriptionPropsByPlatforms {
  /** Apple-specific subscription parameters */
  apple?: RequestSubscriptionIosProps | null;
  /** Google-specific subscription parameters */
  google?: RequestSubscriptionAndroidProps | null;
  /** @deprecated Use apple instead */
  ios?: RequestSubscriptionIosProps | null;
  /** @deprecated Use google instead */
  android?: RequestSubscriptionAndroidProps | null;
}

export type MutationRequestPurchaseArgs =
  | {
      request: RequestPurchasePropsByPlatforms;
      type: 'in-app';
    }
  | {
      request: RequestSubscriptionPropsByPlatforms;
      type: 'subs';
    };
```

## Billing Programs Types (v14.6.0+)

New in v14.6.0, the Billing Programs API provides types for Google Play's external billing programs (Billing Library 8.2.0+).

```ts
// Updated in v14.7.0 - added user-choice-billing and external-payments
export type BillingProgramAndroid =
  | 'unspecified'
  | 'external-content-link'
  | 'external-offer'
  | 'external-payments'      // v14.6.4+ (Billing Library 8.3.0+ - Japan only)
  | 'user-choice-billing';   // v14.7.0+ (Billing Library 7.0+)

export type ExternalLinkLaunchModeAndroid =
  | 'unspecified'
  | 'launch-in-external-browser-or-app'
  | 'caller-will-launch-link';

export type ExternalLinkTypeAndroid =
  | 'unspecified'
  | 'link-to-digital-content-offer'
  | 'link-to-app-download';

export interface LaunchExternalLinkParamsAndroid {
  billingProgram: BillingProgramAndroid;
  launchMode: ExternalLinkLaunchModeAndroid;
  linkType: ExternalLinkTypeAndroid;
  linkUri: string;
}

export interface BillingProgramAvailabilityResultAndroid {
  billingProgram: BillingProgramAndroid;
  isAvailable: boolean;
}

export interface BillingProgramReportingDetailsAndroid {
  billingProgram: BillingProgramAndroid;
  externalTransactionToken: string;
}
```

## Purchase Verification

Purchase verification uses platform-specific options and returns platform-specific results.

### VerifyPurchaseProps

The main parameter type for `verifyPurchase` (and deprecated `validateReceipt`):

```ts
export interface VerifyPurchaseProps {
  /** Apple App Store verification parameters */
  apple?: VerifyPurchaseAppleOptions | null;
  /** Google Play Store verification parameters */
  google?: VerifyPurchaseGoogleOptions | null;
  /** Meta Horizon (Quest) verification parameters */
  horizon?: VerifyPurchaseHorizonOptions | null;
}
```

### Platform-specific Options

```ts
// Apple App Store (iOS)
export interface VerifyPurchaseAppleOptions {
  /** Product SKU to validate */
  sku: string;
}

// Google Play Store (Android)
export interface VerifyPurchaseGoogleOptions {
  /** Product SKU to validate */
  sku: string;
  /** Google OAuth2 access token for API authentication */
  accessToken: string;
  /** Android package name (e.g., com.example.app) */
  packageName: string;
  /** Purchase token from the purchase response */
  purchaseToken: string;
  /** Whether this is a subscription purchase */
  isSub?: boolean | null;
}

// Meta Horizon (Quest)
export interface VerifyPurchaseHorizonOptions {
  /** SKU for the add-on item */
  sku: string;
  /** Access token for Meta API authentication */
  accessToken: string;
  /** User ID to verify purchase for */
  userId: string;
}
```

### Verification Results

```ts
export type VerifyPurchaseResult =
  | VerifyPurchaseResultAndroid
  | VerifyPurchaseResultIOS
  | VerifyPurchaseResultHorizon;

// Android result
export interface VerifyPurchaseResultAndroid {
  autoRenewing: boolean;
  betaProduct: boolean;
  cancelDate?: number | null;
  cancelReason?: string | null;
  deferredDate?: number | null;
  deferredSku?: string | null;
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

// iOS result
export interface VerifyPurchaseResultIOS {
  isValid: boolean;
  receiptData: string;
  jwsRepresentation: string;
  latestTransaction?: Purchase | null;
}

// Horizon result
export interface VerifyPurchaseResultHorizon {
  isEntitled: boolean;
  grantTime?: number | null;
}
```

Use the higher-level `verifyPurchase` helper exported from `src/index.ts` for a strongly typed wrapper around the native modules.

## Where to Find Everything

- For the exhaustive list of enums and interfaces, open [`src/types.ts`](https://github.com/hyochan/react-native-iap/blob/main/src/types.ts).
- For error handling utilities (`createPurchaseError`, `ErrorCodeUtils`), see [`src/utils/errorMapping.ts`](https://github.com/hyochan/react-native-iap/blob/main/src/utils/errorMapping.ts).
- All generated types are re-exported from the package root so consumers can import from `react-native-iap` directly:

```ts
import type {
  Product,
  Purchase,
  ActiveSubscription,
  RequestPurchaseProps,
} from 'react-native-iap';
```

If you need to regenerate types place new schema definitions under the GraphQL inputs and rerun the generator. EOF
