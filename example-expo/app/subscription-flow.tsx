import { useEffect, useCallback, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { signal, effect } from '@preact/signals-react'
import { requestPurchase, useIAP } from 'react-native-iap'
import type {
  SubscriptionProduct,
  PurchaseError,
  Purchase,
} from 'react-native-iap'

/**
 * Subscription Flow Example - Subscription Products
 *
 * Demonstrates useIAP hook approach for subscriptions:
 * - Uses useIAP hook for subscription management
 * - Handles subscription callbacks with proper types
 * - No manual promise handling required
 * - Clean success/error pattern through hooks
 * - Focused on recurring subscriptions
 *
 * New subscription status checking API:
 * - getActiveSubscriptions() - gets all active subscriptions automatically
 * - getActiveSubscriptions(['id1', 'id2']) - gets specific subscriptions
 * - activeSubscriptions state - automatically updated subscription list
 */

// Signals for state management
const purchaseResultSignal = signal<string>('')
const isProcessingSignal = signal(false)
const isCheckingStatusSignal = signal(false)
const selectedSubscriptionSignal = signal<SubscriptionProduct | null>(null)
const modalVisibleSignal = signal(false)

export default function SubscriptionFlow() {
  // React state synced with signals
  const [purchaseResult, setPurchaseResult] = useState(
    purchaseResultSignal.value
  )
  const [isProcessing, setIsProcessing] = useState(isProcessingSignal.value)
  const [isCheckingStatus, setIsCheckingStatus] = useState(
    isCheckingStatusSignal.value
  )
  const [selectedSubscription, setSelectedSubscription] = useState(
    selectedSubscriptionSignal.value
  )
  const [modalVisible, setModalVisible] = useState(modalVisibleSignal.value)

  // Subscribe to signal changes
  useEffect(() => {
    const unsubscribes = [
      effect(() => setPurchaseResult(purchaseResultSignal.value)),
      effect(() => setIsProcessing(isProcessingSignal.value)),
      effect(() => setIsCheckingStatus(isCheckingStatusSignal.value)),
      effect(() => setSelectedSubscription(selectedSubscriptionSignal.value)),
      effect(() => setModalVisible(modalVisibleSignal.value)),
    ]

    return () => unsubscribes.forEach((fn) => fn())
  }, [])

  // Use the useIAP hook for managing subscriptions with built-in subscription status
  const {
    connected,
    subscriptions,
    availablePurchases,
    fetchProducts,
    getAvailablePurchases,
    finishTransaction,
    getActiveSubscriptions,
    activeSubscriptions,
  } = useIAP({
    onPurchaseSuccess: async (purchase: Purchase) => {
      console.log('Subscription successful:', purchase)
      isProcessingSignal.value = false

      // Check if this is a duplicate subscription (already active)
      const isAlreadySubscribed = activeSubscriptions.some(
        (sub: any) => sub.productId === purchase.productId
      )

      if (isAlreadySubscribed) {
        // This is likely a duplicate transaction or restoration
        purchaseResultSignal.value =
          `ℹ️ Subscription restored/verified (${purchase.platform})\n` +
          `Product: ${purchase.productId}\n` +
          `No additional charge - existing subscription confirmed`

        await finishTransaction({
          purchase,
          isConsumable: false,
        })

        Alert.alert(
          'Subscription Status',
          'Your subscription is already active. No additional charge was made.'
        )
        return
      }

      // Handle new subscription
      purchaseResultSignal.value =
        `✅ Subscription successful (${purchase.platform})\n` +
        `Product: ${purchase.productId}\n` +
        `Transaction ID: ${purchase.transactionId || 'N/A'}\n` +
        `Date: ${new Date(purchase.transactionDate).toLocaleDateString()}\n` +
        `Receipt: ${purchase.transactionReceipt?.substring(0, 50)}...`

      // IMPORTANT: Server-side receipt validation should be performed here
      // Send the receipt to your backend server for validation
      // Example:
      // const isValid = await validateReceiptOnServer(purchase.transactionReceipt);
      // if (!isValid) {
      //   Alert.alert('Error', 'Receipt validation failed');
      //   return;
      // }

      // After successful server validation, finish the transaction
      // For subscriptions, isConsumable should be false (subscriptions are non-consumable)
      await finishTransaction({
        purchase,
        isConsumable: false, // Set to false for subscriptions
      })

      Alert.alert('Success', 'Subscription activated successfully!')

      // Refresh subscription status after successful purchase
      setTimeout(() => {
        checkSubscriptionStatus()
      }, 1000)
    },
    onPurchaseError: (error: PurchaseError) => {
      console.error('Subscription failed:', error)
      isProcessingSignal.value = false

      // Handle subscription error
      purchaseResultSignal.value = `❌ Subscription failed: ${error.message}`
    },
    onSyncError: (error: Error) => {
      console.warn('Sync error:', error)
      Alert.alert(
        'Sync Error',
        `Failed to sync subscriptions: ${error.message}`
      )
    },
  })

  // Check subscription status
  const checkSubscriptionStatus = useCallback(async () => {
    if (!connected || isCheckingStatusSignal.value) return

    isCheckingStatusSignal.value = true
    try {
      // No need to pass subscriptionIds - it will check all active subscriptions
      const subs = await getActiveSubscriptions()
      console.log('Active subscriptions result:', subs)
    } catch (error) {
      console.error('Error checking subscription status:', error)
    } finally {
      isCheckingStatusSignal.value = false
    }
  }, [connected, getActiveSubscriptions])

  // Load subscriptions and check status when component mounts
  useEffect(() => {
    if (connected) {
      const subscriptionIds = [
        'dev.hyo.martie.premium', // Example subscription ID
      ]
      console.log('Connected to store, loading subscription products...')
      // fetchProducts is event-based, not promise-based
      // Results will be available through the useIAP hook's subscriptions state
      fetchProducts({ skus: subscriptionIds, type: 'subs' })
      console.log('Product loading request sent - waiting for results...')

      // Load available purchases to check subscription history
      console.log('Loading available purchases...')
      getAvailablePurchases().catch((error: any) => {
        console.warn('Failed to load available purchases:', error)
      })
    }
  }, [connected, fetchProducts, getAvailablePurchases])

  // Check subscription status separately to avoid infinite loop
  useEffect(() => {
    if (connected) {
      // Use a timeout to avoid rapid consecutive calls
      const timer = setTimeout(() => {
        checkSubscriptionStatus()
      }, 500)

      return () => clearTimeout(timer)
    }
    return undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected])

  // Track activeSubscriptions state changes
  useEffect(() => {
    console.log(
      '[STATE CHANGE] activeSubscriptions:',
      activeSubscriptions.length,
      activeSubscriptions
    )
  }, [activeSubscriptions])

  // Track subscriptions (products) state changes
  useEffect(() => {
    console.log(
      '[STATE CHANGE] subscriptions (products):',
      subscriptions.length,
      subscriptions.map((s: SubscriptionProduct) => ({
        id: s.id,
        title: s.title,
      }))
    )
  }, [subscriptions])

  const handleSubscription = async (itemId: string) => {
    try {
      isProcessingSignal.value = true
      purchaseResultSignal.value = 'Processing subscription...'

      // Find the subscription to get offer details for Android
      const subscription = subscriptions.find((sub: any) => sub.id === itemId)

      // New platform-specific API (v2.7.0+) - no Platform.OS branching needed
      // requestPurchase is event-based - results come through onPurchaseSuccess/onPurchaseError
      await requestPurchase({
        request: {
          ios: {
            sku: itemId,
            appAccountToken: 'user-123',
          },
          android: {
            skus: [itemId],
            subscriptionOffers:
              subscription &&
              'subscriptionOfferDetailsAndroid' in subscription &&
              subscription.subscriptionOfferDetailsAndroid
                ? subscription.subscriptionOfferDetailsAndroid.map(
                    (offer: any) => ({
                      sku: itemId,
                      offerToken: offer.offerToken,
                    })
                  )
                : [],
          },
        },
        type: 'subs',
      })
    } catch (error) {
      isProcessingSignal.value = false
      const errorMessage =
        error instanceof Error ? error.message : 'Subscription failed'
      purchaseResultSignal.value = `❌ Subscription failed: ${errorMessage}`
      Alert.alert('Subscription Failed', errorMessage)
    }
  }

  const retryLoadSubscriptions = () => {
    const subscriptionIds = ['dev.hyo.martie.premium']
    fetchProducts({ skus: subscriptionIds, type: 'subs' })
  }

  const getSubscriptionDisplayPrice = (
    subscription: SubscriptionProduct
  ): string => {
    if (
      'subscriptionOfferDetailsAndroid' in subscription &&
      subscription.subscriptionOfferDetailsAndroid
    ) {
      // Android subscription pricing structure
      const offers = subscription.subscriptionOfferDetailsAndroid
      if (offers && offers.length > 0) {
        const firstOffer = offers[0]
        if (firstOffer && firstOffer.pricingPhases) {
          const pricingPhaseList = firstOffer.pricingPhases.pricingPhaseList
          if (pricingPhaseList && pricingPhaseList.length > 0) {
            const firstPhase = pricingPhaseList[0]
            if (firstPhase) {
              return firstPhase.formattedPrice
            }
          }
        }
      }
      return subscription.displayPrice
    } else {
      // iOS subscription pricing
      return subscription.displayPrice
    }
  }

  const getIntroductoryOffer = (
    subscription: SubscriptionProduct
  ): string | null => {
    if (
      'subscriptionInfoIOS' in subscription &&
      subscription.subscriptionInfoIOS?.introductoryOffer
    ) {
      const offer = subscription.subscriptionInfoIOS.introductoryOffer
      switch (offer?.paymentMode) {
        case 'FREETRIAL':
          return `${offer.periodCount} ${offer.period?.unit?.toLowerCase()}(s) free trial`
        case 'PAYASYOUGO':
          return `${offer.displayPrice} for ${offer.periodCount} ${offer.period?.unit?.toLowerCase()}(s)`
        case 'PAYUPFRONT':
          return `${offer.displayPrice} for first ${offer.periodCount} ${offer.period?.unit?.toLowerCase()}(s)`
        default:
          return null
      }
    }
    return null
  }

  const getSubscriptionPeriod = (subscription: SubscriptionProduct): string => {
    if (
      'subscriptionOfferDetailsAndroid' in subscription &&
      subscription.subscriptionOfferDetailsAndroid
    ) {
      const offers = subscription.subscriptionOfferDetailsAndroid
      if (offers && offers.length > 0) {
        const firstOffer = offers[0]
        if (firstOffer) {
          const pricingPhases = firstOffer.pricingPhases
          if (
            pricingPhases?.pricingPhaseList &&
            pricingPhases.pricingPhaseList.length > 0
          ) {
            const firstPhase = pricingPhases.pricingPhaseList[0]
            if (firstPhase) {
              return firstPhase.billingPeriod || 'Unknown'
            }
          }
        }
      }
      return 'Unknown'
    } else if (
      'subscriptionInfoIOS' in subscription &&
      subscription.subscriptionInfoIOS
    ) {
      return (
        subscription.subscriptionInfoIOS.subscriptionPeriod?.unit || 'Unknown'
      )
    }
    return 'Unknown'
  }

  const handleSubscriptionPress = (subscription: SubscriptionProduct) => {
    selectedSubscriptionSignal.value = subscription
    modalVisibleSignal.value = true
  }

  const renderSubscriptionDetails = () => {
    const subscription = selectedSubscription
    if (!subscription) return null

    const jsonString = JSON.stringify(subscription, null, 2)

    const copyToClipboard = async () => {
      try {
        await Clipboard.setStringAsync(jsonString)
        Alert.alert('Copied', 'Subscription JSON copied to clipboard')
      } catch {
        Alert.alert('Copy Failed', 'Failed to copy to clipboard')
      }
    }

    const logToConsole = () => {
      console.log('=== SUBSCRIPTION DATA ===')
      console.log(subscription)
      console.log('=== SUBSCRIPTION JSON ===')
      console.log(jsonString)
      Alert.alert('Console', 'Subscription data logged to console')
    }

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
    )
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Subscription Flow</Text>
        <Text style={styles.subtitle}>
          TypeScript-first approach for subscriptions
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

      {/* Debug Information */}
      {__DEV__ && (
        <View style={[styles.section, { backgroundColor: '#fff3cd' }]}>
          <Text style={styles.sectionTitle}>Debug Info (Dev Only)</Text>
          <Text style={{ fontSize: 12, fontFamily: 'monospace' }}>
            Connected: {connected.toString()}
            {'\n'}
            Subscriptions: {subscriptions.length}
            {'\n'}
            Active Subscriptions: {activeSubscriptions.length}
            {'\n'}
            Available Purchases: {availablePurchases.length}
            {'\n'}
            Checking Status: {isCheckingStatus.toString()}
            {'\n'}
            {activeSubscriptions.length > 0 &&
              `Active IDs: ${activeSubscriptions.map((s: any) => s.productId).join(', ')}\n`}
            {activeSubscriptions.length > 0 &&
              `Active Status: ${JSON.stringify(activeSubscriptions[0], null, 2)}`}
          </Text>
        </View>
      )}

      {/* Subscription Status Section - Using library's activeSubscriptions */}
      {activeSubscriptions.length > 0 ? (
        <View style={[styles.section, styles.statusSection]}>
          <Text style={styles.sectionTitle}>Current Subscription Status</Text>
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Status:</Text>
              <Text style={[styles.statusValue, styles.activeStatus]}>
                ✅ Active
              </Text>
            </View>

            {activeSubscriptions.map((sub: any, index: number) => (
              <View
                key={sub.productId + index}
                style={styles.subscriptionStatusItem}
              >
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Product:</Text>
                  <Text style={styles.statusValue}>{sub.productId}</Text>
                </View>

                {Platform.OS === 'ios' && sub.expirationDateIOS ? (
                  <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Expires:</Text>
                    <Text style={styles.statusValue}>
                      {sub.expirationDateIOS.toLocaleDateString()}
                    </Text>
                  </View>
                ) : null}

                {Platform.OS === 'android' &&
                sub.autoRenewingAndroid !== undefined ? (
                  <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Auto-Renew:</Text>
                    <Text
                      style={[
                        styles.statusValue,
                        sub.autoRenewingAndroid
                          ? styles.activeStatus
                          : styles.cancelledStatus,
                      ]}
                    >
                      {sub.autoRenewingAndroid ? '✅ Enabled' : '⚠️ Cancelled'}
                    </Text>
                  </View>
                ) : null}

                {sub.environmentIOS ? (
                  <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Environment:</Text>
                    <Text style={styles.statusValue}>{sub.environmentIOS}</Text>
                  </View>
                ) : null}

                {sub.willExpireSoon ? (
                  <Text style={styles.warningText}>
                    ⚠️ Your subscription will expire soon.{' '}
                    {sub.daysUntilExpirationIOS &&
                      `(${sub.daysUntilExpirationIOS} days remaining)`}
                  </Text>
                ) : null}
              </View>
            ))}

            {Platform.OS === 'android' &&
            activeSubscriptions.some((s: any) => !s.autoRenewingAndroid) ? (
              <Text style={styles.warningText}>
                ⚠️ Your subscription will not auto-renew. You&apos;ll lose
                access when the current period ends.
              </Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={checkSubscriptionStatus}
            disabled={isCheckingStatus}
          >
            {isCheckingStatus ? (
              <ActivityIndicator color="#007AFF" />
            ) : (
              <Text style={styles.refreshButtonText}>🔄 Refresh Status</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Available Subscriptions</Text>
          {activeSubscriptions.length === 0 && connected ? (
            <TouchableOpacity onPress={checkSubscriptionStatus}>
              <Text style={styles.checkStatusLink}>Check Status</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {!connected ? (
          <Text style={styles.loadingText}>Connecting to store...</Text>
        ) : subscriptions.length > 0 ? (
          subscriptions.map((subscription: SubscriptionProduct) => (
            <View key={subscription.id} style={styles.subscriptionCard}>
              <View style={styles.subscriptionInfo}>
                <Text style={styles.subscriptionTitle}>
                  {subscription.title}
                </Text>
                <Text style={styles.subscriptionDescription}>
                  {subscription.description}
                </Text>
                <View style={styles.subscriptionDetails}>
                  <Text style={styles.subscriptionPrice}>
                    {getSubscriptionDisplayPrice(subscription)}
                  </Text>
                  <Text style={styles.subscriptionPeriod}>
                    per {getSubscriptionPeriod(subscription)}
                  </Text>
                </View>
                {getIntroductoryOffer(subscription) ? (
                  <View style={styles.offerBadge}>
                    <Text style={styles.offerText}>
                      {getIntroductoryOffer(subscription)}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.subscriptionActions}>
                <TouchableOpacity
                  style={styles.infoButton}
                  onPress={() => handleSubscriptionPress(subscription)}
                >
                  <Text style={styles.infoButtonText}>ℹ️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.subscribeButton,
                    (isProcessing ||
                      activeSubscriptions.some(
                        (sub: any) => sub.productId === subscription.id
                      )) &&
                      styles.disabledButton,
                    activeSubscriptions.some(
                      (sub: any) => sub.productId === subscription.id
                    ) && styles.subscribedButton,
                  ]}
                  onPress={() => handleSubscription(subscription.id)}
                  disabled={
                    isProcessing ||
                    !connected ||
                    activeSubscriptions.some(
                      (sub: any) => sub.productId === subscription.id
                    )
                  }
                >
                  <Text
                    style={[
                      styles.subscribeButtonText,
                      activeSubscriptions.some(
                        (sub: any) => sub.productId === subscription.id
                      ) && styles.subscribedButtonText,
                    ]}
                  >
                    {isProcessing
                      ? 'Processing...'
                      : activeSubscriptions.some(
                            (sub: any) => sub.productId === subscription.id
                          )
                        ? '✅ Subscribed'
                        : 'Subscribe'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.noSubscriptionsCard}>
            <Text style={styles.noSubscriptionsText}>
              No subscriptions found. Make sure to configure your subscription
              IDs in your app store.
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={retryLoadSubscriptions}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Available Purchases Section */}
      {availablePurchases?.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Purchases History</Text>
          <Text style={styles.subtitle}>
            Past purchases and subscription transactions
          </Text>
          {(availablePurchases || []).map(
            (purchase: Purchase, index: number) => (
              <View
                key={`${purchase.productId}-${index}`}
                style={styles.purchaseCard}
              >
                <View style={styles.purchaseInfo}>
                  <Text style={styles.purchaseTitle}>{purchase.productId}</Text>
                  <Text style={styles.purchaseDate}>
                    {new Date(purchase.transactionDate).toLocaleDateString()}
                  </Text>
                  <Text style={styles.purchasePlatform}>
                    Platform: {purchase.platform}
                  </Text>
                  {Platform.OS === 'ios' &&
                  'expirationDateIOS' in purchase &&
                  purchase.expirationDateIOS ? (
                    <Text style={styles.purchaseExpiry}>
                      Expires:{' '}
                      {new Date(
                        purchase.expirationDateIOS
                      ).toLocaleDateString()}
                    </Text>
                  ) : null}
                  {Platform.OS === 'android' &&
                  'autoRenewingAndroid' in purchase ? (
                    <Text style={styles.purchaseRenewal}>
                      Auto-Renewing:{' '}
                      {purchase.autoRenewingAndroid ? 'Yes' : 'No'}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.purchaseStatus}>
                  <Text style={styles.purchaseStatusText}>
                    {purchase.platform === 'ios' &&
                    'expirationDateIOS' in purchase &&
                    purchase.expirationDateIOS
                      ? purchase.expirationDateIOS > Date.now()
                        ? '✅ Active'
                        : '❌ Expired'
                      : '✅ Purchased'}
                  </Text>
                </View>
              </View>
            )
          )}
        </View>
      ) : null}

      {purchaseResult ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Result</Text>
          <TouchableOpacity
            style={styles.resultCard}
            onLongPress={async () => {
              try {
                await Clipboard.setStringAsync(purchaseResult)
                Alert.alert('Copied', 'Result copied to clipboard')
              } catch {
                Alert.alert('Copy Failed', 'Failed to copy to clipboard')
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.resultText}>{purchaseResult}</Text>
            <Text style={styles.hintText}>Long press to copy</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          modalVisibleSignal.value = false
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Subscription Details</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => (modalVisibleSignal.value = false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            {renderSubscriptionDetails()}
          </View>
        </View>
      </Modal>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>🔄 Key Features Demonstrated</Text>
        <Text style={styles.infoText}>
          • Automatic TypeScript type inference{'\n'}• Platform-agnostic
          subscription handling{'\n'}• No manual type casting required{'\n'}•
          Subscription-specific pricing display{'\n'}• Auto-renewal state
          management
          {'\n'}• CPK React Native compliance
        </Text>
      </View>
    </ScrollView>
  )
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
    color: '#333',
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    padding: 20,
  },
  subscriptionCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  subscriptionActions: {
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
  subscriptionInfo: {
    flex: 1,
    marginRight: 15,
  },
  subscriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  subscriptionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  subscriptionDetails: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  subscriptionPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
  },
  subscriptionPeriod: {
    fontSize: 12,
    color: '#666',
  },
  subscribeButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  subscribeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  noSubscriptionsCard: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
  },
  noSubscriptionsText: {
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
    borderLeftColor: '#28a745',
  },
  resultText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 20,
    color: '#333',
  },
  hintText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 10,
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
  offerBadge: {
    backgroundColor: '#e7f3ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  offerText: {
    fontSize: 12,
    color: '#0066cc',
    fontWeight: '600',
  },
  statusSection: {
    backgroundColor: '#e8f4f8',
    borderColor: '#0066cc',
    borderWidth: 1,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  activeStatus: {
    color: '#28a745',
  },
  cancelledStatus: {
    color: '#ffc107',
  },
  warningText: {
    fontSize: 12,
    color: '#ff9800',
    fontStyle: 'italic',
    marginTop: 12,
    lineHeight: 18,
  },
  refreshButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    alignItems: 'center',
    marginTop: 8,
  },
  refreshButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  checkStatusLink: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  subscriptionStatusItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 12,
    marginBottom: 12,
  },
  subscribedButton: {
    backgroundColor: '#6c757d',
  },
  subscribedButtonText: {
    color: '#fff',
  },
  purchaseCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  purchaseInfo: {
    flex: 1,
  },
  purchaseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  purchaseDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  purchasePlatform: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  purchaseExpiry: {
    fontSize: 12,
    color: '#28a745',
    marginBottom: 2,
  },
  purchaseRenewal: {
    fontSize: 12,
    color: '#007AFF',
  },
  purchaseStatus: {
    alignItems: 'center',
  },
  purchaseStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#28a745',
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
})
