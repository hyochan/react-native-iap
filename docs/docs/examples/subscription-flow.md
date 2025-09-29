---
title: Subscriptions Flow Example
sidebar_label: Subscriptions Flow
sidebar_position: 2
---

<!-- This document was renamed from subscription-manager.md to subscription-flow.md -->

import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# Subscriptions Flow

<AdFitTopFixed />

This guide demonstrates practical subscription scenarios with react-native-iap.

:::note The complete working example can be found at [example/screens/SubscriptionFlow.tsx](https://github.com/hyochan/react-native-iap/blob/main/example/screens/SubscriptionFlow.tsx). Note that the example code was heavily vibe-coded with Claude and is quite verbose/messy for demonstration purposes - use it as a reference only. :::

## 1. Purchasing a Subscription with `requestPurchase`

### Basic Subscription Purchase

```tsx
import {useIAP} from 'react-native-iap';
import {Platform} from 'react-native';

function SubscriptionPurchase() {
  const {connected, subscriptions, requestPurchase, fetchProducts} = useIAP();

  useEffect(() => {
    // Load subscription products
    if (connected) {
      fetchProducts({
        skus: ['com.app.premium_monthly', 'com.app.premium_yearly'],
        type: 'subs',
      });
    }
  }, [connected]);

  const purchaseSubscription = async (productId: string) => {
    if (!connected) {
      Alert.alert('Error', 'Store not connected');
      return;
    }

    try {
      // Find the subscription product
      const subscription = subscriptions.find((sub) => sub.id === productId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Platform-specific purchase request
      await requestPurchase({
        request: {
          ios: {
            sku: productId,
            andDangerouslyFinishTransactionAutomatically: false,
          },
          android: {
            skus: [productId],
            // Android requires subscriptionOffers for subscriptions
            subscriptionOffers:
              subscription.subscriptionOfferDetailsAndroid?.map((offer) => ({
                sku: subscription.id,
                offerToken: offer.offerToken,
              })) || [],
          },
        },
        type: 'subs',
      });

      // Success handling is done in onPurchaseSuccess callback
    } catch (error) {
      console.error('Purchase failed:', error);
      Alert.alert('Error', 'Failed to purchase subscription');
    }
  };

  return (
    <View>
      {subscriptions.map((sub) => (
        <TouchableOpacity
          key={sub.id}
          onPress={() => purchaseSubscription(sub.id)}
        >
          <Text>
            {sub.title} - {sub.localizedPrice}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
```

### Handling Purchase Success with Hook Callbacks

```tsx
function SubscriptionManager() {
  const [activeSubscription, setActiveSubscription] = useState(null);

  const {connected, subscriptions, requestPurchase, finishTransaction} = useIAP(
    {
      onPurchaseSuccess: async (purchase) => {
        console.log('Purchase successful:', purchase.productId);

        // Validate with your server
        const isValid = await validatePurchaseOnServer(purchase);

        if (isValid) {
          // Update local state
          setActiveSubscription(purchase.productId);

          // Finish the transaction
          await finishTransaction({purchase});

          Alert.alert('Success', 'Subscription activated!');
        }
      },
      onPurchaseError: (error) => {
        if (error.code !== 'E_USER_CANCELLED') {
          Alert.alert('Error', error.message);
        }
      },
    },
  );

  // Purchase function remains simple
  const subscribe = async (productId: string) => {
    const subscription = subscriptions.find((s) => s.id === productId);
    if (!subscription) return;

    await requestPurchase({
      request: {
        ios: {
          sku: productId,
          andDangerouslyFinishTransactionAutomatically: false,
        },
        android: {
          skus: [productId],
          subscriptionOffers:
            subscription.subscriptionOfferDetailsAndroid?.map((offer) => ({
              sku: subscription.id,
              offerToken: offer.offerToken,
            })) || [],
        },
      },
      type: 'subs',
    });
    // Don't handle success here - use onPurchaseSuccess callback
  };
}
```

## 2. Checking Subscription Status with `getActiveSubscriptions`

### Basic Status Check After Purchase

```tsx
import {useIAP} from 'react-native-iap';
import {Platform} from 'react-native';

function useSubscriptionStatus() {
  const {getActiveSubscriptions} = useIAP();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionDetails, setSubscriptionDetails] = useState(null);

  const checkSubscriptionStatus = async () => {
    try {
      // Get active subscriptions - returns array of active subscriptions
      const activeSubscriptions = await getActiveSubscriptions();

      if (activeSubscriptions.length > 0) {
        // User has at least one active subscription
        setIsSubscribed(true);

        // Check specific subscription details
        const subscription = activeSubscriptions[0];

        // Platform-specific status checks
        if (Platform.OS === 'ios') {
          // iOS provides expirationDateIos
          const isExpired = subscription.expirationDateIos < Date.now();
          setSubscriptionDetails({
            productId: subscription.productId,
            isActive: !isExpired,
            expiresAt: new Date(subscription.expirationDateIos),
            environment: subscription.environmentIOS, // 'Production' or 'Sandbox'
          });
        } else {
          // Android provides autoRenewingAndroid
          setSubscriptionDetails({
            productId: subscription.productId,
            isActive: subscription.autoRenewingAndroid,
            willAutoRenew: subscription.autoRenewingAndroid,
            purchaseState: subscription.purchaseStateAndroid, // 0 = purchased, 1 = canceled
          });
        }
      } else {
        setIsSubscribed(false);
        setSubscriptionDetails(null);
      }
    } catch (error) {
      console.error('Failed to check subscription status:', error);
    }
  };

  return {isSubscribed, subscriptionDetails, checkSubscriptionStatus};
}
```

### Checking Multiple Subscription Tiers

```tsx
const SUBSCRIPTION_SKUS = {
  BASIC: 'com.app.basic_monthly',
  PREMIUM: 'com.app.premium_monthly',
  PREMIUM_YEARLY: 'com.app.premium_yearly',
};

async function getUserSubscriptionTier() {
  const {getActiveSubscriptions} = useIAP();

  try {
    const activeSubscriptions = await getActiveSubscriptions();

    // Check for premium yearly first (highest tier)
    const yearlyPremium = activeSubscriptions.find(
      (sub) => sub.productId === SUBSCRIPTION_SKUS.PREMIUM_YEARLY,
    );
    if (yearlyPremium) return 'PREMIUM_YEARLY';

    // Then check monthly premium
    const monthlyPremium = activeSubscriptions.find(
      (sub) => sub.productId === SUBSCRIPTION_SKUS.PREMIUM,
    );
    if (monthlyPremium) return 'PREMIUM';

    // Finally check basic
    const basic = activeSubscriptions.find(
      (sub) => sub.productId === SUBSCRIPTION_SKUS.BASIC,
    );
    if (basic) return 'BASIC';

    return 'FREE';
  } catch (error) {
    console.error('Failed to get subscription tier:', error);
    return 'FREE';
  }
}
```

## 3. Subscription Plan Changes (Upgrade/Downgrade)

### iOS: Automatic Subscription Group Management

On iOS, subscriptions in the same subscription group automatically replace each other when purchased. The App Store handles the proration and timing automatically.

```tsx
// iOS Subscription Configuration in App Store Connect:
// Subscription Group: "Premium Access"
// - com.app.premium_monthly (Rank 1)
// - com.app.premium_yearly (Rank 2 - higher rank = better value)

async function handleIOSSubscriptionChange(newProductId: string) {
  const {requestPurchase, getActiveSubscriptions} = useIAP();

  try {
    // Check current subscription
    const currentSubs = await getActiveSubscriptions();
    const currentSub = currentSubs.find(
      (sub) =>
        sub.productId === 'com.app.premium_monthly' ||
        sub.productId === 'com.app.premium_yearly',
    );

    if (currentSub) {
      console.log(`Changing from ${currentSub.productId} to ${newProductId}`);
      // iOS automatically handles the switch when both products are in the same group
    }

    // Simply purchase the new subscription
    // iOS will automatically:
    // 1. Cancel the old subscription at the end of the current period
    // 2. Start the new subscription
    // 3. Handle any necessary proration
    await requestPurchase({
      request: {
        ios: {
          sku: newProductId,
          andDangerouslyFinishTransactionAutomatically: false,
        },
        android: {
          skus: [newProductId],
        },
      },
      type: 'subs',
    });

    Alert.alert(
      'Subscription Updated',
      'Your subscription will change at the end of the current billing period.',
    );
  } catch (error) {
    console.error('Subscription change failed:', error);
  }
}

// Usage example
function IOSSubscriptionManager() {
  const handleUpgradeToYearly = () => {
    handleIOSSubscriptionChange('com.app.premium_yearly');
  };

  const handleDowngradeToMonthly = () => {
    handleIOSSubscriptionChange('com.app.premium_monthly');
  };

  return (
    <View>
      <Text>iOS subscriptions in the same group auto-replace each other</Text>
      <Button title="Upgrade to Yearly" onPress={handleUpgradeToYearly} />
      <Button title="Switch to Monthly" onPress={handleDowngradeToMonthly} />
    </View>
  );
}
```

### Android: Manual Plan Changes with Purchase Token

On Android, you need to explicitly handle subscription upgrades/downgrades using the purchase token from the existing subscription.

```tsx
async function handleAndroidSubscriptionChange(
  newProductId: string,
  changeType: 'upgrade' | 'downgrade',
) {
  const {requestPurchase, getAvailablePurchases, subscriptions} = useIAP();

  try {
    // Step 1: Get the current subscription's purchase token
    await getAvailablePurchases();
    const currentPurchase = availablePurchases.find(
      (p) =>
        p.productId === 'com.app.premium_monthly' ||
        p.productId === 'com.app.premium_yearly',
    );

    if (!currentPurchase?.purchaseToken) {
      throw new Error('No active subscription found');
    }

    // Step 2: Find the new subscription product
    const newSubscription = subscriptions.find(
      (sub) => sub.id === newProductId,
    );
    if (!newSubscription) {
      throw new Error('New subscription product not found');
    }

    // Step 3: Prepare subscription offers
    const subscriptionOffers = (
      newSubscription.subscriptionOfferDetailsAndroid ?? []
    ).map((offer) => ({
      sku: newSubscription.id,
      offerToken: offer.offerToken,
    }));

    // Step 4: Request purchase with the old purchase token for replacement
    await requestPurchase({
      request: {
        ios: {
          sku: newProductId,
        },
        android: {
          skus: [newProductId],
          subscriptionOffers,
          // IMPORTANT: Include purchase token for subscription replacement
          purchaseTokenAndroid: currentPurchase.purchaseToken,
          // Optional: Specify proration mode
          replacementModeAndroid:
            changeType === 'upgrade'
              ? 'IMMEDIATE_WITH_TIME_PRORATION'
              : 'DEFERRED', // Downgrade happens at next renewal
        },
      },
      type: 'subs',
    });

    const message =
      changeType === 'upgrade'
        ? 'Subscription upgraded immediately!'
        : 'Subscription will change at the end of current period.';

    Alert.alert('Success', message);
  } catch (error) {
    console.error('Android subscription change failed:', error);
    Alert.alert('Error', 'Failed to change subscription plan');
  }
}

// Complete Android Example with UI
function AndroidSubscriptionManager() {
  const {subscriptions, getAvailablePurchases, availablePurchases} = useIAP();
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);

  useEffect(() => {
    checkCurrentPlan();
  }, []);

  const checkCurrentPlan = async () => {
    try {
      await getAvailablePurchases();
      const activeSub = availablePurchases.find(
        (p) =>
          p.productId === 'com.app.premium_monthly' ||
          p.productId === 'com.app.premium_yearly',
      );
      setCurrentPlan(activeSub?.productId || null);
    } catch (error) {
      console.error('Failed to check current plan:', error);
    }
  };

  const handlePlanChange = (targetPlan: string) => {
    if (!currentPlan) {
      // New subscription
      purchaseNewSubscription(targetPlan);
    } else if (
      currentPlan === 'com.app.premium_monthly' &&
      targetPlan === 'com.app.premium_yearly'
    ) {
      // Upgrade to yearly
      handleAndroidSubscriptionChange(targetPlan, 'upgrade');
    } else if (
      currentPlan === 'com.app.premium_yearly' &&
      targetPlan === 'com.app.premium_monthly'
    ) {
      // Downgrade to monthly
      handleAndroidSubscriptionChange(targetPlan, 'downgrade');
    }
  };

  return (
    <View>
      <Text>Current Plan: {currentPlan || 'None'}</Text>

      {currentPlan === 'com.app.premium_monthly' && (
        <Button
          title="⬆️ Upgrade to Yearly (Save 20%)"
          onPress={() => handlePlanChange('com.app.premium_yearly')}
        />
      )}

      {currentPlan === 'com.app.premium_yearly' && (
        <Button
          title="⬇️ Switch to Monthly"
          onPress={() => handlePlanChange('com.app.premium_monthly')}
        />
      )}
    </View>
  );
}
```

## 4. Platform-Unified Subscription Change Handler

Here's a complete example that handles both platforms appropriately:

```tsx
function SubscriptionPlanManager() {
  const {
    requestPurchase,
    getActiveSubscriptions,
    getAvailablePurchases,
    subscriptions,
    availablePurchases,
  } = useIAP();

  const handleSubscriptionChange = async (newProductId: string) => {
    try {
      if (Platform.OS === 'ios') {
        // iOS: Simple purchase - automatic replacement in same group
        await requestPurchase({
          request: {
            ios: {
              sku: newProductId,
              andDangerouslyFinishTransactionAutomatically: false,
            },
            android: {
              skus: [newProductId],
            },
          },
          type: 'subs',
        });

        Alert.alert(
          'Subscription Updated',
          'Your plan will change at the end of the current period.',
        );
      } else {
        // Android: Need purchase token for replacement
        await getAvailablePurchases();

        // Find current subscription
        const currentPurchase = availablePurchases.find((p) =>
          p.productId.includes('premium'),
        );

        // Find new subscription details
        const newSub = subscriptions.find((s) => s.id === newProductId);

        if (currentPurchase?.purchaseToken && newSub) {
          // Prepare offers
          const offers = (newSub.subscriptionOfferDetailsAndroid ?? []).map(
            (offer) => ({
              sku: newSub.id,
              offerToken: offer.offerToken,
            }),
          );

          // Purchase with replacement
          await requestPurchase({
            request: {
              ios: {
                sku: newProductId,
              },
              android: {
                skus: [newProductId],
                subscriptionOffers: offers,
                purchaseTokenAndroid: currentPurchase.purchaseToken,
              },
            },
            type: 'subs',
          });

          Alert.alert('Success', 'Subscription plan changed!');
        } else {
          // New subscription (no existing one)
          const offers = (newSub?.subscriptionOfferDetailsAndroid ?? []).map(
            (offer) => ({
              sku: newSub.id,
              offerToken: offer.offerToken,
            }),
          );

          await requestPurchase({
            request: {
              ios: {
                sku: newProductId,
              },
              android: {
                skus: [newProductId],
                subscriptionOffers: offers,
              },
            },
            type: 'subs',
          });
        }
      }

      // Refresh subscription status
      await getActiveSubscriptions();
    } catch (error) {
      console.error('Subscription change error:', error);
      Alert.alert('Error', 'Failed to change subscription');
    }
  };

  return (
    <View>
      <Text style={styles.title}>Choose Your Plan</Text>

      <TouchableOpacity
        style={styles.planCard}
        onPress={() => handleSubscriptionChange('com.app.premium_monthly')}
      >
        <Text>Monthly - $9.99/month</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.planCard, styles.recommended]}
        onPress={() => handleSubscriptionChange('com.app.premium_yearly')}
      >
        <Text>Yearly - $99.99/year (Save $20!)</Text>
      </TouchableOpacity>

      <Text style={styles.note}>
        {Platform.OS === 'ios'
          ? '✓ Changes take effect at the end of current period'
          : '✓ Upgrades apply immediately with proration'}
      </Text>
    </View>
  );
}
```

## Key Points Summary

### Purchase Flow

1. **Always use hook callbacks** (`onPurchaseSuccess`, `onPurchaseError`) for handling results
2. **Don't chain `.then()` on `requestPurchase` promise** - it can fire at the wrong time
3. **Android requires `subscriptionOffers`** array with offer tokens for subscription purchases

### Platform Differences

| Feature | iOS | Android |
| --- | --- | --- |
| **Plan Changes** | Automatic within subscription group | Manual with purchaseToken |
| **Proration** | Handled by App Store | Configurable via replacementModeAndroid |
| **Status Check** | Check expirationDateIos | Check autoRenewingAndroid |
| **Cancellation** | User manages in Settings | Check autoRenewingAndroid === false |
| **Multiple Plans** | Use subscription groups with ranks | Use base plans and offers |

## Best Practices

1. **Always validate on server**: Client-side checks are for UI only
2. **Handle grace periods**: Check for billing issues before removing access
3. **Use hook callbacks**: Don't rely on promise resolution for state updates
4. **Clear messaging**: Explain when changes take effect
5. **Test thoroughly**: Use sandbox/test accounts for both platforms
6. **Store state properly**: Cache subscription status to reduce API calls

## Additional Resources

- [Complete working example](https://github.com/hyochan/react-native-iap/blob/main/example/screens/SubscriptionFlow.tsx)
- [iOS Subscription Groups Documentation](https://developer.apple.com/app-store/subscriptions/)
- [Android Subscription Upgrade/Downgrade](https://developer.android.com/google/play/billing/subscriptions#upgrade-downgrade)
