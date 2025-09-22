// Product ID constants used across the example apps and tests

export const CONSUMABLE_PRODUCT_IDS: string[] = [
  'dev.hyo.martie.10bulbs',
  'dev.hyo.martie.30bulbs',
];

export const NON_CONSUMABLE_PRODUCT_IDS: string[] = [
  'dev.hyo.martie.certified',
];

export const PRODUCT_IDS: string[] = [
  ...CONSUMABLE_PRODUCT_IDS,
  ...NON_CONSUMABLE_PRODUCT_IDS,
];

export const SUBSCRIPTION_PRODUCT_IDS: string[] = ['dev.hyo.martie.premium'];
export const DEFAULT_SUBSCRIPTION_PRODUCT_ID = SUBSCRIPTION_PRODUCT_IDS[0];
