import {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import type {Purchase, PurchaseError} from 'react-native-iap';
import {useIAP, deepLinkToSubscriptions} from 'react-native-iap';
import Clipboard from '@react-native-clipboard/clipboard';

// Define subscription IDs at component level like in the working example
const subscriptionIds = [
  'dev.hyo.martie.premium', // Same as subscription-flow
];

export default function AvailablePurchases() {
  const [loading, setLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(
    null,
  );
  const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);

  // Use the useIAP hook like subscription-flow does
  const {
    connected,
    subscriptions,
    availablePurchases,
    activeSubscriptions,
    getAvailablePurchases,
    getActiveSubscriptions,
    fetchProducts,
    finishTransaction,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      console.log('[AVAILABLE-PURCHASES] Purchase successful:', purchase);

      // Finish transaction like in subscription-flow
      await finishTransaction({
        purchase,
        isConsumable: false,
      });

      // Refresh status after success
      setTimeout(() => {
        checkSubscriptionStatus();
      }, 1000);
    },
    onPurchaseError: (error: PurchaseError) => {
      console.error('[AVAILABLE-PURCHASES] Purchase failed:', error);
      Alert.alert('Purchase Failed', error.message);
    },
  });

  // Check subscription status like subscription-flow does
  const checkSubscriptionStatus = useCallback(async () => {
    if (!connected || isCheckingStatus) {
      console.log(
        '[AVAILABLE-PURCHASES] Skipping subscription status check - not connected or already checking',
      );
      return;
    }

    console.log('[AVAILABLE-PURCHASES] Checking subscription status...');
    setIsCheckingStatus(true);
    try {
      const subs = await getActiveSubscriptions();
      console.log('[AVAILABLE-PURCHASES] Active subscriptions result:', subs);
    } catch (error) {
      console.error(
        '[AVAILABLE-PURCHASES] Error checking subscription status:',
        error,
      );
      console.warn(
        '[AVAILABLE-PURCHASES] Subscription status check failed, but existing state preserved',
      );
    } finally {
      setIsCheckingStatus(false);
    }
  }, [connected, getActiveSubscriptions, isCheckingStatus]);

  const handleGetAvailablePurchases = async () => {
    if (!connected) return;

    setLoading(true);
    try {
      console.log('Loading available purchases...');
      await getAvailablePurchases();
      console.log('Available purchases request sent');
    } catch (error) {
      console.error('Error getting available purchases:', error);
      Alert.alert('Error', 'Failed to get available purchases');
    } finally {
      setLoading(false);
    }
  };

  // Load products and available purchases when connected - follow subscription-flow pattern
  useEffect(() => {
    if (connected) {
      console.log(
        '[AVAILABLE-PURCHASES] Connected to store, loading subscription products...',
      );
      // Request products first - this is event-based, not promise-based
      fetchProducts({skus: subscriptionIds, type: 'subs'});
      console.log(
        '[AVAILABLE-PURCHASES] Product loading request sent - waiting for results...',
      );

      // Then load available purchases
      console.log('[AVAILABLE-PURCHASES] Loading available purchases...');
      getAvailablePurchases().catch((error) => {
        console.warn(
          '[AVAILABLE-PURCHASES] Failed to load available purchases:',
          error,
        );
      });
    }
  }, [connected, fetchProducts, getAvailablePurchases]);

  // Check subscription status separately like subscription-flow does
  useEffect(() => {
    if (connected) {
      // Use a timeout to avoid rapid consecutive calls
      const timer = setTimeout(() => {
        checkSubscriptionStatus();
      }, 500);

      return () => clearTimeout(timer);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  // Track state changes for debugging
  useEffect(() => {
    console.log(
      '[AVAILABLE-PURCHASES] availablePurchases:',
      availablePurchases.length,
      'items',
    );
  }, [availablePurchases]);

  useEffect(() => {
    console.log(
      '[AVAILABLE-PURCHASES] activeSubscriptions:',
      activeSubscriptions.length,
      activeSubscriptions,
    );
  }, [activeSubscriptions]);

  useEffect(() => {
    console.log(
      '[AVAILABLE-PURCHASES] subscriptions (products):',
      subscriptions.length,
      subscriptions,
    );
  }, [subscriptions]);

  const openManageSubscriptions = () => {
    deepLinkToSubscriptions().catch(() => {});
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Store Connection: {connected ? '✅ Connected' : '❌ Disconnected'}
        </Text>
      </View>

      {/* Active Subscriptions Section */}
      {activeSubscriptions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔄 Active Subscriptions</Text>
          <Text style={styles.subtitle}>
            Currently active subscription services
          </Text>

          {activeSubscriptions.map((subscription, index) => (
            <View
              key={subscription.productId + index}
              style={[styles.purchaseItem, styles.activeSubscriptionItem]}
            >
              <View style={styles.purchaseHeader}>
                <Text style={styles.productId}>{subscription.productId}</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>✅ Active</Text>
                </View>
              </View>

              <View style={styles.purchaseDetails}>
                {subscription.expirationDateIOS && (
                  <View style={styles.purchaseRow}>
                    <Text style={styles.label}>Expires:</Text>
                    <Text
                      style={[
                        styles.value,
                        subscription.willExpireSoon && styles.expiredText,
                      ]}
                    >
                      {new Date(
                        subscription.expirationDateIOS,
                      ).toLocaleDateString()}
                      {subscription.willExpireSoon && ' (Soon)'}
                    </Text>
                  </View>
                )}

                {subscription.environmentIOS && (
                  <View style={styles.purchaseRow}>
                    <Text style={styles.label}>Environment:</Text>
                    <Text style={styles.value}>
                      {subscription.environmentIOS}
                    </Text>
                  </View>
                )}

                {subscription.daysUntilExpirationIOS != null && (
                  <View style={styles.purchaseRow}>
                    <Text style={styles.label}>Days Left:</Text>
                    <Text
                      style={[
                        styles.value,
                        subscription.daysUntilExpirationIOS <= 3 &&
                          styles.expiredText,
                      ]}
                    >
                      {subscription.daysUntilExpirationIOS} days
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))}
          <TouchableOpacity
            style={[styles.button, {marginTop: 8}]}
            onPress={openManageSubscriptions}
          >
            <Text style={styles.buttonText}>👤 Manage Subscriptions</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Available Purchases Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Purchase History</Text>
        <Text style={styles.subtitle}>
          Past purchases and subscription transactions
        </Text>

        {availablePurchases.length === 0 && activeSubscriptions.length === 0 ? (
          <Text style={styles.emptyText}>No purchase history found</Text>
        ) : availablePurchases.length === 0 ? (
          <Text style={styles.emptyText}>
            No historical purchases found (active subscriptions shown above)
          </Text>
        ) : (
          availablePurchases.map((purchase, index) => (
            <TouchableOpacity
              key={purchase.productId + index}
              style={styles.purchaseItem}
              activeOpacity={0.85}
              onPress={() => {
                setSelectedPurchase(purchase as Purchase);
                setPurchaseModalVisible(true);
              }}
              onLongPress={() => {
                setSelectedPurchase(purchase as Purchase);
                setPurchaseModalVisible(true);
              }}
            >
              <View style={styles.purchaseRow}>
                <Text style={styles.label}>Product ID:</Text>
                <Text style={styles.value}>{purchase.productId}</Text>
              </View>
              <View style={styles.purchaseRow}>
                <Text style={styles.label}>Platform:</Text>
                <Text style={styles.value}>{purchase.platform}</Text>
              </View>
              {purchase.transactionDate && (
                <View style={styles.purchaseRow}>
                  <Text style={styles.label}>Date:</Text>
                  <Text style={styles.value}>
                    {new Date(purchase.transactionDate).toLocaleDateString()}
                  </Text>
                </View>
              )}
              {purchase.id && (
                <View style={styles.purchaseRow}>
                  <Text style={styles.label}>Transaction ID:</Text>
                  <Text style={styles.value}>{purchase.id}</Text>
                </View>
              )}

              {/* iOS-specific fields with new IOS naming convention */}
              {Platform.OS === 'ios' &&
                'expirationDateIOS' in purchase &&
                purchase.expirationDateIOS && (
                  <View style={styles.purchaseRow}>
                    <Text style={styles.label}>Expires:</Text>
                    <Text
                      style={[
                        styles.value,
                        purchase.expirationDateIOS < Date.now() &&
                          styles.expiredText,
                      ]}
                    >
                      {new Date(
                        purchase.expirationDateIOS,
                      ).toLocaleDateString()}
                      {purchase.expirationDateIOS < Date.now()
                        ? ' (Expired)'
                        : ''}
                    </Text>
                  </View>
                )}

              {Platform.OS === 'ios' &&
                'environmentIOS' in purchase &&
                purchase.environmentIOS && (
                  <View style={styles.purchaseRow}>
                    <Text style={styles.label}>Environment:</Text>
                    <Text style={styles.value}>{purchase.environmentIOS}</Text>
                  </View>
                )}

              {Platform.OS === 'ios' &&
                'originalTransactionDateIOS' in purchase &&
                purchase.originalTransactionDateIOS && (
                  <View style={styles.purchaseRow}>
                    <Text style={styles.label}>Original Date:</Text>
                    <Text style={styles.value}>
                      {new Date(
                        purchase.originalTransactionDateIOS,
                      ).toLocaleDateString()}
                    </Text>
                  </View>
                )}

              {/* Android-specific fields */}
              {Platform.OS === 'android' &&
                'autoRenewingAndroid' in purchase &&
                purchase.autoRenewingAndroid !== undefined && (
                  <View style={styles.purchaseRow}>
                    <Text style={styles.label}>Auto Renewing:</Text>
                    <Text
                      style={[
                        styles.value,
                        purchase.autoRenewingAndroid
                          ? styles.activeText
                          : styles.expiredText,
                      ]}
                    >
                      {purchase.autoRenewingAndroid ? '✅ Yes' : '❌ No'}
                    </Text>
                  </View>
                )}
            </TouchableOpacity>
          ))
        )}
      </View>

      <TouchableOpacity
        style={[styles.button, !connected && styles.buttonDisabled]}
        onPress={handleGetAvailablePurchases}
        disabled={!connected || loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>🔄 Refresh Purchases</Text>
        )}
      </TouchableOpacity>

      {/* Purchase Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={purchaseModalVisible}
        onRequestClose={() => setPurchaseModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              backgroundColor: '#fff',
              borderRadius: 16,
              width: '90%',
              height: '75%',
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: '#eee',
              }}
            >
              <Text style={{fontSize: 18, fontWeight: '600'}}>
                Purchase Details
              </Text>
              <TouchableOpacity onPress={() => setPurchaseModalVisible(false)}>
                <Text style={{fontSize: 24, color: '#666'}}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{flex: 1, padding: 16}}>
              <Text
                style={{
                  fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                  fontSize: 12,
                  color: '#333',
                  lineHeight: 18,
                }}
              >
                {(() => {
                  if (!selectedPurchase) return '';
                  const {purchaseToken, transactionReceipt, ...safe} =
                    (selectedPurchase || {}) as any;
                  return JSON.stringify(safe, null, 2);
                })()}
              </Text>
            </ScrollView>
            <View
              style={{
                flexDirection: 'row',
                gap: 12,
                padding: 16,
                borderTopWidth: 1,
                borderTopColor: '#eee',
              }}
            >
              <TouchableOpacity
                style={[styles.button, {flex: 1}]}
                onPress={() => {
                  if (!selectedPurchase) return;
                  const {purchaseToken, transactionReceipt, ...safe} =
                    (selectedPurchase || {}) as any;
                  Clipboard.setString(JSON.stringify(safe, null, 2));
                  Alert.alert('Copied', 'Purchase JSON copied to clipboard');
                }}
              >
                <Text style={styles.buttonText}>📋 Copy JSON</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, {flex: 1, backgroundColor: '#6c757d'}]}
                onPress={() => setPurchaseModalVisible(false)}
              >
                <Text style={styles.buttonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  statusContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  purchaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    backgroundColor: '#e8f4f8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  purchaseDetails: {
    gap: 8,
  },
  activeSubscriptionItem: {
    borderLeftColor: '#28a745',
    backgroundColor: '#f8fff9',
    borderLeftWidth: 4,
  },
  emptyText: {
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  purchaseItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  purchaseRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    fontWeight: '500',
    width: 120,
    color: '#333',
  },
  value: {
    flex: 1,
    color: '#666',
  },
  activeText: {
    color: '#28a745',
    fontWeight: '600',
  },
  expiredText: {
    color: '#dc3545',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
