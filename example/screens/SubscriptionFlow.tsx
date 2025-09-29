import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  requestPurchase,
  useIAP,
  deepLinkToSubscriptions,
  getAvailablePurchases,
  type ActiveSubscription,
  type ProductSubscription,
  type Purchase,
  type PurchaseError,
  ErrorCode,
} from 'react-native-iap';
import Loading from '../src/components/Loading';
import {SUBSCRIPTION_PRODUCT_IDS} from '../src/utils/constants';
import PurchaseSummaryRow from '../src/components/PurchaseSummaryRow';

// Extended types for Android-specific properties
type AndroidSubscriptionDetails = ProductSubscription & {
  subscriptionOfferDetailsAndroid?: Array<{
    basePlanId: string;
    offerToken: string;
    offerId?: string;
    offerTags: string[];
    pricingPhases: {
      pricingPhaseList: Array<{
        formattedPrice: string;
        priceAmountMicros: string;
        priceCurrencyCode: string;
        billingPeriod: string;
        billingCycleCount: number;
        recurrenceMode: number;
      }>;
    };
  }>;
};

type ExtendedPurchase = Purchase & {
  purchaseTokenAndroid?: string;
  dataAndroid?: {
    purchaseToken?: string;
  };
  purchaseState?: string;
  offerToken?: string;
};

type ExtendedActiveSubscription = ActiveSubscription & {
  basePlanId?: string;
  purchaseTokenAndroid?: string;
  _detectedBasePlanId?: string;
};

// Component for plan change controls
interface PlanChangeControlsProps {
  activeSubscriptions: ActiveSubscription[];
  handlePlanChange: (
    productId: string,
    changeType: 'upgrade' | 'downgrade' | 'yearly' | 'monthly',
    currentBasePlanId: string,
  ) => void;
  isProcessing: boolean;
  lastPurchasedPlan: string | null;
}

