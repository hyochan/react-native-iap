---
title: Subscriptions Flow Example
sidebar_label: Subscriptions Flow
sidebar_position: 2
---

<!-- This document was renamed from subscription-manager.md to subscription-flow.md -->

import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# Subscriptions Flow

<AdFitTopFixed />

This example walks through a practical subscriptions flow with react-native-iap. It mirrors the working sample in [example/screens/SubscriptionFlow.tsx](https://github.com/hyochan/react-native-iap/blob/main/example/screens/SubscriptionFlow.tsx), including status checks, renewal handling, and subscription management UI.

## Important: Platform-Specific Subscription Properties

When checking subscription status, different platforms provide different properties:

### iOS Subscription Properties

- **`expirationDateIos`**: Unix timestamp (milliseconds) indicating when the subscription expires
- **`originalTransactionDateIos`**: Original purchase date
- **`environmentIos`**: Can be 'Production' or 'Sandbox' (useful for testing)

### Android Subscription Properties

- **`autoRenewingAndroid`**: Boolean indicating if the subscription will auto-renew
- **`purchaseStateAndroid`**: Purchase state (0 = purchased, 1 = canceled)
- **`obfuscatedAccountIdAndroid`**: Account identifier if provided during purchase

### Key Differences

- **iOS**: You must check `expirationDateIos` against current time to determine if active
- **Android**: You can check `autoRenewingAndroid` - if false, the user has canceled

⚠️ **Note**: Always validate subscription status on your server for production apps. Client-side checks are useful for UI updates but should not be the sole source of truth.

## Complete Subscription Flow

```tsx
import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {useIAP} from 'react-native-iap';

// Subscription product IDs
const SUBSCRIPTION_SKUS = [
  'com.yourapp.premium_monthly',
  'com.yourapp.premium_yearly',
];

interface SubscriptionStatus {
  isActive: boolean;
  productId?: string;
  expirationDate?: Date;
  autoRenewing?: boolean;
  inGracePeriod?: boolean;
}

export default function SubscriptionManager() {
  const {
    connected,
    subscriptions,
    currentPurchase,
    currentPurchaseError,
    fetchProducts,
    getAvailablePurchases,
    requestPurchase,
    finishTransaction,
  } = useIAP();

  const [loading, setLoading] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus>({
      isActive: false,
    });

  // Initialize and load subscriptions
  useEffect(() => {
    if (connected) {
      loadSubscriptions();
      checkSubscriptionStatus();
    }
  }, [connected]);

  // Handle subscription purchases
  useEffect(() => {
    if (currentPurchase) {
      handleSubscriptionPurchase(currentPurchase);
    }
  }, [currentPurchase]);

  // Handle purchase errors
  useEffect(() => {
    if (currentPurchaseError) {
      handlePurchaseError(currentPurchaseError);
    }
  }, [currentPurchaseError]);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      await fetchProducts({skus: SUBSCRIPTION_SKUS, type: 'subs'});
      console.log('Subscriptions loaded');
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
      Alert.alert('Error', 'Failed to load subscription options');
    } finally {
      setLoading(false);
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      // In hook: updates state, does not return purchases
      await getAvailablePurchases();
      const activeSubscription = findActiveSubscription(availablePurchases);

      if (activeSubscription) {
        const status = await validateSubscriptionStatus(activeSubscription);
        setSubscriptionStatus(status);
      } else {
        setSubscriptionStatus({isActive: false});
      }
    } catch (error) {
      console.error('Failed to check subscription status:', error);
    }
  };

  const findActiveSubscription = (purchases) => {
    // Find subscriptions and check if they're still active
    return purchases.find((purchase) => {
      if (!SUBSCRIPTION_SKUS.includes(purchase.productId)) {
        return false;
      }
      // Check if the subscription is still active
      return isSubscriptionActive(purchase);
    });
  };

  /**
   * Platform-specific subscription status checking
   * iOS: Uses expirationDateIos to check if subscription is expired
   * Android: Uses autoRenewingAndroid to check renewal status
   */
  const isSubscriptionActive = (purchase) => {
    const currentTime = Date.now();

    // Check platform-specific subscription properties
    if (Platform.OS === 'ios') {
      // iOS: Check expiration date
      if (purchase.expirationDateIos) {
        console.log(
          'iOS Subscription expiration:',
          new Date(purchase.expirationDateIos).toISOString(),
        );
        return purchase.expirationDateIos > currentTime;
      }

      // For sandbox/development environment
      if (purchase.environmentIOS === 'Sandbox') {
        console.log('iOS Sandbox environment detected');
        // In sandbox, also check if it's a recent purchase (within 24 hours)
        const dayInMs = 24 * 60 * 60 * 1000;
        if (
          purchase.transactionDate &&
          currentTime - purchase.transactionDate < dayInMs
        ) {
          return true;
        }
      }
    } else if (Platform.OS === 'android') {
      // Android: Check auto-renewing status
      if (purchase.autoRenewingAndroid !== undefined) {
        console.log(
          'Android auto-renewing status:',
          purchase.autoRenewingAndroid,
        );
        return purchase.autoRenewingAndroid;
      }

      // Fallback: Check if purchase is recent (within 30 days for monthly subscriptions)
      const monthInMs = 30 * 24 * 60 * 60 * 1000;
      if (
        purchase.transactionDate &&
        currentTime - purchase.transactionDate < monthInMs
      ) {
        return true;
      }
    }

    // If we can't determine status, assume inactive
    return false;
  };

  const validateSubscriptionStatus = async (purchase) => {
    try {
      // Validate subscription on your server
      const response = await fetch(
        'https://your-server.com/validate-subscription',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productId: purchase.productId,
            purchaseToken: purchase.purchaseToken, // Unified field (iOS: JWS, Android: purchaseToken)
            packageName: (purchase as PurchaseAndroid)?.packageNameAndroid, // Will be needed in android
          }),
        },
      );

      const result = await response.json();

      return {
        isActive: result.isActive,
        productId: purchase.productId,
        expirationDate: new Date(result.expirationDate),
        autoRenewing: result.autoRenewing,
        inGracePeriod: result.inGracePeriod,
      };
    } catch (error) {
      console.error('Subscription validation error:', error);
      return {isActive: false};
    }
  };

  const handleSubscriptionPurchase = async (purchase) => {
    try {
      console.log('Processing subscription purchase:', purchase.productId);

      // Validate the subscription purchase
      const subscriptionInfo = await validateSubscriptionStatus(purchase);

      if (subscriptionInfo.isActive) {
        // Grant subscription benefits
        await grantSubscriptionBenefits(purchase);

        // Update local status
        setSubscriptionStatus(subscriptionInfo);

        // Finish the transaction
        await finishTransaction({purchase});

        Alert.alert(
          'Subscription Activated',
          `Welcome to Premium! Your subscription is now active.`,
        );
      } else {
        Alert.alert('Error', 'Subscription validation failed');
      }
    } catch (error) {
      console.error('Error processing subscription:', error);
      Alert.alert('Error', 'Failed to activate subscription');
    }
  };

  const handlePurchaseError = (error) => {
    console.error('Subscription purchase error:', error);

    switch (error.code) {
      case 'E_USER_CANCELLED':
        // User cancelled - no action needed
        break;
      case 'E_ALREADY_OWNED':
        Alert.alert(
          'Already Subscribed',
          'You already have an active subscription. Check your subscription status.',
        );
        checkSubscriptionStatus(); // Refresh status
        break;
      default:
        Alert.alert(
          'Subscription Failed',
          error.message || 'Unknown error occurred',
        );
        break;
    }
  };

  const grantSubscriptionBenefits = async (purchase) => {
    try {
      // Grant subscription benefits on your server
      await fetch('https://your-server.com/grant-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'current-user-id',
          productId: purchase.productId,
          transactionId: purchase.transactionId,
        }),
      });

      console.log('Subscription benefits granted');
    } catch (error) {
      console.error('Failed to grant subscription benefits:', error);
      throw error;
    }
  };

  /**
   * Platform-Specific Subscription Purchase Options
   *
   * Android: Requires subscriptionOffers array with offer tokens from fetchProducts()
   * subscriptionOffers: Array of AndroidSubscriptionOfferInput objects containing sku and offerToken
   * Each offer token corresponds to a specific pricing plan (base plan, introductory offer, etc.)
   * Without subscriptionOffers, Android purchases will fail with "number of skus (1) must match: the number of offerTokens (0)"
   *
   * iOS: Optional withOffer for promotional discounts
   * withOffer: DiscountOfferInputIOS object for applying promotional offers
   * Includes offerIdentifier, keyIdentifier, nonce, signature, and timestamp
   * Only needed when applying specific promotional offers to the purchase
   */
  const purchaseSubscription = async (productId) => {
    if (!connected) {
      Alert.alert('Error', 'Store is not connected');
      return;
    }

    try {
      console.log('Requesting subscription:', productId);

      // Find the subscription product to get offer details
      const subscription = subscriptions.find((sub) => sub.id === productId);
      if (!subscription) {
        Alert.alert('Error', 'Subscription product not found');
        return;
      }

      // 2) Build subscriptionOffers from the fetched product details
      const subscriptionOffers = (
        subscription.subscriptionOfferDetailsAndroid ?? []
      ).map((offer) => ({
        sku: subscription.id,
        offerToken: offer.offerToken,
      }));

      // Platform-specific subscription purchase requests
      // For Android: subscriptionOffers are required for subscriptions to specify pricing plans and offer tokens
      // For iOS: withOffer can be used for promotional offers or discounts
      await requestPurchase({
        request: {
          ios: {
            sku: productId,
            andDangerouslyFinishTransactionAutomatically: false,
            // withOffer: { /* DiscountOfferInputIOS for promotional offers */ }
          },
          android: {
            skus: [productId],
            subscriptionOffers,
          },
        },
        type: 'subs',
      });
    } catch (error) {
      console.error('Subscription request failed:', error);
      Alert.alert('Error', 'Failed to start subscription purchase');
    }
  };

  const openSubscriptionManagement = () => {
    import('react-native-iap').then(({deepLinkToSubscriptions}) => {
      deepLinkToSubscriptions({skuAndroid: 'your_subscription_sku'});
    });
  };

  const restoreSubscriptions = async () => {
    try {
      setLoading(true);
      await checkSubscriptionStatus();
      Alert.alert('Restore Complete', 'Subscription status has been updated');
    } catch (error) {
      Alert.alert('Error', 'Failed to restore subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderSubscriptionStatus = () => {
    if (subscriptionStatus.isActive) {
      return (
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Premium Active</Text>
          <Text style={styles.statusSubtitle}>
            Your premium subscription is active
          </Text>

          {subscriptionStatus.expirationDate && (
            <Text style={styles.statusDetail}>
              {subscriptionStatus.autoRenewing ? 'Renews' : 'Expires'} on{' '}
              {formatDate(subscriptionStatus.expirationDate)}
            </Text>
          )}

          {subscriptionStatus.inGracePeriod && (
            <Text style={styles.warningText}>
              Your subscription is in grace period. Please update your payment
              method.
            </Text>
          )}

          <TouchableOpacity
            style={styles.manageButton}
            onPress={openSubscriptionManagement}
          >
            <Text style={styles.manageButtonText}>Manage Subscription</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>No Active Subscription</Text>
        <Text style={styles.statusSubtitle}>
          Subscribe to unlock premium features
        </Text>
      </View>
    );
  };

  const renderSubscriptionOption = (subscription) => {
    const isYearly = subscription.productId.includes('yearly');
    const savings = isYearly ? '2 months free!' : null;

    return (
      <View key={subscription.productId} style={styles.subscriptionCard}>
        <View style={styles.subscriptionInfo}>
          <Text style={styles.subscriptionTitle}>
            {isYearly ? 'Yearly Premium' : 'Monthly Premium'}
          </Text>
          <Text style={styles.subscriptionPrice}>
            {subscription.localizedPrice}
          </Text>
          {subscription.subscriptionPeriod && (
            <Text style={styles.subscriptionPeriod}>
              per {subscription.subscriptionPeriod}
            </Text>
          )}
          {savings && <Text style={styles.savingsText}>{savings}</Text>}
        </View>

        <TouchableOpacity
          style={[styles.subscribeButton, isYearly && styles.yearlyButton]}
          onPress={() => purchaseSubscription(subscription.productId)}
          disabled={loading || subscriptionStatus.isActive}
        >
          <Text style={styles.subscribeButtonText}>
            {subscriptionStatus.isActive ? 'Active' : 'Subscribe'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (!connected) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Connecting to store...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Subscription Management</Text>

      {renderSubscriptionStatus()}

      <Text style={styles.sectionTitle}>Subscription Options</Text>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading subscriptions...</Text>
        </View>
      ) : (
        <View>{subscriptions.map(renderSubscriptionOption)}</View>
      )}

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={restoreSubscriptions}
          disabled={loading}
        >
          <Text style={styles.restoreButtonText}>Restore Purchases</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Subscriptions auto-renew unless cancelled. You can manage your
          subscriptions in your device settings.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
    color: '#333',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 16,
    color: '#333',
  },
  statusCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  statusSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  statusDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#ff9800',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  manageButton: {
    backgroundColor: '#2196f3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  manageButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  subscriptionCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  subscriptionPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196f3',
    marginBottom: 4,
  },
  subscriptionPeriod: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  savingsText: {
    fontSize: 14,
    color: '#4caf50',
    fontWeight: 'bold',
  },
  subscribeButton: {
    backgroundColor: '#2196f3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
  },
  yearlyButton: {
    backgroundColor: '#ff9800',
  },
  subscribeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  actionButtons: {
    marginTop: 32,
    alignItems: 'center',
  },
  restoreButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2196f3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  restoreButtonText: {
    color: '#2196f3',
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 32,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
});
```

## Key Features

### 1. Subscription Status Tracking

- Real-time subscription status validation
- Grace period handling
- Auto-renewal status

### 2. Multiple Subscription Tiers

- Monthly and yearly options
- Pricing display with savings indicators
- Visual differentiation for different tiers

### 3. Subscription Management

- Direct links to platform subscription management
- Purchase restoration
- Status refresh capabilities

### 4. Server Integration

- Server-side subscription validation
- Benefit granting system
- Status synchronization

## Platform Differences

### Subscription Purchase Parameters

**Important**: iOS and Android have different parameter structures for subscription purchases:

**Unified Structure (v2.7.0+):**

```tsx
// New API - no Platform.OS checks needed!
await requestPurchase({
  request: {
    ios: {
      sku: productId,
      andDangerouslyFinishTransactionAutomatically: false,
    },
    android: {
      skus: [productId],
    },
  },
  type: 'subs',
});
```

### Receipt Validation Differences

Subscription validation requires different approaches:

- **iOS**: Send `purchaseToken` which was ~~`transactionReceipt`~~ to Apple's validation servers
- **Android**: Send `purchaseToken` and `packageName` to Google Play validation

This is handled in the `validateSubscriptionStatus` function with platform-specific logic.

## Server-Side Implementation

### Subscription Validation Endpoint

```javascript
// Example Node.js/Express endpoint
app.post('/validate-subscription', async (req, res) => {
  const {receipt, productId, purchaseToken, transactionId} = req.body;

  try {
    let validationResult;

    if (purchaseToken) {
      // Android - Google Play Billing validation
      validationResult = await validateGooglePlaySubscription(
        productId,
        purchaseToken,
      );
    } else {
      // iOS - App Store validation
      validationResult = await validateAppStoreReceipt(receipt);
    }

    res.json({
      isActive: validationResult.isActive,
      expirationDate: validationResult.expirationDate,
      autoRenewing: validationResult.autoRenewing,
      inGracePeriod: validationResult.inGracePeriod,
    });
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({error: 'Validation failed'});
  }
});
```

## Usage

```tsx
import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import SubscriptionManager from './SubscriptionManager';

export default function App() {
  return (
    <NavigationContainer>
      <SubscriptionManager />
    </NavigationContainer>
  );
}
```

## Best Practices Demonstrated

1. **Status Validation**: Always validate subscription status server-side
2. **Grace Period Handling**: Handle billing issues gracefully
3. **User Experience**: Provide clear subscription status and management options
4. **Error Handling**: Comprehensive error handling for various scenarios
5. **Platform Integration**: Use platform-specific subscription management tools

## Customization

You can extend this example with:

- Multiple subscription tiers
- Promotional offers and trials
- Family sharing support
- Subscription analytics
- Custom subscription management UI
