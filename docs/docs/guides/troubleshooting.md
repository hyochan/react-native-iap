---
title: Troubleshooting
sidebar_label: Troubleshooting
sidebar_position: 5
---

import IapKitBanner from "@site/src/uis/IapKitBanner";

# Troubleshooting

<IapKitBanner />

This guide covers common issues you might encounter when implementing in-app purchases with react-native-iap and how to resolve them.

## Prerequisites Checklist

Before diving into troubleshooting, ensure you have completed these essential steps:

### App Store Setup (iOS)

- [ ] **Agreements**: Completed all agreements, tax, and banking information in App Store Connect
- [ ] **Sandbox Account**: Created sandbox testing accounts in "Users and Roles"
- [ ] **Device Setup**: Signed into iOS device with sandbox account in "Settings > iTunes & App Stores"
- [ ] **Products Created**: Set up In-App Purchase products with status "Ready to Submit"

### Google Play Setup (Android)

- [ ] **Play Console**: Completed all required information in Google Play Console
- [ ] **Test Accounts**: Added test accounts to your app's testing track
- [ ] **Signed Build**: Using signed APK/AAB (not debug builds)
- [ ] **Upload**: Uploaded at least one version to internal testing

## Common Issues

### `fetchProducts()` returns an empty array

This is one of the most common issues. Here are the potential causes and solutions:

#### 1. Connection not established

```tsx
const {connected, fetchProducts} = useIAP();

useEffect(() => {
  if (connected) {
    // ✅ Only call fetchProducts when connected
    fetchProducts({skus: productIds, type: 'in-app'});
  } else {
    console.log('Not connected to store yet');
  }
}, [connected]);
```

#### 2. Product IDs don't match

Ensure your product IDs exactly match those configured in the stores:

```tsx
// ❌ Wrong: Using different IDs
const productIds = ['my_product_1', 'my_product_2'];

// ✅ Correct: Using exact IDs from store
const productIds = ['com.yourapp.product1', 'com.yourapp.premium'];
```

#### 3. Products not approved (iOS)

Products need time to propagate through Apple's systems:

- Wait up to 24 hours after creating products
- Ensure products are in "Ready to Submit" status
- Test with sandbox accounts

#### 4. App not uploaded to Play Console (Android)

For Android, your app must be uploaded to Play Console:

```bash
# Create signed build
./gradlew assembleRelease

# Upload to Play Console internal testing track
```

### `useIAP` hook not working

#### 1. Hook initialization

The `useIAP` hook is a standalone hook that manages its own state and doesn't require a provider:

```tsx
// ✅ Correct: Direct usage without provider
import {useIAP} from 'react-native-iap';

function App() {
  const {connected, products, fetchProducts} = useIAP();

  useEffect(() => {
    if (connected) {
      // Connection established, you can now fetch products
      fetchProducts({skus: ['product1', 'product2']});
    }
  }, [connected]);

  return <MyApp />;
}
```

#### 2. Connection not established

The hook automatically initializes the connection when mounted. Check the `connected` state before making IAP calls:

```tsx
const {connected, products, fetchProducts} = useIAP();

// ❌ Wrong: Calling methods before connection
useEffect(() => {
  fetchProducts({skus: ['product1']}); // May fail if not connected
}, []);

// ✅ Correct: Wait for connection
useEffect(() => {
  if (connected) {
    fetchProducts({skus: ['product1']});
  }
}, [connected]);
```

### Purchase flow issues

#### 1. Purchases not completing

Always handle purchase updates and finish transactions:

```tsx
const {finishTransaction} = useIAP({
  onPurchaseSuccess: async (purchase) => {
    try {
      // Validate receipt
      const isValid = await validateOnServer(purchase);

      if (isValid) {
        // Grant purchase to user
        await grantPurchase(purchase);

        // ✅ Always finish the transaction
        await finishTransaction({
          purchase,
          isConsumable: false, // default is false
        });
      }
    } catch (error) {
      console.error('Purchase handling failed:', error);
    }
  },
  onPurchaseError: (error) => {
    console.error('Purchase error:', error);
  },
});
```

**Important - Transaction Acknowledgment Requirements**:

- **iOS**: Unfinished transactions remain in the queue indefinitely until `finishTransaction` is called
  - **Note**: Transactions do NOT auto-finish by default. You must explicitly call `finishTransaction` after validating the purchase. Only set `andDangerouslyFinishTransactionAutomatically: true` if you understand the security implications (skipping server-side validation).
