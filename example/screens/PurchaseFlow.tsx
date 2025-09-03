import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  type Product,
  type Purchase,
  type NitroPurchaseResult,
} from 'react-native-iap';

// Test product IDs
const PRODUCT_IDS = ['dev.hyo.martie.10bulbs', 'dev.hyo.martie.30bulbs'];

const PurchaseFlow: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const subscriptionsRef = useRef<{updateSub?: any; errorSub?: any}>({});

  useEffect(() => {
    // Initialize connection when component mounts
    initializeIAP();
    setupPurchaseListeners();

    // Cleanup when component unmounts
    return () => {
      // Clean up listeners
      subscriptionsRef.current.updateSub?.remove();
      subscriptionsRef.current.errorSub?.remove();
      endConnection();
    };
  }, []);

  const setupPurchaseListeners = () => {
    // Set up purchase success listener
    subscriptionsRef.current.updateSub =
      purchaseUpdatedListener(handlePurchaseUpdate);

    // Set up purchase error listener
    subscriptionsRef.current.errorSub =
      purchaseErrorListener(handlePurchaseError);
  };

  const handlePurchaseUpdate = (purchase: Purchase) => {
    console.log('✅ Purchase successful:', purchase);

    // Get receipt/token based on platform
    const receipt =
      Platform.OS === 'android'
        ? (purchase as any).dataAndroid
        : purchase.purchaseToken || // Contains JWS representation on iOS
          purchase.transactionReceipt; // Legacy receipt format

    // Get transaction ID based on platform
    const transactionId = purchase.transactionId || purchase.id;

    // Build platform-specific result message
    let resultMessage =
      `✅ Purchase successful (${purchase.platform || Platform.OS})\n` +
      `Product: ${purchase.productId}\n` +
      `Transaction ID: ${transactionId || 'N/A'}\n` +
      `Date: ${new Date(purchase.transactionDate).toLocaleDateString()}\n`;

    if (Platform.OS === 'ios') {
      const iosPurchase = purchase as any;
      if (iosPurchase.quantityIOS) {
        resultMessage += `Quantity: ${iosPurchase.quantityIOS}\n`;
      }
      if (iosPurchase.originalTransactionIdentifierIOS) {
        resultMessage += `Original Transaction: ${iosPurchase.originalTransactionIdentifierIOS}\n`;
      }
      if (iosPurchase.originalTransactionDateIOS) {
        resultMessage += `Original Date: ${new Date(iosPurchase.originalTransactionDateIOS).toLocaleDateString()}\n`;
      }
      if (iosPurchase.appAccountToken) {
        resultMessage += `App Account Token: ${iosPurchase.appAccountToken}\n`;
      }
      resultMessage += `JWS Token: ${receipt || 'N/A'}\n`;
    } else if (Platform.OS === 'android') {
      const androidPurchase = purchase as any;
      resultMessage +=
        `Purchase Token: ${androidPurchase.purchaseToken || 'N/A'}\n` +
        `Order ID: ${androidPurchase.orderId || 'N/A'}\n` +
        `Package: ${androidPurchase.packageNameAndroid || 'N/A'}\n` +
        `State: ${androidPurchase.purchaseStateAndroid === 1 ? 'Purchased' : 'Pending'}\n` +
        `Acknowledged: ${androidPurchase.isAcknowledgedAndroid ? 'Yes' : 'No'}\n`;
      if (androidPurchase.signatureAndroid) {
        resultMessage += `Signature: ${androidPurchase.signatureAndroid}\n`;
      }
      resultMessage += `Receipt JSON: ${receipt || 'N/A'}\n`;
    }

    // Update purchase result display
    setPurchaseResult(resultMessage);
    setPurchasing(false);

    // Finish the transaction
    handleFinishTransaction(purchase);

    Alert.alert('Success', 'Purchase completed successfully!');
  };

  const handlePurchaseError = (error: NitroPurchaseResult) => {
    console.error('❌ Purchase failed:', error);

    const errorMessage = error.message || 'Purchase failed';
    setPurchaseResult(`❌ Purchase failed: ${errorMessage}`);
    setPurchasing(false);

    if (error.code === 'user_cancelled') {
      Alert.alert('Purchase Cancelled', 'You cancelled the purchase');
    } else {
      Alert.alert('Purchase Failed', errorMessage);
    }
  };

  const initializeIAP = async () => {
    try {
      setLoading(true);
      const isConnected = await initConnection();
      setConnected(isConnected);

      if (isConnected) {
        await loadProducts();
      }
    } catch (error) {
      console.error('Failed to initialize IAP:', error);
      Alert.alert('Error', 'Failed to initialize IAP connection');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const fetchedProducts = await fetchProducts({
        skus: PRODUCT_IDS,
        type: 'inapp',
      });

      console.log('Fetched products:', fetchedProducts);
      setProducts(fetchedProducts);
    } catch (error) {
      console.error('Failed to load products:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (itemId: string) => {
    try {
      setPurchasing(true);
      setPurchaseResult('Processing purchase...');

      // Request purchase - results will be handled by event listeners
      await requestPurchase({
        request: {
          ios: {
            sku: itemId,
            quantity: 1,
          },
          android: {
            skus: [itemId],
          },
        },
        type: 'inapp',
      });

      console.log(
        'Purchase request sent - waiting for result via event listener',
      );
    } catch (error: any) {
      console.error('Purchase request failed:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Purchase request failed';
      setPurchaseResult(`❌ Purchase request failed: ${errorMessage}`);
      setPurchasing(false);

      Alert.alert('Request Failed', errorMessage);
    }
  };

  const handleFinishTransaction = async (purchase: Purchase) => {
    try {
      await finishTransaction({
        purchase,
        isConsumable: true,
      });
      console.log('Transaction finished');
    } catch (error) {
      console.error('Failed to finish transaction:', error);
    }
  };

  const handleProductPress = (product: Product) => {
    setSelectedProduct(product);
    setModalVisible(true);
  };

  const getProductDisplayPrice = (product: Product): string => {
    // Use the simplified Android offer price fields (added by type bridge)
    const androidProduct = product as any;
    if (
      Platform.OS === 'android' &&
      androidProduct.oneTimePurchaseOfferFormattedPrice
    ) {
      return androidProduct.oneTimePurchaseOfferFormattedPrice;
    }
    return product.displayPrice;
  };

  const copyToClipboard = async () => {
    if (!selectedProduct) return;
    // React Native doesn't have built-in clipboard, showing as console.log instead
    const jsonString = JSON.stringify(selectedProduct, null, 2);
    console.log('=== PRODUCT DATA ===');
    console.log(selectedProduct);
    console.log('=== PRODUCT JSON ===');
    console.log(jsonString);
    Alert.alert('Console', 'Product data logged to console');
  };

  const renderProductDetails = () => {
    const product = selectedProduct;
    if (!product) return null;

    const jsonString = JSON.stringify(product, null, 2);

    return (
      <View style={styles.modalContent}>
        <ScrollView style={styles.jsonContainer}>
          <Text style={styles.jsonText}>{jsonString}</Text>
        </ScrollView>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.consoleButton]}
            onPress={copyToClipboard}
          >
            <Text style={styles.actionButtonText}>🖥️ Console Log</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>In-App Purchase Flow</Text>
        <Text style={styles.subtitle}>Testing with react-native-iap</Text>
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            Store: {connected ? '✅ Connected' : '❌ Disconnected'}
          </Text>
          <Text style={styles.statusText}>
            Platform: {Platform.OS === 'ios' ? '🍎 iOS' : '🤖 Android'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Available Products</Text>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading products...</Text>
          </View>
        ) : products.length > 0 ? (
          products.map((product) => (
            <View key={product.id} style={styles.productCard}>
              <View style={styles.productInfo}>
                <Text style={styles.productTitle}>{product.title}</Text>
                <Text style={styles.productDescription}>
                  {product.description}
                </Text>
                <Text style={styles.productPrice}>
                  {getProductDisplayPrice(product)}
                </Text>
              </View>
              <View style={styles.productActions}>
                <TouchableOpacity
                  style={styles.infoButton}
                  onPress={() => handleProductPress(product)}
                >
                  <Text style={styles.infoButtonText}>ℹ️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.purchaseButton,
                    purchasing && styles.disabledButton,
                  ]}
                  onPress={() => handlePurchase(product.id)}
                  disabled={purchasing || !connected}
                >
                  <Text style={styles.purchaseButtonText}>
                    {purchasing ? 'Processing...' : 'Purchase'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.noProductsCard}>
            <Text style={styles.noProductsText}>
              No products found. Make sure to configure your product IDs in your
              app store.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadProducts}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {purchaseResult ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Result</Text>
          <TouchableOpacity
            onLongPress={() => {
              Clipboard.setString(purchaseResult);
              Alert.alert('Copied', 'Purchase result copied to clipboard');
            }}
            delayLongPress={500}
          >
            <ScrollView style={styles.resultCard} horizontal={true}>
              <Text style={styles.resultText}>{purchaseResult}</Text>
            </ScrollView>
          </TouchableOpacity>
          <Text style={styles.copyHint}>Long press to copy</Text>
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
              <Text style={styles.modalTitle}>Product Details</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            {renderProductDetails()}
          </View>
        </View>
      </Modal>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>Test Information</Text>
        <Text style={styles.infoText}>
          {Platform.OS === 'ios'
            ? 'Using Sandbox environment for testing'
            : 'Using Android test products'}
        </Text>
        <Text style={styles.infoText}>Products: {PRODUCT_IDS.join(', ')}</Text>
      </View>
    </ScrollView>
  );
};

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
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  productCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productActions: {
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
  productInfo: {
    flex: 1,
    marginRight: 15,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  purchaseButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  purchaseButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  noProductsCard: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
  },
  noProductsText: {
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
    borderLeftColor: '#007AFF',
  },
  resultText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 20,
    color: '#333',
    flexShrink: 0,
  },
  copyHint: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'right',
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
  consoleButton: {
    backgroundColor: '#28a745',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PurchaseFlow;
