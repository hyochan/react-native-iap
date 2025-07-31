import React, {useCallback, useEffect, useState} from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  isIosStorekit2,
  PurchaseError,
  requestPurchase as rnIapRequestPurchase,
  requestSubscription as rnIapRequestSubscription,
  SubscriptionAndroid,
  useIAP,
} from 'react-native-iap';

import {Box, Button, Heading, Row, State} from '../components';
import {
  constants,
  contentContainerStyle,
  errorLog,
  isAmazon,
  isIos,
  isPlay,
} from '../utils';

// Unified requestPurchase API wrapper (like expo-iap v2.7.0)
interface UnifiedRequestPurchase {
  request: {
    ios?: {
      sku: string;
      appAccountToken?: string;
      quantity?: number;
    };
    android?: {
      skus: string[];
      subscriptionOffers?: Array<{
        sku: string;
        offerToken: string;
      }>;
      obfuscatedAccountIdAndroid?: string;
      obfuscatedProfileIdAndroid?: string;
      isOfferPersonalized?: boolean;
    };
  };
  type?: 'inapp' | 'subs';
}

// Wrapper to provide expo-iap v2.7.0 style API
const requestPurchase = async (params: UnifiedRequestPurchase) => {
  const {request, type = 'inapp'} = params;

  if (Platform.OS === 'ios' && request.ios) {
    const {sku, appAccountToken, quantity} = request.ios;
    return rnIapRequestPurchase({
      sku,
      appAccountToken,
      quantity,
    });
  } else if (Platform.OS === 'android' && request.android) {
    const {
      skus,
      subscriptionOffers,
      obfuscatedAccountIdAndroid,
      obfuscatedProfileIdAndroid,
      isOfferPersonalized,
    } = request.android;

    if (type === 'subs') {
      if (!subscriptionOffers || subscriptionOffers.length === 0) {
        throw new Error(
          'subscriptionOffers are required for Android subscriptions',
        );
      }
      return rnIapRequestSubscription({
        subscriptionOffers,
        obfuscatedAccountIdAndroid,
        obfuscatedProfileIdAndroid,
        isOfferPersonalized,
      });
    } else {
      return rnIapRequestPurchase({
        skus,
        obfuscatedAccountIdAndroid,
        obfuscatedProfileIdAndroid,
        isOfferPersonalized,
      });
    }
  }

  throw new Error('Invalid platform or request configuration');
};