- **Android**: Purchases must be acknowledged within **3 days (72 hours)** or they will be **automatically refunded**
  - For consumable products: Use `finishTransaction({purchase, isConsumable: true})`
  - For non-consumables/subscriptions: Use `finishTransaction({purchase})` or `finishTransaction({purchase, isConsumable: false})`

#### 2. `onPurchaseSuccess` triggering automatically on app restart (iOS)

This happens when transactions are not properly finished. iOS stores unfinished transactions and replays them on app startup:

**Problem**: Your `onPurchaseSuccess` callback fires automatically every time the app starts with a previous purchase.

**Cause**: You didn't call `finishTransaction` after processing the purchase, so iOS keeps the transaction in an "unfinished" state.

**Solution**: Always call `finishTransaction` after successfully processing a purchase:

```tsx
const {finishTransaction} = useIAP({
  onPurchaseSuccess: async (purchase) => {
    console.log('Purchase successful:', purchase);

    try {
      // 1. Validate the receipt (IMPORTANT: Server-side validation required for both platforms)
      if (Platform.OS === 'ios') {
        // WARNING: validateReceipt() from useIAP is for development only!
        // For production, ALWAYS validate on your secure server

        // Option 1 (Development only - NOT SECURE):
        // const { validateReceipt } = useIAP();
        // const receiptData = await validateReceipt(purchase.id);

        // Option 2 (RECOMMENDED - Secure):
        const isValid = await validateReceiptOnServer({
          transactionId: purchase.transactionId,
          productId: purchase.productId,
        });
        if (!isValid) {
          console.error('Invalid receipt');
          return;
        }
      } else if (Platform.OS === 'android') {
        // Android also requires server-side validation
        const purchaseToken = purchase.purchaseTokenAndroid;
        const packageName = purchase.packageNameAndroid;

        // Get Google Play access token on your server (not in client)
        // Then validate the purchase with Google Play API
        const isValid = await validateAndroidPurchaseOnServer({
          purchaseToken,
          packageName,
          productId: purchase.productId,
        });

        if (!isValid) {
          console.error('Invalid Android purchase');
          return;
        }
      }

      // 2. Process the purchase (unlock content, update backend, etc.)
      await processSubscription(purchase);

      // 3. IMPORTANT: Finish the transaction to prevent replay
      await finishTransaction({
        purchase,
        // isConsumable defaults to false, which is correct for subscriptions and non-consumables
      });
    } catch (error) {
      console.error('Purchase processing failed:', error);
    }
  },
});
```

**Prevention**: Handle pending transactions on app startup:

```tsx
const {getAvailablePurchases, availablePurchases, finishTransaction} = useIAP();

// Fetch available purchases on mount
useEffect(() => {
  getAvailablePurchases();
}, []);

// Process purchases when availablePurchases state updates
useEffect(() => {
  const processPendingPurchases = async () => {
    for (const purchase of availablePurchases) {
      // If already processed, just finish the transaction
      if (await isAlreadyProcessed(purchase)) {
        await finishTransaction({purchase}); // isConsumable: false by default
      } else {
        // Process the purchase first, then finish
        await processPurchase(purchase);
        await finishTransaction({purchase});
      }
    }
  };

  if (availablePurchases.length > 0) {
    processPendingPurchases();
  }
}, [availablePurchases]);
```

**Important Notes**:

- This issue primarily affects iOS because of how StoreKit handles transactions
- Android requires acknowledgment within 3 days to prevent automatic refunds
- The `isConsumable` parameter defaults to `false`, which is appropriate for subscriptions and non-consumable products
- Never set `andDangerouslyFinishTransactionAutomatically: true` unless you understand the implications
- Always implement proper transaction finishing in your purchase flow

#### 2. Testing on simulators/emulators

In-app purchases only work on real devices:

```tsx
import {Platform} from 'react-native';
import {isEmulator} from 'react-native-device-info';

const checkDeviceSupport = async () => {
  if (__DEV__) {
    const emulator = await isEmulator();
    if (emulator) {
      console.warn('In-app purchases not supported on simulators/emulators');
      return false;
    }
  }
  return true;
};
```

### Connection issues

#### 1. Network connectivity

Handle connection state gracefully:

```tsx
const {connected, initConnection} = useIAP({
  onPurchaseError: (error) => {
    // Connection errors are also reported here
    console.error('Error:', error.message);
  },
});

if (!connected) {
  return (
    <View>
      <Text>Store connection failed</Text>
      <Button
        title="Retry"
        onPress={() => {
          // Retry connection
          initConnection();
        }}
      />
    </View>
  );
}
```

#### 2. Store service unavailable

