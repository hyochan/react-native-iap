#!/usr/bin/env node

// Test script to verify IAP module methods
const {NitroModules} = require('react-native-nitro-modules');

try {
  // Try to create the hybrid object
  const iap = NitroModules.createHybridObject('RnIap');

  console.log('✅ Successfully created RnIap hybrid object');
  console.log('Available methods:');

  // Check which methods are available
  const methods = [
    'initConnection',
    'endConnection',
    'fetchProducts',
    'requestPurchase',
    'getAvailablePurchases',
    'finishTransaction',
  ];

  methods.forEach((method) => {
    if (typeof iap[method] === 'function') {
      console.log(`  ✅ ${method}`);
    } else {
      console.log(`  ❌ ${method} (not found)`);
    }
  });
} catch (error) {
  console.error('❌ Failed to create RnIap hybrid object:', error.message);
}
