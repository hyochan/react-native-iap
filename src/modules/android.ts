import {Linking, NativeModules} from 'react-native';

import {
  checkNativeAndroidAvailable,
  getAndroidModule,
  isAndroid,
} from '../internal';
import {
  InstallSourceAndroid,
  Product,
  ProductType,
  Purchase,
  PurchaseResult,
  ReplacementModesAndroid,
  Sku,
} from '../types';
import type * as Android from '../types/android';

import type {NativeModuleProps} from './common';

const {RNIapModule} = NativeModules;

type FlushFailedPurchasesCachedAsPending = () => Promise<boolean>;

type GetItemsByType = <T = Product>(
  type: ProductType,
  skus: Sku[],
) => Promise<T[]>;

type GetAvailableItemsByType = <T = Purchase>(
  type: ProductType,
) => Promise<T[]>;

type GetPurchaseHistoryByType = <T = Purchase>(
  type: ProductType,
) => Promise<T[]>;

export type BuyItemByType = (
  type: string,
  skus: Sku[],
  purchaseToken: string | undefined,
  replacementModeAndroid: ReplacementModesAndroid | -1,
  obfuscatedAccountId: string | undefined,
  obfuscatedProfileId: string | undefined,
  subscriptionOffers: string[],
  isOfferPersonalized: boolean,
) => Promise<Purchase>;

type AcknowledgePurchase = (
  purchaseToken: string,
  developerPayloadAndroid?: string,
) => Promise<PurchaseResult | boolean>;

type ConsumeProduct = (
  purchaseToken: string,
  developerPayloadAndroid?: string,
) => Promise<PurchaseResult | boolean>;

type StartListening = () => Promise<void>;
type GetPackageName = () => Promise<string>;
type GetStorefront = () => Promise<string>;

export interface AndroidModuleProps extends NativeModuleProps {
  flushFailedPurchasesCachedAsPending: FlushFailedPurchasesCachedAsPending;
  getItemsByType: GetItemsByType;
  getAvailableItemsByType: GetAvailableItemsByType;
  getPurchaseHistoryByType: GetPurchaseHistoryByType;
  buyItemByType: BuyItemByType;
  acknowledgePurchase: AcknowledgePurchase;
  consumeProduct: ConsumeProduct;
  /** @deprecated to be renamed to sendUnconsumedPurchases if not removed completely */
  startListening: StartListening;
  getPackageName: GetPackageName;
  getStorefront: GetStorefront;
  isFeatureSupported: (feature: Android.FeatureType) => Promise<boolean>;
}

export const AndroidModule = NativeModules.RNIapModule as AndroidModuleProps;

export const getInstallSourceAndroid = (): InstallSourceAndroid => {
  return RNIapModule
    ? InstallSourceAndroid.GOOGLE_PLAY
    : InstallSourceAndroid.AMAZON;
};

/**
 * Deep link to subscriptions screen on Android.
 * @param {string} sku The product's SKU (on Android)
 * @returns {Promise<void>}
 */
export const deepLinkToSubscriptionsAndroid = async ({
  sku,
}: {
  sku: Sku;
}): Promise<void> => {
  checkNativeAndroidAvailable();

  return Linking.openURL(
    `https://play.google.com/store/account/subscriptions?package=${await RNIapModule.getPackageName()}&sku=${sku}`,
  );
};

/**
 * Validate receipt for Android. NOTE: This method is here for debugging purposes only. Including
 * your access token in the binary you ship to users is potentially dangerous.
 * Use server side validation instead for your production builds
 * @param {string} packageName package name of your app.
 * @param {string} productId product id for your in app product.
 * @param {string} productToken token for your purchase.
 * @param {string} accessToken accessToken from googleApis.
 * @param {boolean} isSub whether this is subscription or inapp. `true` for subscription.
 * @returns {Promise<object>}
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
}): Promise<Android.ReceiptType> => {
  const type = isSub ? 'subscriptions' : 'products';

  const url =
    'https://androidpublisher.googleapis.com/androidpublisher/v3/applications' +
    `/${packageName}/purchases/${type}/${productId}` +
    `/tokens/${productToken}?access_token=${accessToken}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

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
export const acknowledgePurchaseAndroid = ({
  token,
  developerPayload,
}: {
  token: string;
  developerPayload?: string;
}): Promise<PurchaseResult | boolean | void> => {
  return getAndroidModule().acknowledgePurchase(token, developerPayload);
};

/**
 * Acknowledge a product (on Android.) No-op on iOS.
 * @param {Android.FeatureType} feature to be checked
 * @returns {Promise<boolean>}
 */
export const isFeatureSupported = (
  feature: Android.FeatureType,
): Promise<boolean> => {
  if (!(isAndroid && RNIapModule)) {
    return Promise.reject('This is only available on Android clients');
  }
  return AndroidModule.isFeatureSupported(feature);
};
