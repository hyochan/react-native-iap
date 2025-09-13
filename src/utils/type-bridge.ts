/**
 * Type Bridge Utilities
 *
 * This file provides conversion utilities between Nitro types (simple primitives)
 * and TypeScript union types (complex types.ts definitions).
 *
 * Purpose: Prevent type fragmentation between native (Nitro) and TypeScript sides
 */

import type {
  NitroProduct,
  NitroPurchase,
  NitroSubscriptionStatus,
} from '../specs/RnIap.nitro';
import type {
  Product,
  Purchase,
  SubscriptionProduct,
  SubscriptionStatusIOS,
} from '../types';
import {PurchaseState, ProductTypeIOS} from '../types';
import {Platform} from 'react-native';

// ============================================================================
// PRODUCT CONVERSION
// ============================================================================

/**
 * Convert NitroProduct (from native) to TypeScript Product (for library consumers)
 * This ensures all fields are properly mapped and accessible
 */
export function convertNitroProductToProduct(
  nitroProduct: NitroProduct,
): Product {
  // Create base product with common fields, handling platform casting
  const product: any = {
    id: nitroProduct.id,
    title: nitroProduct.title,
    description: nitroProduct.description,
    type: nitroProduct.type as 'inapp' | 'subs',
    displayName: nitroProduct.displayName,
    displayPrice: nitroProduct.displayPrice || '',
    currency: nitroProduct.currency || '',
    price: nitroProduct.price,
    platform: nitroProduct.platform as 'ios' | 'android',
  };

  // Add platform-specific fields based on current platform
  if (Platform.OS === 'ios') {
    // Map iOS fields from Nitro to TypeScript types
    const iosProduct = product as any; // Temporarily cast to access iOS fields
    iosProduct.isFamilyShareable = (nitroProduct as any).isFamilyShareableIOS;
    iosProduct.jsonRepresentation = (nitroProduct as any).jsonRepresentationIOS;
    // Detailed iOS product type - directly from the native field
    const typeIOSValue: string | undefined = (nitroProduct as any).typeIOS;

    switch (typeIOSValue) {
      case 'consumable':
        iosProduct.typeIOS = ProductTypeIOS.consumable;
        break;
      case 'nonConsumable':
        iosProduct.typeIOS = ProductTypeIOS.nonConsumable;
        break;
      case 'autoRenewableSubscription':
        iosProduct.typeIOS = ProductTypeIOS.autoRenewableSubscription;
        break;
      case 'nonRenewingSubscription':
        iosProduct.typeIOS = ProductTypeIOS.nonRenewingSubscription;
        break;
      default:
        iosProduct.typeIOS = undefined;
    }
    iosProduct.subscriptionPeriodUnitIOS =
      nitroProduct.subscriptionPeriodUnitIOS;
    iosProduct.subscriptionPeriodNumberIOS =
      nitroProduct.subscriptionPeriodNumberIOS;
    iosProduct.introductoryPriceIOS = nitroProduct.introductoryPriceIOS;
    iosProduct.introductoryPriceAsAmountIOS =
      nitroProduct.introductoryPriceAsAmountIOS;
    iosProduct.introductoryPricePaymentModeIOS =
      nitroProduct.introductoryPricePaymentModeIOS;
    iosProduct.introductoryPriceNumberOfPeriodsIOS =
      nitroProduct.introductoryPriceNumberOfPeriodsIOS;
    iosProduct.introductoryPriceSubscriptionPeriodIOS =
      nitroProduct.introductoryPriceSubscriptionPeriodIOS;
  } else if (Platform.OS === 'android') {
    // Map Android fields from Nitro to TypeScript types
    const androidProduct = product as any; // Temporarily cast to access Android fields
    androidProduct.originalPrice = (nitroProduct as any).originalPriceAndroid;
    androidProduct.originalPriceAmountMicros = (
      nitroProduct as any
    ).originalPriceAmountMicrosAndroid;
    androidProduct.introductoryPriceValue = (
      nitroProduct as any
    ).introductoryPriceValueAndroid;
    androidProduct.introductoryPriceCycles = (
      nitroProduct as any
    ).introductoryPriceCyclesAndroid;
    androidProduct.introductoryPricePeriod = (
      nitroProduct as any
    ).introductoryPricePeriodAndroid;
    androidProduct.subscriptionPeriod = (
      nitroProduct as any
    ).subscriptionPeriodAndroid;
    androidProduct.freeTrialPeriod = (
      nitroProduct as any
    ).freeTrialPeriodAndroid;

    // Map subscription offer details (parse from JSON string)
    if (nitroProduct.subscriptionOfferDetailsAndroid) {
      try {
        androidProduct.subscriptionOfferDetailsAndroid = JSON.parse(
          nitroProduct.subscriptionOfferDetailsAndroid,
        );
      } catch (e) {
        console.warn('Failed to parse subscription offer details:', e);
        androidProduct.subscriptionOfferDetailsAndroid = null;
      }
    }

    // Create flattened offer fields for easier access in example code
    androidProduct.oneTimePurchaseOfferFormattedPrice =
      nitroProduct.displayPrice;
    androidProduct.oneTimePurchaseOfferPriceAmountMicros = (
      nitroProduct as any
    ).originalPriceAmountMicrosAndroid;
    androidProduct.oneTimePurchaseOfferPriceCurrencyCode =
      nitroProduct.currency;
  }

  return product as Product;
}

// Note: Use nitroProducts.map(convertNitroProductToProduct) instead of a separate function

/**
 * Convert Product to SubscriptionProduct (type-safe casting)
 */
