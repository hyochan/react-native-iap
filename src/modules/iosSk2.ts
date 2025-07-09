import {NativeModules} from 'react-native';

import type {Product, ProductPurchase, Sku} from '../types';
import type {
  PaymentDiscountSk2,
  ProductSk2,
  ProductStatus,
  RefundRequestStatus,
  TransactionSk2,
} from '../types/appleSk2';

import type {NativeModuleProps} from './common';
const {RNIapIosSk2} = NativeModules;

type getItems = (skus: Sku[]) => Promise<ProductSk2[]>;

type getAvailableItems = (
  alsoPublishToEventListener?: boolean,
  onlyIncludeActiveItems?: boolean,
) => Promise<TransactionSk2[]>;

export type BuyProduct = (
  sku: Sku,
  andDangerouslyFinishTransactionAutomaticallyIOS: boolean,
  applicationUsername: string | undefined,
  quantity: number,
  withOffer: Record<keyof PaymentDiscountSk2, string> | undefined,
) => Promise<TransactionSk2>;

type clearTransaction = () => Promise<void>;
type clearProducts = () => Promise<void>;
type promotedProduct = () => Promise<Product | null>;
type buyPromotedProduct = () => Promise<void>;

type finishTransaction = (transactionIdentifier: string) => Promise<boolean>;

type getPendingTransactions = () => Promise<ProductPurchase[]>;
type presentCodeRedemptionSheet = () => Promise<null>;
type showManageSubscriptions = () => Promise<null>;
type getStorefront = () => Promise<string>;

export interface IosModulePropsSk2 extends NativeModuleProps {
  isAvailable(): number;
  latestTransaction(sku: string): Promise<TransactionSk2>;
  currentEntitlement(sku: string): Promise<TransactionSk2>;
  subscriptionStatus(sku: string): Promise<ProductStatus[]>;
  isEligibleForIntroOffer(groupID: string): Promise<Boolean>;
  sync(): Promise<null>;
  getItems: getItems;
  getAvailableItems: getAvailableItems;
  buyProduct: BuyProduct;
  clearTransaction: clearTransaction;
  clearProducts: clearProducts;
  promotedProduct: promotedProduct;
  buyPromotedProduct: buyPromotedProduct;
  finishTransaction: finishTransaction;
  getPendingTransactions: getPendingTransactions;
  presentCodeRedemptionSheet: presentCodeRedemptionSheet;
  showManageSubscriptions: showManageSubscriptions;
  disable: () => Promise<null>;
  beginRefundRequest: (sku: string) => Promise<RefundRequestStatus>;
  getStorefront: getStorefront;
  getReceiptData: () => Promise<string>;
  isTransactionVerified: (sku: string) => Promise<boolean>;
  getTransactionJws: (sku: string) => Promise<string>;
  validateReceiptIos: (sku: string) => Promise<{
    isValid: boolean;
    receiptData: string;
    jwsRepresentation: string;
    latestTransaction?: TransactionSk2;
  }>;
}

/**
 * Sync state with Appstore (iOS only)
 * https://developer.apple.com/documentation/storekit/appstore/3791906-sync
 */
export const sync = (): Promise<null> => RNIapIosSk2.sync();

/**
 *
 */
export const isEligibleForIntroOffer = (groupID: string): Promise<Boolean> =>
  RNIapIosSk2.isEligibleForIntroOffer(groupID);

/**
 *
 */

export const subscriptionStatus = (sku: string): Promise<ProductStatus[]> =>
  RNIapIosSk2.subscriptionStatus(sku);

/**
 *
 */
export const currentEntitlement = (sku: string): Promise<TransactionSk2> =>
  RNIapIosSk2.currentEntitlement(sku);

/**
 *
 */
export const latestTransaction = (sku: string): Promise<TransactionSk2> =>
  RNIapIosSk2.latestTransaction(sku);

/**
 *
 */
export const beginRefundRequest = (sku: string): Promise<RefundRequestStatus> =>
  RNIapIosSk2.beginRefundRequest(sku);

/**
 *
 */
export const showManageSubscriptions = (): Promise<null> =>
  RNIapIosSk2.showManageSubscriptions();

/**
 *
 */
export const finishTransaction = (
  transactionIdentifier: string,
): Promise<Boolean> => RNIapIosSk2.finishTransaction(transactionIdentifier);

/**
 * Get the receipt data from the iOS device.
 * This returns the base64 encoded receipt data which can be sent to your server
 * for verification with Apple's server.
 *
 * NOTE: For proper security, always verify receipts on your server using
 * Apple's verifyReceipt endpoint, not directly from the app.
 *
 * @returns {Promise<string>} Base64 encoded receipt data
 */
export const getReceiptIos = (): Promise<string> =>
  RNIapIosSk2.getReceiptData();

/**
 * Check if a transaction is verified through StoreKit 2.
 * StoreKit 2 performs local verification of transaction JWS signatures.
 *
 * @param {string} sku The product's SKU (on iOS)
 * @returns {Promise<boolean>} True if the transaction is verified
 */
export const isTransactionVerified = (sku: string): Promise<boolean> =>
  RNIapIosSk2.isTransactionVerified(sku);

/**
 * Get the JWS representation of a purchase for server-side verification.
 * The JWS (JSON Web Signature) can be verified on your server using Apple's public keys.
 *
 * @param {string} sku The product's SKU (on iOS)
 * @returns {Promise<string>} JWS representation of the transaction
 */
export const getTransactionJws = (sku: string): Promise<string> =>
  RNIapIosSk2.getTransactionJws(sku);

/**
 * Validate receipt for iOS using StoreKit 2's built-in verification.
 * Returns receipt data and verification information to help with server-side validation.
 *
 * NOTE: For proper security, Apple recommends verifying receipts on your server using
 * the verifyReceipt endpoint rather than relying solely on client-side verification.
 *
 * @param {string} sku The product's SKU (on iOS)
 * @returns {Promise<{
 *   isValid: boolean;
 *   receiptData: string;
 *   jwsRepresentation: string;
 *   latestTransaction?: TransactionSk2;
 * }>}
 */
export const validateReceiptIos = async (
  sku: string,
): Promise<{
  isValid: boolean;
  receiptData: string;
  jwsRepresentation: string;
  latestTransaction?: TransactionSk2;
}> => {
  const result = await RNIapIosSk2.validateReceiptIos(sku);
  return result;
};
