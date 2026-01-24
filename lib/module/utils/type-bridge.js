"use strict";

/**
 * Type Bridge Utilities
 *
 * Converts the loose Nitro shapes coming from native into the strongly typed
 * structures that our generated TypeScript types expect.
 */

import { RnIapConsole } from "./debug.js";
const PLATFORM_IOS = 'ios';
const PLATFORM_ANDROID = 'android';
const STORE_UNKNOWN = 'unknown';
const STORE_APPLE = 'apple';
const STORE_GOOGLE = 'google';
const STORE_HORIZON = 'horizon';
const PRODUCT_TYPE_SUBS = 'subs';
const PRODUCT_TYPE_IN_APP = 'in-app';
const PURCHASE_STATE_PENDING = 'pending';
const PURCHASE_STATE_PURCHASED = 'purchased';
const PURCHASE_STATE_UNKNOWN = 'unknown';
const PAYMENT_MODE_EMPTY = 'empty';
const PAYMENT_MODE_FREE_TRIAL = 'free-trial';
const PAYMENT_MODE_PAY_AS_YOU_GO = 'pay-as-you-go';
const PAYMENT_MODE_PAY_UP_FRONT = 'pay-up-front';
const SUBSCRIPTION_PERIOD_DAY = 'day';
const SUBSCRIPTION_PERIOD_WEEK = 'week';
const SUBSCRIPTION_PERIOD_MONTH = 'month';
const SUBSCRIPTION_PERIOD_YEAR = 'year';
const SUBSCRIPTION_PERIOD_EMPTY = 'empty';
const DEFAULT_JSON_REPR = '{}';
function normalizePlatform(value) {
  return value?.toLowerCase() === PLATFORM_IOS ? PLATFORM_IOS : PLATFORM_ANDROID;
}
function normalizeStore(value) {
  switch (value?.toLowerCase()) {
    case 'apple':
      return STORE_APPLE;
    case 'google':
      return STORE_GOOGLE;
    case 'horizon':
      return STORE_HORIZON;
    default:
      return STORE_UNKNOWN;
  }
}
function normalizeProductType(value) {
  return value?.toLowerCase() === PRODUCT_TYPE_SUBS ? PRODUCT_TYPE_SUBS : PRODUCT_TYPE_IN_APP;
}
function normalizeProductTypeIOS(value) {
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
        RnIapConsole.warn(`[react-native-iap] Unknown iOS product type "${value}", defaulting to NonConsumable.`);
      }
      return 'non-consumable';
  }
}
function normalizePaymentMode(value) {
  switch ((value ?? '').toUpperCase()) {
    case 'FREE_TRIAL':
    case 'FREETRIAL':
    case 'FREE-TRIAL':
      return PAYMENT_MODE_FREE_TRIAL;
    case 'PAY_AS_YOU_GO':
    case 'PAYASYOUGO':
    case 'PAY-AS-YOU-GO':
      return PAYMENT_MODE_PAY_AS_YOU_GO;
    case 'PAY_UP_FRONT':
    case 'PAYUPFRONT':
    case 'PAY-UP-FRONT':
      return PAYMENT_MODE_PAY_UP_FRONT;
    default:
      return PAYMENT_MODE_EMPTY;
  }
}
function normalizeSubscriptionPeriod(value) {
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
function normalizePurchaseState(state) {
  if (typeof state === 'string') {
    switch (state.toLowerCase()) {
      case PURCHASE_STATE_PURCHASED:
      case 'restored':
        // Restored purchases are treated as purchased
        return PURCHASE_STATE_PURCHASED;
      case PURCHASE_STATE_PENDING:
      case 'deferred':
        // Deferred is treated as pending
        return PURCHASE_STATE_PENDING;
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
function toNullableString(value) {
  if (value == null) return null;
  return String(value);
}
function toNullableNumber(value) {
  if (value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}
function toNullableBoolean(value) {
  if (value == null) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return null;
}
function parseSubscriptionOffers(value) {
  if (!value) return undefined;

  // If it's already an array (from mocks), return it as-is
  if (Array.isArray(value)) {
    return value;
  }

  // Otherwise, try to parse it as JSON string
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (error) {
    RnIapConsole.warn('Failed to parse subscriptionOfferDetailsAndroid:', error);
  }
  return undefined;
}

/**
 * Convert NitroProduct (from native) to generated Product type
 */
export function convertNitroProductToProduct(nitroProduct) {
  const platform = normalizePlatform(nitroProduct.platform);
  const type = normalizeProductType(nitroProduct.type);
  const base = {
    id: nitroProduct.id,
    title: nitroProduct.title,
    description: nitroProduct.description,
    type,
    displayName: nitroProduct.displayName ?? null,
    displayPrice: nitroProduct.displayPrice ?? '',
    currency: nitroProduct.currency ?? '',
    price: toNullableNumber(nitroProduct.price),
    debugDescription: null,
    platform
  };
  if (platform === PLATFORM_IOS) {
    const iosProduct = {
      ...base,
      displayNameIOS: nitroProduct.displayName ?? nitroProduct.title,
      isFamilyShareableIOS: Boolean(nitroProduct.isFamilyShareableIOS ?? false),
      jsonRepresentationIOS: nitroProduct.jsonRepresentationIOS ?? DEFAULT_JSON_REPR,
      typeIOS: normalizeProductTypeIOS(nitroProduct.typeIOS),
      subscriptionInfoIOS: undefined
    };
    iosProduct.introductoryPriceAsAmountIOS = toNullableString(nitroProduct.introductoryPriceAsAmountIOS);
    iosProduct.introductoryPriceIOS = toNullableString(nitroProduct.introductoryPriceIOS);
    iosProduct.introductoryPriceNumberOfPeriodsIOS = toNullableString(nitroProduct.introductoryPriceNumberOfPeriodsIOS);
    iosProduct.introductoryPricePaymentModeIOS = normalizePaymentMode(nitroProduct.introductoryPricePaymentModeIOS);
    iosProduct.introductoryPriceSubscriptionPeriodIOS = normalizeSubscriptionPeriod(nitroProduct.introductoryPriceSubscriptionPeriodIOS);
    iosProduct.subscriptionPeriodNumberIOS = toNullableString(nitroProduct.subscriptionPeriodNumberIOS);
    iosProduct.subscriptionPeriodUnitIOS = normalizeSubscriptionPeriod(nitroProduct.subscriptionPeriodUnitIOS);

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
    return iosProduct;
  }
  const androidProduct = {
    ...base,
    nameAndroid: nitroProduct.nameAndroid ?? nitroProduct.title,
    oneTimePurchaseOfferDetailsAndroid: nitroProduct.oneTimePurchaseOfferDetailsAndroid ?? null,
    subscriptionOfferDetailsAndroid: parseSubscriptionOffers(nitroProduct.subscriptionOfferDetailsAndroid)
  };
  if (type === PRODUCT_TYPE_SUBS) {
    if (!Array.isArray(androidProduct.subscriptionOfferDetailsAndroid)) {
      androidProduct.subscriptionOfferDetailsAndroid = [];
    }
  }
  return androidProduct;
}

/**
 * Convert Product to ProductSubscription (type-safe casting helper)
 */
export function convertProductToProductSubscription(product) {
  if (product.type !== PRODUCT_TYPE_SUBS) {
    RnIapConsole.warn('Converting non-subscription product to ProductSubscription:', product.id);
  }
  const output = {
    ...product
  };
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
export function convertNitroPurchaseToPurchase(nitroPurchase) {
  const platform = normalizePlatform(nitroPurchase.platform);
  let purchaseState = normalizePurchaseState(nitroPurchase.purchaseState ?? nitroPurchase.purchaseStateAndroid);

  // Fallback for unknown purchase state
  if (purchaseState === PURCHASE_STATE_UNKNOWN && nitroPurchase.purchaseStateAndroid != null) {
    purchaseState = normalizePurchaseState(nitroPurchase.purchaseStateAndroid);
  }
  const store = normalizeStore(nitroPurchase.store);
  if (platform === PLATFORM_IOS) {
    const iosPurchase = {
      id: nitroPurchase.id,
      productId: nitroPurchase.productId,
      transactionDate: nitroPurchase.transactionDate ?? Date.now(),
      purchaseToken: nitroPurchase.purchaseToken ?? null,
      platform,
      store,
      quantity: nitroPurchase.quantity ?? 1,
      purchaseState,
      isAutoRenewing: Boolean(nitroPurchase.isAutoRenewing),
      // PurchaseIOS requires both id and transactionId (they are the same value)
      transactionId: nitroPurchase.id,
      quantityIOS: toNullableNumber(nitroPurchase.quantityIOS),
      originalTransactionDateIOS: toNullableNumber(nitroPurchase.originalTransactionDateIOS),
      originalTransactionIdentifierIOS: toNullableString(nitroPurchase.originalTransactionIdentifierIOS),
      appAccountToken: toNullableString(nitroPurchase.appAccountToken),
      appBundleIdIOS: toNullableString(nitroPurchase.appBundleIdIOS),
      countryCodeIOS: toNullableString(nitroPurchase.countryCodeIOS),
      currencyCodeIOS: toNullableString(nitroPurchase.currencyCodeIOS),
      currencySymbolIOS: toNullableString(nitroPurchase.currencySymbolIOS),
      environmentIOS: toNullableString(nitroPurchase.environmentIOS),
      expirationDateIOS: toNullableNumber(nitroPurchase.expirationDateIOS),
      isUpgradedIOS: toNullableBoolean(nitroPurchase.isUpgradedIOS),
      offerIOS: nitroPurchase.offerIOS ? (() => {
        try {
          return JSON.parse(nitroPurchase.offerIOS);
        } catch {
          return null;
        }
      })() : null,
      ownershipTypeIOS: toNullableString(nitroPurchase.ownershipTypeIOS),
      reasonIOS: toNullableString(nitroPurchase.reasonIOS),
      reasonStringRepresentationIOS: toNullableString(nitroPurchase.reasonStringRepresentationIOS),
      revocationDateIOS: toNullableNumber(nitroPurchase.revocationDateIOS),
      revocationReasonIOS: toNullableString(nitroPurchase.revocationReasonIOS),
      storefrontCountryCodeIOS: toNullableString(nitroPurchase.storefrontCountryCodeIOS),
      subscriptionGroupIdIOS: toNullableString(nitroPurchase.subscriptionGroupIdIOS),
      transactionReasonIOS: toNullableString(nitroPurchase.transactionReasonIOS),
      webOrderLineItemIdIOS: toNullableString(nitroPurchase.webOrderLineItemIdIOS),
      renewalInfoIOS: nitroPurchase.renewalInfoIOS ? {
        autoRenewPreference: toNullableString(nitroPurchase.renewalInfoIOS.autoRenewPreference),
        expirationReason: toNullableString(nitroPurchase.renewalInfoIOS.expirationReason),
        gracePeriodExpirationDate: toNullableNumber(nitroPurchase.renewalInfoIOS.gracePeriodExpirationDate),
        isInBillingRetry: toNullableBoolean(nitroPurchase.renewalInfoIOS.isInBillingRetry),
        jsonRepresentation: toNullableString(nitroPurchase.renewalInfoIOS.jsonRepresentation),
        pendingUpgradeProductId: toNullableString(nitroPurchase.renewalInfoIOS.pendingUpgradeProductId),
        priceIncreaseStatus: toNullableString(nitroPurchase.renewalInfoIOS.priceIncreaseStatus),
        renewalDate: toNullableNumber(nitroPurchase.renewalInfoIOS.renewalDate),
        renewalOfferId: toNullableString(nitroPurchase.renewalInfoIOS.renewalOfferId),
        renewalOfferType: toNullableString(nitroPurchase.renewalInfoIOS.renewalOfferType),
        willAutoRenew: nitroPurchase.renewalInfoIOS.willAutoRenew ?? false
      } : null
    };
    return iosPurchase;
  }
  const androidPurchase = {
    id: nitroPurchase.id,
    productId: nitroPurchase.productId,
    transactionDate: nitroPurchase.transactionDate ?? Date.now(),
    purchaseToken: nitroPurchase.purchaseToken ?? nitroPurchase.purchaseTokenAndroid ?? null,
    platform,
    store,
    quantity: nitroPurchase.quantity ?? 1,
    purchaseState,
    isAutoRenewing: Boolean(nitroPurchase.isAutoRenewing),
    // PurchaseAndroid has optional transactionId (may differ from id/orderId)
    transactionId: toNullableString(nitroPurchase.id),
    autoRenewingAndroid: toNullableBoolean(nitroPurchase.autoRenewingAndroid ?? nitroPurchase.isAutoRenewing),
    dataAndroid: toNullableString(nitroPurchase.dataAndroid),
    signatureAndroid: toNullableString(nitroPurchase.signatureAndroid),
    isAcknowledgedAndroid: toNullableBoolean(nitroPurchase.isAcknowledgedAndroid),
    packageNameAndroid: toNullableString(nitroPurchase.packageNameAndroid),
    obfuscatedAccountIdAndroid: toNullableString(nitroPurchase.obfuscatedAccountIdAndroid),
    obfuscatedProfileIdAndroid: toNullableString(nitroPurchase.obfuscatedProfileIdAndroid),
    developerPayloadAndroid: toNullableString(nitroPurchase.developerPayloadAndroid),
    isSuspendedAndroid: toNullableBoolean(nitroPurchase.isSuspendedAndroid)
  };
  return androidPurchase;
}

/**
 * Convert Nitro subscription status (iOS) to generated type
 */
export function convertNitroSubscriptionStatusToSubscriptionStatusIOS(nitro) {
  return {
    state: String(nitro.state ?? ''),
    renewalInfo: nitro.renewalInfo ? {
      autoRenewPreference: toNullableString(nitro.renewalInfo.autoRenewPreference),
      jsonRepresentation: JSON.stringify(nitro.renewalInfo),
      willAutoRenew: Boolean(nitro.renewalInfo.autoRenewStatus)
    } : undefined
  };
}

/**
 * Validate that a NitroProduct has the expected shape
 */
export function validateNitroProduct(nitroProduct) {
  if (!nitroProduct || typeof nitroProduct !== 'object') {
    return false;
  }
  const required = ['id', 'title', 'description', 'type', 'platform'];
  for (const field of required) {
    if (!(field in nitroProduct) || nitroProduct[field] == null) {
      RnIapConsole.error(`NitroProduct missing required field: ${field}`, nitroProduct);
      return false;
    }
  }
  return true;
}

/**
 * Validate that a NitroPurchase has the expected shape
 */
export function validateNitroPurchase(nitroPurchase) {
  if (!nitroPurchase || typeof nitroPurchase !== 'object') {
    return false;
  }
  const required = ['id', 'productId', 'transactionDate', 'platform'];
  for (const field of required) {
    if (!(field in nitroPurchase) || nitroPurchase[field] == null) {
      RnIapConsole.error(`NitroPurchase missing required field: ${field}`, nitroPurchase);
      return false;
    }
  }
  return true;
}

/**
 * Development helper to check that type conversions stay valid
 */
export function checkTypeSynchronization() {
  const issues = [];
  try {
    const testNitroProduct = {
      id: 'test',
      title: 'Test',
      description: 'Test product',
      type: 'inapp',
      platform: PLATFORM_IOS,
      displayPrice: '$1.00',
      currency: 'USD',
      price: 1,
      introductoryPricePaymentModeIOS: PAYMENT_MODE_EMPTY
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
    issues
  };
}
//# sourceMappingURL=type-bridge.js.map