import { Platform } from 'react-native';
import { getAvailablePurchases } from '../index';

export interface ActiveSubscription {
  productId: string;
  isActive: boolean;
  expirationDateIOS?: Date;
  autoRenewingAndroid?: boolean;
  environmentIOS?: string;
  willExpireSoon?: boolean;
  daysUntilExpirationIOS?: number;
}

/**
 * Get all active subscriptions with detailed information
 * @param subscriptionIds - Optional array of subscription product IDs to filter. If not provided, returns all active subscriptions.
 * @returns Promise<ActiveSubscription[]> array of active subscriptions with details
 */
export const getActiveSubscriptions = async (
  subscriptionIds?: string[]
): Promise<ActiveSubscription[]> => {
  try {
    const purchases = await getAvailablePurchases();
    console.log('[getActiveSubscriptions] Available purchases:', purchases);
    console.log(
      '[getActiveSubscriptions] Looking for subscription IDs:',
      subscriptionIds
    );

    const currentTime = Date.now();
    const activeSubscriptions: ActiveSubscription[] = [];

    // Filter purchases to find active subscriptions
    const filteredPurchases = purchases.filter((purchase) => {
      // If specific IDs provided, filter by them
      if (subscriptionIds && subscriptionIds.length > 0) {
        const productId = purchase.productId;
        console.log(
          '[getActiveSubscriptions] Checking purchase with productId:',
          productId
        );
        if (!subscriptionIds.includes(productId)) {
          console.log(
            '[getActiveSubscriptions] Not in subscription IDs list, skipping'
          );
          return false;
        }
      }

      // Check if this purchase has subscription-specific fields
      const hasSubscriptionFields =
        ('expirationDateIOS' in purchase && purchase.expirationDateIOS) ||
        'autoRenewingAndroid' in purchase ||
        ('environmentIOS' in purchase && purchase.environmentIOS);

      console.log(
        '[getActiveSubscriptions] Has subscription fields:',
        hasSubscriptionFields,
        {
          expirationDateIOS:
            'expirationDateIOS' in purchase
              ? purchase.expirationDateIOS
              : undefined,
          autoRenewingAndroid:
            'autoRenewingAndroid' in purchase
              ? purchase.autoRenewingAndroid
              : undefined,
          environmentIOS:
            'environmentIOS' in purchase ? purchase.environmentIOS : undefined,
        }
      );

      // TEMPORARY: If no subscription fields but it's in our subscription IDs list, consider it active
      if (
        !hasSubscriptionFields &&
        subscriptionIds &&
        subscriptionIds.length > 0
      ) {
        const productId = purchase.productId;
        if (subscriptionIds.includes(productId)) {
          console.log(
            '[getActiveSubscriptions] No subscription fields but ID matches, considering as active subscription'
          );
          return true; // Assume it's an active subscription
        }
        return false;
      }

      if (!hasSubscriptionFields) {
        console.log(
          '[getActiveSubscriptions] No subscription fields found, skipping'
        );
        return false;
      }

      // Check if it's actually active
      if (Platform.OS === 'ios') {
        if (
          'expirationDateIOS' in purchase &&
          purchase.expirationDateIOS &&
          typeof purchase.expirationDateIOS === 'number'
        ) {
          return purchase.expirationDateIOS > currentTime;
        }
        // For iOS purchases without expiration date (like Sandbox), we consider them active
        // if they have the environmentIOS field and were created recently
        if ('environmentIOS' in purchase && purchase.environmentIOS) {
          const dayInMs = 24 * 60 * 60 * 1000;
          // If no expiration date, consider active if transaction is recent (within 24 hours for Sandbox)
          if (
            !('expirationDateIOS' in purchase) ||
            !purchase.expirationDateIOS
          ) {
            if (
              purchase.environmentIOS === 'Sandbox' &&
              purchase.transactionDate &&
              currentTime - purchase.transactionDate < dayInMs
            ) {
              return true;
            }
          }
        }
      } else if (Platform.OS === 'android') {
        // For Android, if it's in the purchases list, it's active
        return true;
      }

      return false;
    });

    // Convert to ActiveSubscription format
    for (const purchase of filteredPurchases) {
      const productId = purchase.productId;
      const subscription: ActiveSubscription = {
        productId,
        isActive: true,
      };

      // Add platform-specific details
      if (Platform.OS === 'ios') {
        if (
          'expirationDateIOS' in purchase &&
          purchase.expirationDateIOS &&
          typeof purchase.expirationDateIOS === 'number'
        ) {
          const expirationDate = new Date(purchase.expirationDateIOS);
          subscription.expirationDateIOS = expirationDate;

          // Calculate days until expiration (round to nearest day)
          const daysUntilExpiration = Math.round(
            (purchase.expirationDateIOS - currentTime) / (1000 * 60 * 60 * 24)
          );
          subscription.daysUntilExpirationIOS = daysUntilExpiration;
          subscription.willExpireSoon = daysUntilExpiration <= 7;
        }

        if (
          'environmentIOS' in purchase &&
          typeof purchase.environmentIOS === 'string'
        ) {
          subscription.environmentIOS = purchase.environmentIOS;
        }
      } else if (Platform.OS === 'android') {
        if ('autoRenewingAndroid' in purchase) {
          subscription.autoRenewingAndroid = purchase.autoRenewingAndroid;
          // If auto-renewing is false, subscription will expire soon
          subscription.willExpireSoon = !purchase.autoRenewingAndroid;
        }
      }

      activeSubscriptions.push(subscription);
    }

    return activeSubscriptions;
  } catch (error) {
    console.error('Error getting active subscriptions:', error);
    return [];
  }
};

/**
 * Check if user has any active subscriptions
 * @param subscriptionIds - Optional array of subscription product IDs to check. If not provided, checks all subscriptions.
 * @returns Promise<boolean> true if user has at least one active subscription
 */
export const hasActiveSubscriptions = async (
  subscriptionIds?: string[]
): Promise<boolean> => {
  const subscriptions = await getActiveSubscriptions(subscriptionIds);
  return subscriptions.length > 0;
};