Sometimes store services are temporarily unavailable:

```tsx
const handleStoreUnavailable = () => {
  // Show user-friendly message
  Alert.alert(
    'Store Unavailable',
    'The App Store is temporarily unavailable. Please try again later.',
    [{text: 'OK'}],
  );
};
```

### Platform-specific issues

#### iOS Issues

1. **Invalid product ID error**:

   ```tsx
   // Ensure you're signed in with sandbox account
   // Check product IDs match exactly
   // Verify app bundle ID matches
   ```

2. **StoreKit configuration**:

   ```tsx
   // Add StoreKit capability in Xcode
   // For iOS 12.x, add SwiftUI.framework as optional
   ```

3. **Xcode version issues**:

   If you're experiencing issues like duplicate purchase events or other unexpected behavior:
   - **Solution**: Upgrade to Xcode 16.4 or later
   - **Known issues resolved**: [#114](https://github.com/hyochan/react-native-iap/issues/114), [react-native-iap #2970](https://github.com/hyochan/react-native-iap/issues/2970)
   - **Symptoms of old Xcode versions**:
     - Duplicate purchase notifications
     - StoreKit transaction handling errors
     - Unexpected purchase flow behavior

#### Android Issues

1. **Billing client setup**:

   ```gradle
   // android/app/build.gradle
   dependencies {
     implementation 'com.android.billingclient:billing:5.0.0'
   }
   ```

2. **Missing permissions**:
   ```xml
   <!-- android/app/src/main/AndroidManifest.xml -->
   <uses-permission android:name="com.android.vending.BILLING" />
   ```

## Debugging Tips

### 1. Enable verbose logging

```tsx
import {setDebugMode} from 'react-native-iap';

// Enable debug mode in development
if (__DEV__) {
  setDebugMode(true);
}
```

### 2. Log purchase events

```tsx
const {
  /* other props */
} = useIAP({
  onPurchaseSuccess: async (purchase) => {
    console.log('Purchase received:', JSON.stringify(purchase, null, 2));
    // Handle purchase...
  },
  onPurchaseError: (error) => {
    console.error('Purchase error:', JSON.stringify(error, null, 2));
  },
});
```

### 3. Monitor connection state

```tsx
const {connected} = useIAP({
  onPurchaseError: (error) => {
    console.error('Error occurred:', error);
  },
});

useEffect(() => {
  console.log('Connection state changed:', {connected});
}, [connected]);
```

## Testing Strategies

### 1. Staged testing approach

1. **Unit tests**: Test your purchase logic without actual store calls
2. **Sandbox testing**: Use store sandbox/test accounts
3. **Internal testing**: Test with real store in closed testing
4. **Production testing**: Final verification in live environment

### 2. Test different scenarios

```tsx
const testScenarios = [
  'successful_purchase',
  'user_cancelled',
  'network_error',
  'insufficient_funds',
  'product_unavailable',
  'pending_purchase',
];

// Test each scenario with appropriate mocks
```

### 3. Device testing matrix

Test on various devices and OS versions:

- iOS: Different iPhone/iPad models, iOS versions
- Android: Different manufacturers, Android versions, Play Services versions

## Error Code Reference

Common error codes and their meanings:

| Code | Description | Action |
| --- | --- | --- |
| `ErrorCode.UserCancelled` | User cancelled purchase | No action needed |
| `ErrorCode.NetworkError` | Network connectivity issue | Show retry option |
| `ErrorCode.ItemUnavailable` | Product not available | Check product setup |
| `ErrorCode.AlreadyOwned` | User already owns product | Check ownership status |
| `ErrorCode.Unknown` | Unknown error | Log for investigation |

**Note:** Import `ErrorCode` from `react-native-iap` to use these constants.

## Getting Help

If you're still experiencing issues:

1. **Check logs**: Review device logs and crash reports
2. **Search issues**: Check the [GitHub issues](https://github.com/hyochan/react-native-iap/issues)
3. **Minimal reproduction**: Create a minimal example that reproduces the issue. See [this example](https://github.com/hyochan/react-native-iap/issues/114) for reference on sharing a helpful repro
4. **Report bug**: File a detailed issue with reproduction steps

### Bug report template

```markdown
**Environment:**

- react-native-iap version: x.x.x
- Platform: iOS/Android
- OS version: x.x.x
- Device: Device model

**Description:** Clear description of the issue

**Steps to reproduce:**

1. Step 1
2. Step 2
3. Step 3

**Expected behavior:** What should happen

**Actual behavior:** What actually happens

**Logs:** Relevant logs and error messages
```
