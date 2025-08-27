import { Linking, Platform } from 'react-native';
import { IapModule } from '../IapModule';
import type { PurchaseResult, ReceiptAndroid, ProductPurchase } from '../types';

// Type guards
export function isProductAndroid<T extends { platform?: string }>(
  item: unknown
): item is T & { platform: 'android' } {
  return (
    item != null &&
    typeof item === 'object' &&
    'platform' in item &&
    item.platform === 'android'
  );
}

/**
 * Deep link to subscriptions screen on Android.
 * @param {string} sku The product's SKU (on Android)
 * @returns {Promise<void>}
 */
export const deepLinkToSubscriptionsAndroid = async ({
  sku,
}: {
  sku: string;
}): Promise<void> => {
  if (Platform.OS !== 'android') {
    throw new Error('This method is only available on Android');
  }
  // Get package name from the native module
  const packageName = await IapModule.getPackageName();

  return Linking.openURL(
    `https://play.google.com/store/account/subscriptions?package=${packageName}&sku=${sku}`
  );
};

/**
 * Validate receipt for Android. NOTE: This method is here for debugging purposes only. Including
 * your access token in the binary you ship to users is potentially dangerous.
 * Use server side validation instead for your production builds
 * @param {string} packageName package name of your app.
 * @param {string} productId product id for your in app product.
 * @param {string} productToken token for your purchase (called 'token' in the API documentation).
 * @param {string} accessToken OAuth access token with androidpublisher scope. Required for authentication.
 * @param {boolean} isSub whether this is subscription or inapp. `true` for subscription.
 * @returns {Promise<ReceiptAndroid>}
 */
export const validateReceiptAndroid = async ({
  packageName,
  productId,
  productToken,
  accessToken,
  isSub,
}: {
  packageName: string;
  productId: string;
  productToken: string;
  accessToken: string;
  isSub?: boolean;
}): Promise<ReceiptAndroid> => {
  if (Platform.OS !== 'android') {
    throw new Error('This method is only available on Android');
  }

  const url = isSub
    ? `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptionsv2/tokens/${productToken}`
    : `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/products/${productId}/tokens/${productToken}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));

  if (!response.ok) {
    throw Object.assign(new Error(response.statusText), {
      statusCode: response.status,
    });
  }

  return response.json();
};

/**
 * Acknowledge a product (on Android.) No-op on iOS.
 * @param {string} token The product's token (on Android)
 * @returns {Promise<PurchaseResult | void>}
 */
export const acknowledgePurchaseAndroid = async ({
  token,
}: {
  token: string;
  developerPayload?: string;
}): Promise<PurchaseResult | boolean | void> => {
  if (Platform.OS !== 'android') {
    return Promise.resolve();
  }
  const result = await IapModule.acknowledgePurchase(token);
  // Convert to ProductPurchase format
  return {
    ...result,
    platform: 'android' as const,
  } as ProductPurchase;
};

/**
 * Consume a product (on Android.) No-op on iOS.
 * @param {string} token The product's token (on Android)
 * @returns {Promise<PurchaseResult | void>}
 */
export const consumeProductAndroid = async ({
  token,
}: {
  token: string;
}): Promise<PurchaseResult | void> => {
  if (Platform.OS !== 'android') {
    return Promise.resolve();
  }
  const result = await IapModule.consumeProduct(token);
  // Convert to ProductPurchase format
  return {
    ...result,
    platform: 'android' as const,
  } as ProductPurchase;
};
