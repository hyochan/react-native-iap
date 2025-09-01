import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import {
  useIAP,
  Purchase,
  PurchaseError,
  finishTransaction,
  getAvailablePurchases,
} from 'react-native-iap';

export default function AvailablePurchases() {
  const [loading, setLoading] = useState(false);
  const [availablePurchasesState, setAvailablePurchasesState] = useState<Purchase[]>([]);
  
  const {
    connected,
    subscriptions,
    currentPurchase,
    currentPurchaseError,
    availablePurchases,
    getPurchaseHistory,
  } = useIAP();

  // Handle purchase updates
  useEffect(() => {
    if (currentPurchase) {
      const finishPurchase = async () => {
        try {
          await finishTransaction({
            purchase: currentPurchase,
            isConsumable: false,
          });
          console.log('[AVAILABLE-PURCHASES] Purchase finished:', currentPurchase);
          // Refresh purchases after successful transaction
          handleGetAvailablePurchases();
        } catch (error) {
          console.error('[AVAILABLE-PURCHASES] Error finishing transaction:', error);
        }
      };
      finishPurchase();
    }
  }, [currentPurchase]);

  // Handle purchase errors
  useEffect(() => {
    if (currentPurchaseError) {
      console.error('[AVAILABLE-PURCHASES] Purchase error:', currentPurchaseError);
      Alert.alert('Purchase Error', currentPurchaseError.message || 'An error occurred');
    }
  }, [currentPurchaseError]);

  const handleGetAvailablePurchases = async () => {
    if (!connected) {
      Alert.alert('Not Connected', 'Please wait for store connection');
      return;
    }
    
    setLoading(true);
    try {
      console.log('Loading available purchases...');
      const purchases = await getAvailablePurchases();
      console.log('Available purchases loaded:', purchases?.length || 0, 'items');
      setAvailablePurchasesState(purchases || []);
    } catch (error) {
      console.error('Error getting available purchases:', error);
      Alert.alert('Error', 'Failed to get available purchases');
    } finally {
      setLoading(false);
    }
  };

  const handleGetPurchaseHistory = async () => {
    if (!connected) {
      Alert.alert('Not Connected', 'Please wait for store connection');
      return;
    }
    
    setLoading(true);
    try {
      console.log('Loading purchase history...');
      await getPurchaseHistory();
      console.log('Purchase history request sent');
    } catch (error) {
      console.error('Error getting purchase history:', error);
      Alert.alert('Error', 'Failed to get purchase history');
    } finally {
      setLoading(false);
    }
  };

  // Load available purchases when connected
  useEffect(() => {
    if (connected) {
      console.log('[AVAILABLE-PURCHASES] Connected to store, loading purchases...');
      handleGetAvailablePurchases();
    }
  }, [connected]);

  // Update local state when availablePurchases from hook changes
  useEffect(() => {
    if (availablePurchases && availablePurchases.length > 0) {
      console.log('[AVAILABLE-PURCHASES] Available purchases from hook:', availablePurchases.length);
      setAvailablePurchasesState(availablePurchases);
    }
  }, [availablePurchases]);

  // Track state changes for debugging
  useEffect(() => {
    console.log('[AVAILABLE-PURCHASES] Current purchases:', availablePurchasesState.length, 'items');
  }, [availablePurchasesState]);

  useEffect(() => {
    console.log('[AVAILABLE-PURCHASES] Subscriptions (products):', subscriptions.length, subscriptions);
  }, [subscriptions]);

  const formatDate = (timestamp: number | string | undefined) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  const isExpired = (expirationDate: number | string | undefined) => {
    if (!expirationDate) return false;
    const expDate = new Date(expirationDate);
    return expDate < new Date();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Store Connection: {connected ? '✅ Connected' : '❌ Disconnected'}
        </Text>
      </View>

      {/* Purchase History Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Purchase History</Text>
        <Text style={styles.subtitle}>Past purchases and subscription transactions</Text>

        {availablePurchasesState.length === 0 ? (
          <Text style={styles.emptyText}>No purchase history found</Text>
        ) : (
          availablePurchasesState.map((purchase, index) => (
            <View key={`${purchase.productId}-${index}`} style={styles.purchaseItem}>
              <View style={styles.purchaseHeader}>
                <Text style={styles.productId}>{purchase.productId}</Text>
                {Platform.OS === 'ios' && purchase.isUpgraded && (
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>Upgraded</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.purchaseDetails}>
                <View style={styles.purchaseRow}>
                  <Text style={styles.label}>Platform:</Text>
                  <Text style={styles.value}>{Platform.OS}</Text>
                </View>
                
                {purchase.transactionDate && (
                  <View style={styles.purchaseRow}>
                    <Text style={styles.label}>Date:</Text>
                    <Text style={styles.value}>
                      {formatDate(purchase.transactionDate)}
                    </Text>
                  </View>
                )}
                
                {purchase.transactionId && (
                  <View style={styles.purchaseRow}>
                    <Text style={styles.label}>Transaction ID:</Text>
                    <Text style={[styles.value, styles.transactionId]}>
                      {purchase.transactionId}
                    </Text>
                  </View>
                )}
                
                {/* iOS-specific fields */}
                {Platform.OS === 'ios' && purchase.originalTransactionDateIOS && (
                  <View style={styles.purchaseRow}>
                    <Text style={styles.label}>Original Date:</Text>
                    <Text style={styles.value}>
                      {formatDate(purchase.originalTransactionDateIOS)}
                    </Text>
                  </View>
                )}
                
                {Platform.OS === 'ios' && purchase.originalTransactionIdentifierIOS && (
                  <View style={styles.purchaseRow}>
                    <Text style={styles.label}>Original Transaction:</Text>
                    <Text style={[styles.value, styles.transactionId]}>
                      {purchase.originalTransactionIdentifierIOS}
                    </Text>
                  </View>
                )}

                {/* Android-specific fields */}
                {Platform.OS === 'android' && purchase.purchaseStateAndroid !== undefined && (
                  <View style={styles.purchaseRow}>
                    <Text style={styles.label}>Purchase State:</Text>
                    <Text style={styles.value}>
                      {purchase.purchaseStateAndroid === 0 ? 'Purchased' : 'Pending'}
                    </Text>
                  </View>
                )}
                
                {Platform.OS === 'android' && purchase.autoRenewingAndroid !== undefined && (
                  <View style={styles.purchaseRow}>
                    <Text style={styles.label}>Auto Renewing:</Text>
                    <Text style={[styles.value, purchase.autoRenewingAndroid ? styles.activeText : styles.expiredText]}>
                      {purchase.autoRenewingAndroid ? '✅ Yes' : '❌ No'}
                    </Text>
                  </View>
                )}
                
                {Platform.OS === 'android' && purchase.purchaseTokenAndroid && (
                  <View style={styles.purchaseRow}>
                    <Text style={styles.label}>Purchase Token:</Text>
                    <Text style={[styles.value, styles.transactionId]}>
                      {purchase.purchaseTokenAndroid.substring(0, 20)}...
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, !connected && styles.buttonDisabled]}
          onPress={handleGetAvailablePurchases}
          disabled={!connected || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>🔄 Refresh Available Purchases</Text>
          )}
        </TouchableOpacity>

        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, !connected && styles.buttonDisabled]}
            onPress={handleGetPurchaseHistory}
            disabled={!connected || loading}
          >
            <Text style={styles.buttonText}>📚 Get Purchase History (iOS)</Text>
          </TouchableOpacity>
        )}
      </View>
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
  transactionId: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  activeText: {
    color: '#28a745',
    fontWeight: '600',
  },
  expiredText: {
    color: '#dc3545',
    fontWeight: '600',
  },
  buttonContainer: {
    gap: 12,
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
  secondaryButton: {
    backgroundColor: '#6c757d',
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