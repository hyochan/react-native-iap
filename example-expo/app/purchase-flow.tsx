// Generated from example/screens/PurchaseFlow.tsx
// This file is automatically copied during postinstall
// Do not edit directly - modify the source file instead

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  ScrollView,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {requestPurchase, useIAP, getAppTransactionIOS} from 'react-native-iap';
import Loading from '../components/Loading';
import {
  CONSUMABLE_PRODUCT_IDS,
  NON_CONSUMABLE_PRODUCT_IDS,
  PRODUCT_IDS,
} from '../constants/products';
import type {Product, Purchase, PurchaseError} from 'react-native-iap';
import PurchaseDetails from '../components/PurchaseDetails';
import PurchaseSummaryRow from '../components/PurchaseSummaryRow';

const CONSUMABLE_PRODUCT_ID_SET = new Set(CONSUMABLE_PRODUCT_IDS);
const NON_CONSUMABLE_PRODUCT_ID_SET = new Set(NON_CONSUMABLE_PRODUCT_IDS);

const deduplicatePurchases = (purchases: Purchase[]): Purchase[] => {
  const uniquePurchases = new Map<string, Purchase>();

  for (const purchase of purchases) {
    const productId = purchase.productId;
    if (!productId) {
      continue;
    }

    const existingPurchase = uniquePurchases.get(productId);
    if (!existingPurchase) {
      uniquePurchases.set(productId, purchase);
      continue;
    }

    const existingTimestamp = existingPurchase.transactionDate ?? 0;
    const newTimestamp = purchase.transactionDate ?? 0;

    if (newTimestamp > existingTimestamp) {
      uniquePurchases.set(productId, purchase);
    }
  }

  return Array.from(uniquePurchases.values());
};

type PurchaseFlowProps = {
  connected: boolean;
  products: Product[];
  availablePurchases: Purchase[];
  purchaseResult: string;
  isProcessing: boolean;
  lastPurchase: Purchase | null;
  refreshingAvailablePurchases: boolean;
  onPurchase: (productId: string) => void;
  onRefreshAvailablePurchases: () => Promise<void>;
};

/**
 * Purchase Flow Example - In-App Products
 *
 * Demonstrates useIAP hook approach for in-app products:
 * - Uses useIAP hook for purchase management
 * - Handles purchase callbacks with proper types
 * - No manual promise handling required
 * - Clean success/error pattern through hooks
 * - Focused on one-time purchases (products)
 */

