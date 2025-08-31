import {useEffect, useCallback, useState} from 'react';
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
  type Product,
  type SubscriptionProductIOS,
} from 'react-native-iap';

/**
 * Subscription Flow Example using useIAP Hook
 *
 * Demonstrates subscription handling with useIAP:
 * - Loading subscription products
 * - Handling subscription purchases with event-based API
 * - Checking subscription status
 * - Platform-specific subscription details
 */

// Sample subscription product IDs
const SUBSCRIPTION_IDS = ['dev.hyo.martie.premium'];

export default function SubscriptionFlow() {
  const {
    connected,
    subscriptions,
    availablePurchases,
    activeSubscriptions,
    currentPurchase,
    currentPurchaseError,
    requestProducts,
    requestPurchase,
    finishTransaction,
    getAvailablePurchases,
    getActiveSubscriptions,
    clearCurrentPurchase,
    clearCurrentPurchaseError,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      console.log('Purchase successful:', purchase);

      // Check if this is a duplicate subscription
      const isAlreadySubscribed = activeSubscriptions.some(
        (sub) => sub.productId === purchase.id,
      );

      if (isAlreadySubscribed) {
        Alert.alert(
          'Subscription Status',
          'Your subscription is already active. No additional charge was made.',
        );
      } else {
        Alert.alert('Success', 'Subscription activated successfully!');
      }

      // IMPORTANT: Server-side receipt validation should be performed here
      // After successful server validation, finish the transaction
      await finishTransaction({
        purchase,
        isConsumable: false,
      });

      // Refresh subscription status
      setTimeout(() => {
        checkSubscriptionStatus();
      }, 1000);
    },
    onPurchaseError: (error) => {
      console.error('Purchase error:', error);
      setPurchaseResult(`❌ Subscription failed: ${error.message}`);
    },
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState('');
  const [selectedSubscription, setSelectedSubscription] =
    useState<Product | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Load subscription products when connected
  useEffect(() => {
    if (connected) {
      loadSubscriptions();
      checkSubscriptionStatus();
    }
  }, [connected]);

  // Handle current purchase updates
  useEffect(() => {
    if (currentPurchase) {
      setIsProcessing(false);
      setPurchaseResult(
        `✅ Subscription successful (${currentPurchase.platform})\n` +
          `Product: ${currentPurchase.id}\n` +
          `Transaction ID: ${currentPurchase.transactionId || 'N/A'}\n` +
          `Date: ${new Date(
            currentPurchase.transactionDate,
          ).toLocaleDateString()}\n` +
          `Receipt: ${currentPurchase.transactionReceipt?.substring(0, 50)}...`,
      );
    }
  }, [currentPurchase]);

  // Handle purchase errors
  useEffect(() => {
    if (currentPurchaseError) {
      setIsProcessing(false);
      setPurchaseResult(
        `❌ Subscription failed: ${currentPurchaseError.message}`,
      );
    }
  }, [currentPurchaseError]);

  // Load subscription products
  const loadSubscriptions = useCallback(async () => {
    if (!connected) return;

    try {
      console.log('Loading subscription products...');
      await requestProducts({
        skus: SUBSCRIPTION_IDS,
        type: 'subs',
      });
      console.log('Loaded subscriptions:', subscriptions);
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
      Alert.alert('Error', 'Failed to load subscription products');
    }
  }, [connected, requestProducts]);

  // Check subscription status
  const checkSubscriptionStatus = useCallback(async () => {
    if (!connected || isCheckingStatus) return;

    setIsCheckingStatus(true);
    try {
      console.log('Checking subscription status...');

      // Get available purchases (includes subscriptions)
      await getAvailablePurchases();

      // Get active subscriptions
      await getActiveSubscriptions(SUBSCRIPTION_IDS);

      console.log('Active subscriptions:', activeSubscriptions);
    } catch (error) {
      console.error('Error checking subscription status:', error);
    } finally {
      setIsCheckingStatus(false);
    }
  }, [
    connected,
    isCheckingStatus,
    getAvailablePurchases,
    getActiveSubscriptions,
    activeSubscriptions,
  ]);

  // Handle subscription purchase
  const handleSubscription = async (productId: string) => {
    try {
      setIsProcessing(true);
      setPurchaseResult('Processing subscription...');
      clearCurrentPurchase();
      clearCurrentPurchaseError();

      // Find the subscription product
      const subscription = subscriptions.find((sub) => sub.id === productId);
      console.log('Found subscription:', JSON.stringify(subscription, null, 2));

      // Prepare Android subscription offers if available
      let subscriptionOffers: Array<{sku: string; offerToken: string}> = [];
      if (Platform.OS === 'android' && subscription) {
        // Get the offer token from subscription details
        const androidSub = subscription as any;
        console.log('Android subscription details:', androidSub);
        
        if (androidSub.subscriptionOfferDetailsAndroid?.length > 0) {
          const offer = androidSub.subscriptionOfferDetailsAndroid[0];
          console.log('Offer details:', offer);
          
          if (offer.offerToken) {
            subscriptionOffers = [{
              sku: productId,
              offerToken: offer.offerToken,
            }];
            console.log('Using subscription offers:', subscriptionOffers);
          } else {
            console.error('No offerToken found in offer details');
          }
        } else {
          console.error('No subscriptionOfferDetailsAndroid found');
        }
      }

      // Request purchase (event-based - results come through listeners)
      const purchaseRequest = {
        request: {
          ios: {
            sku: productId,
          },
          android: {
            skus: [productId],
            subscriptionOffers: subscriptionOffers.length > 0 ? subscriptionOffers : undefined,
          },
        },
        type: 'subs' as const,
      };
      
      console.log('Purchase request:', JSON.stringify(purchaseRequest, null, 2));
      
      await requestPurchase(purchaseRequest);

      console.log(
        'Purchase request sent - waiting for result via event listener',
      );
    } catch (error) {
      setIsProcessing(false);
      const errorMessage =
        error instanceof Error ? error.message : 'Subscription failed';
      setPurchaseResult(`❌ Subscription failed: ${errorMessage}`);
      Alert.alert('Subscription Failed', errorMessage);
    }
  };

  // Get subscription display price
  const getSubscriptionDisplayPrice = (subscription: Product): string => {
    return subscription.displayPrice || subscription.price?.toString() || 'N/A';
  };

  // Get subscription period
  const getSubscriptionPeriod = (subscription: Product): string => {
    if (Platform.OS === 'ios') {
      // iOS subscription period
      const periodUnit = (subscription as SubscriptionProductIOS)
        .subscriptionPeriodUnitIOS;
      const periodNumber = (subscription as SubscriptionProductIOS)
        .subscriptionPeriodNumberIOS;
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
  const getIntroductoryOffer = (subscription: Product): string | null => {
    if (Platform.OS === 'ios') {
      const subProduct = subscription as SubscriptionProductIOS;
      if (subProduct.introductoryPriceIOS) {
        const paymentMode = subProduct.introductoryPricePaymentModeIOS;
        const numberOfPeriods = subProduct.introductoryPriceNumberOfPeriodsIOS;
        const subscriptionPeriod =
          subProduct.introductoryPriceSubscriptionPeriodIOS;

        if (paymentMode === 'FREETRIAL') {
          return `${numberOfPeriods} ${subscriptionPeriod} free trial`;
        } else if (paymentMode === 'PAYASYOUGO') {
          return `${subProduct.introductoryPriceIOS} for ${numberOfPeriods} ${subscriptionPeriod}`;
        } else if (paymentMode === 'PAYUPFRONT') {
          return `${subProduct.introductoryPriceIOS} for first ${numberOfPeriods} ${subscriptionPeriod}`;
        }
      }
    }
    return null;
  };

  // Handle subscription info press
  const handleSubscriptionPress = (subscription: Product) => {
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

            {activeSubscriptions.map((sub, index) => (
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
          subscriptions.map((subscription) => (
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
              onPress={loadSubscriptions}
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
          {availablePurchases.map((purchase, index) => (
            <View key={`${purchase.id}-${index}`} style={styles.purchaseCard}>
              <View style={styles.purchaseInfo}>
                <Text style={styles.purchaseTitle}>{purchase.id}</Text>
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
            </View>
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
