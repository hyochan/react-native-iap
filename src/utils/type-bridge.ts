/**
 * Type Bridge Utilities
 *
 * Converts the loose Nitro shapes coming from native into the strongly typed
 * structures that our generated TypeScript types expect.
 */

import type {
  NitroProduct,
  NitroPurchase,
  NitroSubscriptionStatus,
} from '../specs/RnIap.nitro';
import {
  Platform as IapPlatform,
  PaymentModeIos,
  ProductType,
  ProductTypeIos,
  PurchaseState,
  SubscriptionPeriodIos,
} from '../types';
import type {
  Product,
  ProductSubscription,
  Purchase,
  SubscriptionStatusIos,
} from '../types';

const PLATFORM_IOS = 'ios';
const PRODUCT_TYPE_SUBS = 'subs';
const PURCHASE_STATE_DEFERRED = 'deferred';
const PURCHASE_STATE_FAILED = 'failed';
const PURCHASE_STATE_PENDING = 'pending';
const PURCHASE_STATE_PURCHASED = 'purchased';
const PURCHASE_STATE_RESTORED = 'restored';
const DEFAULT_JSON_REPR = '{}';

type Nullable<T> = T | null | undefined;

function normalizePlatform(value?: Nullable<string>): IapPlatform {
  return value?.toLowerCase() === PLATFORM_IOS
    ? IapPlatform.Ios
    : IapPlatform.Android;
}

function normalizeProductType(value?: Nullable<string>): ProductType {
  return value?.toLowerCase() === PRODUCT_TYPE_SUBS
    ? ProductType.Subs
    : ProductType.InApp;
}

function normalizeProductTypeIos(value?: Nullable<string>): ProductTypeIos {
  switch ((value ?? '').toLowerCase()) {
    case 'consumable':
      return ProductTypeIos.Consumable;
    case 'nonconsumable':
    case 'non_consumable':
    case 'non-consumable':
      return ProductTypeIos.NonConsumable;
    case 'autorenewablesubscription':
    case 'auto_renewable_subscription':
    case 'autorenewable':
      return ProductTypeIos.AutoRenewableSubscription;
    case 'nonrenewingsubscription':
    case 'non_renewing_subscription':
      return ProductTypeIos.NonRenewingSubscription;
    default:
      if (value) {
        console.warn(
          `[react-native-iap] Unknown iOS product type "${value}", defaulting to NonConsumable.`,
        );
      }
      return ProductTypeIos.NonConsumable;
  }
}

function normalizePaymentMode(value?: Nullable<string>): PaymentModeIos | null {
  switch ((value ?? '').toUpperCase()) {
    case 'FREE_TRIAL':
    case 'FREETRIAL':
      return PaymentModeIos.FreeTrial;
    case 'PAY_AS_YOU_GO':
    case 'PAYASYOUGO':
      return PaymentModeIos.PayAsYouGo;
    case 'PAY_UP_FRONT':
    case 'PAYUPFRONT':
      return PaymentModeIos.PayUpFront;
    default:
      return PaymentModeIos.Empty;
  }
}

function normalizeSubscriptionPeriod(
  value?: Nullable<string>,
): SubscriptionPeriodIos | null {
  switch ((value ?? '').toUpperCase()) {
    case 'DAY':
      return SubscriptionPeriodIos.Day;
    case 'WEEK':
      return SubscriptionPeriodIos.Week;
    case 'MONTH':
      return SubscriptionPeriodIos.Month;
    case 'YEAR':
      return SubscriptionPeriodIos.Year;
    default:
      return SubscriptionPeriodIos.Empty;
  }
}

function normalizePurchaseState(state: unknown): PurchaseState {
  if (typeof state === 'string') {
    switch (state.toLowerCase()) {
      case PURCHASE_STATE_PURCHASED:
        return PurchaseState.Purchased;
      case PURCHASE_STATE_PENDING:
        return PurchaseState.Pending;
      case PURCHASE_STATE_FAILED:
        return PurchaseState.Failed;
      case PURCHASE_STATE_RESTORED:
        return PurchaseState.Restored;
      case PURCHASE_STATE_DEFERRED:
        return PurchaseState.Deferred;
      default:
        return PurchaseState.Unknown;
    }
  }

  if (typeof state === 'number') {
    switch (state) {
      case 1:
        return PurchaseState.Purchased;
      case 2:
        return PurchaseState.Pending;
      default:
        return PurchaseState.Unknown;
    }
  }

  return PurchaseState.Unknown;
}

function toNullableString(value: unknown): string | null {
  if (value == null) return null;
  return String(value);
}

