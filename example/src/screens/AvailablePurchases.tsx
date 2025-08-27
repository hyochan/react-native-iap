import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useIAP } from '../../../src';
import type { PurchaseError } from '../../../src';

export default function AvailablePurchases() {
  const [loading, setLoading] = useState(false);
  const [modalData, setModalData] = useState<any>(null);
  const [modalTitle, setModalTitle] = useState<string>('');
  const [modalVisible, setModalVisible] = useState(false);

  // Use the useIAP hook like subscription-flow does
  const {
    connected,
    availablePurchases,
    activeSubscriptions,
    getAvailablePurchases,
  } = useIAP({
    onPurchaseSuccess: async purchase => {
      console.log('[AVAILABLE-PURCHASES] Purchase successful:', purchase);
    },
    onPurchaseError: (error: PurchaseError) => {
      console.error('[AVAILABLE-PURCHASES] Purchase failed:', error);
      Alert.alert('Purchase Failed', error.message);
    },
  });

  const handleGetAvailablePurchases = async () => {
    if (!connected) return;

    setLoading(true);
    try {
      console.log('Loading available purchases...');
      await getAvailablePurchases([]);
      console.log('Available purchases request sent');
    } catch (error) {
      console.error('Error getting available purchases:', error);
      Alert.alert('Error', 'Failed to get available purchases');
    } finally {
      setLoading(false);
    }
  };

  // Load available purchases when connected
  useEffect(() => {
    if (connected) {
      console.log(
        '[AVAILABLE-PURCHASES] Connected to store, loading available purchases...',
      );
      getAvailablePurchases([]).catch(error => {
        console.warn(
          '[AVAILABLE-PURCHASES] Failed to load available purchases:',
          error,
        );
      });
    }
  }, [connected, getAvailablePurchases]);

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
            <TouchableOpacity
              key={subscription.productId + index}
              style={[styles.purchaseItem, styles.activeSubscriptionItem]}
              onPress={() => {
                setModalData(subscription);
                setModalTitle('Active Subscription Details');
                setModalVisible(true);
              }}
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

                {subscription.daysUntilExpirationIOS !== undefined && (
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
            </TouchableOpacity>
          ))}
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
              key={purchase.id + index}
              style={styles.purchaseItem}
              onPress={() => {
                setModalData(purchase);
                setModalTitle('Purchase Details');
                setModalVisible(true);
              }}
            >
              <View style={styles.purchaseRow}>
                <Text style={styles.label}>Product ID:</Text>
                <Text style={styles.value}>{purchase.productId}</Text>
              </View>
              <View style={styles.purchaseRow}>
                <Text style={styles.label}>Platform:</Text>
                <Text style={styles.value}>
                  {purchase.platform || 'unknown'}
                </Text>
              </View>
              {purchase.transactionDate && (
                <View style={styles.purchaseRow}>
                  <Text style={styles.label}>Date:</Text>
                  <Text style={styles.value}>
                    {new Date(purchase.transactionDate).toLocaleDateString()}
                  </Text>
                </View>
              )}
              {purchase.transactionId && (
                <View style={styles.purchaseRow}>
                  <Text style={styles.label}>Transaction ID:</Text>
                  <Text style={styles.value}>{purchase.transactionId}</Text>
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
              <Text style={styles.modalTitle}>{modalTitle}</Text>
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
                  {modalData ? JSON.stringify(modalData, null, 2) : ''}
                </Text>
              </ScrollView>
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.copyButton]}
                  onPress={() => {
                    if (modalData) {
                      Clipboard.setString(JSON.stringify(modalData, null, 2));
                      Alert.alert('Copied', 'Data copied to clipboard');
                    }
                  }}
                >
                  <Text style={styles.actionButtonText}>📋 Copy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.consoleButton]}
                  onPress={() => {
                    if (modalData) {
                      console.log(`=== ${modalTitle.toUpperCase()} ===`);
                      console.log(modalData);
                      console.log('=== JSON ===');
                      console.log(JSON.stringify(modalData, null, 2));
                      Alert.alert('Console', 'Data logged to console');
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
    shadowOffset: { width: 0, height: 1 },
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
    shadowOffset: { width: 0, height: 1 },
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
    shadowOffset: { width: 0, height: 2 },
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
    shadowOffset: { width: 0, height: 2 },
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
});
