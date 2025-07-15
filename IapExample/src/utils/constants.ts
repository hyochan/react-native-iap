import {Platform} from 'react-native';

import {isAmazon} from 'react-native-iap/src/internal';

const productSkus = Platform.select({
  ios: ['dev.hyo.martie.10bulbs', 'dev.hyo.martie.30bulbs'],

  android: [
    'android.test.purchased',
    'android.test.canceled',
    'android.test.refunded',
    'android.test.item_unavailable',
    'dev.hyo.martie.10bulbs',
    'dev.hyo.martie.30bulbs',
  ],

  default: [],
}) as string[];

const subscriptionSkus = Platform.select({
  ios: ['dev.hyo.martie.premium'],
  android: isAmazon
    ? [
        'com.amazon.sample.iap.subscription.mymagazine.month',
        'com.amazon.sample.iap.subscription.mymagazine.quarter',
      ]
    : ['test.sub1', 'dev.hyo.martie.premium'],
  default: ['dev.hyo.martie.premium'],
}) as string[];
const amazonBaseSku = 'com.amazon.sample.iap.subscription.mymagazine';
export const constants = {
  productSkus,
  subscriptionSkus,
  amazonBaseSku,
};
