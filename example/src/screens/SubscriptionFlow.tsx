import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
  Modal,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useIAP } from '../../../src';
import type { SubscriptionProduct, PurchaseError } from '../../../src';

/**
 * Subscription Flow Example - Subscription Products
 *
 * Demonstrates useIAP hook approach for subscriptions:
 * - Uses useIAP hook for subscription management
 * - Handles subscription callbacks with proper types
 * - No manual promise handling required
 * - Clean success/error pattern through hooks
 * - Focused on recurring subscriptions
 */
export default function SubscriptionFlow() {
  const [purchaseResult, setPurchaseResult] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalSubscription, setModalSubscription] =
    useState<SubscriptionProduct | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Use the useIAP hook for managing subscriptions
  const {
    connected,
    subscriptions,
    activeSubscriptions,
    requestProducts,
    requestPurchase,
    getActiveSubscriptions,
    finishTransaction,
  } = useIAP({
    onPurchaseSuccess: async purchase => {
      console.log('Purchase update received:', purchase);

      // Only handle if we're actively processing a purchase
      if (isProcessing) {
        setIsProcessing(false);

        // Handle successful subscription
        setPurchaseResult(
          `✅ Subscription successful (${purchase.platform})\n` +
            `Product: ${purchase.productId}\n` +
            `Transaction ID: ${purchase.transactionId || 'N/A'}\n` +
            `Date: ${new Date(
              purchase.transactionDate,
            ).toLocaleDateString()}\n` +
            `Receipt: ${purchase.transactionReceipt?.substring(0, 50)}...`,
        );

        // Finish the transaction for subscriptions (non-consumable)
        await finishTransaction({
          purchase,
          isConsumable: false,
        });

        Alert.alert('Success', 'Subscription activated successfully!');

        // Refresh active subscriptions after successful purchase
        setTimeout(async () => {
          const subscriptionIds = ['dev.hyo.martie.premium'];
          await getActiveSubscriptions(subscriptionIds);
        }, 1000);
      }
    },
    onPurchaseError: (error: PurchaseError) => {
      console.error('Subscription error:', error);

      // Only handle if we're actively processing a purchase
      if (isProcessing) {
        setIsProcessing(false);

        // Handle subscription error
        setPurchaseResult(`❌ Subscription failed: ${error.message}`);
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

  // Load subscriptions when component mounts
  useEffect(() => {
    if (connected) {
      // Using subscription ID that exists in App Store Connect
      const subscriptionIds = [
        'dev.hyo.martie.premium', // Updated to match expo-iap example
      ];
      console.log('Connected to store, loading subscription products...');
      requestProducts({ skus: subscriptionIds, type: 'subs' });
      console.log('Product loading request sent - waiting for results...');

      // Also load active subscriptions
      getActiveSubscriptions(subscriptionIds).catch(error => {
        console.warn('Failed to load active subscriptions:', error);
      });
    }
  }, [connected, requestProducts, getActiveSubscriptions]);

  const handleSubscription = async (sub: SubscriptionProduct) => {
    try {
      // Check if already subscribed to this product
      const isAlreadySubscribed = activeSubscriptions.some(
        activeSub => activeSub.productId === sub.id && activeSub.isActive,
      );

      if (isAlreadySubscribed) {
        Alert.alert(
          'Already Subscribed',
          'You are already subscribed to this product. No additional charge will be made.',
          [{ text: 'OK' }],
        );
        return;
      }

      setIsProcessing(true);
      setPurchaseResult('Processing subscription...');

      // Debug logging
      console.log('[SubscriptionFlow] Subscription product:', sub);
      if ('subscriptionOfferDetails' in sub) {
        console.log(
          '[SubscriptionFlow] Subscription offer details:',
          sub.subscriptionOfferDetails,
        );
      }

      // Use requestPurchase for subscriptions - the result will be handled by callbacks
      // Use expo-iap format with ios/android fields
      const subscriptionRequest = {
        ios: {
          sku: sub.id,
          appAccountToken: 'user-123',
        },
        android: {
          skus: [sub.id],
          subscriptionOffers:
            'subscriptionOfferDetails' in sub &&
            sub.subscriptionOfferDetails &&
            Array.isArray(sub.subscriptionOfferDetails) &&
            sub.subscriptionOfferDetails[0]?.offerToken
              ? [
                  {
                    sku: sub.id,
                    offerToken: sub.subscriptionOfferDetails[0].offerToken,
                  },
                ]
              : [],
        },
      };

      console.log(
        '[SubscriptionFlow] Subscription request:',
        JSON.stringify(subscriptionRequest, null, 2),
      );

      await requestPurchase({
        request: subscriptionRequest,
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

  const retryLoadSubscriptions = () => {
    const subscriptionIds = ['dev.hyo.martie.premium'];
    requestProducts({ skus: subscriptionIds, type: 'subs' });
  };

  const getSubscriptionDisplayPrice = (
    subscription: SubscriptionProduct,
  ): string => {
    if (subscription.platform === 'android') {
      // Android subscription pricing structure
      const offers = subscription.subscriptionOfferDetails;
      if (offers && offers.length > 0) {
        const offer = offers[0];
        if (offer) {
          const pricingPhases = offer.pricingPhases;
          if (
            pricingPhases &&
            (pricingPhases as any).pricingPhaseList?.length > 0
          ) {
            return (pricingPhases as any).pricingPhaseList[0].formattedPrice;
          }
        }
      }
      return (subscription as any).displayPrice || 'N/A';
    } else {
      // iOS subscription pricing
      return subscription.displayPrice || 'N/A';
    }
  };

  const getSubscriptionPeriod = (subscription: SubscriptionProduct): string => {
    if (subscription.platform === 'android') {
      const offers = subscription.subscriptionOfferDetails;
      if (offers && offers.length > 0) {
        const offer = offers[0];
        if (offer) {
          const pricingPhases = offer.pricingPhases;
          if (
            pricingPhases &&
            (pricingPhases as any).pricingPhaseList?.length > 0
          ) {
            return (
              (pricingPhases as any).pricingPhaseList[0].billingPeriod ||
              'Unknown'
            );
          }
        }
      }
      return 'Unknown';
    } else {
      return 'Unknown'; // subscription.subscription?.subscriptionPeriod || 'Unknown';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Subscription Flow</Text>
        <Text style={styles.subtitle}>
          TypeScript-first approach for subscriptions
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

      {/* Active Subscriptions Section */}
      {activeSubscriptions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Subscriptions</Text>
          {activeSubscriptions.map(activeSub => (
            <View
              key={activeSub.productId}
              style={styles.activeSubscriptionCard}
            >
              <Text style={styles.activeSubscriptionTitle}>
                📱 {activeSub.productId}
              </Text>
              <Text style={styles.activeSubscriptionInfo}>
                Status: {activeSub.isActive ? '✅ Active' : '❌ Expired'}
              </Text>
              {Platform.OS === 'ios' && activeSub.expirationDateIOS && (
                <>
                  <Text style={styles.activeSubscriptionInfo}>
                    Expires: {activeSub.expirationDateIOS.toLocaleDateString()}
                  </Text>
                  {activeSub.daysUntilExpirationIOS !== undefined && (
                    <Text style={styles.activeSubscriptionInfo}>
                      Days until expiration: {activeSub.daysUntilExpirationIOS}
                    </Text>
                  )}
                  {activeSub.willExpireSoon && (
                    <Text
                      style={[
                        styles.activeSubscriptionInfo,
                        styles.warningText,
                      ]}
                    >
                      ⚠️ Expires soon!
                    </Text>
                  )}
                </>
              )}
              {Platform.OS === 'android' && (
                <>
                  <Text style={styles.activeSubscriptionInfo}>
                    Auto-renewing:{' '}
                    {activeSub.autoRenewingAndroid ? 'Yes' : 'No'}
                  </Text>
                  {activeSub.willExpireSoon && (
                    <Text
                      style={[
                        styles.activeSubscriptionInfo,
                        styles.warningText,
                      ]}
                    >
                      ⚠️ Will not renew
                    </Text>
                  )}
                </>
              )}
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Available Subscriptions</Text>
        {!connected ? (
          <Text style={styles.loadingText}>Connecting to store...</Text>
        ) : subscriptions.length > 0 ? (
          subscriptions.map(subscription => {
            const isSubscribed = activeSubscriptions.some(
              activeSub =>
                activeSub.productId === subscription.id && activeSub.isActive,
            );

            let buttonText = 'Subscribe';
            if (isProcessing) {
              buttonText = 'Processing...';
            } else if (isSubscribed) {
              buttonText = '✓ Subscribed';
            }

            return (
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
                </View>
                <View style={styles.subscriptionActions}>
                  <TouchableOpacity
                    style={styles.infoButton}
                    onPress={() => {
                      setModalSubscription(subscription);
                      setModalVisible(true);
                    }}
                  >
                    <Text style={styles.infoButtonText}>ℹ️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.subscribeButton,
                      isProcessing && styles.disabledButton,
                      isSubscribed && styles.subscribedButton,
                    ]}
                    onPress={() => handleSubscription(subscription)}
                    disabled={isProcessing || !connected}
                  >
                    <Text style={styles.subscribeButtonText}>{buttonText}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
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

      {purchaseResult ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Result</Text>
          <View style={styles.resultCard}>
            <Text style={styles.resultText}>{purchaseResult}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>🔄 Key Features Demonstrated</Text>
        <Text style={styles.infoText}>
          • Automatic TypeScript type inference{'\n'}• Platform-agnostic
          subscription handling{'\n'}• No manual type casting required{'\n'}•
          Subscription-specific pricing display{'\n'}• Auto-renewal state
          management
          {'\n'}• Powered by Nitro Modules 🔥
        </Text>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
        }}
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
            <View style={styles.modalContent}>
              <ScrollView style={styles.jsonContainer}>
                <Text style={styles.jsonText}>
                  {modalSubscription
                    ? JSON.stringify(modalSubscription, null, 2)
                    : ''}
                </Text>
              </ScrollView>
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.copyButton]}
                  onPress={() => {
                    if (modalSubscription) {
                      Clipboard.setString(
                        JSON.stringify(modalSubscription, null, 2),
                      );
                      Alert.alert(
                        'Copied',
                        'Subscription JSON copied to clipboard',
                      );
                    }
                  }}
                >
                  <Text style={styles.actionButtonText}>📋 Copy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.consoleButton]}
                  onPress={() => {
                    if (modalSubscription) {
                      console.log('=== SUBSCRIPTION DATA ===');
                      console.log(modalSubscription);
                      console.log('=== SUBSCRIPTION JSON ===');
                      console.log(JSON.stringify(modalSubscription, null, 2));
                      Alert.alert(
                        'Console',
                        'Subscription data logged to console',
                      );
                    }
                  }}
                >
                  <Text style={styles.actionButtonText}>🖥️ Console</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingTop: 60,
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
  loadingText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    padding: 20,
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
  activeSubscriptionCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#4caf50',
  },
  activeSubscriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: 8,
  },
  activeSubscriptionInfo: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  warningText: {
    color: '#ff9800',
    fontWeight: '600',
  },
});
