import {useCallback, useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  TextInput,
  ScrollView,
} from 'react-native';
import {router} from 'expo-router';
import {
  useIAP,
  requestPurchase,
  presentExternalPurchaseLinkIOS,
  type Product,
  type Purchase,
  type AlternativeBillingModeAndroid,
} from 'react-native-iap';
import {PRODUCT_IDS} from '../constants/products';

export default function AlternativeBillingScreen() {
  const [externalUrl, setExternalUrl] = useState('https://openiap.dev');
  const [billingMode, setBillingMode] =
    useState<AlternativeBillingModeAndroid>('alternative-only');
  const [purchaseResult, setPurchaseResult] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    connected,
    products,
    fetchProducts,
    checkAlternativeBillingAvailabilityAndroid,
    showAlternativeBillingDialogAndroid,
    createAlternativeBillingTokenAndroid,
  } = useIAP({
    alternativeBillingModeAndroid:
      Platform.OS === 'android' ? billingMode : undefined,
    onPurchaseSuccess: async (purchase: Purchase) => {
      console.log('Purchase successful:', purchase);
      setIsProcessing(false);
      setPurchaseResult(`✅ Purchase successful: ${purchase.productId}`);
      Alert.alert('Success', 'Purchase completed!');
    },
    onPurchaseError: (error) => {
      console.log('[AlternativeBilling] Purchase error:', error);
      setIsProcessing(false);
      setPurchaseResult(`❌ Error: ${error.message}`);
    },
  });

  const handleFetchProducts = useCallback(async () => {
    try {
      console.log('[AlternativeBilling] Fetching products:', PRODUCT_IDS);
      await fetchProducts({skus: PRODUCT_IDS, type: 'in-app'});
      console.log('[AlternativeBilling] Products fetched successfully');
    } catch (error) {
      console.error('[AlternativeBilling] Failed to fetch products:', error);
      Alert.alert('Error', 'Failed to fetch products');
    }
  }, [fetchProducts]);

  // Auto-fetch products when connected
  useEffect(() => {
    if (connected) {
      console.log('[AlternativeBilling] Auto-fetching products on connection');
      handleFetchProducts();
    }
  }, [connected, handleFetchProducts]);

  useEffect(() => {
    console.log(
      '[AlternativeBilling] Products updated:',
      products.length,
      products,
    );
  }, [products]);

  useEffect(() => {
    console.log('[AlternativeBilling] Connected:', connected);
  }, [connected]);

  const handleIOSPurchase = useCallback(
    async (product: Product) => {
      console.log('[iOS] Starting alternative billing purchase:', product.id);
      console.log('[iOS] External URL:', externalUrl);

      if (!externalUrl || externalUrl.trim() === '') {
        Alert.alert('Error', 'Please enter a valid external purchase URL');
        return;
      }

      setIsProcessing(true);
      setPurchaseResult('🌐 Opening external purchase link...');

      try {
        // Use StoreKit External Purchase Link API
        const result = await presentExternalPurchaseLinkIOS(externalUrl);
        console.log('[iOS] External purchase link result:', result);

        if (result.error) {
          setPurchaseResult(`❌ Error: ${result.error}`);
          Alert.alert('Error', result.error);
        } else if (result.success) {
          setPurchaseResult(
            `✅ External purchase link opened\n\nProduct: ${product.id}\nURL: ${externalUrl}\n\nUser redirected to external website.`,
          );
          Alert.alert(
            'Redirected',
            'User was redirected to your external purchase website.',
          );
        }
      } catch (error: any) {
        console.error('[iOS] Alternative billing error:', error);
        setPurchaseResult(`❌ Error: ${error.message}`);
        Alert.alert('Error', error.message);
      } finally {
        setIsProcessing(false);
      }
    },
    [externalUrl],
  );

  const handleAndroidAlternativeBilling = useCallback(
    async (product: Product) => {
      setIsProcessing(true);
      setPurchaseResult('Checking availability...');

      try {
        const isAvailable = await checkAlternativeBillingAvailabilityAndroid!();

        if (!isAvailable) {
          setPurchaseResult('❌ Alternative billing not available');
          Alert.alert('Error', 'Alternative billing not available');
          setIsProcessing(false);
          return;
        }

        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 500);
        });

        setPurchaseResult('Showing dialog...');
        const userAccepted = await showAlternativeBillingDialogAndroid!();

        if (!userAccepted) {
          setPurchaseResult('ℹ️ User cancelled');
          setIsProcessing(false);
          return;
        }

        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 500);
        });

        setPurchaseResult('Creating token...');
        const token = await createAlternativeBillingTokenAndroid!(product.id);

        if (token) {
          setPurchaseResult(
            `✅ Complete (DEMO)\n\nToken: ${token.substring(0, 20)}...\n\n⚠️ Report to Google within 24h`,
          );
          Alert.alert('Demo Complete', 'Alternative billing flow completed');
        }
      } catch (error: any) {
        console.error('Error:', error);
        setPurchaseResult(`❌ Error: ${error.message}`);
        Alert.alert('Error', error.message);
      } finally {
        setIsProcessing(false);
      }
    },
    [
      checkAlternativeBillingAvailabilityAndroid,
      showAlternativeBillingDialogAndroid,
      createAlternativeBillingTokenAndroid,
    ],
  );

  const handlePurchase = (product: Product) => {
    if (Platform.OS === 'ios') {
      handleIOSPurchase(product);
    } else if (billingMode === 'alternative-only') {
      handleAndroidAlternativeBilling(product);
    } else {
      // User choice billing
      setIsProcessing(true);
      setPurchaseResult('Showing user choice dialog...');
      requestPurchase({
        request: {
          android: {
            skus: [product.id],
          },
        },
        type: 'in-app',
        useAlternativeBilling: true,
      })
        .then(() => {
          setPurchaseResult(
            `🔄 User choice dialog shown\n\nProduct: ${product.id}\n\nIf user selects:\n- Google Play: onPurchaseUpdated callback\n- Alternative: Manual flow required`,
          );
          setIsProcessing(false);
        })
        .catch((error) => {
          console.error('[Android] User choice billing error:', error);
          setPurchaseResult(`❌ Error: ${error.message}`);
          Alert.alert('Error', error.message);
          setIsProcessing(false);
        });
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Alternative Billing</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>
          {Platform.OS === 'ios'
            ? 'iOS External Purchase'
            : 'Android Alternative Billing'}
        </Text>
        <Text style={styles.infoText}>
          {Platform.OS === 'ios'
            ? 'Redirects to external website for payment'
            : billingMode === 'alternative-only'
              ? '3-step flow: check → dialog → token'
              : 'User chooses between Google Play and alternative'}
        </Text>
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Connection:</Text>
        <Text style={[styles.statusValue, connected && styles.connected]}>
          {connected ? '✓ Connected' : '✗ Disconnected'}
        </Text>
      </View>

      {Platform.OS === 'android' && (
        <View style={styles.modeSelector}>
          <Text style={styles.label}>Billing Mode:</Text>
          <TouchableOpacity
            style={styles.modeButton}
            onPress={() =>
              setBillingMode(
                billingMode === 'alternative-only'
                  ? 'user-choice'
                  : 'alternative-only',
              )
            }
          >
            <Text style={styles.modeButtonText}>
              {billingMode === 'alternative-only'
                ? '🔒 Alternative Only'
                : '🔀 User Choice'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {Platform.OS === 'ios' && (
        <View style={styles.urlInput}>
          <Text style={styles.label}>External URL:</Text>
          <TextInput
            style={styles.input}
            value={externalUrl}
            onChangeText={setExternalUrl}
            placeholder="https://your-site.com"
            autoCapitalize="none"
          />
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, !connected && styles.buttonDisabled]}
        onPress={handleFetchProducts}
        disabled={!connected}
      >
        <Text style={styles.buttonText}>Fetch Products</Text>
      </TouchableOpacity>

      <View style={styles.productsSection}>
        <Text style={styles.sectionTitle}>Products ({products.length})</Text>
        {products.map((product) => (
          <TouchableOpacity
            key={product.id}
            style={styles.productCard}
            onPress={() => handlePurchase(product)}
            disabled={isProcessing || !connected}
          >
            <View style={styles.productInfo}>
              <Text style={styles.productTitle}>{product.title}</Text>
              <Text style={styles.productPrice}>{product.displayPrice}</Text>
            </View>
            <Text style={styles.buyButton}>Buy</Text>
          </TouchableOpacity>
        ))}
      </View>

      {purchaseResult ? (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Result:</Text>
          <Text style={styles.resultText}>{purchaseResult}</Text>
        </View>
      ) : null}
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
  infoCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
  statusCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: 16,
    marginTop: 0,
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
  modeSelector: {
    margin: 16,
    marginTop: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  modeButton: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    alignItems: 'center',
  },
  modeButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  urlInput: {
    margin: 16,
    marginTop: 0,
  },
  input: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  button: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  productsSection: {
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    color: '#666',
  },
  buyButton: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