export function convertProductToSubscriptionProduct(
  product: Product,
): SubscriptionProduct {
  if (product.type !== 'subs') {
    console.warn(
      'Converting non-subscription product to SubscriptionProduct:',
      product.id,
    );
  }
  // Since SubscriptionProduct is now an intersection type, we need to cast properly
  return {
    ...product,
    type: 'subs' as const,
  } as SubscriptionProduct;
}

// ============================================================================
// PURCHASE CONVERSION
// ============================================================================

/**
 * Convert NitroPurchase (from native) to TypeScript Purchase (for library consumers)
 */
export function convertNitroPurchaseToPurchase(
  nitroPurchase: NitroPurchase,
): Purchase {
  // Create base purchase with common fields
  const purchase: any = {
    id: nitroPurchase.id,
    productId: nitroPurchase.productId,
    transactionDate: nitroPurchase.transactionDate,
    // Unified token (iOS JWS, Android purchaseToken)
    purchaseToken: nitroPurchase.purchaseToken,
    platform: nitroPurchase.platform as 'ios' | 'android',
    // Common fields from NitroPurchase
    quantity: nitroPurchase.quantity || 1,
    purchaseState:
      (nitroPurchase.purchaseState as PurchaseState) || PurchaseState.unknown,
    isAutoRenewing: nitroPurchase.isAutoRenewing || false,
  };

  // Add platform-specific fields
  if (Platform.OS === 'ios') {
    const iosPurchase = purchase as any;
    iosPurchase.quantityIOS = nitroPurchase.quantityIOS;
    iosPurchase.originalTransactionDateIOS =
      nitroPurchase.originalTransactionDateIOS;
    iosPurchase.originalTransactionIdentifierIOS =
      nitroPurchase.originalTransactionIdentifierIOS;
    iosPurchase.appAccountToken = nitroPurchase.appAccountToken;
    // Fill common quantity from iOS-specific quantity when available
    if (typeof nitroPurchase.quantityIOS === 'number') {
      purchase.quantity = nitroPurchase.quantityIOS;
    }
  } else if (Platform.OS === 'android') {
    const androidPurchase = purchase as any;
    androidPurchase.purchaseTokenAndroid = nitroPurchase.purchaseTokenAndroid;
    androidPurchase.dataAndroid = nitroPurchase.dataAndroid;
    androidPurchase.signatureAndroid = nitroPurchase.signatureAndroid;
    // Support both old and new field names for backward compatibility
    androidPurchase.autoRenewingAndroid =
      nitroPurchase.autoRenewingAndroid ?? nitroPurchase.isAutoRenewing;
    // no longer surface purchaseStateAndroid on TS side
    androidPurchase.isAcknowledgedAndroid = nitroPurchase.isAcknowledgedAndroid;
    androidPurchase.packageNameAndroid = nitroPurchase.packageNameAndroid;
    androidPurchase.obfuscatedAccountIdAndroid =
      nitroPurchase.obfuscatedAccountIdAndroid;
    androidPurchase.obfuscatedProfileIdAndroid =
      nitroPurchase.obfuscatedProfileIdAndroid;

    // Use the common isAutoRenewing field from NitroPurchase
    purchase.isAutoRenewing = nitroPurchase.isAutoRenewing;

    // Map numeric Android purchase state to common PurchaseState
    switch (nitroPurchase.purchaseStateAndroid) {
      case 1:
        purchase.purchaseState = PurchaseState.purchased;
        break;
      case 2:
        purchase.purchaseState = PurchaseState.pending;
        break;
      case 0:
      default:
        purchase.purchaseState = PurchaseState.unknown;
        break;
    }
  }

  return purchase as Purchase;
}

// Note: Use nitroPurchases.map(convertNitroPurchaseToPurchase) instead of a separate function

// ============================================================================
// SUBSCRIPTION STATUS CONVERSION (iOS)
// ============================================================================

export function convertNitroSubscriptionStatusToSubscriptionStatusIOS(
  nitro: NitroSubscriptionStatus,
): SubscriptionStatusIOS {
  return {
    state: nitro.state,
    platform: 'ios',
    renewalInfo: nitro.renewalInfo
      ? {
          autoRenewStatus: nitro.renewalInfo.autoRenewStatus,
          autoRenewPreference: nitro.renewalInfo.autoRenewPreference,
          expirationReason: nitro.renewalInfo.expirationReason,
          gracePeriodExpirationDate:
            nitro.renewalInfo.gracePeriodExpirationDate,
          currentProductID: nitro.renewalInfo.currentProductID,
          platform: 'ios',
        }
      : undefined,
  };
}

// ============================================================================
// TYPE VALIDATION
// ============================================================================

/**
 * Validate that a NitroProduct has all required fields for conversion
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
 * Validate that a NitroPurchase has all required fields for conversion
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

// ============================================================================
// TYPE SYNCHRONIZATION HELPERS
// ============================================================================

/**
 * Check if Nitro types and TypeScript types are synchronized
 * This function can be run in development to detect type mismatches
 */
export function checkTypeSynchronization(): {
  isSync: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  try {
    // Simple test: can we convert between types?
    const testNitroProduct: NitroProduct = {
      id: 'test',
      title: 'Test',
      description: 'Test',
      type: 'inapp',
      platform: 'ios',
      displayPrice: '$1.00',
      currency: 'USD',
    };

    const converted = convertNitroProductToProduct(testNitroProduct);

    if (!converted.id || !converted.title) {
      issues.push('Type conversion failed');
    }
  } catch (error) {
    issues.push(`Type conversion error: ${error}`);
  }

  return {
    isSync: issues.length === 0,
    issues,
  };
}
