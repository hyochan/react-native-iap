import React, {useEffect, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {
  isIosStorekit2,
  PurchaseError,
  requestPurchase,
  Sku,
  useIAP,
} from 'react-native-iap';

import {Box, Button, Heading, Row, State} from '../components';
import {
  colors,
  constants,
  contentContainerStyle,
  errorLog,
  theme,
} from '../utils';

export const Products = () => {
  const [success, setSuccess] = useState(false);
  const {
    connected,
    products,
    currentPurchase,
    currentPurchaseError,
    initConnectionError,
    finishTransaction,
    getProducts,
  } = useIAP();

  const handleGetProducts = async () => {
    try {
      await getProducts({skus: constants.productSkus});
    } catch (error) {
      errorLog({message: 'handleGetProducts', error});
    }
  };

  const handleBuyProduct = async (sku: Sku) => {
    try {
      await requestPurchase({sku});
    } catch (error) {
      if (error instanceof PurchaseError) {
        errorLog({message: `[${error.code}]: ${error.message}`, error});
      } else {
        errorLog({message: 'handleBuyProduct', error});
      }
    }
  };

  useEffect(() => {
    const checkCurrentPurchase = async () => {
      try {
        if (
          (isIosStorekit2() && currentPurchase?.transactionId) ||
          currentPurchase?.transactionReceipt
        ) {
          await finishTransaction({
            purchase: currentPurchase,
            isConsumable: true,
          });

          setSuccess(true);
        }
      } catch (error) {
        if (error instanceof PurchaseError) {
          errorLog({message: `[${error.code}]: ${error.message}`, error});
        } else {
          errorLog({message: 'handleBuyProduct', error});
        }
      }
    };

    checkCurrentPurchase();
  }, [currentPurchase, finishTransaction]);

  return (
    <ScrollView contentContainerStyle={contentContainerStyle}>
      <State connected={connected} storekit2={isIosStorekit2()} />

      {initConnectionError && (
        <Box>
          <Text style={styles.errorMessage}>
            An error happened while initiating the connection.
          </Text>
        </Box>
      )}

      {currentPurchaseError && (
        <Box>
          <Text style={styles.errorMessage}>
            code: {currentPurchaseError.code}, message:{' '}
            {currentPurchaseError.message}
          </Text>
        </Box>
      )}

      {success && (
        <Box>
          <Text style={styles.successMessage}>
            A product purchase has been processed successfully.
          </Text>
        </Box>
      )}

      <Box>
        <View style={styles.container}>
          <Heading copy="Products" />

          {products.map((product, index) => (
            <Row
              key={product.productId}
              fields={[
                {
                  label: 'Product Id',
                  value: product.productId,
                },
                {
                  label: 'type',
                  value: product.type,
                },
              ]}
              isLast={products.length - 1 === index}>
              <Button
                title="Buy"
                onPress={() => handleBuyProduct(product.productId)}
              />
            </Row>
          ))}
        </View>

        <Button title="Get the products" onPress={handleGetProducts} />
      </Box>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  errorMessage: {
    ...theme.P1,
    color: colors.red,
  },

  successMessage: {
    ...theme.P1,
    color: colors.green,
  },

  container: {
    marginBottom: 20,
  },
});
