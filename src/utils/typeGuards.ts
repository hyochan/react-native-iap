/**
 * Type guard functions for react-native-iap
 */

import {Platform} from 'react-native';

import type {
  Product,
  ProductPurchase,
  ProductWithPlatform,
  Purchase,
  PurchaseWithPlatform,
} from '../types';

/**
 * Type guard to check if a product is from iOS
 */
export function isProductIos(
  product: Product | ProductWithPlatform,
): product is Product & {platform?: 'ios'} {
  return Platform.OS === 'ios' || (product as any).platform === 'ios';
}

/**
 * Type guard to check if a product is from Android
 */
export function isProductAndroid(
  product: Product | ProductWithPlatform,
): product is Product & {platform?: 'android'} {
  return Platform.OS === 'android' || (product as any).platform === 'android';
}

/**
 * Type guard to check if a purchase is from iOS
 */
export function isPurchaseIos(
  purchase: Purchase | PurchaseWithPlatform,
): purchase is Purchase & {platform?: 'ios'} {
  return Platform.OS === 'ios' || (purchase as any).platform === 'ios';
}

/**
 * Type guard to check if a purchase is from Android
 */
export function isPurchaseAndroid(
  purchase: Purchase | PurchaseWithPlatform,
): purchase is Purchase & {platform?: 'android'} {
  return Platform.OS === 'android' || (purchase as any).platform === 'android';
}

/**
 * Type guard to check if a purchase is from Amazon
 */
export function isPurchaseAmazon(
  purchase: Purchase | PurchaseWithPlatform,
): purchase is Purchase & {platform?: 'amazon'} {
  return (
    (purchase as any).platform === 'amazon' || !!(purchase as any).userIdAmazon
  );
}

/**
 * Type guard to check if an item is a ProductPurchase
 */
export function isProductPurchase(item: unknown): item is ProductPurchase {
  return (
    item != null &&
    typeof item === 'object' &&
    'productId' in item &&
    'transactionDate' in item &&
    'transactionReceipt' in item
  );
}

/**
 * Helper to get the product ID from either field name
 */
export function getProductId(item: {productId?: string; id?: string}): string {
  return item.productId || item.id || '';
}

/**
 * Helper to get the display price from either field name
 */
export function getDisplayPrice(item: {
  localizedPrice?: string;
  displayPrice?: string;
}): string {
  return item.displayPrice || item.localizedPrice || '';
}