export const Subscriptions = () => {
  const {
    connected,
    subscriptions,
    getSubscriptions,
    currentPurchase,
    finishTransaction,
  } = useIAP();
  const [ownedSubscriptions, setOwnedSubscriptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [purchasingSubscription, setPurchasingSubscription] = useState<
    string | null
  >(null);

  console.log('Subscriptions rendered');
  console.log('Current state:', {
    connected,
    subscriptionsCount: subscriptions.length,
    isLoading,
  });
  const handleGetSubscriptions = useCallback(async () => {
    console.log('=== handleGetSubscriptions called ===');
    console.log('connected:', connected);
    console.log('subscriptionSkus:', constants.subscriptionSkus);

    if (!connected) {
      console.log('Not connected to store, skipping subscription fetch');
      return;
    }

    try {
      setIsLoading(true);
      console.log(
        'Fetching subscriptions with skus:',
        constants.subscriptionSkus,
      );
      await getSubscriptions({skus: constants.subscriptionSkus});
    } catch (error) {
      console.error('Error getting subscriptions:', error);
      errorLog({message: 'handleGetSubscriptions', error});
    } finally {
      setIsLoading(false);
    }
  }, [connected, getSubscriptions]);

  const handleBuySubscription = async (
    productId: string,
    offerToken?: string,
  ) => {
    console.log('🛒 Starting subscription purchase for:', productId);
    console.log('Platform:', Platform.OS);
    console.log('Offer token:', offerToken);

    setPurchasingSubscription(productId);

    try {
      // Find the subscription to get all available offers
      const subscription = subscriptions.find(
        sub => sub.productId === productId,
      );

      // Use unified API (expo-iap v2.7.0 style)
      await requestPurchase({
        request: {
          ios: {
            sku: productId,
            // Add app account token for better tracking
            appAccountToken: 'user-example-token',
          },
          android: {
            skus: [productId],
            subscriptionOffers: offerToken
              ? [{sku: productId, offerToken}]
              : subscription && 'subscriptionOfferDetails' in subscription
              ? (
                  subscription as SubscriptionAndroid
                ).subscriptionOfferDetails?.map(offer => ({
                  sku: productId,
                  offerToken: offer.offerToken,
                })) || []
              : [],
          },
        },
        type: 'subs',
      });

      console.log('✅ Subscription request completed for:', productId);
    } catch (error) {
      console.log('❌ Subscription purchase failed for:', productId, error);
      if (error instanceof PurchaseError) {
        errorLog({message: `[${error.code}]: ${error.message}`, error});
      } else {
        errorLog({message: 'handleBuySubscription', error});
      }
    } finally {
      setPurchasingSubscription(null);
    }
  };

  // Automatically load subscriptions when connected
  useEffect(() => {
    if (connected && subscriptions.length === 0 && !isLoading) {
      console.log('🔄 Auto-loading subscriptions on connection...');
      handleGetSubscriptions();
    }
  }, [connected, subscriptions.length, isLoading, handleGetSubscriptions]);

  useEffect(() => {
    const checkCurrentPurchase = async () => {
      if (!currentPurchase?.productId) {
        return;
      }

      console.log('📱 Processing subscription purchase:', currentPurchase);

      try {
        console.log('Finishing subscription transaction...');
        await finishTransaction({
          purchase: currentPurchase,
          isConsumable: false, // Subscriptions are NOT consumable
        });
        console.log('✅ Subscription transaction finished successfully');

        setOwnedSubscriptions(prev => [...prev, currentPurchase.productId]);
        Alert.alert(
          'Subscription Successful',
          `You are now subscribed to ${currentPurchase.productId}`,
        );
      } catch (error) {
        console.error('❌ Error finishing subscription transaction:', error);
        if (error instanceof PurchaseError) {
          errorLog({message: `[${error.code}]: ${error.message}`, error});
        } else {
          errorLog({message: 'checkCurrentPurchase', error});
        }
        Alert.alert(
          'Subscription Error',
          'There was an error processing your subscription. Please try again.',
        );
      }
    };

    checkCurrentPurchase();
  }, [currentPurchase, finishTransaction]);

  return (
    <ScrollView contentContainerStyle={contentContainerStyle}>
      <State connected={connected} storekit2={isIosStorekit2()} />

      <Box>
        <View style={styles.container}>
          <Heading copy="Subscriptions" />

          {/* Debug Info */}
          <Text style={{marginBottom: 10, color: 'gray'}}>
            Debug: Connected={connected.toString()}, Subscriptions=
            {subscriptions.length}, Loading={isLoading.toString()}
          </Text>

          {isLoading && (
            <View style={{alignItems: 'center', padding: 20}}>
              <Text>Loading subscriptions...</Text>
            </View>
          )}

          {!isLoading && subscriptions.length === 0 && (
            <View style={{alignItems: 'center', padding: 20}}>
              <Text>
                No subscriptions available. Please click "Get the subscriptions"
                button.
              </Text>
            </View>
          )}

          {!isLoading &&
            subscriptions.map((subscription, index) => {
              const owned = ownedSubscriptions.find(pId => {
                return isAmazon
                  ? pId === constants.amazonBaseSku
                  : pId === subscription.productId;
              });
              return (
                <Row
                  key={subscription.productId}
                  fields={[
                    {
                      label: 'Subscription Id',
                      value: subscription.productId,
                    },
                    {
                      label: 'type',
                      value:
                        'type' in subscription
                          ? subscription.type
                          : subscription.productType,
                    },
                  ]}
                  isLast={subscriptions.length - 1 === index}>
                  {owned && (
                    <Text style={styles.subscribedText}>✓ Subscribed</Text>
                  )}
                  {!owned &&
                    isPlay &&
                    // On Google Play Billing V5 you might have  multiple offers for a single sku
                    'subscriptionOfferDetails' in subscription &&
                    subscription?.subscriptionOfferDetails?.map(
                      (offer, offerIndex) => (
                        <Button
                          key={`${subscription.productId}-offer-${offerIndex}`}
                          title={
                            purchasingSubscription === subscription.productId
                              ? 'Purchasing...'
                              : `Subscribe ${offer.pricingPhases.pricingPhaseList
                                  .map(ppl => ppl.billingPeriod)
                                  .join(',')}`
                          }
                          onPress={() => {
                            handleBuySubscription(
                              subscription.productId,
                              offer.offerToken,
                            );
                          }}
                          disabled={purchasingSubscription !== null}
                        />
                      ),
                    )}
                  {!owned && (isIos || isAmazon) && (
                    <Button
                      title={
                        purchasingSubscription === subscription.productId
                          ? 'Purchasing...'
                          : 'Subscribe'
                      }
                      onPress={() => {
                        handleBuySubscription(subscription.productId);
                      }}
                      disabled={purchasingSubscription !== null}
                    />
                  )}
                </Row>
              );
            })}
        </View>

        <Button
          title="Get the subscriptions"
          onPress={handleGetSubscriptions}
          disabled={isLoading}
        />
      </Box>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  subscribedText: {
    color: 'green',
    fontWeight: 'bold',
  },
});
