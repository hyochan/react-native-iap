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