const PlanChangeControls = React.memo(
  ({
    activeSubscriptions,
    handlePlanChange,
    isProcessing,
    lastPurchasedPlan,
  }: PlanChangeControlsProps) => {
    // Find all premium subscriptions (both monthly and yearly)
    const premiumSubs = activeSubscriptions.filter(
      (sub) =>
        sub.productId === 'dev.hyo.martie.premium' ||
        sub.productId === 'dev.hyo.martie.premium_year',
    );

    if (premiumSubs.length === 0) return null;

    // Detect the current plan based on product ID for iOS
    let currentBasePlan = 'unknown';
    let activeSub: ActiveSubscription | undefined = undefined;

    if (Platform.OS === 'ios') {
      // On iOS, find the most recent subscription (in case both exist during transition)
      // Sort by transaction date to get the most recent one
      const sortedSubs = [...premiumSubs].sort((a, b) => {
        const dateA = (a as any).transactionDate || 0;
        const dateB = (b as any).transactionDate || 0;
        return dateB - dateA;
      });

      activeSub = sortedSubs[0];

      // Check for the most recent purchase to determine actual plan
      // First, check if both products exist (transition state)
      const hasYearly = premiumSubs.some(
        (s) => s.productId === 'dev.hyo.martie.premium_year',
      );
      const hasMonthly = premiumSubs.some(
        (s) => s.productId === 'dev.hyo.martie.premium',
      );

      if (lastPurchasedPlan) {
        // If we have a recently purchased plan, use that
        currentBasePlan = lastPurchasedPlan;
        console.log('Using last purchased plan:', lastPurchasedPlan);
      } else if (hasYearly && !hasMonthly) {
        // Only yearly exists - user has yearly
        currentBasePlan = 'premium-year';
      } else if (!hasYearly && hasMonthly) {
        // Only monthly exists - user has monthly
        currentBasePlan = 'premium';
      } else if (activeSub) {
        // Both exist or transition state - use the most recent one
        if (activeSub.productId === 'dev.hyo.martie.premium_year') {
          currentBasePlan = 'premium-year';
        } else if (activeSub.productId === 'dev.hyo.martie.premium') {
          currentBasePlan = 'premium';
        }
      }
    } else {
      // Android uses base plans within the same product
      activeSub = premiumSubs[0];
      const extendedSub = activeSub as ExtendedActiveSubscription;
      if (extendedSub.basePlanId) {
        currentBasePlan = extendedSub.basePlanId;
      } else if (lastPurchasedPlan) {
        currentBasePlan = lastPurchasedPlan;
      } else {
        // Default to monthly if we can't detect
        currentBasePlan = 'premium';
      }
    }

    console.log(
      'Button section - current base plan:',
      currentBasePlan,
      'Active sub:',
      activeSub?.productId,
    );

    // iOS doesn't need upgrade/downgrade buttons as it's handled automatically by the App Store
    if (Platform.OS === 'ios') {
      return null;
    }

    return (
      <View style={styles.planChangeSection}>
        {currentBasePlan === 'premium' && (
          <TouchableOpacity
            style={[styles.changePlanButton, styles.upgradeButton]}
            onPress={() =>
              handlePlanChange(
                activeSub?.productId || 'dev.hyo.martie.premium',
                'upgrade',
                'premium',
              )
            }
            disabled={isProcessing}
          >
            <Text style={styles.changePlanButtonText}>
              ⬆️ Upgrade to Yearly Plan
            </Text>
            <Text style={styles.changePlanButtonSubtext}>
              Save with annual billing
            </Text>
          </TouchableOpacity>
        )}

        {currentBasePlan === 'premium-year' && (
          <TouchableOpacity
            style={[styles.changePlanButton, styles.downgradeButton]}
            onPress={() =>
              handlePlanChange(
                activeSub?.productId || 'dev.hyo.martie.premium_year',
                'downgrade',
                'premium-year',
              )
            }
            disabled={isProcessing}
          >
            <Text style={styles.changePlanButtonText}>
              ⬇️ Downgrade to Monthly Plan
            </Text>
            <Text style={styles.changePlanButtonSubtext}>
              More flexibility with monthly billing
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  },
);

/**
 * Subscription Flow Example - Subscription Products
 *
 * Demonstrates useIAP hook approach for subscriptions:
 * - Uses useIAP hook for subscription management
 * - Handles subscription callbacks with proper types
 * - No manual promise handling required
 * - Clean success/error pattern through hooks
 * - Focused on recurring subscriptions
 *
 * New subscription status checking API:
 * - getActiveSubscriptions() - gets all active subscriptions automatically
 * - getActiveSubscriptions(['id1', 'id2']) - gets specific subscriptions
 * - activeSubscriptions state - automatically updated subscription list
 */

type SubscriptionFlowProps = {
  connected: boolean;
  subscriptions: ProductSubscription[];
  activeSubscriptions: ActiveSubscription[];
  purchaseResult: string;
  isProcessing: boolean;
  isCheckingStatus: boolean;
  lastPurchase: Purchase | null;
  lastPurchasedPlan: string | null;
  cachedAvailablePurchases: Purchase[];
  setCachedAvailablePurchases: (purchases: Purchase[]) => void;
  setIsProcessing: (value: boolean) => void;
  setPurchaseResult: (value: string) => void;
  setLastPurchasedPlan: (value: string | null) => void;
  onSubscribe: (productId: string) => void;
  onRetryLoadSubscriptions: () => void;
  onRefreshStatus: () => void;
  onManageSubscriptions: () => void;
};

function SubscriptionFlow({
  connected,
  subscriptions,
  activeSubscriptions,
  purchaseResult,
  isProcessing,
  isCheckingStatus,
  lastPurchase,
  lastPurchasedPlan,
  cachedAvailablePurchases,
  setCachedAvailablePurchases,
  setIsProcessing,
  setPurchaseResult,
  onSubscribe,
  onRetryLoadSubscriptions,
  onRefreshStatus,
  onManageSubscriptions,
}: SubscriptionFlowProps) {
  const [selectedSubscription, setSelectedSubscription] =
    useState<ProductSubscription | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const ownedSubscriptions = useMemo(() => {
    return new Set(activeSubscriptions.map((sub) => sub.productId));
  }, [activeSubscriptions]);

  const handleSubscription = useCallback(
    (itemId: string) => {
      const isAlreadySubscribed = ownedSubscriptions.has(itemId);

      if (isAlreadySubscribed) {
        Alert.alert(
          'Already Subscribed',
          'You already have an active subscription to this product.',
          [{text: 'OK', style: 'default'}],
        );
        return;
      }
      onSubscribe(itemId);
    },
    [onSubscribe, ownedSubscriptions],
  );

  const handleSubscriptionPress = (subscription: ProductSubscription) => {
    setSelectedSubscription(subscription);
    setModalVisible(true);
  };

  const handlePlanChange = useCallback(
    (
      currentProductId: string,
      changeType: 'upgrade' | 'downgrade' | 'yearly' | 'monthly',
      currentBasePlanId: string,
    ) => {
      // iOS doesn't use this function anymore as upgrade/downgrade is handled by App Store
      if (Platform.OS === 'ios') {
        return;
      }

      // Android uses the same product with different base plans
      const targetProductId = 'dev.hyo.martie.premium';

      // Find the subscription with the target base plan
      const targetSubscription = subscriptions.find(
        (s) => s.id === targetProductId,
      );

      if (!targetSubscription) {
        Alert.alert('Error', 'Target subscription plan not found');
        return;
      }

      // Determine target base plan based on current plan and change type
      let targetBasePlanId = '';
      let actionDescription = '';

      if (currentBasePlanId === 'premium') {
        // Currently on monthly, can only upgrade
        if (changeType === 'upgrade' || changeType === 'yearly') {
          targetBasePlanId = 'premium-year';
          actionDescription = 'upgrade to Yearly';
        } else {
          Alert.alert('Info', 'You are already on the Monthly plan');
          return;
        }
      } else if (currentBasePlanId === 'premium-year') {
        // Currently on yearly, can only downgrade
        if (changeType === 'downgrade' || changeType === 'monthly') {
          targetBasePlanId = 'premium';
          actionDescription = 'downgrade to Monthly';
        } else {
          Alert.alert('Info', 'You are already on the Yearly plan');
          return;
        }
      } else {
        // Can't detect current plan, allow switching to either
        if (changeType === 'upgrade' || changeType === 'yearly') {
          targetBasePlanId = 'premium-year';
          actionDescription = 'switch to Yearly';
        } else if (changeType === 'downgrade' || changeType === 'monthly') {
          targetBasePlanId = 'premium';
          actionDescription = 'switch to Monthly';
        }
      }

      console.log('Plan change:', {
        currentBasePlanId,
        targetBasePlanId,
        changeType,
      });

      Alert.alert(
        'Change Subscription Plan',
        `Do you want to ${actionDescription} plan?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Confirm',
            onPress: async () => {
              setIsProcessing(true);
              setPurchaseResult('Processing plan change...');

              // Get the current subscription to find purchase token
              const currentSub = activeSubscriptions.find(
                (s) => s.productId === currentProductId,
              );

              if (Platform.OS === 'android') {
                // Android subscription replacement
                const targetSubWithDetails =
                  targetSubscription as AndroidSubscriptionDetails;
                const androidOffers =
                  targetSubWithDetails.subscriptionOfferDetailsAndroid;
                const targetOffer = androidOffers?.find(
                  (offer) => offer.basePlanId === targetBasePlanId,
                );

                if (!targetOffer) {
                  Alert.alert('Error', 'Target plan not available');
                  setIsProcessing(false);
                  return;
                }

                // For Android, we need to get the purchase token from available purchases
                // The activeSubscriptions might not have the purchase token
                const getPurchaseToken = async () => {
                  try {
                    // Use cached purchases if available, otherwise fetch once
                    let availablePurchases = cachedAvailablePurchases;
                    if (availablePurchases.length === 0) {
                      console.log('No cached purchases, fetching...');
                      availablePurchases = await getAvailablePurchases();
                      setCachedAvailablePurchases(availablePurchases);
                    }

                    const currentPurchase = availablePurchases.find(
                      (p: Purchase) => p.productId === currentProductId,
                    ) as ExtendedPurchase | undefined;

                    // Check multiple possible token fields
                    const extendedPurchase = currentPurchase as
                      | ExtendedPurchase
                      | undefined;
                    const token =
                      extendedPurchase?.purchaseToken ||
                      extendedPurchase?.purchaseTokenAndroid ||
                      extendedPurchase?.dataAndroid?.purchaseToken;

                    console.log('Found purchase with token:', {
                      productId: currentPurchase?.productId,
                      hasToken: !!token,
                      tokenLength: token?.length,
                      purchaseState: currentPurchase?.purchaseState,
                    });

                    return token;
                  } catch (e) {
                    console.error('Failed to get purchase token:', e);
                    const extendedSub = currentSub as
                      | ExtendedActiveSubscription
                      | undefined;
                    return (
                      extendedSub?.purchaseToken ||
                      extendedSub?.purchaseTokenAndroid
                    );
                  }
                };

                const purchaseToken = await getPurchaseToken();

                if (!purchaseToken) {
                  Alert.alert(
                    'Error',
                    'Unable to find current subscription purchase token. Please try refreshing your subscription status.',
                  );
                  setIsProcessing(false);
                  return;
                }

                // Make sure purchase token is a string
                const tokenString =
                  typeof purchaseToken === 'string'
                    ? purchaseToken
                    : String(purchaseToken);

                // Use replacement mode for Android
                // ProrationMode constants from Google Play Billing:
                // 1 = IMMEDIATE_WITH_TIME_PRORATION
                // 2 = IMMEDIATE_AND_CHARGE_PRORATED_PRICE
                // 3 = IMMEDIATE_AND_CHARGE_FULL_PRICE
                // 4 = DEFERRED
                // 5 = IMMEDIATE_WITHOUT_PRORATION
                // For same product with different offers, OpenIAP uses CHARGE_FULL_PRICE (5)
                const replacementMode = 5; // IMMEDIATE_WITHOUT_PRORATION as per OpenIAP example

                console.log('Plan change params:', {
                  skus: [targetProductId],
                  currentBasePlanId,
                  targetBasePlanId,
                  offerToken: targetOffer.offerToken,
                  replacementMode,
                  purchaseToken: tokenString
                    ? `<${tokenString.substring(0, 10)}...>`
                    : 'missing',
                  allOffers: androidOffers?.map((o) => ({
                    basePlanId: o.basePlanId,
                    offerId: o.offerId,
                    offerToken: o.offerToken?.substring(0, 20) + '...',
                  })),
                });

                // Make the request with proper token
                void requestPurchase({
                  request: {
                    android: {
                      skus: [targetProductId],
                      subscriptionOffers: [
                        {
                          sku: targetProductId,
                          offerToken: targetOffer.offerToken,
                        },
                      ],
                      replacementModeAndroid: replacementMode,
                      purchaseTokenAndroid: tokenString,
                    },
                  },
                  type: 'subs',
                }).catch((err: PurchaseError) => {
                  console.error('Plan change failed:', err);
                  console.error('Full error:', JSON.stringify(err));

                  // More helpful error messages
                  let errorMessage = err.message;
                  if (
                    err.message?.includes('DEVELOPER_ERROR') ||
                    err.message?.includes('Invalid arguments')
                  ) {
                    errorMessage =
                      'Unable to change subscription plan. This may be due to:\n' +
                      '• Subscriptions not being in the same group in Play Console\n' +
                      '• Invalid offer configuration\n' +
                      '• Missing purchase token\n\n' +
                      'Original error: ' +
                      err.message;
                  }

                  setIsProcessing(false);
                  setPurchaseResult(`❌ Plan change failed: ${err.message}`);
                  Alert.alert('Plan Change Failed', errorMessage);
                });
              }
            },
          },
        ],
      );
    },
    [subscriptions, activeSubscriptions, setIsProcessing, setPurchaseResult],
  );

  const copyToClipboard = (subscription: ProductSubscription) => {
    const jsonString = JSON.stringify(subscription, null, 2);
    Clipboard.setString(jsonString);
    Alert.alert('Copied', 'Subscription JSON copied to clipboard');
  };

  const renderSubscriptionDetails = useMemo(() => {
    if (!selectedSubscription) return null;

    const jsonString = JSON.stringify(selectedSubscription, null, 2);

    return (
      <View style={styles.modalContent}>
        <ScrollView style={styles.jsonContainer}>
          <Text style={styles.jsonText}>{jsonString}</Text>
        </ScrollView>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.copyButton]}
            onPress={() => copyToClipboard(selectedSubscription)}
          >
            <Text style={styles.actionButtonText}>📋 Copy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.consoleButton]}
            onPress={() => {
              console.log('=== SUBSCRIPTION DATA ===');
              console.log(selectedSubscription);
              console.log('=== SUBSCRIPTION JSON ===');
              console.log(jsonString);
              Alert.alert('Console', 'Subscription data logged to console');
            }}
          >
            <Text style={styles.actionButtonText}>🖥️ Console</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [selectedSubscription]);

  if (!connected) {
    return <Loading message="Connecting to Store..." />;
  }

  const renderIntroductoryOffer = (subscription: ProductSubscription) => {
    if (Platform.OS === 'ios' && 'introductoryPriceIOS' in subscription) {
      if (subscription.introductoryPriceIOS) {
        const paymentMode = subscription.introductoryPricePaymentModeIOS;
        const numberOfPeriods =
          subscription.introductoryPriceNumberOfPeriodsIOS;
        const subscriptionPeriod =
          subscription.introductoryPriceSubscriptionPeriodIOS;

        const periodLabel = subscriptionPeriod
          ? subscriptionPeriod.toLowerCase()
          : 'period';

        if (paymentMode === 'free-trial') {
          return `${numberOfPeriods} ${periodLabel} free trial`;
        }
        if (paymentMode === 'pay-as-you-go') {
          return `${subscription.introductoryPriceIOS} for ${numberOfPeriods} ${periodLabel}`;
        }
        if (paymentMode === 'pay-up-front') {
          return `${subscription.introductoryPriceIOS} for first ${numberOfPeriods} ${periodLabel}`;
        }
      }
    }
    return null;
  };

  const renderSubscriptionPeriod = (subscription: ProductSubscription) => {
    if (Platform.OS === 'ios' && 'subscriptionPeriodUnitIOS' in subscription) {
      const periodUnit = subscription.subscriptionPeriodUnitIOS;
      const periodNumber = subscription.subscriptionPeriodNumberIOS;
      if (periodUnit && periodNumber) {
        const units: Record<string, string> = {
          day: 'day',
          week: 'week',
          month: 'month',
          year: 'year',
        };
        const periodNum = parseInt(periodNumber, 10);
        const normalizedUnit = units[periodUnit] || periodUnit;
        return `${periodNumber} ${normalizedUnit}${periodNum > 1 ? 's' : ''}`;
      }
    }
    return 'subscription';
  };

  const renderSubscriptionPrice = (subscription: ProductSubscription) => {
    if (
      'subscriptionOfferDetailsAndroid' in subscription &&
      subscription.subscriptionOfferDetailsAndroid
    ) {
      const offers = subscription.subscriptionOfferDetailsAndroid;
      if (offers && offers.length > 0) {
        const firstOffer = offers[0];
        if (firstOffer && firstOffer.pricingPhases) {
          const pricingPhaseList = firstOffer.pricingPhases.pricingPhaseList;
          if (pricingPhaseList && pricingPhaseList.length > 0) {
            const firstPhase = pricingPhaseList[0];
            if (firstPhase) {
              return firstPhase.formattedPrice;
            }
          }
        }
      }
      return subscription.displayPrice;
    }
    return subscription.displayPrice;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Subscription Flow</Text>
        <Text style={styles.subtitle}>
          React Native IAP Subscription Management with useIAP Hook
        </Text>
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            Store: {connected ? '✅ Connected' : '❌ Disconnected'}
          </Text>
          <Text style={styles.statusText}>
            Platform: {Platform.OS === 'ios' ? '🍎 iOS' : '🤖 Android'}
          </Text>
        </View>
      </View>

      {activeSubscriptions.length > 0 && (
        <View style={[styles.section, styles.statusSection]}>
          <Text style={styles.sectionTitle}>Current Subscription Status</Text>
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Status:</Text>
              <Text style={[styles.statusValue, styles.activeStatus]}>
                ✅ Active
              </Text>
            </View>

            {(() => {
              // For iOS, filter to show only the most recent subscription in the group
              let subsToShow = [...activeSubscriptions];

              if (Platform.OS === 'ios') {
                // Filter out duplicates for iOS subscription group
                const premiumSubs = activeSubscriptions.filter(
                  (sub) =>
                    sub.productId === 'dev.hyo.martie.premium' ||
                    sub.productId === 'dev.hyo.martie.premium_year',
                );

                if (premiumSubs.length > 1) {
                  // Sort by transaction date and keep only the most recent
                  const sortedPremiumSubs = [...premiumSubs].sort((a, b) => {
                    const dateA = (a as any).transactionDate || 0;
                    const dateB = (b as any).transactionDate || 0;
                    return dateB - dateA;
                  });

                  const mostRecentPremium = sortedPremiumSubs[0];

                  // Filter out old premium subscriptions, keep only the most recent
                  subsToShow = activeSubscriptions.filter((sub) => {
                    if (
                      sub.productId === 'dev.hyo.martie.premium' ||
                      sub.productId === 'dev.hyo.martie.premium_year'
                    ) {
                      return sub === mostRecentPremium;
                    }
                    return true; // Keep all non-premium subscriptions
                  });
                }
              }

              return subsToShow.map((sub: any, index: number) => {
                // Find the matching subscription to get offer details
                const matchingSubscription = subscriptions.find(
                  (s) => s.id === sub.productId,
                );

                // Plan detection for dev.hyo.martie.premium
                let activeOfferLabel = '';
                let detectedBasePlanId = '';

                if (
                  (sub.productId === 'dev.hyo.martie.premium' ||
                    sub.productId === 'dev.hyo.martie.premium_year') &&
                  matchingSubscription
                ) {
                  // Log the full data to understand what's available
                  console.log(
                    'ActiveSubscription data:',
                    JSON.stringify(sub, null, 2),
                  );
                  console.log(
                    'Product ID:',
                    sub.productId,
                    'Is Upgraded?:',
                    (sub as any).isUpgradedIOS,
                  );

                  if (Platform.OS === 'ios') {
                    // iOS: Detect based on product ID
                    if (sub.productId === 'dev.hyo.martie.premium_year') {
                      detectedBasePlanId = 'premium-year';
                      activeOfferLabel = '📅 Yearly Plan';
                    } else {
                      detectedBasePlanId = 'premium';
                      activeOfferLabel = '📆 Monthly Plan';
                    }
                  } else {
                    // Android: Try to detect the base plan from various sources
                    // Method 1: Check if basePlanId is directly available from native
                    if ((sub as any).basePlanId) {
                      detectedBasePlanId = (sub as any).basePlanId;
                      activeOfferLabel =
                        detectedBasePlanId === 'premium-year'
                          ? '📅 Yearly Plan'
                          : '📆 Monthly Plan';
                    }
                    // Method 2: Check localStorage for last purchased plan
                    else {
                      // Try to get from state
                      const storedPlan = lastPurchasedPlan;

                      if (storedPlan === 'premium-year') {
                        detectedBasePlanId = 'premium-year';
                        activeOfferLabel = '📅 Yearly Plan';
                      } else {
                        // Default to monthly
                        detectedBasePlanId = 'premium';
                        activeOfferLabel = '📆 Monthly Plan';
                      }

                      console.log(
                        'Detected plan from state:',
                        storedPlan || 'none (defaulting to monthly)',
                      );
                    }
                  }

                  // We'll use this detectedBasePlanId in the button section below
                }

                // No need for separate handling since we already check both products above

                return (
                  <View
                    key={sub.productId + index}
                    style={styles.subscriptionStatusItem}
                  >
                    <View style={styles.statusRow}>
                      <Text style={styles.statusLabel}>Product:</Text>
                      <Text style={styles.statusValue}>{sub.productId}</Text>
                    </View>

                    {activeOfferLabel &&
                      (sub.productId === 'dev.hyo.martie.premium' ||
                        sub.productId === 'dev.hyo.martie.premium_year') && (
                        <View style={styles.statusRow}>
                          <Text style={styles.statusLabel}>Current Plan:</Text>
                          <Text style={[styles.statusValue, styles.offerLabel]}>
                            {activeOfferLabel}
                          </Text>
                        </View>
                      )}

                    {sub.expirationDateIOS && (
                      <View style={styles.statusRow}>
                        <Text style={styles.statusLabel}>Expires:</Text>
                        <Text style={styles.statusValue}>
                          {new Date(sub.expirationDateIOS).toLocaleDateString()}
                        </Text>
                      </View>
                    )}

                    {Platform.OS === 'android' &&
                      sub.isActive !== undefined && (
                        <View style={styles.statusRow}>
                          <Text style={styles.statusLabel}>Auto-Renew:</Text>
                          <Text
                            style={[
                              styles.statusValue,
                              sub.isActive
                                ? styles.activeStatus
                                : styles.cancelledStatus,
                            ]}
                          >
                            {sub.isActive ? '✅ Enabled' : '⚠️ Cancelled'}
                          </Text>
                        </View>
                      )}

                    {sub.transactionId && (
                      <View style={styles.statusRow}>
                        <Text style={styles.statusLabel}>Transaction ID:</Text>
                        <Text
                          style={[styles.statusValue, styles.transactionId]}
                        >
                          {sub.transactionId.substring(0, 10)}...
                        </Text>
                      </View>
                    )}
                  </View>
                );
              });
            })()}
          </View>

          {/* Upgrade/Downgrade button for Android only */}
          <PlanChangeControls
            activeSubscriptions={activeSubscriptions}
            handlePlanChange={handlePlanChange}
            isProcessing={isProcessing}
            lastPurchasedPlan={lastPurchasedPlan}
          />

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={onRefreshStatus}
            disabled={isCheckingStatus}
          >
            {isCheckingStatus ? (
              <ActivityIndicator color="#007AFF" />
            ) : (
              <Text style={styles.refreshButtonText}>Check Status</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Available Subscriptions</Text>
          <TouchableOpacity
            style={styles.manageButton}
            onPress={onManageSubscriptions}
          >
            <Text style={styles.manageButtonText}>Manage</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sectionSubtitle}>
          {subscriptions.length > 0
            ? `${subscriptions.length} subscription(s) available`
            : 'No subscriptions found. Configure products in the console.'}
        </Text>

        {subscriptions.length > 0 ? (
          subscriptions.map((subscription) => {
            const introOffer = renderIntroductoryOffer(subscription);
            const periodLabel = renderSubscriptionPeriod(subscription);
            const priceLabel = renderSubscriptionPrice(subscription);
            const owned = ownedSubscriptions.has(subscription.id);

            return (
              <View key={subscription.id} style={styles.subscriptionCard}>
                <View style={styles.subscriptionHeader}>
                  <View style={{flex: 1}}>
                    <Text style={styles.subscriptionTitle}>
                      {subscription.title}
                    </Text>
                    <Text style={styles.subscriptionDescription}>
                      {subscription.description}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.infoButton}
                    onPress={() => handleSubscriptionPress(subscription)}
                  >
                    <Text style={styles.infoButtonText}>ℹ️</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.subscriptionMeta}>
                  <Text style={styles.subscriptionPrice}>{priceLabel}</Text>
                  <Text style={styles.subscriptionPeriod}>{periodLabel}</Text>
                </View>

                {introOffer ? (
                  <View style={styles.badgeIntroOffer}>
                    <Text style={styles.badgeIntroOfferText}>{introOffer}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[
                    styles.subscribeButton,
                    owned && styles.subscribeButtonOwned,
                  ]}
                  onPress={() => handleSubscription(subscription.id)}
                  disabled={isProcessing || owned}
                >
                  <Text
                    style={[
                      styles.subscribeButtonText,
                      owned && styles.subscribeButtonOwnedText,
                    ]}
                  >
                    {owned
                      ? 'Already Subscribed'
                      : isProcessing
                        ? 'Processing...'
                        : 'Subscribe'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No subscriptions found. Please configure your products.
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={onRetryLoadSubscriptions}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {purchaseResult || lastPurchase ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Latest Activity</Text>
          {purchaseResult ? (
            <View style={styles.resultCard}>
              <Text style={styles.resultText}>{purchaseResult}</Text>
            </View>
          ) : null}
          {lastPurchase ? (
            <View style={styles.latestPurchaseContainer}>
              <Text style={styles.latestPurchaseTitle}>Latest Purchase</Text>
              <PurchaseSummaryRow purchase={lastPurchase} onPress={() => {}} />
            </View>
          ) : null}
        </View>
      ) : null}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Subscription Details</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            {renderSubscriptionDetails}
          </View>
        </View>
      </Modal>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>🔄 Key Features with useIAP Hook</Text>
        <Text style={styles.infoText}>
          • Automatic connection handling with purchase callbacks
        </Text>
        <Text style={styles.infoText}>
          • Active subscription tracking with `getActiveSubscriptions`
        </Text>
        <Text style={styles.infoText}>
          • Auto-refresh of purchases after successful transactions
        </Text>
        <Text style={styles.infoText}>
          • Platform-specific offer handling built-in
        </Text>
      </View>
    </ScrollView>
  );
}

function SubscriptionFlowContainer() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState('');
  const [lastPurchase, setLastPurchase] = useState<Purchase | null>(null);
  const [lastPurchasedPlan, setLastPurchasedPlan] = useState<string | null>(
    null,
  );
  const [cachedAvailablePurchases, setCachedAvailablePurchases] = useState<
    Purchase[]
  >([]);
  const lastSuccessAtRef = useRef(0);
  const connectedRef = useRef(false);
  const fetchedProductsOnceRef = useRef(false);
  const statusAutoCheckedRef = useRef(false);
  const fetchedAvailablePurchasesRef = useRef(false);

  const {
    connected,
    subscriptions,
    activeSubscriptions,
    fetchProducts,
    finishTransaction,
    getActiveSubscriptions,
  } = useIAP({
    onPurchaseSuccess: async (purchase: Purchase) => {
      const {purchaseToken, ...safePurchase} = purchase || {};
      console.log('Purchase successful (redacted):', safePurchase);

      // Try to detect which plan was purchased
      if (Platform.OS === 'ios') {
        // iOS uses separate products
        if (purchase.productId === 'dev.hyo.martie.premium_year') {
          setLastPurchasedPlan('premium-year');
          console.log('Detected yearly plan from purchase (iOS)');
        } else if (purchase.productId === 'dev.hyo.martie.premium') {
          setLastPurchasedPlan('premium');
          console.log('Detected monthly plan from purchase (iOS)');
        }
      } else if (purchase.productId === 'dev.hyo.martie.premium') {
        // Android: Check if we have offerToken or other data to identify the plan
        const purchaseData = purchase as any;

        // Log full purchase data to understand what's available
        console.log(
          'Full purchase data for plan detection:',
          JSON.stringify(purchaseData, null, 2),
        );

        // Map offerToken to basePlanId using fetched subscription data
        if (purchaseData.offerToken) {
          const premiumSub = subscriptions.find(
            (s) => s.id === 'dev.hyo.martie.premium',
          ) as any;
          const matchingOffer =
            premiumSub?.subscriptionOfferDetailsAndroid?.find(
              (offer: any) => offer.offerToken === purchaseData.offerToken,
            );
          if (matchingOffer?.basePlanId) {
            setLastPurchasedPlan(matchingOffer.basePlanId);
            console.log(
              'Detected plan from offerToken (Android):',
              matchingOffer.basePlanId,
            );
          } else {
            // Fallback if we can't find the matching offer
            console.log(
              'Could not map offerToken to basePlanId:',
              purchaseData.offerToken,
            );
          }
        }
      }

      lastSuccessAtRef.current = Date.now();
      setLastPurchase(purchase);
      setIsProcessing(false);

      const isConsumable = false;

      if (!connectedRef.current) {
        console.log(
          '[SubscriptionFlow] Skipping finishTransaction - not connected yet',
        );
        const started = Date.now();
        const tryFinish = () => {
          if (connectedRef.current) {
            finishTransaction({
              purchase,
              isConsumable,
            }).catch((err) => {
              console.warn(
                '[SubscriptionFlow] Delayed finishTransaction failed:',
                err,
              );
            });
            return;
          }
          if (Date.now() - started < 30000) {
            setTimeout(tryFinish, 500);
          }
        };
        setTimeout(tryFinish, 500);
      } else {
        await finishTransaction({
          purchase,
          isConsumable,
        });
      }

      try {
        // Refresh both active subscriptions and available purchases after successful purchase
        const [, purchases] = await Promise.all([
          getActiveSubscriptions(SUBSCRIPTION_PRODUCT_IDS),
          getAvailablePurchases(),
        ]);
        setCachedAvailablePurchases(purchases);
      } catch (e) {
        console.warn('Failed to refresh subscriptions:', e);
      }

      setPurchaseResult(
        `✅ Subscription activated\n` +
          `Product: ${purchase.productId}\n` +
          `Transaction ID: ${purchase.id}\n` +
          `Date: ${new Date(purchase.transactionDate).toLocaleDateString()}`,
      );

      Alert.alert('Success', 'Purchase completed successfully!');
    },
    onPurchaseError: (error: PurchaseError) => {
      console.error('Subscription failed:', error);
      setIsProcessing(false);
      const dt = Date.now() - lastSuccessAtRef.current;
      if (error?.code === ErrorCode.ServiceError && dt >= 0 && dt < 1500) {
        return;
      }

      setPurchaseResult(`❌ Subscription failed: ${error.message}`);
      Alert.alert('Subscription Failed', error.message);
    },
  });

  useEffect(() => {
    connectedRef.current = connected;
  }, [connected]);

  useEffect(() => {
    if (connected) {
      if (!fetchedProductsOnceRef.current) {
        fetchProducts({
          skus: SUBSCRIPTION_PRODUCT_IDS,
          type: 'subs',
        });
        fetchedProductsOnceRef.current = true;
      }

      // Fetch available purchases once when connected
      if (!fetchedAvailablePurchasesRef.current) {
        getAvailablePurchases()
          .then((purchases) => {
            setCachedAvailablePurchases(purchases);
            fetchedAvailablePurchasesRef.current = true;
            console.log('Cached available purchases:', purchases.length);
          })
          .catch((error) => {
            console.error('Failed to fetch available purchases:', error);
          });
      }
    }
  }, [connected, fetchProducts]);

  const handleRefreshStatus = useCallback(async () => {
    if (!connected || isCheckingStatus) return;

    setIsCheckingStatus(true);
    try {
      // Refresh both active subscriptions and available purchases
      const [activeSubs, purchases] = await Promise.all([
        getActiveSubscriptions(),
        getAvailablePurchases(),
      ]);
      setCachedAvailablePurchases(purchases);
      console.log('Refreshed active subscriptions:', activeSubs);
      console.log('Refreshed available purchases:', purchases);

      // For iOS, check if there's a pending change
      if (Platform.OS === 'ios') {
        const premiumPurchases = purchases.filter(
          (p) =>
            p.productId === 'dev.hyo.martie.premium' ||
            p.productId === 'dev.hyo.martie.premium_year',
        );
        console.log(
          'Premium purchases found:',
          premiumPurchases.map((p) => ({
            productId: p.productId,
            transactionDate: new Date(p.transactionDate).toISOString(),
            isAutoRenewing: p.isAutoRenewing,
          })),
        );
      }
    } catch (error) {
      console.error('Error checking subscription status:', error);
    } finally {
      setIsCheckingStatus(false);
    }
  }, [connected, getActiveSubscriptions, isCheckingStatus]);

  useEffect(() => {
    if (connected && !statusAutoCheckedRef.current) {
      const timer = setTimeout(() => {
        statusAutoCheckedRef.current = true;
        void handleRefreshStatus();
      }, 500);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [connected, handleRefreshStatus]);

  const handleSubscription = useCallback(
    (itemId: string) => {
      setIsProcessing(true);
      setPurchaseResult('Processing subscription...');

      const subscription = subscriptions.find((sub) => sub.id === itemId);

      void requestPurchase({
        request: {
          ios: {
            sku: itemId,
            appAccountToken: 'user-123',
          },
          android: {
            skus: [itemId],
            subscriptionOffers:
              subscription &&
              'subscriptionOfferDetailsAndroid' in subscription &&
              (subscription as AndroidSubscriptionDetails)
                .subscriptionOfferDetailsAndroid
                ? (
                    subscription as AndroidSubscriptionDetails
                  ).subscriptionOfferDetailsAndroid!.map((offer) => ({
                    sku: itemId,
                    offerToken: offer.offerToken,
                  }))
                : [],
          },
        },
        type: 'subs',
      }).catch((err: PurchaseError) => {
        console.warn('requestPurchase failed:', err);
        setIsProcessing(false);
        setPurchaseResult(`❌ Subscription failed: ${err.message}`);
        Alert.alert('Subscription Failed', err.message);
      });
    },
    [subscriptions],
  );

  const handleRetryLoadSubscriptions = useCallback(() => {
    fetchProducts({
      skus: SUBSCRIPTION_PRODUCT_IDS,
      type: 'subs',
    });
  }, [fetchProducts]);

  const handleManageSubscriptions = useCallback(async () => {
    try {
      await deepLinkToSubscriptions();
    } catch (error) {
      console.warn('Failed to open subscription management:', error);
      Alert.alert(
        'Cannot Open',
        'Unable to open the subscription management screen on this device.',
      );
    }
  }, []);

  return (
    <SubscriptionFlow
      connected={connected}
      subscriptions={subscriptions}
      activeSubscriptions={activeSubscriptions}
      purchaseResult={purchaseResult}
      isProcessing={isProcessing}
      isCheckingStatus={isCheckingStatus}
      lastPurchase={lastPurchase}
      lastPurchasedPlan={lastPurchasedPlan}
      cachedAvailablePurchases={cachedAvailablePurchases}
      setCachedAvailablePurchases={setCachedAvailablePurchases}
      setIsProcessing={setIsProcessing}
      setPurchaseResult={setPurchaseResult}
      setLastPurchasedPlan={setLastPurchasedPlan}
      onSubscribe={handleSubscription}
      onRetryLoadSubscriptions={handleRetryLoadSubscriptions}
      onRefreshStatus={handleRefreshStatus}
      onManageSubscriptions={handleManageSubscriptions}
    />
  );
}

export default SubscriptionFlowContainer;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  header: {
    padding: 24,
    paddingTop: 48,
    backgroundColor: '#1f3c88',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
  },
  statusContainer: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  statusText: {
    color: 'white',
    fontSize: 13,
    marginBottom: 4,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1f36',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#5f6470',
    marginTop: 6,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#e1e7ef',
    marginVertical: 20,
  },
  subscriptionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 18,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  subscriptionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1f36',
  },
  subscriptionDescription: {
    fontSize: 13,
    color: '#5f6470',
    marginTop: 4,
  },
  subscriptionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  subscriptionPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1f36',
  },
  subscriptionPeriod: {
    fontSize: 13,
    color: '#5f6470',
  },
  badgeIntroOffer: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#ff8c42',
  },
  badgeIntroOfferText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subscribeButton: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#1f3c88',
  },
  subscribeButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },
  subscribeButtonOwned: {
    backgroundColor: 'rgba(31,60,136,0.1)',
  },
  subscribeButtonOwnedText: {
    color: '#1f3c88',
  },
  infoButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#f1f4ff',
  },
  infoButtonText: {
    fontSize: 16,
  },
  emptyState: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#5f6470',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#1f3c88',
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  statusSection: {
    paddingTop: 32,
  },
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    gap: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 13,
    color: '#5f6470',
    fontWeight: '600',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1f36',
  },
  activeStatus: {
    color: '#1f8a70',
  },
  cancelledStatus: {
    color: '#d7263d',
  },
  subscriptionStatusItem: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#e1e7ef',
    borderRadius: 12,
  },
  refreshButton: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1f3c88',
    backgroundColor: 'white',
  },
  refreshButtonText: {
    color: '#1f3c88',
    fontWeight: '600',
    fontSize: 14,
  },
  manageButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(31,60,136,0.1)',
  },
  manageButtonText: {
    color: '#1f3c88',
    fontWeight: '600',
  },
  resultCard: {
    marginTop: 16,
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#1f8a70',
  },
  resultText: {
    fontSize: 13,
    color: '#1a1f36',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  latestPurchaseContainer: {
    marginTop: 16,
    gap: 12,
  },
  latestPurchaseTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1f36',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e1e7ef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1f36',
  },
  closeButton: {
    padding: 6,
  },
  closeButtonText: {
    fontSize: 22,
    color: '#5f6470',
  },
  modalContent: {
    padding: 18,
  },
  modalLabel: {
    fontSize: 12,
    color: '#5f6470',
  },
  modalValue: {
    fontSize: 14,
    color: '#1a1f36',
  },
  jsonContainer: {
    maxHeight: 320,
    borderRadius: 12,
    backgroundColor: '#f7f9fc',
    padding: 16,
  },
  jsonText: {
    fontSize: 12,
    color: '#1a1f36',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  copyButton: {
    backgroundColor: '#1f3c88',
  },
  consoleButton: {
    backgroundColor: '#1f8a70',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
  },
  purchaseDetailsContainer: {
    gap: 12,
  },
  purchaseDetailRow: {
    flexDirection: 'column',
    gap: 6,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e1e7ef',
  },
  infoSection: {
    margin: 24,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#eef2ff',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1f36',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 13,
    color: '#1a1f36',
    marginBottom: 6,
  },
  offerLabel: {
    fontWeight: '600',
    color: '#1f3c88',
  },
  transactionId: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 12,
    color: '#5f6470',
  },
  planChangeSection: {
    marginTop: 16,
    marginBottom: 8,
  },
  planChangeOptions: {
    gap: 8,
  },
  changePlanButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  changePlanButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
  },
  changePlanButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 4,
  },
  upgradeButton: {
    backgroundColor: '#4CAF50',
  },
  downgradeButton: {
    backgroundColor: '#FF9800',
  },
  switchButton: {
    backgroundColor: '#2196F3',
  },
  selectButton: {
    backgroundColor: '#9C27B0',
  },
  warningText: {
    fontSize: 13,
    color: '#FF9800',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 18,
  },
  questionText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    color: '#1a1f36',
  },
});
