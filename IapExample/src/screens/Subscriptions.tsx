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
  requestSubscription,
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

    if (isPlay && !offerToken) {
      console.warn(
        `There are no subscription Offers for selected product (Only required for Google Play purchases): ${productId}`,
      );
    }

    try {
      if (Platform.OS === 'ios') {
        console.log('iOS: Requesting subscription with sku:', productId);
        await requestSubscription({
          sku: productId,
        });
      } else if (Platform.OS === 'android') {
        if (offerToken) {
          console.log('Android: Requesting subscription with offer token');
          await requestSubscription({
            subscriptionOffers: [{sku: productId, offerToken}],
          });
        } else {
          console.log(
            'Android: Requesting subscription without offer token - this may fail',
          );
          console.warn(
            'Android requires subscriptionOffers with offerToken for subscriptions',
          );
          // Note: This will likely fail on Google Play as subscriptionOffers are required
          // But we'll try anyway for compatibility
          await requestSubscription({
            subscriptionOffers: [{sku: productId, offerToken: ''}],
          });
        }
      }
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
