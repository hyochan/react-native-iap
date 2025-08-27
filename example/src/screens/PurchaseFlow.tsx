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
import {
  useIAP,
  getAppTransactionIOS,
  getAvailablePurchases,
} from '../../../src';
import type { Product, ProductPurchase, PurchaseError } from '../../../src';

const PRODUCT_IDS = ['dev.hyo.martie.10bulbs', 'dev.hyo.martie.30bulbs'];

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

export default function PurchaseFlow() {
  // React state for local component state
  const [purchaseResult, setPurchaseResult] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Use the useIAP hook for managing purchases
  const {
    connected,
    products,
    requestProducts,
    finishTransaction,
    requestPurchase,
  } = useIAP({
    onPurchaseSuccess: async (purchase: ProductPurchase) => {
      console.log('Purchase successful:', purchase);
      setIsProcessing(false);

      // Handle successful purchase
      setPurchaseResult(
        `✅ Purchase successful (${purchase.platform})\n` +
          `Product: ${purchase.id}\n` +
          `Transaction ID: ${purchase.transactionId || 'N/A'}\n` +
          `Date: ${new Date(purchase.transactionDate).toLocaleDateString()}\n` +
          `Receipt: ${purchase.transactionReceipt?.substring(0, 50)}...`,
      );

      // IMPORTANT: Server-side receipt validation should be performed here
      // Send the receipt to your backend server for validation
      // Example:
      // const isValid = await validateReceiptOnServer(purchase.transactionReceipt);
      // if (!isValid) {
      //   Alert.alert('Error', 'Receipt validation failed');
      //   return;
      // }

      // After successful server validation, finish the transaction
      // For consumable products (like bulb packs), set isConsumable to true
      await finishTransaction({
        purchase,
        isConsumable: true, // Set to true for consumable products
      });

      Alert.alert('Success', 'Purchase completed successfully!');
    },
    onPurchaseError: async (error: PurchaseError) => {
      console.error('Purchase failed:', error);
      setIsProcessing(false);

      // Handle purchase error
      setPurchaseResult(`❌ Purchase failed: ${error.message}`);

      // WARNING: This is for testing purposes only!
      // In production, you should NOT automatically consume items that are already owned.
      // This could lead to users losing their purchases without proper validation.
      // Always validate purchases on your server before consuming them.
      if (
        error.message?.toLowerCase().includes('already owned') ||
        error.message?.toLowerCase().includes('item already owned')
      ) {
        console.warn(
          '[TEST MODE] Item already owned, attempting to consume for testing purposes',
        );

        // Try to find and consume the existing purchase
        try {
          const availablePurchases = await getAvailablePurchases();
          const existingPurchase = availablePurchases.find(
            p => selectedProduct && p.productId === selectedProduct.id,
          );

          if (existingPurchase) {
            console.log(
              '[TEST MODE] Found existing purchase, consuming it:',
              existingPurchase,
            );
            await finishTransaction({
              purchase: existingPurchase,
              isConsumable: true,
            });
            Alert.alert(
              'Test Mode',
              'Item was already owned. Consumed for testing. Try purchasing again.',
              [{ text: 'OK' }],
            );
            return;
          }
        } catch (consumeError) {
          console.error(
            '[TEST MODE] Failed to consume existing purchase:',
            consumeError,
          );
        }
      }

      Alert.alert('Purchase Failed', error.message);
    },
    onSyncError: (error: Error) => {
      console.warn('Sync error:', error);
      Alert.alert('Sync Error', `Failed to sync purchases: ${error.message}`);
    },
  });

  // Load products when component mounts
  useEffect(() => {
    console.log('[PurchaseFlow] useEffect - connected:', connected);
    if (connected) {
      console.log('[PurchaseFlow] Requesting products with SKUs:', PRODUCT_IDS);
      requestProducts({ skus: PRODUCT_IDS, type: 'inapp' })
        .then(() => {
          console.log('[PurchaseFlow] Products request completed');
        })
        .catch(error => {
          console.error('[PurchaseFlow] Error requesting products:', error);
        });
    }
  }, [connected, requestProducts]);

  const handlePurchase = async (itemId: string) => {
    try {
      setIsProcessing(true);
      setPurchaseResult('Processing purchase...');

      // Set the current product being purchased (for error handling)
      const product = products.find(p => p.id === itemId);
      if (product) {
        setSelectedProduct(product);
      }

      // Use requestPurchase - the result will be handled by onPurchaseSuccess/onPurchaseError callbacks
      // Use expo-iap format with ios/android fields
      const purchaseRequest = {
        ios: { sku: itemId, quantity: 1 },
        android: { skus: [itemId] },
      };

      await requestPurchase({
        request: purchaseRequest,
        type: 'inapp',
      });
    } catch (error) {
      setIsProcessing(false);
      const errorMessage =
        error instanceof Error ? error.message : 'Purchase failed';
      setPurchaseResult(`❌ Purchase failed: ${errorMessage}`);
    }
  };

  const retryLoadProducts = () => {
    requestProducts({ skus: PRODUCT_IDS, type: 'inapp' });
  };

  const getProductDisplayPrice = (product: Product): string => {
    if (product.platform === 'android') {
      return (
        (product as any).oneTimePurchaseOfferDetails?.formattedPrice ||
        product.displayPrice ||
        'N/A'
      );
    } else {
      return product.displayPrice || 'N/A';
    }
  };

  const handleProductPress = (product: Product) => {
    setSelectedProduct(product);
    setModalVisible(true);
  };

  const renderProductDetails = () => {
    const product = selectedProduct;
    if (!product) return null;

    const jsonString = JSON.stringify(product, null, 2);

    const copyToClipboard = async () => {
      try {
        Clipboard.setString(jsonString);
        Alert.alert('Copied', 'Product JSON copied to clipboard');
      } catch {
        Alert.alert('Copy Failed', 'Failed to copy to clipboard');
      }
    };

    const logToConsole = () => {
      console.log('=== PRODUCT DATA ===');
      console.log(product);
      console.log('=== PRODUCT JSON ===');
      console.log(jsonString);
      Alert.alert('Console', 'Product data logged to console');
    };

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
        <Text style={styles.title}>In-App Purchase Flow</Text>
        <Text style={styles.subtitle}>
          TypeScript-first approach for products
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Available Products</Text>
        {!connected ? (
          <Text style={styles.loadingText}>Connecting to store...</Text>
        ) : products.length > 0 ? (
          products.map(product => (
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
                    isProcessing && styles.disabledButton,
                  ]}
                  onPress={() => handlePurchase(product.id)}
                  disabled={isProcessing || !connected}
                >
                  <Text style={styles.purchaseButtonText}>
                    {isProcessing ? 'Processing...' : 'Purchase'}
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
            <TouchableOpacity
              style={styles.retryButton}
              onPress={retryLoadProducts}
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
        <Text style={styles.infoTitle}>🎯 Key Features Demonstrated</Text>
        <Text style={styles.infoText}>
          • Automatic TypeScript type inference{'\n'}• Platform-agnostic
          property access{'\n'}• No manual type casting required{'\n'}• Focused
          on one-time purchases{'\n'}• Type-safe error handling
          {'\n'}• Powered by Nitro Modules 🔥
        </Text>
      </View>

      {Platform.OS === 'ios' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test iOS 16.0 Feature</Text>
          <TouchableOpacity
            style={styles.testButton}
            onPress={async () => {
              try {
                const appTransaction = await getAppTransactionIOS();
                Alert.alert(
                  'Success',
                  `App Transaction: ${JSON.stringify(appTransaction)}`,
                );
              } catch (error: any) {
                Alert.alert(
                  'Error',
                  error.message || 'Failed to get app transaction',
                );
              }
            }}
          >
            <Text style={styles.testButtonText}>Test getAppTransaction</Text>
          </TouchableOpacity>
        </View>
      )}
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
    color: '#000',
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    padding: 20,
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
  testButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
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
