// Generated from example/screens/SubscriptionFlow.tsx
// This file is automatically copied during postinstall
// Do not edit directly - modify the source file instead

import {useEffect, useCallback, useState, useRef} from 'react';
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
  useIAP,
  type SubscriptionProduct,
  type PurchaseError,
  type Purchase,
  isUserCancelledError,
  deepLinkToSubscriptions,
} from 'react-native-iap';

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

// Sample subscription product IDs
const SUBSCRIPTION_IDS = ['dev.hyo.martie.premium'];

export default function SubscriptionFlow() {
  // Track connection to coordinate delayed finish
  const connectedRef = useRef(false);
  const lastSuccessAtRef = useRef<number>(0);

  const {
    connected,
    subscriptions,
    availablePurchases,
    activeSubscriptions,
    fetchProducts,
    finishTransaction,
    getAvailablePurchases,
    getActiveSubscriptions,
    requestPurchase,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      {
        const {purchaseToken, transactionReceipt, ...safePurchase} =
          (purchase as any) || {};
        console.log('Purchase successful (redacted):', safePurchase);
      }
      lastSuccessAtRef.current = Date.now();
      setIsProcessing(false);

      // IMPORTANT: Perform server-side validation here
      // Use the unified purchase token for both platforms
      // Example:
      // const isValid = await validateReceiptOnServer(purchase.purchaseToken);
      // if (!isValid) {
      //   Alert.alert('Error', 'Receipt validation failed');
      //   return;
      // }

      // After successful server validation, finish the transaction
      // Guard: Only attempt when connected to store
      if (!connectedRef.current) {
        console.log(
          '[SubscriptionFlow] Skipping finishTransaction - not connected yet',
        );
        // Retry until connected or timeout (~1s)
        const started = Date.now();
        const tryFinish = () => {
          if (connectedRef.current) {
            finishTransaction({
              purchase,
              isConsumable: false,
            }).catch((err) => {
              console.warn(
                '[SubscriptionFlow] Delayed finishTransaction failed:',
                err,
              );
            });
            return;
          }
          if (Date.now() - started < 1000) {
            setTimeout(tryFinish, 100);
          }
        };
        setTimeout(tryFinish, 100);
      } else {
        // For subscriptions, set isConsumable to false
        await finishTransaction({
          purchase,
          isConsumable: false, // Set to false for subscription products
        });
      }

      // Refresh subscription status and available purchases after success
      try {
        await getActiveSubscriptions(SUBSCRIPTION_IDS);
      } catch (e) {
        console.warn('Failed to refresh active subscriptions:', e);
      }
      try {
        await getAvailablePurchases();
      } catch (e) {
        console.warn('Failed to refresh available purchases:', e);
      }

      // Handle successful purchase
      setPurchaseResult(
        `✅ Subscription activated\n` +
          `Product: ${purchase.productId}\n` +
          `Transaction ID: ${purchase.id}\n` +
          `Date: ${new Date(purchase.transactionDate).toLocaleDateString()}\n` +
          `Token: ${purchase.purchaseToken?.substring(0, 50) || 'N/A'}...`,
      );

      Alert.alert('Success', 'Purchase completed successfully!');
    },
    onPurchaseError: (error: PurchaseError) => {
      console.error('Subscription failed:', error);
      setIsProcessing(false);
      const isCancel = isUserCancelledError(error as any);
      // iOS may emit a transient error after a success; ignore within a short window
      if (!isCancel && (error as any)?.code === 'E_SERVICE_ERROR') {
        const dt = Date.now() - lastSuccessAtRef.current;
        if (dt >= 0 && dt < 1500) {
          // Ignore spurious error shortly after a success event
          return;
        }
      }
      // Always update UI error text
      setPurchaseResult(`❌ Subscription failed: ${error.message}`);
      // Only alert for non-cancel errors
      if (!isCancel) {
        Alert.alert('Subscription Failed', error.message);
      }
    },
    onSyncError: (error: Error) => {
      console.warn('Sync error:', error);
      Alert.alert(
        'Sync Error',
        `Failed to sync subscriptions: ${error.message}`,
      );
    },
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState('');
  const [selectedSubscription, setSelectedSubscription] =
    useState<SubscriptionProduct | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(
    null,
  );
  const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);
  const fetchedProductsOnceRef = useRef(false);
  const loadedPurchasesOnceRef = useRef(false);
  const statusAutoCheckedRef = useRef(false);

  // Load subscription products when connected
  useEffect(() => {
    if (connected) {
      if (!fetchedProductsOnceRef.current) {
        console.log('Connected to store, loading subscription products...');
        fetchProducts({skus: SUBSCRIPTION_IDS, type: 'subs'});
        console.log('Product loading request sent - waiting for results...');
        fetchedProductsOnceRef.current = true;
      }

      if (!loadedPurchasesOnceRef.current) {
        console.log('Loading available purchases...');
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

  // Keep ref in sync for delayed finish
  useEffect(() => {
    connectedRef.current = connected;
  }, [connected]);

  // Check subscription status separately to avoid infinite loop
  useEffect(() => {
    if (connected && !statusAutoCheckedRef.current) {
      // Use a timeout to avoid rapid consecutive calls
      const timer = setTimeout(() => {
        statusAutoCheckedRef.current = true;
        checkSubscriptionStatus();
      }, 500);

      return () => clearTimeout(timer);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  // Track activeSubscriptions state changes
  useEffect(() => {
    // State change: activeSubscriptions
  }, [activeSubscriptions]);

  // Track subscriptions (products) state changes
  useEffect(() => {
    // State change: subscriptions (products)
  }, [subscriptions]);

  // Removed - handled by onPurchaseSuccess and onPurchaseError callbacks

  // Check subscription status
  const checkSubscriptionStatus = useCallback(async () => {
    if (!connected || isCheckingStatus) return;

    setIsCheckingStatus(true);
    try {
      // No need to pass subscriptionIds - it will check all active subscriptions
      const subs = await getActiveSubscriptions();
      console.log('Active subscriptions result:', subs);
    } catch (error) {
      console.error('Error checking subscription status:', error);
    } finally {
      setIsCheckingStatus(false);
    }
  }, [connected, getActiveSubscriptions, isCheckingStatus]);

  // Handle subscription purchase
  const handleSubscription = async (itemId: string) => {
    try {
      setIsProcessing(true);
      setPurchaseResult('Processing subscription...');

      // Find the subscription to get offer details for Android
      const subscription = subscriptions.find((sub) => sub.id === itemId);

      // New platform-specific API (v2.7.0+) - no Platform.OS branching needed
      // requestPurchase is event-based - results come through onPurchaseSuccess/onPurchaseError
      await requestPurchase({
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
                ? subscription.subscriptionOfferDetailsAndroid.map(
                    (offer: any) => ({
                      sku: itemId,
                      offerToken: offer.offerToken,
                    }),
                  )
                : [],
          },
        },
        type: 'subs',
      });
    } catch (error) {
      setIsProcessing(false);
      const errorMessage =
        error instanceof Error ? error.message : 'Subscription failed';
      setPurchaseResult(`❌ Subscription failed: ${errorMessage}`);
      Alert.alert('Subscription Failed', errorMessage);
    }
  };

  // Retry loading subscriptions
  const retryLoadSubscriptions = () => {
    fetchProducts({skus: SUBSCRIPTION_IDS, type: 'subs'});
  };

  // Get subscription display price
  const getSubscriptionDisplayPrice = (
    subscription: SubscriptionProduct,
  ): string => {
    if (
      'subscriptionOfferDetailsAndroid' in subscription &&
      subscription.subscriptionOfferDetailsAndroid
    ) {
      // Android subscription pricing structure
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
    } else {
      // iOS subscription pricing
      return subscription.displayPrice;
    }
  };

  // Get subscription period
  const getSubscriptionPeriod = (subscription: SubscriptionProduct): string => {
    if (Platform.OS === 'ios' && 'subscriptionPeriodUnitIOS' in subscription) {
      // iOS subscription period
      const periodUnit = subscription.subscriptionPeriodUnitIOS;
      const periodNumber = subscription.subscriptionPeriodNumberIOS;
      if (periodUnit && periodNumber) {
        const units: Record<string, string> = {
          DAY: 'day',
          WEEK: 'week',
          MONTH: 'month',
          YEAR: 'year',
        };
        const periodNum = parseInt(periodNumber, 10);
        return `${periodNumber} ${units[periodUnit] || periodUnit}${
          periodNum > 1 ? 's' : ''
        }`;
      }
    }
    // Default or Android
    return 'subscription';
  };

  // Get introductory offer text
  const getIntroductoryOffer = (
    subscription: SubscriptionProduct,
  ): string | null => {
    if (Platform.OS === 'ios' && 'introductoryPriceIOS' in subscription) {
      if (subscription.introductoryPriceIOS) {
        const paymentMode = subscription.introductoryPricePaymentModeIOS;
        const numberOfPeriods =
          subscription.introductoryPriceNumberOfPeriodsIOS;
        const subscriptionPeriod =
          subscription.introductoryPriceSubscriptionPeriodIOS;

        if (paymentMode === 'FREETRIAL') {
          return `${numberOfPeriods} ${subscriptionPeriod} free trial`;
        } else if (paymentMode === 'PAYASYOUGO') {
          return `${subscription.introductoryPriceIOS} for ${numberOfPeriods} ${subscriptionPeriod}`;
        } else if (paymentMode === 'PAYUPFRONT') {
          return `${subscription.introductoryPriceIOS} for first ${numberOfPeriods} ${subscriptionPeriod}`;
        }
      }
    }
    return null;
  };

  // Handle subscription info press
  const handleSubscriptionPress = (subscription: SubscriptionProduct) => {
    setSelectedSubscription(subscription);
    setModalVisible(true);
  };

  // Copy subscription details to clipboard
  const copyToClipboard = async () => {
    if (!selectedSubscription) return;

    const jsonString = JSON.stringify(selectedSubscription, null, 2);
    Clipboard.setString(jsonString);
    Alert.alert('Copied', 'Subscription JSON copied to clipboard');
  };

  // Log subscription to console
  const logToConsole = () => {
    if (!selectedSubscription) return;

    console.log('=== SUBSCRIPTION DATA ===');
    console.log(selectedSubscription);
    console.log('=== SUBSCRIPTION JSON ===');
    console.log(JSON.stringify(selectedSubscription, null, 2));
    Alert.alert('Console', 'Subscription data logged to console');
  };

  // Render subscription details modal
  const renderSubscriptionDetails = () => {
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
            onPress={copyToClipboard}
          >
            <Text style={styles.actionButtonText}>📋 Copy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.consoleButton]}
            onPress={logToConsole}
          >
            <Text style={styles.actionButtonText}>🖥️ Console</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
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
        {!connected && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginTop: 8,
            }}
          >
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingText}>Connecting to store…</Text>
          </View>
        )}
      </View>

      {/* Subscription Status Section */}
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
            onPress={checkSubscriptionStatus}
            disabled={isCheckingStatus}
          >
            {isCheckingStatus ? (
              <ActivityIndicator color="#007AFF" />
            ) : (
              <Text style={styles.refreshButtonText}>🔄 Refresh Status</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.refreshButton, {marginTop: 8}]}
            onPress={() => deepLinkToSubscriptions().catch(() => {})}
          >
            <Text style={styles.refreshButtonText}>
              👤 Manage Subscriptions
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Available Subscriptions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Available Subscriptions</Text>
          {activeSubscriptions.length === 0 && connected && (
            <TouchableOpacity onPress={checkSubscriptionStatus}>
              <Text style={styles.checkStatusLink}>Check Status</Text>
            </TouchableOpacity>
          )}
        </View>

        {!connected ? (
          <Text style={styles.loadingText}>Connecting to store...</Text>
        ) : subscriptions.length > 0 ? (
          subscriptions.map((subscription: SubscriptionProduct) => (
            <View key={subscription.id} style={styles.subscriptionCard}>
              <View style={styles.subscriptionInfo}>
                <Text style={styles.subscriptionTitle}>
                  {subscription.title}
                </Text>
                <Text style={styles.subscriptionDescription}>
                  {subscription.description}
                </Text>
                <View style={styles.subscriptionDetails}>
                  <Text style={styles.subscriptionPrice}>
                    {getSubscriptionDisplayPrice(subscription)}
                  </Text>
                  <Text style={styles.subscriptionPeriod}>
                    per {getSubscriptionPeriod(subscription)}
                  </Text>
                </View>
                {getIntroductoryOffer(subscription) && (
                  <View style={styles.offerBadge}>
                    <Text style={styles.offerText}>
                      {getIntroductoryOffer(subscription)}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.subscriptionActions}>
                <TouchableOpacity
                  style={styles.infoButton}
                  onPress={() => handleSubscriptionPress(subscription)}
                >
                  <Text style={styles.infoButtonText}>ℹ️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.subscribeButton,
                    (isProcessing ||
                      activeSubscriptions.some(
                        (sub) => sub.productId === subscription.id,
                      )) &&
                      styles.disabledButton,
                    activeSubscriptions.some(
                      (sub) => sub.productId === subscription.id,
                    ) && styles.subscribedButton,
                  ]}
                  onPress={() => handleSubscription(subscription.id)}
                  disabled={
                    isProcessing ||
                    !connected ||
                    activeSubscriptions.some(
                      (sub) => sub.productId === subscription.id,
                    )
                  }
                >
                  <Text
                    style={[
                      styles.subscribeButtonText,
                      activeSubscriptions.some(
                        (sub) => sub.productId === subscription.id,
                      ) && styles.subscribedButtonText,
                    ]}
                  >
                    {isProcessing
                      ? 'Processing...'
                      : activeSubscriptions.some(
                            (sub) => sub.productId === subscription.id,
                          )
                        ? '✅ Subscribed'
                        : 'Subscribe'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.noSubscriptionsCard}>
            <Text style={styles.noSubscriptionsText}>
              No subscriptions found. Make sure to configure your subscription
              IDs in your app store.
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={retryLoadSubscriptions}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Purchase History */}
      {availablePurchases.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Purchase History</Text>
          <Text style={styles.subtitle}>
            Past purchases and subscription transactions
          </Text>
          {(() => {
            // Deduplicate by productId: keep the most recent transaction
            const byId = new Map<string, Purchase>();
            for (const p of availablePurchases) {
              const existing = byId.get(p.productId);
              if (
                !existing ||
                (p.transactionDate || 0) > (existing.transactionDate || 0)
              ) {
                byId.set(p.productId, p);
              }
            }
            const unique = Array.from(byId.values());
            return unique;
          })().map((purchase: Purchase, index: number) => (
            <TouchableOpacity
              key={`${purchase.id}-${index}`}
              style={styles.purchaseCard}
              activeOpacity={0.8}
              onPress={() => {
                setSelectedPurchase(purchase);
                setPurchaseModalVisible(true);
              }}
              onLongPress={() => {
                setSelectedPurchase(purchase);
                setPurchaseModalVisible(true);
              }}
            >
              <View style={styles.purchaseInfo}>
                <Text style={styles.purchaseTitle}>{purchase.productId}</Text>
                <Text style={styles.purchaseDate}>
                  {new Date(purchase.transactionDate).toLocaleDateString()}
                </Text>
                <Text style={styles.purchasePlatform}>
                  Platform: {purchase.platform}
                </Text>
                {Platform.OS === 'android' &&
                  'autoRenewingAndroid' in purchase && (
                    <Text style={styles.purchaseRenewal}>
                      Auto-Renewing:{' '}
                      {purchase.autoRenewingAndroid ? 'Yes' : 'No'}
                    </Text>
                  )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Purchase Result */}
      {purchaseResult && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Result</Text>
          <View style={styles.resultCard}>
            <Text style={styles.resultText}>{purchaseResult}</Text>
          </View>
        </View>
      )}

      {/* Subscription Details Modal */}
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
            {renderSubscriptionDetails()}
          </View>
        </View>
      </Modal>

      {/* Purchase Details Modal (long press) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={purchaseModalVisible}
        onRequestClose={() => setPurchaseModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Purchase Details</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setPurchaseModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            {selectedPurchase ? (
              <View style={styles.modalContent}>
                {(() => {
                  const {purchaseToken, transactionReceipt, ...safe} =
                    (selectedPurchase || {}) as any;
                  const jsonString = JSON.stringify(safe, null, 2);
                  return (
                    <>
                      <ScrollView style={styles.jsonContainer}>
                        <Text style={styles.jsonText}>{jsonString}</Text>
                      </ScrollView>
                      <View style={styles.buttonContainer}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.copyButton]}
                          onPress={() => Clipboard.setString(jsonString)}
                        >
                          <Text style={styles.actionButtonText}>📋 Copy</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.consoleButton]}
                          onPress={() => {
                            console.log('=== PURCHASE DATA (redacted) ===');
                            console.log(safe);
                            console.log('=== PURCHASE JSON (redacted) ===');
                            console.log(jsonString);
                            Alert.alert(
                              'Console',
                              'Purchase data logged to console',
                            );
                          }}
                        >
                          <Text style={styles.actionButtonText}>
                            🖥️ Console
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  );
                })()}
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Info Section */}
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>🔄 Key Features with useIAP Hook</Text>
        <Text style={styles.infoText}>
          • Simplified API with useIAP hook{'\n'}• Event-based subscription
          handling{'\n'}• Automatic connection management{'\n'}•
          Platform-specific subscription details{'\n'}• Subscription status
          checking{'\n'}• Auto-renewal state management{'\n'}• Receipt
          validation ready
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  checkStatusLink: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    padding: 20,
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  statusSection: {
    backgroundColor: '#e8f4f8',
    borderColor: '#0066cc',
    borderWidth: 1,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  activeStatus: {
    color: '#28a745',
  },
  cancelledStatus: {
    color: '#ffc107',
  },
  subscriptionStatusItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 12,
    marginBottom: 12,
  },
  refreshButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    alignItems: 'center',
    marginTop: 8,
  },
  refreshButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14,
  },
  subscriptionCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  subscriptionInfo: {
    flex: 1,
    marginRight: 15,
  },
  subscriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  subscriptionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  subscriptionDetails: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  subscriptionPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
  },
  subscriptionPeriod: {
    fontSize: 12,
    color: '#666',
  },
  subscriptionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoButton: {
    backgroundColor: '#e9ecef',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoButtonText: {
    fontSize: 18,
  },
  subscribeButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  subscribeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  subscribedButton: {
    backgroundColor: '#6c757d',
  },
  subscribedButtonText: {
    color: '#fff',
  },
  offerBadge: {
    backgroundColor: '#e7f3ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  offerText: {
    fontSize: 12,
    color: '#0066cc',
    fontWeight: '600',
  },
  noSubscriptionsCard: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
  },
  noSubscriptionsText: {
    textAlign: 'center',
    color: '#856404',
    marginBottom: 15,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#ffc107',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#212529',
    fontWeight: '600',
  },
  purchaseCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  purchaseInfo: {
    flex: 1,
  },
  purchaseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  purchaseDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  purchasePlatform: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  purchaseRenewal: {
    fontSize: 12,
    color: '#007AFF',
  },
  resultCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  resultText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 20,
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    height: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  modalContent: {
    flex: 1,
    padding: 20,
    paddingTop: 0,
  },
  jsonContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  jsonText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    color: '#333',
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  copyButton: {
    backgroundColor: '#007AFF',
  },
  consoleButton: {
    backgroundColor: '#28a745',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    padding: 20,
    backgroundColor: '#f0f8ff',
    margin: 20,
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#0066cc',
  },
  infoText: {
    fontSize: 14,
    color: '#0066cc',
    lineHeight: 20,
  },
});
