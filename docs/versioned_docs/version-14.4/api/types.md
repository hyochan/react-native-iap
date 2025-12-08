import GreatFrontEndTopFixed from "@site/src/uis/GreatFrontEndTopFixed";

# Types

<GreatFrontEndTopFixed />

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

export type PurchaseState =
  | 'deferred'
  | 'failed'
  | 'pending'
  | 'purchased'
  | 'restored'
  | 'unknown';
```

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
  oneTimePurchaseOfferDetailsAndroid?: ProductAndroidOneTimePurchaseOfferDetail | null;
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
}

export interface PurchaseIOS extends PurchaseCommon {
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

## Purchase Verification

Purchase verification results are platform-specific unions:

```ts
export type PurchaseVerificationResult =
  | PurchaseVerificationResultAndroid
  | PurchaseVerificationResultIos;
```

Use the higher-level `validateReceipt` helper exported from `src/index.ts` for a strongly typed wrapper around the native modules.

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
