import {NativeModules} from 'react-native';

import {enhancedFetch} from '../internal';
import type {Product, ProrationModesAmazon, Purchase, Sku} from '../types';
import type {
  AmazonLicensingStatus,
  ReceiptType,
  UserDataAmazon,
} from '../types/amazon';

import type {NativeModuleProps} from './common';
// ----------

type GetUser = () => Promise<UserDataAmazon>;
type FlushFailedPurchasesCachedAsPending = () => Promise<boolean>;
type GetItemsByType = (type: string, skus: Sku[]) => Promise<Product[]>;
type GetAvailableItems = () => Promise<Purchase[]>;
type BuyItemByType = (
  sku: Sku,
  proration: ProrationModesAmazon,
) => Promise<Purchase>;

type AcknowledgePurchase = (
  purchaseToken: string,
  developerPayloadAndroid?: string,
) => Promise<boolean>;

type ConsumeProduct = (
  purchaseToken: string,
  developerPayloadAndroid?: string,
) => Promise<boolean>;

type StartListening = () => Promise<void>;

export interface AmazonModuleProps extends NativeModuleProps {
  getUser: GetUser;
  flushFailedPurchasesCachedAsPending: FlushFailedPurchasesCachedAsPending;
  getItemsByType: GetItemsByType;
  getAvailableItems: GetAvailableItems;
  buyItemByType: BuyItemByType;
  acknowledgePurchase: AcknowledgePurchase;
  consumeProduct: ConsumeProduct;
  /** @deprecated to be renamed to sendUnconsumedPurchases if not removed completely */
  startListening: StartListening;
  verifyLicense: () => Promise<AmazonLicensingStatus>;
  deepLinkToSubscriptions: (isAmazonDevice: boolean) => Promise<void>;
}

export const AmazonModule =
  NativeModules.RNIapAmazonModule as AmazonModuleProps;

/**
 * Validate receipt for Amazon. NOTE: This method is here for debugging purposes only. Including
 * your developer secret in the binary you ship to users is potentially dangerous.
 * Use server side validation instead for your production builds
 * @param {string} developerSecret: from the Amazon developer console.
 * @param {string} userId who purchased the item.
 * @param {string} receiptId long obfuscated string returned when purchasing the item
 * @param {boolean} useSandbox Defaults to true, use sandbox environment or production.
 * @returns {Promise<object>}
 */
export const validateReceiptAmazon = async ({
  developerSecret,
  userId,
  receiptId,
  useSandbox = true,
}: {
  developerSecret: string;
  userId: string;
  receiptId: string;
  useSandbox: boolean;
}): Promise<ReceiptType> => {
  const sandBoxUrl = useSandbox ? 'sandbox/' : '';
  const url = `https://appstore-sdk.amazon.com/${sandBoxUrl}version/1.0/verifyReceiptId/developer/${developerSecret}/user/${userId}/receiptId/${receiptId}`;

  return await enhancedFetch<ReceiptType>(url);
};

/**
 * Returns the status of verifying app's license @see AmazonLicensingStatus
 */
export const verifyLicense = async (): Promise<AmazonLicensingStatus> =>
  AmazonModule.verifyLicense();

/**
 * Deep link to subscriptions screen on Android.
 * @param {string} sku The product's SKU (on Android)
 * @returns {Promise<void>}
 */
export const deepLinkToSubscriptionsAmazon = async ({
  isAmazonDevice,
}: {
  isAmazonDevice: boolean;
}): Promise<void> => AmazonModule.deepLinkToSubscriptions(isAmazonDevice);
