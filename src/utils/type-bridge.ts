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
import type {
  IapPlatform,
  PaymentModeIOS,
  ProductType,
  ProductTypeIOS,
  PurchaseState,
  SubscriptionPeriodIOS,
} from '../types';
import type {
  Product,
  ProductSubscription,
  Purchase,
  SubscriptionStatusIOS,
} from '../types';
import {RnIapConsole} from './debug';

const PLATFORM_IOS: IapPlatform = 'ios';
const PLATFORM_ANDROID: IapPlatform = 'android';
const PRODUCT_TYPE_SUBS: ProductType = 'subs';
const PRODUCT_TYPE_IN_APP: ProductType = 'in-app';
const PURCHASE_STATE_DEFERRED: PurchaseState = 'deferred';
const PURCHASE_STATE_FAILED: PurchaseState = 'failed';
const PURCHASE_STATE_PENDING: PurchaseState = 'pending';
const PURCHASE_STATE_PURCHASED: PurchaseState = 'purchased';
const PURCHASE_STATE_RESTORED: PurchaseState = 'restored';
const PURCHASE_STATE_UNKNOWN: PurchaseState = 'unknown';
const PAYMENT_MODE_EMPTY: PaymentModeIOS = 'empty';
const PAYMENT_MODE_FREE_TRIAL: PaymentModeIOS = 'free-trial';
const PAYMENT_MODE_PAY_AS_YOU_GO: PaymentModeIOS = 'pay-as-you-go';
const PAYMENT_MODE_PAY_UP_FRONT: PaymentModeIOS = 'pay-up-front';
const SUBSCRIPTION_PERIOD_DAY: SubscriptionPeriodIOS = 'day';
const SUBSCRIPTION_PERIOD_WEEK: SubscriptionPeriodIOS = 'week';
const SUBSCRIPTION_PERIOD_MONTH: SubscriptionPeriodIOS = 'month';
const SUBSCRIPTION_PERIOD_YEAR: SubscriptionPeriodIOS = 'year';
const SUBSCRIPTION_PERIOD_EMPTY: SubscriptionPeriodIOS = 'empty';
const DEFAULT_JSON_REPR = '{}';

type Nullable<T> = T | null | undefined;

function normalizePlatform(value?: Nullable<string>): IapPlatform {
  return value?.toLowerCase() === PLATFORM_IOS
    ? PLATFORM_IOS
    : PLATFORM_ANDROID;
}

function normalizeProductType(value?: Nullable<string>): ProductType {
  return value?.toLowerCase() === PRODUCT_TYPE_SUBS
    ? PRODUCT_TYPE_SUBS
    : PRODUCT_TYPE_IN_APP;
}

function normalizeProductTypeIOS(value?: Nullable<string>): ProductTypeIOS {
  switch ((value ?? '').toLowerCase()) {
    case 'consumable':
      return 'consumable';
    case 'nonconsumable':
    case 'non_consumable':
    case 'non-consumable':
      return 'non-consumable';
    case 'autorenewablesubscription':
    case 'auto_renewable_subscription':
    case 'auto-renewable-subscription':
    case 'autorenewable':
      return 'auto-renewable-subscription';
    case 'nonrenewingsubscription':
    case 'non_renewing_subscription':
      return 'non-renewing-subscription';
    default:
      if (value) {
        RnIapConsole.warn(
          `[react-native-iap] Unknown iOS product type "${value}", defaulting to NonConsumable.`,
        );
      }
      return 'non-consumable';
  }
}

function normalizePaymentMode(value?: Nullable<string>): PaymentModeIOS {
  switch ((value ?? '').toUpperCase()) {
    case 'FREE_TRIAL':
    case 'FREETRIAL':
      return PAYMENT_MODE_FREE_TRIAL;
    case 'PAY_AS_YOU_GO':
    case 'PAYASYOUGO':
      return PAYMENT_MODE_PAY_AS_YOU_GO;
    case 'PAY_UP_FRONT':
    case 'PAYUPFRONT':
      return PAYMENT_MODE_PAY_UP_FRONT;
    default:
      return PAYMENT_MODE_EMPTY;
  }
}

function normalizeSubscriptionPeriod(
  value?: Nullable<string>,
): SubscriptionPeriodIOS | null {
  switch ((value ?? '').toUpperCase()) {
    case 'DAY':
      return SUBSCRIPTION_PERIOD_DAY;
    case 'WEEK':
      return SUBSCRIPTION_PERIOD_WEEK;
    case 'MONTH':
      return SUBSCRIPTION_PERIOD_MONTH;
    case 'YEAR':
      return SUBSCRIPTION_PERIOD_YEAR;
    default:
      return SUBSCRIPTION_PERIOD_EMPTY;
  }
}

