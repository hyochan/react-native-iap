import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
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
  type ActiveSubscription,
  type ProductSubscription,
  type Purchase,
  type PurchaseError,
  ErrorCode,
} from 'react-native-iap';
import Loading from '../src/components/Loading';
import {SUBSCRIPTION_PRODUCT_IDS} from '../src/utils/constants';
import PurchaseDetails from '../src/components/PurchaseDetails';
import PurchaseSummaryRow from '../src/components/PurchaseSummaryRow';

const deduplicatePurchases = (purchases: Purchase[]): Purchase[] => {
  const uniquePurchases = new Map<string, Purchase>();

  for (const purchase of purchases) {
    const existingPurchase = uniquePurchases.get(purchase.productId);
    if (!existingPurchase) {
      uniquePurchases.set(purchase.productId, purchase);
    } else {
      const existingTimestamp = existingPurchase.transactionDate || 0;
      const newTimestamp = purchase.transactionDate || 0;

      if (newTimestamp > existingTimestamp) {
        uniquePurchases.set(purchase.productId, purchase);
      }
    }
  }

  return Array.from(uniquePurchases.values());
};

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
  availablePurchases: Purchase[];
  activeSubscriptions: ActiveSubscription[];
  purchaseResult: string;
  isProcessing: boolean;
  isCheckingStatus: boolean;
  lastPurchase: Purchase | null;
  onSubscribe: (productId: string) => void;
  onRetryLoadSubscriptions: () => void;
  onRefreshStatus: () => void;
  onManageSubscriptions: () => void;
};

function SubscriptionFlow({
  connected,
  subscriptions,
  availablePurchases,
  activeSubscriptions,
  purchaseResult,
  isProcessing,
  isCheckingStatus,
  lastPurchase,
  onSubscribe,
  onRetryLoadSubscriptions,
  onRefreshStatus,
  onManageSubscriptions,
}: SubscriptionFlowProps) {
  const [selectedSubscription, setSelectedSubscription] =
    useState<ProductSubscription | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(
    null,
  );
  const [purchaseDetailsVisible, setPurchaseDetailsVisible] = useState(false);

  const availablePurchaseRows = useMemo(
    () => deduplicatePurchases(availablePurchases),
    [availablePurchases],
  );

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

            {activeSubscriptions.map((sub: any, index: number) => (
              <View
                key={sub.productId + index}
                style={styles.subscriptionStatusItem}
              >
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Product:</Text>
                  <Text style={styles.statusValue}>{sub.productId}</Text>
                </View>

                {sub.expirationDateIOS && (
                  <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Expires:</Text>
                    <Text style={styles.statusValue}>
                      {sub.expirationDateIOS?.toLocaleDateString()}
                    </Text>
                  </View>
                )}

                {Platform.OS === 'android' && sub.isActive !== undefined && (
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
              </View>
            ))}
          </View>

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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Stored Purchases</Text>
        <Text style={styles.sectionSubtitle}>
          {availablePurchaseRows.length > 0
            ? `${availablePurchaseRows.length} saved purchases`
            : 'No stored purchases yet'}
        </Text>

        {availablePurchaseRows.length > 0 ? (
          availablePurchaseRows.map((purchase) => (
            <PurchaseSummaryRow
              key={`${purchase.productId}-${
                purchase.transactionDate ?? purchase.id ?? 'na'
              }`}
              purchase={purchase}
              onPress={() => {
                setSelectedPurchase(purchase);
                setPurchaseDetailsVisible(true);
              }}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No stored purchases yet. Complete a subscription purchase to see
              it here.
            </Text>
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
              <PurchaseSummaryRow
                purchase={lastPurchase}
                onPress={() => {
                  setSelectedPurchase(lastPurchase);
                  setPurchaseDetailsVisible(true);
                }}
              />
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

      <Modal
        animationType="slide"
        transparent={true}
        visible={purchaseDetailsVisible}
        onRequestClose={() => setPurchaseDetailsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Purchase Details</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setPurchaseDetailsVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            {selectedPurchase ? (
              <View style={styles.modalContent}>
                <PurchaseDetails
                  purchase={selectedPurchase}
                  containerStyle={styles.purchaseDetailsContainer}
                  rowStyle={styles.purchaseDetailRow}
                  labelStyle={styles.modalLabel}
                  valueStyle={styles.modalValue}
                />
              </View>
            ) : null}
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
  const lastSuccessAtRef = useRef(0);
  const connectedRef = useRef(false);
  const fetchedProductsOnceRef = useRef(false);
  const loadedPurchasesOnceRef = useRef(false);
  const statusAutoCheckedRef = useRef(false);

  const {
    connected,
    subscriptions,
    availablePurchases,
    activeSubscriptions,
    fetchProducts,
    finishTransaction,
    getAvailablePurchases,
    getActiveSubscriptions,
  } = useIAP({
    onPurchaseSuccess: async (purchase: Purchase) => {
      const {purchaseToken, ...safePurchase} = purchase || {};
      console.log('Purchase successful (redacted):', safePurchase);
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
        await getActiveSubscriptions(SUBSCRIPTION_PRODUCT_IDS);
      } catch (e) {
        console.warn('Failed to refresh active subscriptions:', e);
      }
      try {
        await getAvailablePurchases();
      } catch (e) {
        console.warn('Failed to refresh available purchases:', e);
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

      if (!loadedPurchasesOnceRef.current) {
        getAvailablePurchases()
          .catch((error) => {
            console.warn('Failed to load available purchases:', error);
          })
          .finally(() => {
            loadedPurchasesOnceRef.current = true;
          });
      }
    }
  }, [connected, fetchProducts, getAvailablePurchases]);

  const handleRefreshStatus = useCallback(async () => {
    if (!connected || isCheckingStatus) return;

    setIsCheckingStatus(true);
    try {
      await getActiveSubscriptions();
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
              subscription.subscriptionOfferDetailsAndroid
                ? subscription.subscriptionOfferDetailsAndroid.map((offer) => ({
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
      availablePurchases={availablePurchases}
      activeSubscriptions={activeSubscriptions}
      purchaseResult={purchaseResult}
      isProcessing={isProcessing}
      isCheckingStatus={isCheckingStatus}
      lastPurchase={lastPurchase}
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
});
