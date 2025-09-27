import {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import {useIAP} from 'react-native-iap';
import Loading from '../src/components/Loading';
import {
  PRODUCT_IDS,
  SUBSCRIPTION_PRODUCT_IDS,
  CONSUMABLE_PRODUCT_IDS,
  NON_CONSUMABLE_PRODUCT_IDS,
} from '../src/utils/constants';
import type {Product} from 'react-native-iap';

const ALL_PRODUCT_IDS = [...PRODUCT_IDS, ...SUBSCRIPTION_PRODUCT_IDS];

/**
 * All Products Example - Show All Products and Subscriptions
 *
 * Demonstrates fetching all products (both in-app and subscriptions):
 * - Uses fetchProducts with 'all' type to get everything
 * - Displays products and subscriptions as they come from the API
 * - Single view for all product types
 */

function AllProducts() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const {connected, products, subscriptions, fetchProducts} = useIAP();

  useEffect(() => {
    console.log('[AllProducts] useEffect - connected:', connected);
    if (connected) {
      console.log('[AllProducts] Fetching all products');

      // Fetch all products with type 'all'
      fetchProducts({skus: ALL_PRODUCT_IDS, type: 'all'})
        .then(() => {
          console.log('[AllProducts] fetchProducts completed');
        })
        .catch((error) => {
          console.error('[AllProducts] fetchProducts error:', error);
        });
    }
  }, [connected, fetchProducts]);

  const handleShowDetails = (product: Product) => {
    setSelectedProduct(product);
    setModalVisible(true);
  };

  const getProductTypeLabel = (product: Product) => {
    if (CONSUMABLE_PRODUCT_IDS.includes(product.id)) {
      return 'CONSUMABLE';
    }
    if (NON_CONSUMABLE_PRODUCT_IDS.includes(product.id)) {
      return 'NON-CONSUMABLE';
    }
    return 'IN-APP';
  };

  const getProductTypeStyle = (product: Product) => {
    if (CONSUMABLE_PRODUCT_IDS.includes(product.id)) {
      return styles.typeBadgeConsumable;
    }
    if (NON_CONSUMABLE_PRODUCT_IDS.includes(product.id)) {
      return styles.typeBadgeNonConsumable;
    }
    return styles.typeBadgeInApp;
  };

  // Show loading screen while disconnected
  if (!connected) {
    return <Loading message="Connecting to Store..." />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>All Products</Text>
        <Text style={styles.subtitle}>In-App Purchases and Subscriptions</Text>
      </View>

      <View style={styles.content}>
        {/* Connection Status */}
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

        {/* Products List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Products (In-App)</Text>
          <Text style={styles.sectionSubtitle}>
            {products.length > 0
              ? `${products.length} product(s) loaded`
              : 'No products'}
          </Text>

          {products.map((product) => (
            <View key={product.id} style={styles.productCard}>
              <View style={styles.productHeader}>
                <View style={styles.productTitleContainer}>
                  <Text style={styles.productTitle}>{product.title}</Text>
                  <Text
                    style={[styles.typeBadge, getProductTypeStyle(product)]}
                  >
                    {getProductTypeLabel(product)}
                  </Text>
                </View>
                <Text style={styles.productPrice}>{product.displayPrice}</Text>
              </View>
              <Text style={styles.productDescription}>
                {product.description}
              </Text>
              <TouchableOpacity
                style={styles.detailsButton}
                onPress={() => handleShowDetails(product)}
              >
                <Text style={styles.detailsButtonText}>Details</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Subscriptions List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscriptions</Text>
          <Text style={styles.sectionSubtitle}>
            {subscriptions.length > 0
              ? `${subscriptions.length} subscription(s) loaded`
              : 'No subscriptions'}
          </Text>

          {subscriptions.map((subscription) => (
            <View key={subscription.id} style={styles.productCard}>
              <View style={styles.productHeader}>
                <View style={styles.productTitleContainer}>
                  <Text style={styles.productTitle}>{subscription.title}</Text>
                  <Text
                    style={[styles.typeBadge, styles.typeBadgeSubscription]}
                  >
                    SUBS
                  </Text>
                </View>
                <Text style={styles.productPrice}>
                  {subscription.displayPrice}
                </Text>
              </View>
              <Text style={styles.productDescription}>
                {subscription.description}
              </Text>
              <TouchableOpacity
                style={styles.detailsButton}
                onPress={() => handleShowDetails(subscription)}
              >
                <Text style={styles.detailsButtonText}>Details</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>

      {/* Product Details Modal */}
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
    </ScrollView>
  );
}

export default AllProducts;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#FF6B6B',
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
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productTitleContainer: {
    flex: 1,
    marginRight: 10,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
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
  typeBadge: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  typeBadgeInApp: {
    backgroundColor: '#E3F2FD',
    color: '#1565C0',
  },
  typeBadgeConsumable: {
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
  },
  typeBadgeNonConsumable: {
    backgroundColor: '#F3E5F5',
    color: '#6A1B9A',
  },
  typeBadgeSubscription: {
    backgroundColor: '#FFF8E1',
    color: '#F57C00',
  },
  detailsButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
    alignItems: 'center',
    alignSelf: 'flex-start',
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
