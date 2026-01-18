import {useEffect, useState, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SectionList,
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
import type {
  Product,
  ProductAndroid,
  ProductSubscription,
  ProductSubscriptionAndroid,
  ProductSubscriptionAndroidOfferDetails,
} from 'react-native-iap';
import AndroidOneTimeOfferDetails from '../src/components/AndroidOneTimeOfferDetails';

const ALL_PRODUCT_IDS = [...PRODUCT_IDS, ...SUBSCRIPTION_PRODUCT_IDS];

/**
 * All Products Example - Show All Products and Subscriptions
 *
 * Demonstrates fetching all products (both in-app and subscriptions):
 * - Uses fetchProducts with 'all' type to get everything
 * - Displays products and subscriptions as they come from the API
 * - Single view for all product types
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 🎯 TypeScript Discriminated Union Type Narrowing Examples
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * This file demonstrates real-world usage of discriminated union type narrowing
 * with OpenIAP gql 1.2.4+ types. See the following functions for examples:
 *
 * Example 1 (Line ~134): getProductTypeLabel()
 *   - Shows basic type narrowing using the 'type' discriminator
 *   - Narrows Product | ProductSubscription -> ProductSubscription
 *
 * Example 2 (Line ~91): handleShowDetails()
 *   - Demonstrates combining 'platform' and 'type' discriminators
 *   - Shows how to narrow to specific types like ProductSubscriptionIOS
 *   - Includes console.log examples showing type-safe field access
 *
 * Key discriminator fields:
 * - `type`: 'in-app' | 'subs' - Distinguishes products from subscriptions
 * - `platform`: 'ios' | 'android' - Distinguishes platform-specific types
 *
 * Type hierarchy:
 * - Product = ProductIOS | ProductAndroid (type: 'in-app')
 * - ProductSubscription = ProductSubscriptionIOS | ProductSubscriptionAndroid (type: 'subs')
 *
 * Benefits:
 * ✅ Type-safe access to platform-specific fields (e.g., discountsIOS, subscriptionOfferDetailsAndroid)
 * ✅ Compile-time errors prevent accessing non-existent fields
 * ✅ Better IDE autocomplete and IntelliSense
 * ✅ Runtime safety - no accessing undefined fields
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

function AllProducts() {
  const [selectedProduct, setSelectedProduct] = useState<
    Product | ProductSubscription | null
  >(null);
  const [modalVisible, setModalVisible] = useState(false);

  const {connected, products, subscriptions, fetchProducts} = useIAP();

  useEffect(() => {
    console.log('[AllProducts] useEffect - connected:', connected);
    console.log('[AllProducts] Current products:', products.length);
    console.log('[AllProducts] Current subscriptions:', subscriptions.length);

    if (connected) {
      console.log(
        '[AllProducts] Fetching all products with SKUs:',
        ALL_PRODUCT_IDS,
      );

      // Fetch all products with type 'all'
      fetchProducts({skus: ALL_PRODUCT_IDS, type: 'all'})
        .then(() => {
          console.log('[AllProducts] fetchProducts completed');
          console.log('[AllProducts] Products after fetch:', products.length);
          console.log(
            '[AllProducts] Subscriptions after fetch:',
            subscriptions.length,
          );
        })
        .catch((error) => {
          console.error('[AllProducts] fetchProducts error:', error);
        });
    }
  }, [connected, fetchProducts]);

  // Prepare sections for SectionList
  const sections = useMemo(() => {
    const sectionsData = [];

    if (products.length > 0) {
      sectionsData.push({
        title: 'In-App Products',
        data: products,
      });
    }

    if (subscriptions.length > 0) {
      sectionsData.push({
        title: 'Subscriptions',
        data: subscriptions,
      });
    }

    return sectionsData;
  }, [products, subscriptions]);

  /**
   * 🎯 Type Narrowing Example 2: Platform + Type narrowing
   *
   * This demonstrates combining both 'platform' and 'type' discriminators
   * to narrow down to a specific type (e.g., ProductSubscriptionIOS).
   */
  const handleShowDetails = (product: Product | ProductSubscription) => {
    // Log type narrowing examples
    console.log('\n🎯 Type Narrowing Examples for:', product.id);

    // Example 1: Narrow by type
    if (product.type === 'subs') {
      // ✅ Narrowed to: ProductSubscription
      console.log('- This is a subscription');

      // Example 2: Further narrow by platform
      if (product.platform === 'ios') {
        // ✅ Narrowed to: ProductSubscriptionIOS
        console.log('- iOS Subscription detected');
        console.log(
          '- Subscription Period:',
          product.subscriptionPeriodUnitIOS,
        );
        console.log('- Has Discounts:', product.discountsIOS?.length || 0);
      } else if (product.platform === 'android') {
        // ✅ Narrowed to: ProductSubscriptionAndroid
        console.log('- Android Subscription detected');
        console.log(
          '- Offers:',
          product.subscriptionOfferDetailsAndroid?.length || 0,
        );
      }
    } else {
      // ✅ Narrowed to: Product (in-app)
      console.log('- This is an in-app product');

      if (product.platform === 'ios') {
        // ✅ Narrowed to: ProductIOS
        console.log('- iOS Product');
        console.log('- Family Shareable:', product.isFamilyShareableIOS);
      } else {
        // ✅ Narrowed to: ProductAndroid
        console.log('- Android Product');
        console.log('- Name:', product.nameAndroid);
      }
    }

    setSelectedProduct(product);
    setModalVisible(true);
  };

  /**
   * 🎯 Type Narrowing Example 1: Using 'type' discriminator
   *
   * This demonstrates how TypeScript narrows the union type
   * Product | ProductSubscription using the 'type' field.
   */
  const getProductTypeLabel = (product: Product | ProductSubscription) => {
    // Type narrowing using 'type' discriminator
    if (product.type === 'subs') {
      // ✅ TypeScript narrows to: ProductSubscription
      return 'SUBSCRIPTION';
    }
    // ✅ TypeScript narrows to: Product (type === 'in-app')
    if (CONSUMABLE_PRODUCT_IDS.includes(product.id)) {
      return 'CONSUMABLE';
    }
    if (NON_CONSUMABLE_PRODUCT_IDS.includes(product.id)) {
      return 'NON-CONSUMABLE';
    }
    return 'IN-APP';
  };

  const getProductTypeStyle = (product: Product | ProductSubscription) => {
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

  const renderItem = ({item}: {item: Product | ProductSubscription}) => (
    <View style={styles.productCard}>
      <View style={styles.productHeader}>
        <View style={styles.productTitleContainer}>
          <Text style={styles.productTitle}>{item.title}</Text>
          <Text
            style={[
              styles.typeBadge,
              item.type === 'subs'
                ? styles.typeBadgeSubscription
                : getProductTypeStyle(item),
            ]}
          >
            {item.type === 'subs' ? 'SUBSCRIPTION' : getProductTypeLabel(item)}
          </Text>
        </View>
        <Text style={styles.productPrice}>{item.displayPrice}</Text>
      </View>
      <Text style={styles.productDescription}>{item.description}</Text>
      <TouchableOpacity
        style={styles.detailsButton}
        onPress={() => handleShowDetails(item)}
      >
        <Text style={styles.detailsButtonText}>Details</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSectionHeader = ({
    section,
  }: {
    section: {title: string; data: (Product | ProductSubscription)[]};
  }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Text style={styles.sectionCount}>
        {section.title === 'In-App Products'
          ? `${products.length} item(s)`
          : `${subscriptions.length} item(s)`}
      </Text>
    </View>
  );

  const ListHeaderComponent = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>All Products</Text>
        <Text style={styles.subtitle}>In-App Purchases and Subscriptions</Text>
      </View>
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
    </>
  );

  const ListEmptyComponent = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>No products available</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
      />

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
            <ScrollView style={styles.modalScrollView}>
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
                      <Text style={styles.modalLabel}>
                        Is Family Shareable:
                      </Text>
                      <Text style={styles.modalValue}>
                        {selectedProduct.isFamilyShareableIOS ? 'Yes' : 'No'}
                      </Text>
                    </>
                  )}

                  {/* Android One-Time Purchase Offers */}
                  {selectedProduct.platform === 'android' &&
                    'oneTimePurchaseOfferDetailsAndroid' in selectedProduct && (
                      <AndroidOneTimeOfferDetails
                        offers={
                          (
                            selectedProduct as
                              | ProductAndroid
                              | ProductSubscriptionAndroid
                          ).oneTimePurchaseOfferDetailsAndroid ?? []
                        }
                      />
                    )}

                  {/* Android Subscription Offers */}
                  {selectedProduct.platform === 'android' &&
                    'subscriptionOfferDetailsAndroid' in selectedProduct &&
                    selectedProduct.subscriptionOfferDetailsAndroid &&
                    selectedProduct.subscriptionOfferDetailsAndroid.length >
                      0 && (
                      <View style={styles.offersSection}>
                        <Text style={styles.offersSectionTitle}>
                          Subscription Offers (
                          {
                            selectedProduct.subscriptionOfferDetailsAndroid
                              .length
                          }
                          )
                        </Text>
                        {selectedProduct.subscriptionOfferDetailsAndroid.map(
                          (
                            offer: ProductSubscriptionAndroidOfferDetails,
                            index: number,
                          ) => (
                            <View
                              key={offer.offerToken}
                              style={styles.offerCard}
                            >
                              <Text style={styles.offerTitle}>
                                Offer {index + 1}
                                {offer.offerId ? ` (${offer.offerId})` : ''}
                              </Text>

                              <Text style={styles.offerLabel}>
                                Base Plan ID:
                              </Text>
                              <Text style={styles.offerValue}>
                                {offer.basePlanId}
                              </Text>

                              {offer.pricingPhases.pricingPhaseList.length >
                                0 && (
                                <>
                                  <Text style={styles.offerLabel}>
                                    Pricing Phases:
                                  </Text>
                                  {offer.pricingPhases.pricingPhaseList.map(
                                    (phase, phaseIndex) => (
                                      <View
                                        key={phaseIndex}
                                        style={styles.pricingPhase}
                                      >
                                        <Text style={styles.phaseText}>
                                          Phase {phaseIndex + 1}:{' '}
                                          {phase.formattedPrice} /{' '}
                                          {phase.billingPeriod}
                                        </Text>
                                        <Text style={styles.phaseDetail}>
                                          Cycles: {phase.billingCycleCount},
                                          Mode: {phase.recurrenceMode}
                                        </Text>
                                      </View>
                                    ),
                                  )}
                                </>
                              )}

                              {offer.offerTags.length > 0 && (
                                <>
                                  <Text style={styles.offerLabel}>Tags:</Text>
                                  <Text style={styles.offerValue}>
                                    {offer.offerTags.join(', ')}
                                  </Text>
                                </>
                              )}

                              <Text style={styles.offerLabel}>
                                Offer Token:
                              </Text>
                              <Text
                                style={[styles.offerValue, styles.offerToken]}
                                numberOfLines={2}
                              >
                                {offer.offerToken}
                              </Text>
                            </View>
                          ),
                        )}
                      </View>
                    )}

                  {/* Cross-Platform Standardized Subscription Offers (v14.7.2+) */}
                  {'subscriptionOffers' in selectedProduct &&
                    selectedProduct.subscriptionOffers &&
                    selectedProduct.subscriptionOffers.length > 0 && (
                      <View style={styles.offersSection}>
                        <Text style={styles.offersSectionTitle}>
                          Cross-Platform Subscription Offers (
                          {selectedProduct.subscriptionOffers.length})
                        </Text>
                        <Text style={styles.offersSectionSubtitle}>
                          Standardized offers for both iOS and Android
                        </Text>
                        {selectedProduct.subscriptionOffers.map(
                          (offer, index: number) => (
                            <View
                              key={offer.id || `offer-${index}`}
                              style={[
                                styles.offerCard,
                                styles.standardizedOffer,
                              ]}
                            >
                              <Text style={styles.offerTitle}>
                                {offer.id || `Offer ${index + 1}`}
                              </Text>

                              <View style={styles.offerRow}>
                                <Text style={styles.offerLabel}>Type:</Text>
                                <Text
                                  style={[styles.offerValue, styles.offerBadge]}
                                >
                                  {offer.type}
                                </Text>
                              </View>

                              <View style={styles.offerRow}>
                                <Text style={styles.offerLabel}>Price:</Text>
                                <Text style={styles.offerValue}>
                                  {offer.displayPrice}
                                </Text>
                              </View>

                              {offer.paymentMode && (
                                <View style={styles.offerRow}>
                                  <Text style={styles.offerLabel}>
                                    Payment Mode:
                                  </Text>
                                  <Text style={styles.offerValue}>
                                    {offer.paymentMode}
                                  </Text>
                                </View>
                              )}

                              {offer.period && (
                                <View style={styles.offerRow}>
                                  <Text style={styles.offerLabel}>Period:</Text>
                                  <Text style={styles.offerValue}>
                                    {offer.period.value} {offer.period.unit}
                                    {offer.periodCount
                                      ? ` × ${offer.periodCount}`
                                      : ''}
                                  </Text>
                                </View>
                              )}

                              {/* Android-specific fields */}
                              {offer.basePlanIdAndroid && (
                                <View style={styles.offerRow}>
                                  <Text style={styles.offerLabel}>
                                    Base Plan (Android):
                                  </Text>
                                  <Text style={styles.offerValue}>
                                    {offer.basePlanIdAndroid}
                                  </Text>
                                </View>
                              )}

                              {offer.offerTokenAndroid && (
                                <>
                                  <Text style={styles.offerLabel}>
                                    Offer Token (Android):
                                  </Text>
                                  <Text
                                    style={[
                                      styles.offerValue,
                                      styles.offerToken,
                                    ]}
                                    numberOfLines={2}
                                  >
                                    {offer.offerTokenAndroid}
                                  </Text>
                                </>
                              )}
                            </View>
                          ),
                        )}
                      </View>
                    )}
                </>
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default AllProducts;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    flexGrow: 1,
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
  statusContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    margin: 15,
    marginTop: 0,
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
  sectionHeader: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  sectionCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginHorizontal: 15,
    marginVertical: 5,
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
  modalScrollView: {
    maxHeight: '85%',
  },
  offersSection: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  offersSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  offerCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  offerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 8,
  },
  offerLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 6,
    fontWeight: '600',
  },
  offerValue: {
    fontSize: 13,
    color: '#333',
    marginTop: 2,
  },
  offerValueDiscount: {
    fontSize: 13,
    color: '#E53935',
    marginTop: 2,
    fontWeight: '600',
  },
  offerToken: {
    fontSize: 10,
    color: '#999',
    fontFamily: 'monospace',
  },
  standardizedOffer: {
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  offerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  offerBadge: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 11,
    fontWeight: '600',
    overflow: 'hidden',
  },
  offersSectionSubtitle: {
    fontSize: 11,
    color: '#888',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  pricingPhase: {
    backgroundColor: '#e3f2fd',
    borderRadius: 4,
    padding: 6,
    marginTop: 4,
    marginBottom: 2,
  },
  phaseText: {
    fontSize: 12,
    color: '#1565C0',
    fontWeight: '600',
  },
  phaseDetail: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
});
