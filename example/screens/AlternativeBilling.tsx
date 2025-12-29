import {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import {
  useIAP,
  requestPurchase,
  initConnection,
  endConnection,
  presentExternalPurchaseLinkIOS,
  // Billing Programs API (Android 8.2.0+)
  // Note: enableBillingProgramAndroid must be set in InitConnectionConfig
  // For User Choice Billing, use 'user-choice-billing' in enableBillingProgramAndroid
  isBillingProgramAvailableAndroid,
  createBillingProgramReportingDetailsAndroid,
  launchExternalLinkAndroid,
  // External Payments API (Android 8.3.0+ - Japan only)
  developerProvidedBillingListenerAndroid,
  type Product,
  type Purchase,
  type PurchaseError,
  type BillingProgramAndroid,
  type DeveloperProvidedBillingDetailsAndroid,
} from 'react-native-iap';
import Loading from '../src/components/Loading';
import {CONSUMABLE_PRODUCT_IDS} from '../src/utils/constants';

/**
 * Alternative Billing Example
 *
 * Demonstrates alternative billing flows for iOS and Android:
 *
 * iOS (Alternative Billing):
 * - Redirects users to external website
 * - No onPurchaseUpdated callback when using external URL
 * - User completes purchase on external website
 * - Must implement deep link to return to app
 *
 * Android (Billing Programs API - Recommended for 8.2.0+):
 * - Step 1: Set enableBillingProgramAndroid in InitConnectionConfig
 * - Step 2: Check availability with isBillingProgramAvailableAndroid()
 * - Step 3: Launch external link with launchExternalLinkAndroid()
 * - Step 4: Create reporting token with createBillingProgramReportingDetailsAndroid()
 * - Must report token to Google Play backend within 24 hours
 *
 * Android (User Choice Billing - 7.0+):
 * - Set enableBillingProgramAndroid: 'user-choice-billing' in InitConnectionConfig
 * - Users choose between Google Play and your payment system
 * - If user selects Google Play: onPurchaseUpdated callback
 * - If user selects alternative: userChoiceBillingListener fires
 *
 * Android (External Payments API - 8.3.0+ Japan only):
 * - Set enableBillingProgramAndroid: 'external-payments' in InitConnectionConfig
 * - Call requestPurchase with developerBillingOption
 * - Shows side-by-side choice dialog (Google Play vs Developer billing)
 * - If user selects Google Play: purchaseUpdatedListener fires
 * - If user selects Developer billing: developerProvidedBillingListenerAndroid fires
 * - Must report externalTransactionToken to Google Play within 24 hours
 *
 * ⚠️ DEPRECATED APIs (still supported but not recommended):
 * - alternativeBillingModeAndroid in InitConnectionConfig
 *   → Use enableBillingProgramAndroid instead:
 *   - 'user-choice' → 'user-choice-billing'
 *   - 'alternative-only' → 'external-offer'
 */

// Android Billing Mode types - all unified under BillingProgramAndroid
type AndroidBillingMode = 'billing-programs' | 'external-payments';

function AlternativeBillingScreen() {
  const [externalUrl, setExternalUrl] = useState('https://openiap.dev');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [androidBillingMode, setAndroidBillingMode] =
    useState<AndroidBillingMode>('billing-programs');
  const [billingProgram, setBillingProgram] =
    useState<BillingProgramAndroid>('external-offer');
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [showProgramSelector, setShowProgramSelector] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState<string>('');
  const [externalPaymentsToken, setExternalPaymentsToken] = useState<
    string | null
  >(null);
  const [lastPurchase, setLastPurchase] = useState<Purchase | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Initialize with billing program config (recommended over deprecated alternativeBillingModeAndroid)
  const {connected, products, fetchProducts, finishTransaction} = useIAP({
    // Use enableBillingProgramAndroid instead of deprecated alternativeBillingModeAndroid
    enableBillingProgramAndroid:
      Platform.OS === 'android' ? billingProgram : undefined,
    onPurchaseSuccess: async (purchase: Purchase) => {
      console.log('Purchase successful:', purchase);
      setLastPurchase(purchase);
      setIsProcessing(false);

      const productId = purchase.productId ?? '';
      const isConsumable = CONSUMABLE_PRODUCT_IDS.includes(productId);

      setPurchaseResult(
        `✅ Purchase successful\nProduct: ${productId}\nTransaction ID: ${
          purchase.id
        }\nDate: ${new Date(purchase.transactionDate).toLocaleString()}`,
      );

      try {
        await finishTransaction({
          purchase,
          isConsumable,
        });
        console.log('Transaction finished');
      } catch (error) {
        console.warn('Failed to finish transaction:', error);
      }

      Alert.alert('Success', 'Purchase completed successfully!');
    },
    onPurchaseError: (error: PurchaseError) => {
      console.error('Purchase failed:', error);
      setIsProcessing(false);
      setPurchaseResult(`❌ Purchase failed: ${error.message}`);

      if (error.code !== 'user-cancelled') {
        Alert.alert('Error', error.message);
      }
    },
  });

  // Load products when connected
  useEffect(() => {
    if (connected) {
      fetchProducts({skus: CONSUMABLE_PRODUCT_IDS, type: 'in-app'}).catch(
        (error) => {
          console.error('Failed to load products:', error);
          Alert.alert('Error', 'Failed to load products');
        },
      );
    }
  }, [connected, fetchProducts]);

  // Set up External Payments listener (Android 8.3.0+ - Japan only)
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const subscription = developerProvidedBillingListenerAndroid(
      (details: DeveloperProvidedBillingDetailsAndroid) => {
        console.log(
          '[Android] User selected developer billing (External Payments)',
        );
        console.log(
          '[Android] External transaction token:',
          details.externalTransactionToken,
        );

        setExternalPaymentsToken(details.externalTransactionToken);
        setIsProcessing(false);
        setPurchaseResult(
          `✅ User selected Developer Billing (External Payments)\n\nToken: ${details.externalTransactionToken.substring(0, 30)}...\n\n⚠️ Important:\n1. Process payment through your external system\n2. Report token to Google Play within 24 hours`,
        );

        Alert.alert(
          'Developer Billing Selected',
          'User chose your external payment option.\n\nProcess payment and report token to Google Play.',
        );
      },
    );

    return () => {
      subscription.remove();
    };
  }, []);

  // Reconnect with new billing program
  const reconnectWithBillingProgram = useCallback(
    async (newProgram: BillingProgramAndroid) => {
      try {
        setIsReconnecting(true);
        setPurchaseResult('Reconnecting with new billing program...');

        // End current connection
        await endConnection();

        // Wait a bit for cleanup
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 500);
        });

        // Reinitialize with new billing program (recommended API)
        const config =
          Platform.OS === 'android'
            ? {enableBillingProgramAndroid: newProgram}
            : undefined;
        await initConnection(config);

        setPurchaseResult(`✅ Reconnected with ${newProgram} program`);

        // Reload products
        await fetchProducts({skus: CONSUMABLE_PRODUCT_IDS, type: 'in-app'});
      } catch (error: any) {
        console.error('Reconnection error:', error);
        setPurchaseResult(`❌ Reconnection failed: ${error.message}`);
      } finally {
        setIsReconnecting(false);
      }
    },
    [fetchProducts],
  );

  // Handle iOS alternative billing purchase (external URL)
  const handleIosAlternativeBillingPurchase = useCallback(
    async (product: Product) => {
      console.log('[iOS] Starting alternative billing purchase:', product.id);
      console.log('[iOS] External URL:', externalUrl);
      console.log('[iOS] Platform.Version:', Platform.Version);

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
            `✅ External purchase link opened successfully\n\nProduct: ${product.id}\nURL: ${externalUrl}\n\nUser was redirected to external website.\n\nNote: Complete purchase on your website and implement server-side validation.`,
          );
          Alert.alert(
            'Redirected',
            'User was redirected to your external purchase website. Complete the purchase there.',
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

  // Handle Android Billing Programs API (Recommended for 8.2.0+)
  const handleAndroidBillingPrograms = useCallback(async () => {
    console.log('[Android] Starting Billing Programs flow');
    console.log('[Android] Billing Program:', billingProgram);

    setIsProcessing(true);
    setPurchaseResult('Checking billing program availability...');

    try {
      // Step 1: Check availability
      const result = await isBillingProgramAvailableAndroid(billingProgram);
      console.log('[Android] Billing program available:', result.isAvailable);

      if (!result.isAvailable) {
        setPurchaseResult(
          `❌ Billing program "${billingProgram}" not available for this user`,
        );
        Alert.alert(
          'Not Available',
          `The billing program "${billingProgram}" is not available for this user/device`,
        );
        setIsProcessing(false);
        return;
      }

      setPurchaseResult('Launching external link...');

      // Step 2: Launch external link
      const success = await launchExternalLinkAndroid({
        billingProgram,
        launchMode: 'launch-in-external-browser-or-app',
        linkType: 'link-to-digital-content-offer',
        linkUri: externalUrl,
      });
      console.log('[Android] External link launched:', success);

      if (success) {
        setPurchaseResult('Creating reporting token...');

        // Step 3: Create reporting token (after user completes external purchase)
        const details =
          await createBillingProgramReportingDetailsAndroid(billingProgram);
        console.log(
          '[Android] Reporting token created:',
          details.externalTransactionToken.substring(0, 20) + '...',
        );

        setPurchaseResult(
          `✅ Billing Programs API completed\n\nProgram: ${billingProgram}\nURL: ${externalUrl}\nToken: ${details.externalTransactionToken.substring(0, 30)}...\n\n⚠️ Important:\n1. User completes purchase externally\n2. Report token to Google Play within 24h`,
        );

        Alert.alert(
          'Success',
          'External link launched. Complete purchase on external site.\n\nToken created for Google Play reporting.',
        );
      } else {
        setPurchaseResult('❌ Failed to launch external link');
        Alert.alert('Error', 'Failed to launch external link');
      }
    } catch (error: any) {
      console.error('[Android] Billing Programs error:', error);
      setPurchaseResult(`❌ Error: ${error.message}`);
      Alert.alert('Error', error.message);
    } finally {
      setIsProcessing(false);
    }
  }, [billingProgram, externalUrl]);

  // Handle Android External Payments (8.3.0+ - Japan only)
  const handleAndroidExternalPayments = useCallback(
    async (product: Product) => {
      console.log('[Android] Starting External Payments flow:', product.id);
      console.log('[Android] External URL:', externalUrl);

      setIsProcessing(true);
      setPurchaseResult('Starting External Payments purchase...');

      try {
        // Request purchase with developerBillingOption
        // This shows a side-by-side choice dialog in Japan
        await requestPurchase({
          request: {
            android: {
              skus: [product.id],
              developerBillingOption: {
                billingProgram: 'external-payments',
                linkUri: externalUrl,
                launchMode: 'launch-in-external-browser-or-app',
              },
            },
          },
          type: 'in-app',
        });

        // If user selects Google Play, the purchase listener will handle it
        // If user selects developer billing, the developerProvidedBillingListenerAndroid will fire
        setPurchaseResult(
          `🔄 External Payments dialog shown\n\nProduct: ${product.id}\n\nWaiting for user choice:\n- Google Play → purchaseUpdatedListener\n- Developer billing → developerProvidedBillingListener`,
        );
      } catch (error: any) {
        console.error('[Android] External Payments error:', error);
        setIsProcessing(false);

        if (error.code !== 'user-cancelled') {
          setPurchaseResult(`❌ Error: ${error.message}`);
          Alert.alert('Error', error.message);
        } else {
          setPurchaseResult('ℹ️ User cancelled');
        }
      }
    },
    [externalUrl],
  );

  // Handle purchase based on platform and mode
  const handlePurchase = useCallback(
    (product: Product) => {
      if (Platform.OS === 'ios') {
        handleIosAlternativeBillingPurchase(product);
      } else if (Platform.OS === 'android') {
        if (androidBillingMode === 'billing-programs') {
          void handleAndroidBillingPrograms();
        } else if (androidBillingMode === 'external-payments') {
          void handleAndroidExternalPayments(product);
        }
      }
    },
    [
      androidBillingMode,
      handleIosAlternativeBillingPurchase,
      handleAndroidBillingPrograms,
      handleAndroidExternalPayments,
    ],
  );

  if (!connected) {
    return <Loading message="Connecting to Store..." />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Alternative Billing</Text>
        <Text style={styles.subtitle}>
          {Platform.OS === 'ios'
            ? 'External purchase links (iOS 16.0+)'
            : 'Google Play alternative billing'}
        </Text>
      </View>

      <View style={styles.content}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>ℹ️ How It Works</Text>
          {Platform.OS === 'ios' ? (
            <>
              <Text style={styles.infoText}>
                • Enter your external purchase URL{'\n'}• Tap Purchase on any
                product{'\n'}• User will be redirected to the external URL{'\n'}
                • Complete purchase on your website{'\n'}• No onPurchaseUpdated
                callback{'\n'}• Implement deep link to return to app
              </Text>
              <Text style={styles.warningText}>
                ⚠️ iOS 16.0+ required{'\n'}
                ⚠️ Valid external URL needed{'\n'}
                ⚠️ useAlternativeBilling: true is set
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.infoText}>
                {androidBillingMode === 'billing-programs'
                  ? billingProgram === 'user-choice-billing'
                    ? '• User Choice Billing (7.0+)\n• Users choose between Google Play & your payment\n• If Google Play: purchaseUpdatedListener\n• If alternative: userChoiceBillingListener\n• Must report token within 24h'
                    : '• Billing Programs API (8.2.0+)\n• Recommended for new implementations\n• Uses external-offer, external-content-link, or user-choice-billing\n• Cleaner API with launchExternalLink\n• Must report token within 24h'
                  : '• External Payments (8.3.0+ - Japan only)\n• Side-by-side choice in purchase dialog\n• User sees Google Play & your option together\n• If Google Play: purchaseUpdatedListener\n• If Developer billing: developerProvidedBillingListener\n• Must report token within 24h'}
              </Text>
              <Text style={styles.warningText}>
                ⚠️ Requires approval from Google{'\n'}
                ⚠️ Must report tokens within 24 hours{'\n'}
                ⚠️ Backend integration required
              </Text>
            </>
          )}
        </View>

        {/* Mode Selector (Android only) */}
        {Platform.OS === 'android' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Android Billing Mode</Text>
            <TouchableOpacity
              style={styles.modeSelector}
              onPress={() => setShowModeSelector(true)}
            >
              <Text style={styles.modeSelectorText}>
                {androidBillingMode === 'billing-programs'
                  ? '🆕 Billing Programs API (8.2.0+)'
                  : '🇯🇵 External Payments (8.3.0+ Japan)'}
              </Text>
              <Text style={styles.modeSelectorArrow}>▼</Text>
            </TouchableOpacity>

            {/* Billing Program Selector (only for billing-programs mode) */}
            {androidBillingMode === 'billing-programs' && (
              <View style={styles.programSelector}>
                <Text style={styles.programLabel}>Program Type:</Text>
                <TouchableOpacity
                  style={styles.modeSelector}
                  onPress={() => setShowProgramSelector(true)}
                >
                  <Text style={styles.modeSelectorText}>
                    {billingProgram === 'external-offer'
                      ? 'External Offer (8.2.0+)'
                      : billingProgram === 'external-content-link'
                        ? 'External Content Link (8.2.0+)'
                        : billingProgram === 'user-choice-billing'
                          ? 'User Choice Billing (7.0+)'
                          : billingProgram}
                  </Text>
                  <Text style={styles.modeSelectorArrow}>▼</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : null}

        {/* External URL Input (Android Billing Programs except user-choice, External Payments, or iOS) */}
        {Platform.OS === 'ios' ||
        (Platform.OS === 'android' &&
          ((androidBillingMode === 'billing-programs' &&
            billingProgram !== 'user-choice-billing') ||
            androidBillingMode === 'external-payments')) ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>External Purchase URL</Text>
            <TextInput
              style={styles.urlInput}
              value={externalUrl}
              onChangeText={setExternalUrl}
              placeholder="https://your-payment-site.com/checkout"
              autoCapitalize="none"
              keyboardType="url"
            />
            <Text style={styles.urlHint}>
              This URL will be opened when a user taps Purchase
            </Text>
          </View>
        ) : null}

        {/* Reconnecting Status */}
        {isReconnecting ? (
          <View style={styles.warningBanner}>
            <Text style={styles.warningBannerText}>
              🔄 Reconnecting with new billing mode...
            </Text>
          </View>
        ) : null}

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
          {Platform.OS === 'android' ? (
            <Text style={styles.statusSubtext}>
              Current mode:{' '}
              {androidBillingMode === 'billing-programs'
                ? `BILLING_PROGRAMS (${billingProgram})`
                : 'EXTERNAL_PAYMENTS (8.3.0+ Japan)'}
            </Text>
          ) : null}
        </View>

        {/* Products */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Product</Text>
          {products.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Loading products...</Text>
            </View>
          ) : (
            products.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={[
                  styles.productCard,
                  selectedProduct?.id === product.id &&
                    styles.productCardSelected,
                ]}
                onPress={() => setSelectedProduct(product)}
              >
                <View style={styles.productHeader}>
                  <Text style={styles.productTitle}>{product.title}</Text>
                  <Text style={styles.productPrice}>
                    {product.displayPrice}
                  </Text>
                </View>
                <Text style={styles.productDescription}>
                  {product.description}
                </Text>
                {selectedProduct?.id === product.id ? (
                  <View style={styles.selectedBadge}>
                    <Text style={styles.selectedBadgeText}>✓ Selected</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Product Details & Action */}
        {selectedProduct ? (
          <View style={styles.section}>
            <View style={styles.detailsCard}>
              <Text style={styles.detailsTitle}>Product Details</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>ID:</Text>
                <Text style={styles.detailValue}>{selectedProduct.id}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Title:</Text>
                <Text style={styles.detailValue}>{selectedProduct.title}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Price:</Text>
                <Text style={styles.detailValue}>
                  {selectedProduct.displayPrice}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Type:</Text>
                <Text style={styles.detailValue}>{selectedProduct.type}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.purchaseButton, isProcessing && {opacity: 0.5}]}
              onPress={() => handlePurchase(selectedProduct)}
              disabled={isProcessing || !connected}
            >
              <Text style={styles.purchaseButtonText}>
                {isProcessing
                  ? 'Processing...'
                  : Platform.OS === 'ios'
                    ? '🛒 Buy (External URL)'
                    : billingProgram === 'external-offer'
                      ? '🛒 Buy (External Offer)'
                      : billingProgram === 'user-choice-billing'
                        ? '🛒 Buy (User Choice)'
                        : `🛒 Buy (${billingProgram})`}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Purchase Result */}
        {purchaseResult ? (
          <View style={styles.resultContainer}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>Purchase Result</Text>
              <TouchableOpacity
                onPress={() => {
                  setPurchaseResult('');
                  setLastPurchase(null);
                }}
              >
                <Text style={styles.dismissButton}>Dismiss</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.resultText}>{purchaseResult}</Text>
          </View>
        ) : null}

        {/* External Payments Token (Android 8.3.0+) */}
        {externalPaymentsToken && Platform.OS === 'android' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              External Payments Token (Japan)
            </Text>
            <View style={styles.purchaseCard}>
              <Text style={styles.purchaseText}>
                Token: {externalPaymentsToken.substring(0, 40)}...
              </Text>
              <Text style={styles.purchaseWarning}>
                ⚠️ Report this token to Google Play within 24 hours{'\n'}
                ℹ️ Process external payment through your system
              </Text>
              <TouchableOpacity
                style={[styles.purchaseButton, {marginTop: 10}]}
                onPress={() => setExternalPaymentsToken(null)}
              >
                <Text style={styles.purchaseButtonText}>Clear Token</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Last Purchase */}
        {lastPurchase ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Last Purchase</Text>
            <View style={styles.purchaseCard}>
              <Text style={styles.purchaseText}>
                Product: {lastPurchase.productId}
              </Text>
              <Text style={styles.purchaseText}>
                Transaction: {lastPurchase.id}
              </Text>
              <Text style={styles.purchaseText}>
                Date: {new Date(lastPurchase.transactionDate).toLocaleString()}
              </Text>
              <Text style={styles.purchaseWarning}>
                ℹ️ Transaction auto-finished for testing.{'\n'}
                PRODUCTION: Validate on backend first!
              </Text>
            </View>
          </View>
        ) : null}

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>Testing Instructions:</Text>
          <Text style={styles.instructionsText}>
            1. Select a product from the list{'\n'}
            2. Tap the purchase button{'\n'}
            3. Follow the platform-specific flow{'\n'}
            4. Check the purchase result{'\n'}
            5. Verify token/URL behavior
          </Text>
        </View>
      </View>

      {/* Mode Selector Modal (Android) */}
      <Modal
        visible={showModeSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModeSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>Select Android Billing Mode</Text>

              {/* Billing Programs API (Recommended) */}
              <TouchableOpacity
                style={[
                  styles.modeOption,
                  androidBillingMode === 'billing-programs' &&
                    styles.modeOptionSelected,
                ]}
                onPress={() => {
                  setAndroidBillingMode('billing-programs');
                  // Keep current billing program if already set to a billing-programs option
                  if (billingProgram === 'external-payments') {
                    setBillingProgram('external-offer');
                    void reconnectWithBillingProgram('external-offer');
                  }
                  setShowModeSelector(false);
                }}
              >
                <Text style={styles.modeOptionTitle}>
                  🆕 Billing Programs API (7.0+/8.2.0+)
                </Text>
                <Text style={styles.modeOptionDescription}>
                  Recommended. Includes external-offer, external-content-link,
                  and user-choice-billing programs.
                </Text>
              </TouchableOpacity>

              {/* External Payments API (8.3.0+ Japan only) */}
              <TouchableOpacity
                style={[
                  styles.modeOption,
                  androidBillingMode === 'external-payments' &&
                    styles.modeOptionSelected,
                ]}
                onPress={() => {
                  setAndroidBillingMode('external-payments');
                  setBillingProgram('external-payments');
                  void reconnectWithBillingProgram('external-payments');
                  setShowModeSelector(false);
                }}
              >
                <Text style={styles.modeOptionTitle}>
                  🇯🇵 External Payments (8.3.0+ Japan)
                </Text>
                <Text style={styles.modeOptionDescription}>
                  Side-by-side choice in purchase dialog. User sees both Google
                  Play and developer billing options together.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowModeSelector(false)}
              >
                <Text style={styles.modalCloseButtonText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Program Selector Modal (Android) */}
      <Modal
        visible={showProgramSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProgramSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>Select Billing Program</Text>

              {/* External Offer */}
              <TouchableOpacity
                style={[
                  styles.modeOption,
                  billingProgram === 'external-offer' &&
                    styles.modeOptionSelected,
                ]}
                onPress={() => {
                  setBillingProgram('external-offer');
                  void reconnectWithBillingProgram('external-offer');
                  setShowProgramSelector(false);
                }}
              >
                <Text style={styles.modeOptionTitle}>
                  External Offer (8.2.0+)
                </Text>
                <Text style={styles.modeOptionDescription}>
                  Redirect users to your external payment site. Best for apps
                  with existing payment infrastructure.
                </Text>
              </TouchableOpacity>

              {/* External Content Link */}
              <TouchableOpacity
                style={[
                  styles.modeOption,
                  billingProgram === 'external-content-link' &&
                    styles.modeOptionSelected,
                ]}
                onPress={() => {
                  setBillingProgram('external-content-link');
                  void reconnectWithBillingProgram('external-content-link');
                  setShowProgramSelector(false);
                }}
              >
                <Text style={styles.modeOptionTitle}>
                  External Content Link (8.2.0+)
                </Text>
                <Text style={styles.modeOptionDescription}>
                  Link to external content offers. Suitable for content-based
                  subscriptions.
                </Text>
              </TouchableOpacity>

              {/* User Choice Billing */}
              <TouchableOpacity
                style={[
                  styles.modeOption,
                  billingProgram === 'user-choice-billing' &&
                    styles.modeOptionSelected,
                ]}
                onPress={() => {
                  setBillingProgram('user-choice-billing');
                  void reconnectWithBillingProgram('user-choice-billing');
                  setShowProgramSelector(false);
                }}
              >
                <Text style={styles.modeOptionTitle}>
                  User Choice Billing (7.0+)
                </Text>
                <Text style={styles.modeOptionDescription}>
                  Let users choose between Google Play and your payment system.
                  Shows a selection dialog.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowProgramSelector(false)}
              >
                <Text style={styles.modalCloseButtonText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

export default AlternativeBillingScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#FF9800',
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
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    padding: 15,
  },
  infoCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#E65100',
  },
  infoText: {
    fontSize: 13,
    color: '#5D4037',
    marginBottom: 8,
    lineHeight: 20,
  },
  warningText: {
    fontSize: 12,
    color: '#D84315',
    lineHeight: 18,
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  modeSelectorText: {
    fontSize: 14,
    color: '#333',
  },
  modeSelectorArrow: {
    fontSize: 12,
    color: '#999',
  },
  urlInput: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 14,
  },
  urlHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  warningBanner: {
    backgroundColor: '#FFF3CD',
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  warningBannerText: {
    fontSize: 14,
    color: '#856404',
    fontWeight: '600',
  },
  statusContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  productCardSelected: {
    borderColor: '#FF9800',
    backgroundColor: '#FFF3E0',
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
    color: '#FF9800',
  },
  productDescription: {
    fontSize: 14,
    color: '#666',
  },
  selectedBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#FF9800',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  selectedBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  detailsCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  purchaseButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  purchaseButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  resultContainer: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  dismissButton: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '600',
  },
  resultText: {
    fontSize: 13,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    lineHeight: 18,
  },
  purchaseCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
  },
  purchaseText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  purchaseWarning: {
    fontSize: 12,
    color: '#FF9800',
    marginTop: 10,
    lineHeight: 18,
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
  },
  instructions: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 15,
    marginTop: 10,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    color: '#1565C0',
  },
  instructionsText: {
    fontSize: 12,
    color: '#333',
    lineHeight: 18,
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
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  modeOption: {
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    marginBottom: 10,
  },
  modeOptionSelected: {
    borderColor: '#FF9800',
    backgroundColor: '#FFF3E0',
  },
  modeOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  modeOptionDescription: {
    fontSize: 13,
    color: '#666',
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    marginTop: 10,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalCloseButton: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  modalCloseButtonText: {
    fontSize: 16,
    color: '#666',
  },
  programSelector: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  programLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  programOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  programOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
    alignItems: 'center',
  },
  programOptionSelected: {
    borderColor: '#FF9800',
    backgroundColor: '#FFF3E0',
  },
  programOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
});