function normalizePurchaseState(state: unknown): PurchaseState {
  if (typeof state === 'string') {
    switch (state.toLowerCase()) {
      case PURCHASE_STATE_PURCHASED:
        return PURCHASE_STATE_PURCHASED;
      case PURCHASE_STATE_PENDING:
        return PURCHASE_STATE_PENDING;
      case PURCHASE_STATE_FAILED:
        return PURCHASE_STATE_FAILED;
      case PURCHASE_STATE_RESTORED:
        return PURCHASE_STATE_RESTORED;
      case PURCHASE_STATE_DEFERRED:
        return PURCHASE_STATE_DEFERRED;
      default:
        return PURCHASE_STATE_UNKNOWN;
    }
  }

  if (typeof state === 'number') {
    switch (state) {
      case 1:
        return PURCHASE_STATE_PURCHASED;
      case 2:
        return PURCHASE_STATE_PENDING;
      default:
        return PURCHASE_STATE_UNKNOWN;
    }
  }

  return PURCHASE_STATE_UNKNOWN;
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

function parseSubscriptionOffers(value?: Nullable<string> | any[]) {
  if (!value) return undefined;

  // If it's already an array (from mocks), return it as-is
  if (Array.isArray(value)) {
    return value;
  }

  // Otherwise, try to parse it as JSON string
  try {
    const parsed = JSON.parse(value as string);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (error) {
    RnIapConsole.warn(
      'Failed to parse subscriptionOfferDetailsAndroid:',
      error,
    );
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

  if (platform === PLATFORM_IOS) {
    const iosProduct: any = {
      ...base,
      displayNameIOS: nitroProduct.displayName ?? nitroProduct.title,
      isFamilyShareableIOS: Boolean(nitroProduct.isFamilyShareableIOS ?? false),
      jsonRepresentationIOS:
        nitroProduct.jsonRepresentationIOS ?? DEFAULT_JSON_REPR,
      typeIOS: normalizeProductTypeIOS(nitroProduct.typeIOS),
      subscriptionInfoIOS: undefined,
    };

    iosProduct.introductoryPriceAsAmountIOS = toNullableString(
      nitroProduct.introductoryPriceAsAmountIOS,
    );
    iosProduct.introductoryPriceIOS = toNullableString(
      nitroProduct.introductoryPriceIOS,
    );
    iosProduct.introductoryPriceNumberOfPeriodsIOS = toNullableString(
      nitroProduct.introductoryPriceNumberOfPeriodsIOS,
    );
    iosProduct.introductoryPricePaymentModeIOS = normalizePaymentMode(
      nitroProduct.introductoryPricePaymentModeIOS,
    );
    iosProduct.introductoryPriceSubscriptionPeriodIOS =
      normalizeSubscriptionPeriod(
        nitroProduct.introductoryPriceSubscriptionPeriodIOS,
      );
    iosProduct.subscriptionPeriodNumberIOS = toNullableString(
      nitroProduct.subscriptionPeriodNumberIOS,
    );
    iosProduct.subscriptionPeriodUnitIOS = normalizeSubscriptionPeriod(
      nitroProduct.subscriptionPeriodUnitIOS,
    );

    // Parse discountsIOS from JSON string if present
    if (nitroProduct.discountsIOS) {
      try {
        iosProduct.discountsIOS = JSON.parse(nitroProduct.discountsIOS);
      } catch {
        iosProduct.discountsIOS = null;
      }
    } else {
      iosProduct.discountsIOS = null;
    }

    return iosProduct as Product;
  }

  const androidProduct: any = {
    ...base,
    nameAndroid: nitroProduct.nameAndroid ?? nitroProduct.title,
    oneTimePurchaseOfferDetailsAndroid:
      nitroProduct.oneTimePurchaseOfferDetailsAndroid ?? null,
    subscriptionOfferDetailsAndroid: parseSubscriptionOffers(
      nitroProduct.subscriptionOfferDetailsAndroid,
    ),
  };

  if (type === PRODUCT_TYPE_SUBS) {
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
  if (product.type !== PRODUCT_TYPE_SUBS) {
    RnIapConsole.warn(
      'Converting non-subscription product to ProductSubscription:',
      product.id,
    );
  }

  const output: any = {...(product as any)};

  if (output.platform === PLATFORM_ANDROID) {
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
    purchase.purchaseState === PURCHASE_STATE_UNKNOWN &&
    nitroPurchase.purchaseStateAndroid != null
  ) {
    purchase.purchaseState = normalizePurchaseState(
      nitroPurchase.purchaseStateAndroid,
    );
  }

  if (platform === PLATFORM_IOS) {
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
    iosPurchase.appBundleIdIOS = toNullableString(nitroPurchase.appBundleIdIOS);
    iosPurchase.countryCodeIOS = toNullableString(nitroPurchase.countryCodeIOS);
    iosPurchase.currencyCodeIOS = toNullableString(
      nitroPurchase.currencyCodeIOS,
    );
    iosPurchase.currencySymbolIOS = toNullableString(
      nitroPurchase.currencySymbolIOS,
    );
    iosPurchase.environmentIOS = toNullableString(nitroPurchase.environmentIOS);
    iosPurchase.expirationDateIOS = toNullableNumber(
      nitroPurchase.expirationDateIOS,
    );
    iosPurchase.isUpgradedIOS = toNullableBoolean(nitroPurchase.isUpgradedIOS);
    // Parse offerIOS from JSON string if present
    if (nitroPurchase.offerIOS) {
      try {
        iosPurchase.offerIOS = JSON.parse(nitroPurchase.offerIOS);
      } catch {
        iosPurchase.offerIOS = null;
      }
    } else {
      iosPurchase.offerIOS = null;
    }
    iosPurchase.ownershipTypeIOS = toNullableString(
      nitroPurchase.ownershipTypeIOS,
    );
    iosPurchase.reasonIOS = toNullableString(nitroPurchase.reasonIOS);
    iosPurchase.reasonStringRepresentationIOS = toNullableString(
      nitroPurchase.reasonStringRepresentationIOS,
    );
    iosPurchase.revocationDateIOS = toNullableNumber(
      nitroPurchase.revocationDateIOS,
    );
    iosPurchase.revocationReasonIOS = toNullableString(
      nitroPurchase.revocationReasonIOS,
    );
    iosPurchase.storefrontCountryCodeIOS = toNullableString(
      nitroPurchase.storefrontCountryCodeIOS,
    );
    iosPurchase.subscriptionGroupIdIOS = toNullableString(
      nitroPurchase.subscriptionGroupIdIOS,
    );
    iosPurchase.transactionReasonIOS = toNullableString(
      nitroPurchase.transactionReasonIOS,
    );
    iosPurchase.webOrderLineItemIdIOS = toNullableString(
      nitroPurchase.webOrderLineItemIdIOS,
    );
    // Convert renewalInfoIOS from Nitro type to JS type
    if (nitroPurchase.renewalInfoIOS) {
      iosPurchase.renewalInfoIOS = {
        autoRenewPreference: toNullableString(
          nitroPurchase.renewalInfoIOS.autoRenewPreference,
        ),
        expirationReason: toNullableString(
          nitroPurchase.renewalInfoIOS.expirationReason,
        ),
        gracePeriodExpirationDate: toNullableNumber(
          nitroPurchase.renewalInfoIOS.gracePeriodExpirationDate,
        ),
        isInBillingRetry: toNullableBoolean(
          nitroPurchase.renewalInfoIOS.isInBillingRetry,
        ),
        jsonRepresentation: toNullableString(
          nitroPurchase.renewalInfoIOS.jsonRepresentation,
        ),
        pendingUpgradeProductId: toNullableString(
          nitroPurchase.renewalInfoIOS.pendingUpgradeProductId,
        ),
        priceIncreaseStatus: toNullableString(
          nitroPurchase.renewalInfoIOS.priceIncreaseStatus,
        ),
        renewalDate: toNullableNumber(nitroPurchase.renewalInfoIOS.renewalDate),
        renewalOfferId: toNullableString(
          nitroPurchase.renewalInfoIOS.renewalOfferId,
        ),
        renewalOfferType: toNullableString(
          nitroPurchase.renewalInfoIOS.renewalOfferType,
        ),
        willAutoRenew: nitroPurchase.renewalInfoIOS.willAutoRenew ?? false,
      };
    } else {
      iosPurchase.renewalInfoIOS = null;
    }
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
  androidPurchase.developerPayloadAndroid = toNullableString(
    nitroPurchase.developerPayloadAndroid,
  );

  return androidPurchase as Purchase;
}

/**
 * Convert Nitro subscription status (iOS) to generated type
 */
export function convertNitroSubscriptionStatusToSubscriptionStatusIOS(
  nitro: NitroSubscriptionStatus,
): SubscriptionStatusIOS {
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
      RnIapConsole.error(
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
      RnIapConsole.error(
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
      introductoryPricePaymentModeIOS: PAYMENT_MODE_EMPTY,
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