function PurchaseFlow({
  connected,
  products,
  availablePurchases,
  purchaseResult,
  isProcessing,
  lastPurchase,
  refreshingAvailablePurchases,
  onPurchase,
  onRefreshAvailablePurchases,
}: PurchaseFlowProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [purchaseDetailsVisible, setPurchaseDetailsVisible] = useState(false);
  const [purchaseDetailsTarget, setPurchaseDetailsTarget] =
    useState<Purchase | null>(null);

  const availablePurchaseRows = useMemo(
    () => deduplicatePurchases(availablePurchases),
    [availablePurchases],
  );

  const ownedNonConsumableIds = useMemo(() => {
    const ids = new Set<string>();

    for (const purchase of availablePurchaseRows) {
      if (
        purchase.productId &&
        NON_CONSUMABLE_PRODUCT_ID_SET.has(purchase.productId)
      ) {
        ids.add(purchase.productId);
      }
    }

    return ids;
  }, [availablePurchaseRows]);

  const visibleProducts = useMemo(() => {
    if (ownedNonConsumableIds.size === 0) {
      return products;
    }

    return products.filter((product) => {
      if (!product.id) {
        return true;
      }

      return !(
        NON_CONSUMABLE_PRODUCT_ID_SET.has(product.id) &&
        ownedNonConsumableIds.has(product.id)
      );
    });
  }, [ownedNonConsumableIds, products]);

  const hasHiddenNonConsumables = products.length > visibleProducts.length;

  const handlePurchase = useCallback(
    (itemId: string) => {
      onPurchase(itemId);
    },
    [onPurchase],
  );

  const handleCopyResult = () => {
    if (purchaseResult) {
      Clipboard.setString(purchaseResult);
      Alert.alert('Copied', 'Purchase result copied to clipboard');
    }
  };

  const checkAppTransaction = async () => {
    try {
      console.log('Checking app transaction...');
      const transaction = await getAppTransactionIOS();

      if (transaction) {
        Alert.alert(
          'App Transaction',
          `App Transaction Found:\n\n` +
            `Original App Version: ${
              transaction.originalAppVersion || 'N/A'
            }\n` +
            `Purchase Date: ${
              transaction.originalPurchaseDate
                ? new Date(
                    transaction.originalPurchaseDate,
                  ).toLocaleDateString()
                : 'N/A'
            }\n` +
            `Device Verification: ${
              transaction.deviceVerification || 'N/A'
            }\n` +
            `Environment: ${transaction.environment || 'N/A'}`,
          [{text: 'OK'}],
        );
      } else {
        Alert.alert('App Transaction', 'No app transaction found');
      }
    } catch (error) {
      console.error('Failed to get app transaction:', error);
      Alert.alert('Error', 'Failed to get app transaction');
    }
  };

  const handleShowDetails = (product: Product) => {
    setSelectedProduct(product);
    setModalVisible(true);
  };

  const handleRefreshAvailablePurchases = useCallback(() => {
    return onRefreshAvailablePurchases();
  }, [onRefreshAvailablePurchases]);

  if (!connected) {
    return <Loading message="Connecting to Store..." />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>In-App Purchase Flow</Text>
        <Text style={styles.subtitle}>
          Testing consumable and non-consumable products
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Store Connection:</Text>
          <Text
            style={[
              styles.statusValue,
              {color: connected ? '#4CAF50' : '#F44336'},
            ]}
          >
            {connected ? '✅ Connected' : '❌ Disconnected'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Products</Text>
          <Text style={styles.sectionSubtitle}>
            {visibleProducts.length > 0
              ? `${visibleProducts.length} product(s) available`
              : hasHiddenNonConsumables
                ? 'All non-consumable products already purchased'
                : 'Loading products...'}
          </Text>

          {visibleProducts.map((product) => (
            <View key={product.id} style={styles.productCard}>
              <View style={styles.productHeader}>
                <Text style={styles.productTitle}>{product.title}</Text>
                <Text style={styles.productPrice}>{product.displayPrice}</Text>
              </View>
              <Text style={styles.productDescription}>
                {product.description}
              </Text>
              <Text
                style={[
                  styles.productBadgeText,
                  CONSUMABLE_PRODUCT_ID_SET.has(product.id)
                    ? styles.productBadgeConsumable
                    : NON_CONSUMABLE_PRODUCT_ID_SET.has(product.id)
                      ? styles.productBadgeNonConsumable
                      : null,
                ]}
              >
                {CONSUMABLE_PRODUCT_ID_SET.has(product.id)
                  ? 'Consumable product'
                  : NON_CONSUMABLE_PRODUCT_ID_SET.has(product.id)
                    ? 'Non-consumable product'
                    : 'In-app product'}
              </Text>
              <View style={styles.productActions}>
                <TouchableOpacity
                  style={[
                    styles.purchaseButton,
                    isProcessing && {opacity: 0.5},
                  ]}
                  onPress={() => handlePurchase(product.id)}
                  disabled={isProcessing}
                >
                  <Text style={styles.purchaseButtonText}>
                    {isProcessing ? 'Processing...' : `Purchase`}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.detailsButton}
                  onPress={() => handleShowDetails(product)}
                >
                  <Text style={styles.detailsButtonText}>Details</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {visibleProducts.length === 0 && connected && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {hasHiddenNonConsumables
                  ? 'All available non-consumable products have already been purchased.'
                  : 'No products available. Please check your app store configuration.'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Purchases</Text>
          <Text style={styles.sectionSubtitle}>
            {availablePurchaseRows.length > 0
              ? `${availablePurchaseRows.length} stored purchase(s)`
              : 'Purchase a non-consumable to view it here'}
          </Text>

          {availablePurchaseRows.length > 0 ? (
            availablePurchaseRows.map((purchase) => (
              <PurchaseSummaryRow
                key={`${purchase.productId ?? 'unknown'}-${
                  purchase.transactionDate ?? purchase.id ?? 'na'
                }`}
                purchase={purchase}
                onPress={() => {
                  setPurchaseDetailsTarget(purchase);
                  setPurchaseDetailsVisible(true);
                }}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No saved purchases yet. Complete a non-consumable purchase to
                see it listed here.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.refreshButton,
              refreshingAvailablePurchases && {opacity: 0.6},
            ]}
            onPress={handleRefreshAvailablePurchases}
            disabled={refreshingAvailablePurchases}
          >
            <Text style={styles.refreshButtonText}>
              {refreshingAvailablePurchases
                ? 'Refreshing purchases...'
                : 'Refresh available purchases'}
            </Text>
          </TouchableOpacity>
        </View>

        {purchaseResult || lastPurchase ? (
          <View style={styles.resultContainer}>
            {purchaseResult ? (
              <>
                <Text style={styles.resultTitle}>Latest Status</Text>
                <Text style={styles.resultText}>{purchaseResult}</Text>
              </>
            ) : null}
            {lastPurchase ? (
              <View style={{marginTop: 8}}>
                <Text style={styles.resultSubtitle}>Latest Purchase</Text>
                <PurchaseSummaryRow
                  purchase={lastPurchase}
                  onPress={() => {
                    setPurchaseDetailsTarget(lastPurchase);
                    setPurchaseDetailsVisible(true);
                  }}
                />
              </View>
            ) : null}
            {purchaseResult ? (
              <TouchableOpacity
                style={styles.copyButton}
                onPress={handleCopyResult}
              >
                <Text style={styles.copyButtonText}>📋 Copy Message</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={styles.appTransactionButton}
            onPress={checkAppTransaction}
          >
            <Text style={styles.appTransactionButtonText}>
              🔍 Check App Transaction (iOS 16+)
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>How to test:</Text>
          <Text style={styles.instructionsText}>
            1. Make sure you're signed in with a Sandbox account
          </Text>
          <Text style={styles.instructionsText}>
            2. Products must be configured in App Store Connect
          </Text>
          <Text style={styles.instructionsText}>
            3. Tap "Purchase" to initiate the transaction
          </Text>
          <Text style={styles.instructionsText}>
            4. The transaction will be processed via the hook callbacks
          </Text>
          <Text style={styles.instructionsText}>
            5. Server-side receipt validation is recommended for production
          </Text>
        </View>
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Product Details</Text>
            {selectedProduct && (
              <>
                <Text style={styles.modalLabel}>Product ID:</Text>
                <Text style={styles.modalValue}>{selectedProduct.id}</Text>

                <Text style={styles.modalLabel}>Title:</Text>
                <Text style={styles.modalValue}>{selectedProduct.title}</Text>

                <Text style={styles.modalLabel}>Description:</Text>
                <Text style={styles.modalValue}>
                  {selectedProduct.description}
                </Text>

                <Text style={styles.modalLabel}>Price:</Text>
                <Text style={styles.modalValue}>
                  {selectedProduct.displayPrice}
                </Text>

                <Text style={styles.modalLabel}>Currency:</Text>
                <Text style={styles.modalValue}>
                  {selectedProduct.currency || 'N/A'}
                </Text>

                <Text style={styles.modalLabel}>Type:</Text>
                <Text style={styles.modalValue}>
                  {selectedProduct.type || 'N/A'}
                </Text>

                {'isFamilyShareableIOS' in selectedProduct && (
                  <>
                    <Text style={styles.modalLabel}>Is Family Shareable:</Text>
                    <Text style={styles.modalValue}>
                      {selectedProduct.isFamilyShareableIOS ? 'Yes' : 'No'}
                    </Text>
                  </>
                )}
              </>
            )}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={purchaseDetailsVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setPurchaseDetailsVisible(false);
          setPurchaseDetailsTarget(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Purchase Details</Text>
              <TouchableOpacity
                onPress={() => {
                  setPurchaseDetailsVisible(false);
                  setPurchaseDetailsTarget(null);
                }}
                style={styles.modalCloseIconButton}
              >
                <Text style={styles.modalCloseIconText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {purchaseDetailsTarget ? (
                <PurchaseDetails
                  purchase={purchaseDetailsTarget}
                  containerStyle={styles.purchaseDetailsContainer}
                  rowStyle={styles.purchaseDetailRow}
                  labelStyle={styles.modalLabel}
                  valueStyle={styles.modalValue}
                />
              ) : (
                <Text style={styles.modalValue}>No purchase selected.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function PurchaseFlowContainer() {
  const [purchaseResult, setPurchaseResult] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastPurchase, setLastPurchase] = useState<Purchase | null>(null);
  const [refreshingAvailablePurchases, setRefreshingAvailablePurchases] =
    useState(false);

  const {
    connected,
    products,
    availablePurchases,
    fetchProducts,
    finishTransaction,
    getAvailablePurchases,
  } = useIAP({
    onPurchaseSuccess: async (purchase: Purchase) => {
      const {purchaseToken: tokenToMask, ...rest} = purchase;
      const masked = {
        ...rest,
        ...(tokenToMask ? {purchaseToken: 'hidden'} : {}),
      };
      console.log('Purchase successful:', masked);
      console.log('[PurchaseFlow] purchaseState:', purchase.purchaseState);
      setLastPurchase(purchase);
      setIsProcessing(false);

      setPurchaseResult(
        `Purchase completed successfully (state: ${purchase.purchaseState}).`,
      );

      const productId = purchase.productId ?? '';
      const isConsumablePurchase = CONSUMABLE_PRODUCT_ID_SET.has(productId);
      if (!isConsumablePurchase && productId) {
        if (NON_CONSUMABLE_PRODUCT_ID_SET.has(productId)) {
          console.log(
            '[PurchaseFlow] Non-consumable purchase recorded:',
            productId,
          );
        } else {
          console.warn(
            '[PurchaseFlow] Purchase for product not listed in constants:',
            productId,
          );
        }
      }

      try {
        await finishTransaction({
          purchase,
          isConsumable: isConsumablePurchase,
        });
      } catch (error) {
        console.warn('[PurchaseFlow] finishTransaction failed:', error);
      }

      try {
        await getAvailablePurchases();
        console.log('[PurchaseFlow] Available purchases refreshed');
      } catch (error) {
        console.warn(
          '[PurchaseFlow] Failed to refresh available purchases:',
          error,
        );
      }

      Alert.alert('Success', 'Purchase completed successfully!');
    },
    onPurchaseError: (error: PurchaseError) => {
      console.error('Purchase failed:', error);
      setIsProcessing(false);
      setPurchaseResult(`Purchase failed: ${error.message}`);
    },
  });

  const didFetchRef = useRef(false);

  useEffect(() => {
    console.log('[PurchaseFlow] useEffect - connected:', connected);
    console.log('[PurchaseFlow] PRODUCT_IDS:', PRODUCT_IDS);
    if (connected && !didFetchRef.current) {
      didFetchRef.current = true;
      console.log('[PurchaseFlow] Calling fetchProducts with:', PRODUCT_IDS);
      fetchProducts({skus: PRODUCT_IDS, type: 'in-app'})
        .then(() => {
          console.log('[PurchaseFlow] fetchProducts completed');
        })
        .catch((error) => {
          console.error('[PurchaseFlow] fetchProducts error:', error);
        });

      getAvailablePurchases()
        .then(() => {
          console.log('[PurchaseFlow] getAvailablePurchases completed');
        })
        .catch((error) => {
          console.warn('[PurchaseFlow] getAvailablePurchases error:', error);
        });
    } else if (!connected) {
      didFetchRef.current = false;
      console.log('[PurchaseFlow] Not fetching products - not connected');
    }
  }, [connected, fetchProducts, getAvailablePurchases]);

  const handleRefreshAvailablePurchases = useCallback(async () => {
    if (refreshingAvailablePurchases) {
      return;
    }

    setRefreshingAvailablePurchases(true);
    try {
      await getAvailablePurchases();
    } catch (error) {
      console.warn(
        '[PurchaseFlow] Failed to refresh available purchases manually:',
        error,
      );
      Alert.alert('Refresh Failed', 'Could not refresh available purchases.');
    } finally {
      setRefreshingAvailablePurchases(false);
    }
  }, [getAvailablePurchases, refreshingAvailablePurchases]);

  const handlePurchase = useCallback((itemId: string) => {
    setIsProcessing(true);
    setPurchaseResult('Processing purchase...');

    if (typeof requestPurchase !== 'function') {
      console.warn('[PurchaseFlow] requestPurchase missing (test/mock env)');
      setIsProcessing(false);
      setPurchaseResult('Cannot start purchase in test/mock environment.');
      return;
    }

    void requestPurchase({
      request: {
        ios: {
          sku: itemId,
          quantity: 1,
        },
        android: {
          skus: [itemId],
        },
      },
      type: 'in-app',
    });
  }, []);

  return (
    <PurchaseFlow
      connected={connected}
      products={products}
      availablePurchases={availablePurchases}
      purchaseResult={purchaseResult}
      isProcessing={isProcessing}
      lastPurchase={lastPurchase}
      refreshingAvailablePurchases={refreshingAvailablePurchases}
      onPurchase={handlePurchase}
      onRefreshAvailablePurchases={handleRefreshAvailablePurchases}
    />
  );
}

export default PurchaseFlowContainer;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    padding: 15,
  },
  statusContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  productDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  productBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  productBadgeConsumable: {
    color: '#43A047',
  },
  productBadgeNonConsumable: {
    color: '#6A1B9A',
  },
  productActions: {
    flexDirection: 'row',
    gap: 10,
  },
  purchaseButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  purchaseButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  detailsButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
    alignItems: 'center',
  },
  detailsButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyState: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  resultContainer: {
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  resultSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultText: {
    fontSize: 12,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  copyButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#4CAF50',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4CAF50',
    minHeight: 44,
    justifyContent: 'center',
    marginTop: 12,
  },
  copyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  refreshButton: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  refreshButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14,
  },
  appTransactionButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 15,
  },
  appTransactionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  instructions: {
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    padding: 15,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    color: '#e65100',
  },
  instructionsText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalCloseIconButton: {
    padding: 4,
  },
  modalCloseIconText: {
    fontSize: 22,
    color: '#666',
  },
  modalLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 10,
    marginBottom: 5,
  },
  modalValue: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  purchaseDetailsContainer: {
    gap: 10,
  },
  purchaseDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  closeButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});
