import {useCallback, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import {router} from 'expo-router';
import {useIAP, type Product} from 'react-native-iap';
import {PRODUCT_IDS, SUBSCRIPTION_PRODUCT_IDS} from '../constants/products';

export default function AllProductsScreen() {
  const {
    connected,
    products,
    subscriptions,
    fetchProducts,
    requestPurchase,
    finishTransaction,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      console.log('Purchase successful:', purchase);
      Alert.alert('Success', `Purchased: ${purchase.productId}`);

      try {
        // Determine if the product is consumable
        const allProducts = [...(products || []), ...(subscriptions || [])];
        const product = allProducts.find((p) => p.id === purchase.productId);
        const isConsumable =
          product?.type === 'in-app' &&
          PRODUCT_IDS.includes(purchase.productId);

        await finishTransaction({
          purchase,
          isConsumable,
        });
        console.log('Transaction finished');
      } catch (error) {
        console.warn('Failed to finish transaction:', error);
      }
    },
    onPurchaseError: (error) => {
      console.error('Purchase error:', error);
      Alert.alert('Error', error.message);
    },
  });

  const handleFetchProducts = useCallback(async () => {
    try {
      console.log('[AllProducts] Fetching products:', PRODUCT_IDS);
      await fetchProducts({skus: PRODUCT_IDS, type: 'in-app'});
      console.log(
        '[AllProducts] Fetching subscriptions:',
        SUBSCRIPTION_PRODUCT_IDS,
      );
      await fetchProducts({skus: SUBSCRIPTION_PRODUCT_IDS, type: 'subs'});
      console.log('[AllProducts] All products fetched successfully');
    } catch (error: any) {
      console.error('[AllProducts] Failed to fetch products:', error);
      Alert.alert('Error', 'Failed to fetch products');
    }
  }, [fetchProducts]);

  // Auto-fetch products when connected
  useEffect(() => {
    if (connected) {
      console.log('[AllProducts] Auto-fetching products on connection');
      handleFetchProducts();
    }
  }, [connected, handleFetchProducts]);

  const handlePurchase = useCallback(
    (product: Product, type: 'in-app' | 'subs') => {
      if (!connected) {
        Alert.alert('Error', 'Not connected to store');
        return;
      }

      requestPurchase({
        request: {
          ios: {
            sku: product.id,
            quantity: 1,
          },
          android: {
            skus: [product.id],
          },
        },
        type,
      });
    },
    [connected, requestPurchase],
  );

  const renderProduct = (product: Product, type: 'in-app' | 'subs') => (
    <View key={product.id} style={styles.productCard}>
      <View style={styles.productInfo}>
        <Text style={styles.productTitle}>{product.title}</Text>
        <Text style={styles.productDescription}>{product.description}</Text>
        <Text style={styles.productPrice}>{product.displayPrice}</Text>
        <Text style={styles.productType}>
          {type === 'in-app' ? '🛒 Product' : '🔄 Subscription'}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.buyButton, !connected && styles.buyButtonDisabled]}
        onPress={() => handlePurchase(product, type)}
        disabled={!connected}
      >
        <Text style={styles.buyButtonText}>Buy</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>All Products</Text>
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Connection:</Text>
        <Text style={[styles.statusValue, connected && styles.connected]}>
          {connected ? '✓ Connected' : '✗ Disconnected'}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.fetchButton, !connected && styles.fetchButtonDisabled]}
        onPress={handleFetchProducts}
        disabled={!connected}
      >
        <Text style={styles.fetchButtonText}>Fetch Products</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Products ({products.length})</Text>
        {products.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No products available. Tap "Fetch Products" to load.
            </Text>
          </View>
        ) : (
          products.map((product) => renderProduct(product, 'in-app'))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Subscriptions ({subscriptions.length})
        </Text>
        {subscriptions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No subscriptions available. Tap "Fetch Products" to load.
            </Text>
          </View>
        ) : (
          subscriptions.map((product) => renderProduct(product, 'subs'))
        )}
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>ℹ️ Test Mode</Text>
        <Text style={styles.infoText}>
          {Platform.OS === 'ios'
            ? 'Use sandbox accounts for testing'
            : 'Use test tracks in Google Play Console'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statusCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 14,
    color: '#999',
  },
  connected: {
    color: '#4CAF50',
  },
  fetchButton: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  fetchButtonDisabled: {
    backgroundColor: '#ccc',
  },
  fetchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    margin: 16,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  productCard: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  productType: {
    fontSize: 12,
    color: '#999',
  },
  buyButton: {
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  buyButtonDisabled: {
    backgroundColor: '#ccc',
  },
  buyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  infoCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#856404',
  },
});