function toNullableNumber(value: unknown): number | null {
  if (value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toNullableBoolean(value: unknown): boolean | null {
  if (value == null) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return null;
}

function parseSubscriptionOffers(value?: Nullable<string>) {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (error) {
    console.warn('Failed to parse subscriptionOfferDetailsAndroid:', error);
  }
  return undefined;
}

/**
 * Convert NitroProduct (from native) to generated Product type
 */
export function convertNitroProductToProduct(
  nitroProduct: NitroProduct,
): Product {
  const platform = normalizePlatform(nitroProduct.platform);
  const type = normalizeProductType(nitroProduct.type);

  const base: any = {
    id: nitroProduct.id,
    title: nitroProduct.title,
    description: nitroProduct.description,
    type,
    displayName: nitroProduct.displayName ?? null,
    displayPrice: nitroProduct.displayPrice ?? '',
    currency: nitroProduct.currency ?? '',
    price: toNullableNumber(nitroProduct.price),
    debugDescription: null,
    platform,
  };

  if (platform === IapPlatform.Ios) {
    const iosProduct: any = {
      ...base,
      displayNameIOS: nitroProduct.displayName ?? nitroProduct.title,
      isFamilyShareableIOS: Boolean(
        (nitroProduct as any).isFamilyShareableIOS ?? false,
      ),
      jsonRepresentationIOS:
        (nitroProduct as any).jsonRepresentationIOS ?? DEFAULT_JSON_REPR,
      typeIOS: normalizeProductTypeIos((nitroProduct as any).typeIOS),
      subscriptionInfoIOS: undefined,
    };

    iosProduct.introductoryPriceAsAmountIOS = toNullableString(
      (nitroProduct as any).introductoryPriceAsAmountIOS,
    );
    iosProduct.introductoryPriceIOS = toNullableString(
      (nitroProduct as any).introductoryPriceIOS,
    );
    iosProduct.introductoryPriceNumberOfPeriodsIOS = toNullableString(
      (nitroProduct as any).introductoryPriceNumberOfPeriodsIOS,
    );
    iosProduct.introductoryPricePaymentModeIOS = normalizePaymentMode(
      (nitroProduct as any).introductoryPricePaymentModeIOS,
    );
    iosProduct.introductoryPriceSubscriptionPeriodIOS =
      normalizeSubscriptionPeriod(
        (nitroProduct as any).introductoryPriceSubscriptionPeriodIOS,
      );
    iosProduct.subscriptionPeriodNumberIOS = toNullableString(
      (nitroProduct as any).subscriptionPeriodNumberIOS,
    );
    iosProduct.subscriptionPeriodUnitIOS = normalizeSubscriptionPeriod(
      (nitroProduct as any).subscriptionPeriodUnitIOS,
    );

    return iosProduct as Product;
  }

  const androidProduct: any = {
    ...base,
    nameAndroid: (nitroProduct as any).nameAndroid ?? nitroProduct.title,
    oneTimePurchaseOfferDetailsAndroid: (nitroProduct as any)
      .oneTimePurchaseOfferDetailsAndroid,
    subscriptionOfferDetailsAndroid: parseSubscriptionOffers(
      (nitroProduct as any).subscriptionOfferDetailsAndroid,
    ),
  };

  if (type === ProductType.Subs) {
    if (!Array.isArray(androidProduct.subscriptionOfferDetailsAndroid)) {
      androidProduct.subscriptionOfferDetailsAndroid = [];
    }
  }

  return androidProduct as Product;
}

/**
 * Convert Product to ProductSubscription (type-safe casting helper)
 */
export function convertProductToProductSubscription(
  product: Product,
): ProductSubscription {
  if (product.type !== ProductType.Subs) {
    console.warn(
      'Converting non-subscription product to ProductSubscription:',
      product.id,
    );
  }

  const output: any = {...(product as any)};

  if (output.platform === IapPlatform.Android) {
    if (!Array.isArray(output.subscriptionOfferDetailsAndroid)) {
      output.subscriptionOfferDetailsAndroid = [];
    }
  }

  return output;
}

/**
 * Convert NitroPurchase (from native) to generated Purchase type
 */
export function convertNitroPurchaseToPurchase(
  nitroPurchase: NitroPurchase,
): Purchase {
  const platform = normalizePlatform(nitroPurchase.platform);
  const purchase: any = {
    id: nitroPurchase.id,
    productId: nitroPurchase.productId,
    transactionDate: nitroPurchase.transactionDate ?? Date.now(),
    purchaseToken:
      nitroPurchase.purchaseToken ?? nitroPurchase.purchaseTokenAndroid ?? null,
    platform,
    quantity: nitroPurchase.quantity ?? 1,
    purchaseState: normalizePurchaseState(
      nitroPurchase.purchaseState ?? nitroPurchase.purchaseStateAndroid,
    ),
    isAutoRenewing: Boolean(nitroPurchase.isAutoRenewing),
  };

  if (
    purchase.purchaseState === PurchaseState.Unknown &&
    nitroPurchase.purchaseStateAndroid != null
  ) {
    purchase.purchaseState = normalizePurchaseState(
      nitroPurchase.purchaseStateAndroid,
    );
  }

  if (platform === IapPlatform.Ios) {
    const iosPurchase: any = purchase;
    iosPurchase.quantityIOS = toNullableNumber(nitroPurchase.quantityIOS);
    iosPurchase.originalTransactionDateIOS = toNullableNumber(
      nitroPurchase.originalTransactionDateIOS,
    );
    iosPurchase.originalTransactionIdentifierIOS = toNullableString(
      nitroPurchase.originalTransactionIdentifierIOS,
    );
    iosPurchase.appAccountToken = toNullableString(
      nitroPurchase.appAccountToken,
    );
    return iosPurchase as Purchase;
  }

  const androidPurchase: any = purchase;
  androidPurchase.autoRenewingAndroid = toNullableBoolean(
    nitroPurchase.autoRenewingAndroid ?? nitroPurchase.isAutoRenewing,
  );
  androidPurchase.dataAndroid = toNullableString(nitroPurchase.dataAndroid);
  androidPurchase.signatureAndroid = toNullableString(
    nitroPurchase.signatureAndroid,
  );
  androidPurchase.isAcknowledgedAndroid = toNullableBoolean(
    nitroPurchase.isAcknowledgedAndroid,
  );
  androidPurchase.packageNameAndroid = toNullableString(
    nitroPurchase.packageNameAndroid,
  );
  androidPurchase.obfuscatedAccountIdAndroid = toNullableString(
    nitroPurchase.obfuscatedAccountIdAndroid,
  );
  androidPurchase.obfuscatedProfileIdAndroid = toNullableString(
    nitroPurchase.obfuscatedProfileIdAndroid,
  );

  return androidPurchase as Purchase;
}

/**
 * Convert Nitro subscription status (iOS) to generated type
 */
export function convertNitroSubscriptionStatusToSubscriptionStatusIOS(
  nitro: NitroSubscriptionStatus,
): SubscriptionStatusIos {
  return {
    state: String(nitro.state ?? ''),
    renewalInfo: nitro.renewalInfo
      ? {
          autoRenewPreference: toNullableString(
            nitro.renewalInfo.autoRenewPreference,
          ),
          jsonRepresentation: JSON.stringify(nitro.renewalInfo),
          willAutoRenew: Boolean(nitro.renewalInfo.autoRenewStatus),
        }
      : undefined,
  };
}

/**
 * Validate that a NitroProduct has the expected shape
 */
export function validateNitroProduct(nitroProduct: NitroProduct): boolean {
  if (!nitroProduct || typeof nitroProduct !== 'object') {
    return false;
  }

  const required = ['id', 'title', 'description', 'type', 'platform'];
  for (const field of required) {
    if (
      !(field in nitroProduct) ||
      nitroProduct[field as keyof NitroProduct] == null
    ) {
      console.error(
        `NitroProduct missing required field: ${field}`,
        nitroProduct,
      );
      return false;
    }
  }

  return true;
}

/**
 * Validate that a NitroPurchase has the expected shape
 */
export function validateNitroPurchase(nitroPurchase: NitroPurchase): boolean {
  if (!nitroPurchase || typeof nitroPurchase !== 'object') {
    return false;
  }

  const required = ['id', 'productId', 'transactionDate', 'platform'];
  for (const field of required) {
    if (
      !(field in nitroPurchase) ||
      nitroPurchase[field as keyof NitroPurchase] == null
    ) {
      console.error(
        `NitroPurchase missing required field: ${field}`,
        nitroPurchase,
      );
      return false;
    }
  }

  return true;
}

/**
 * Development helper to check that type conversions stay valid
 */
export function checkTypeSynchronization(): {
  isSync: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  try {
    const testNitroProduct: NitroProduct = {
      id: 'test',
      title: 'Test',
      description: 'Test product',
      type: 'inapp',
      platform: PLATFORM_IOS,
      displayPrice: '$1.00',
      currency: 'USD',
      price: 1,
    };

    const converted = convertNitroProductToProduct(testNitroProduct);
    if (!converted.id || !converted.title) {
      issues.push('Type conversion failed');
    }
  } catch (error) {
    issues.push(`Type conversion error: ${String(error)}`);
  }

  return {
    isSync: issues.length === 0,
    issues,
  };
}
