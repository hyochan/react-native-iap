import {getAvailablePurchases} from '../';
import type {
  ActiveSubscription,
  PurchaseIOS,
  PurchaseAndroid,
} from '../types';

/**
 * Get active subscriptions
 * @param subscriptionIds - Optional array of subscription IDs to filter by
 * @returns Promise<ActiveSubscription[]> - Array of active subscriptions
 */
export const getActiveSubscriptions = async (
  subscriptionIds?: string[],
): Promise<ActiveSubscription[]> => {
  try {
    // Get available purchases and filter for subscriptions
    const purchases = await getAvailablePurchases();
    
    // Filter for subscriptions and map to ActiveSubscription format
    const subscriptions = purchases
      .filter((purchase) => {
        // Filter by subscription IDs if provided
        if (subscriptionIds && subscriptionIds.length > 0) {
          return subscriptionIds.includes(purchase.productId);
        }
        return true;
      })
      .map((purchase): ActiveSubscription => {
        const iosPurchase = purchase as PurchaseIOS;
        return {
          productId: purchase.productId,
          isActive: true, // If it's in availablePurchases, it's active
          expirationDateIOS: iosPurchase.expirationDateIOS ? new Date(iosPurchase.expirationDateIOS) : undefined,
          autoRenewingAndroid: (purchase as PurchaseAndroid).autoRenewingAndroid,
          environmentIOS: iosPurchase.environmentIOS,
          willExpireSoon: false, // Would need to calculate based on expiration date
          daysUntilExpirationIOS: iosPurchase.expirationDateIOS ? 
            Math.ceil((iosPurchase.expirationDateIOS - Date.now()) / (1000 * 60 * 60 * 24)) : undefined,
        };
      });
    
    return subscriptions;
  } catch (error) {
    console.error('Failed to get active subscriptions:', error);
    throw error;
  }
};

/**
 * Check if there are any active subscriptions
 * @param subscriptionIds - Optional array of subscription IDs to check
 * @returns Promise<boolean> - True if there are active subscriptions
 */
export const hasActiveSubscriptions = async (
  subscriptionIds?: string[],
): Promise<boolean> => {
  try {
    const activeSubscriptions = await getActiveSubscriptions(subscriptionIds);
    return activeSubscriptions.length > 0;
  } catch (error) {
    console.error('Failed to check active subscriptions:', error);
    return false;
  }
};