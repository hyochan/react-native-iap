---
title: Frequently Asked Questions
sidebar_label: FAQ
sidebar_position: 6
---

import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# Frequently Asked Questions

<AdFitTopFixed />

## General Questions

### What is react-native-iap?

`react-native-iap` is a comprehensive in-app purchase solution specifically designed for Expo and React Native applications. It provides a unified API for handling purchases across iOS and Android with TypeScript support and modern React hooks.

### How is react-native-iap different from react-native-iap?

`react-native-iap` is the official successor to `react-native-iap`. After 8 years of maintaining `react-native-iap` (with 3K+ stars, 230+ contributors, and 214K monthly downloads), the project is being gradually deprecated in favor of `react-native-iap`.

**Why the migration?**

- **Expo-first approach**: Expo is now the recommended way to start React Native projects
- **Better performance**: Built for New Architecture with no manual bridging required
- **Lower maintenance cost**: Easier to test, update, and support
- **Renderer-agnostic**: Works seamlessly across different React Native architectures
- **Production-ready**: Already used in major apps with 2M+ daily active users

**Key improvements in react-native-iap:**

- Native Expo Modules integration
- Modern React hooks API (`useIAP`)
- Enhanced TypeScript support with full type safety
- Streamlined error handling with centralized error codes
- Cleaner APIs and smoother developer experience
- Out-of-the-box New Architecture support

For more details about the migration and reasoning, see:

- [Migration Discussion](https://github.com/hyochan/react-native-iap/discussions/2754)
- [Announcement Post](https://x.com/hyodotdev/status/1939420943665049961)

### Can I use react-native-iap in a bare React Native project?

Yes! `react-native-iap` works in both Expo managed and bare React Native projects. However, it's optimized for Expo workflows.

## Setup and Configuration

### Why can't I test in-app purchases in Expo Go?

In-app purchases require native modules that aren't available in Expo Go. You need to create a [custom development client](https://docs.expo.dev/development/create-development-builds/) or use a bare workflow.

### Can I test in-app purchases with the development client?

Yes! You can test in-app purchases using the Expo development client. Simply run:

```bash
npx expo run:ios --device  # For iOS
npx expo run:android       # For Android
```

This will build and install the development client on your physical device where you can test in-app purchases. You don't need to upload to TestFlight or Google Play for basic testing, though those platforms are useful for more comprehensive testing scenarios.

### Do I need to configure anything in my app stores?

Yes, you need to:

**iOS (App Store Connect):**

- Complete agreements, tax, and banking information
- Create in-app purchase products
- Set up sandbox test accounts

**Android (Google Play Console):**

- Upload your app to a testing track
- Create in-app products
- Add test accounts

### How long does it take for products to become available?

- **iOS**: Products can take up to 24 hours to become available in sandbox
- **Android**: Products are usually available immediately after app upload

## Products and Purchases

### Why does `fetchProducts()` return an empty array?

Common causes:

1. **Connection not established** - check `connected` state
2. **Product IDs don't match** store configuration exactly (case-sensitive)
3. **Products not yet approved/available** in store
4. **Testing on simulator/emulator** - real device required
5. **Store setup incomplete** - see platform-specific requirements below

```tsx
const {connected, fetchProducts} = useIAP();

useEffect(() => {
  if (connected) {
    fetchProducts({skus: ['com.yourapp.product1'], type: 'in-app'});
  }
}, [connected]);
```

**Platform-specific setup requirements:**

- **iOS**: See [iOS Setup Guide](/docs/getting-started/setup-ios)
- **Android**: See [Android Setup Guide](/docs/getting-started/setup-android)

**Still not working?**

✅ **Common Checks:**

**iOS:**

- Your App is in "Ready for Submission" or "TestFlight" status (not just created in App Store Connect)
- The in-app purchase product is in "Approved" status
- You are logged into the App Store on your test device with a real or sandbox Apple ID (not just simulator)
- The app was installed via `expo run:ios --device` on a real device OR via TestFlight
- Your bundle ID matches exactly (including case sensitivity) between your app and App Store Connect
- Product IDs are correct and match exactly in code
- You called `initConnection()` before `fetchProducts()`

**Android:**

- Create signed APK for your application
- Upload your APK to Google Play Store (at least to internal testing track)
- Create products in Google Play Console
- Wait 6-12 hours for products to be available on the store
- Billing permissions are automatically handled by react-native-iap (no manual Manifest.xml edit needed)
- **Don't use emulator** - it doesn't support Google Play Billing Services, use a real device

🛠 **Worst-Case Scenario:**

Sometimes, even if everything seems correct, App Store Connect simply doesn't return products. In that case, the only thing that works is:

❌ **Delete and recreate your app + in-app purchase product from scratch.**

### Can I purchase products without calling `fetchProducts()` first?

No, you should always call `fetchProducts()` first. This ensures:

- Products are available and properly configured
- You have the latest pricing and product information
- The store connection is established

### How do users cancel subscriptions?

Users cannot cancel subscriptions within your app. They need to manage their subscriptions through:

- **iOS**: App Store Settings > Subscriptions
- **Android**: Google Play Store > Menu > Subscriptions

### How do I restore purchases?

For non-consumable products and subscriptions:

```tsx
const {getAvailablePurchases} = useIAP();

const restorePurchases = async () => {
  try {
    const purchases = await getAvailablePurchases();
    // Process and validate restored purchases
    for (const purchase of purchases) {
      await validateAndGrantPurchase(purchase);
    }
  } catch (error) {
    console.error('Restore failed:', error);
  }
};
```

## Receipt Validation

### Do I need to validate receipts on my server?

**Yes, absolutely!** Client-side validation is not secure. Always validate receipts on your secure server to prevent fraud.

### What should I do after successful receipt validation?

1. Grant the purchase to the user (update database, unlock features, etc.)
2. Call `finishTransaction()` to complete the purchase
3. Log the transaction for your records

```tsx
const handlePurchaseUpdate = async (purchase) => {
  try {
    // 1. Validate on server
    const isValid = await validateReceiptOnServer(purchase);

    if (isValid) {
      // 2. Grant purchase
      await grantPurchaseToUser(purchase);

      // 3. Finish transaction
      await finishTransaction({purchase});
    }
  } catch (error) {
    console.error('Purchase validation failed:', error);
  }
};
```

### What happens if I don't call `finishTransaction()`?

- The purchase will remain in a pending state
- The store will continue to notify your app about this purchase
- On iOS, the user may see repeated purchase prompts
- On Android, the purchase may be refunded automatically

## Error Handling

### What should I do when a purchase fails?

Handle different error types appropriately:

```tsx
const handlePurchaseError = (error) => {
  switch (error.code) {
    case 'E_USER_CANCELLED':
      // User cancelled - no action needed
      break;

    case 'E_NETWORK_ERROR':
      // Show retry option
      showRetryDialog();
      break;

    case 'E_ITEM_UNAVAILABLE':
      // Product not available
      showProductUnavailableMessage();
      break;

    case 'E_ALREADY_OWNED':
      // User already owns this
      showAlreadyOwnedMessage();
      break;

    default:
      // Log for investigation
      console.error('Purchase error:', error);**
**      break;
  }
};
```

### How do I handle network errors during purchases?

Network errors during purchases are tricky because the purchase might still go through. Always:

1. Don't retry the purchase immediately
2. Check for pending purchases on app restart
3. Implement proper error messaging for users

## Testing

### Can I test in-app purchases on simulators?

No, in-app purchases only work on real devices. Use:

- iOS: Real iPhone/iPad with sandbox account
- Android: Real Android device with signed build

### Why do my purchases work in testing but not in production?

Common issues:

- Different product IDs between testing and production
- App not properly signed for production
- Store review process not completed
- Different bundle ID or package name

### How do I test subscription cancellations?

You can't directly test cancellations in sandbox, but you can:

- Test subscription purchase flow
- Test subscription restoration
- Use server-side webhook notifications for cancellation handling

## Performance and Best Practices

### When should I initialize the connection?

Initialize as early as possible in your app's lifecycle:

```tsx
function App() {
  const {connected} = useIAP(); // Connection starts automatically

  return <YourAppContent />;
}
```

### How do I prevent multiple purchase attempts?

Implement purchase state management:

```tsx
const [isPurchasing, setIsPurchasing] = useState(false);

const handlePurchase = async (productId) => {
  if (isPurchasing) return;

  setIsPurchasing(true);
  try {
    await requestPurchase({sku: productId});
  } finally {
    setIsPurchasing(false);
  }
};
```

### Should I cache product information?

No, you don't need to implement caching at the application level. The native module automatically handles product caching internally for optimal performance.

When using the `useIAP` hook:

- Products are automatically cached by the native StoreKit (iOS) and Google Play Billing (Android) modules
- The hook maintains state of fetched products in the `products` and `subscriptions` arrays
- Simply call `fetchProducts` when needed - the library handles caching efficiently

```tsx
// No manual caching needed - just fetch when connected
useEffect(() => {
  if (connected) {
    fetchProducts({skus: productIds, type: 'in-app'});
  }
}, [connected]);

// Access products directly from state
products.map((product) => <ProductItem key={product.id} product={product} />);
```

## Migration and Updates

### How do I migrate from react-native-iap?

`react-native-iap` is the official successor to `react-native-iap`. The migration is straightforward with these key changes:

**Installation:**

```bash
# Remove react-native-iap
npm uninstall react-native-iap

# Install react-native-iap
npx expo install react-native-iap
```

**API Changes:**

```tsx
// react-native-iap (OLD)
import {useIAP, withIAPContext} from 'react-native-iap';

function App() {
  return (
    <withIAPContext>
      <YourApp />
    </withIAPContext>
  );
}

// react-native-iap (NEW)
import {useIAP} from 'react-native-iap'; // No context wrapper needed

function App() {
  return <YourApp />; // Hook works anywhere in your app
}
```

**Hook Usage (mostly compatible):**

```tsx
// Most of the useIAP API remains the same
const {
  connected,
  products,
  purchases,
  fetchProducts, // Updated method name
  requestPurchase,
  finishTransaction,
  // ... other methods
} = useIAP();
```

**Key Benefits of Migration:**

- **Automatic connection management** - no manual connection setup
- **Better error handling** - centralized error codes across platforms
- **Expo Config Plugin** - simplified native configuration
- **New Architecture support** - future-proof your app
- **Active maintenance** - continued updates and support

**Migration Timeline:**

- `react-native-iap` will be gradually deprecated over time
- Critical security updates will continue for existing users
- New features and improvements will only be added to `react-native-iap`

For detailed migration guide and community support:

- [GitHub Migration Discussion](https://github.com/hyochan/react-native-iap/discussions/2754)
- [Official Announcement](https://x.com/hyodotdev/status/1939420943665049961)

### What if react-native-iap doesn't support a feature I need?

1. Check if it's in the roadmap
2. File a feature request
3. Consider contributing to the project
4. For urgent needs, you might need to use react-native-iap

### What version of Xcode should I use for iOS development?

**Use Xcode 16.4 or later** for the best experience with in-app purchases. Earlier versions have known issues that can cause:

- Duplicate purchase events
- Transaction handling errors
- Unexpected StoreKit behavior

These issues ([#114](https://github.com/hyochan/react-native-iap/issues/114), [react-native-iap #2970](https://github.com/hyochan/react-native-iap/issues/2970)) have been resolved by upgrading to Xcode 16.4+.

## Platform-Specific Issues

### iOS Issues

#### purchaseUpdatedListener is called twice after finishTransaction

**Issue:** On iOS, `purchaseUpdatedListener` may be called twice for the same transaction when using `andDangerouslyFinishTransactionAutomatically: false` and manually calling `finishTransaction()`.

**Symptoms:**

- First call: Immediate after successful purchase
- Second call: After `finishTransaction()` is called (or on app restart for products)
- Both calls have the same `id`

**Example:**

```tsx
// This pattern may cause duplicate calls
const purchaseListener = purchaseUpdatedListener(async (purchase) => {
  console.log('Purchase received:', purchase.id);
  await validateOnServer(purchase);
  await finishTransaction({purchase, isConsumable: false});
  // ⚠️ Listener may be called again after finishTransaction
});

await requestPurchase({
  sku: 'your.product.id',
  andDangerouslyFinishTransactionAutomatically: false,
});
```

**Workaround:** Track processed transactions to avoid duplicate processing:

```tsx
const processedTransactions = new Set();

const purchaseListener = purchaseUpdatedListener(async (purchase) => {
  const transactionId = purchase.id;

  // Skip if already processed
  if (processedTransactions.has(transactionId)) {
    console.log('Transaction already processed:', transactionId);
    return;
  }

  // Mark as processed
  processedTransactions.add(transactionId);

  try {
    console.log('Processing purchase:', transactionId);
    await validateOnServer(purchase);
    await finishTransaction({purchase, isConsumable: false});
  } catch (error) {
    // Remove from processed set if validation fails
    processedTransactions.delete(transactionId);
    console.error('Purchase processing failed:', error);
  }
});
```

**Root Cause:** This appears to be an Apple StoreKit behavior where finishing a transaction triggers another purchase notification. This is a known iOS platform limitation, not specific to react-native-iap.

**Related Issues:**

- [GitHub Issue #56](https://github.com/hyochan/react-native-iap/issues/56)
- [react-native-iap Issue #2713](https://github.com/hyochan/react-native-iap/issues/2713)

#### Build error: 'appTransactionID' property not found

**Issue:** iOS build fails with errors like:

- `Property 'appTransactionID' doesn't exist`
- `Cannot find member 'appTransactionID' in AppTransaction`
- `Property 'unit' is inaccessible due to 'internal' protection level` (yoga related)

**Root Cause:** The `appTransactionID` field was introduced in iOS 18.4+ SDK. This error occurs when:

- Using Xcode < 16.4 (which doesn't include iOS 18.4 SDK)
- iOS SDK version < 18.4
- Version mismatches between react-native-iap, React Native, and Expo SDK

**Solutions:**

1. **Upgrade Xcode to 16.4 or later** (recommended):

   ````bash
   # Check your current versions
   xcodebuild -version
   xcrun --show-sdk-version
   ```

   Required: Xcode 16.4+ with iOS SDK 18.4+

   ````

2. **Use compatible package versions**:

   ```json
   {
     "dependencies": {
       "expo": "~53.0.20",
       "react-native": "0.79.5",
       "react-native-iap": "2.7.5"
     }
   }
   ```

3. **If you can't upgrade Xcode, downgrade react-native-iap**:

   ```bash
   npm install react-native-iap@2.5.3
   ```

   Note: Versions 2.5.1-2.5.3 work without iOS 18.4 SDK

**Build with EAS:**

```bash
eas build --profile development --platform ios --clear-cache
```

**Important Compatibility Notes:**

- react-native-iap 2.7.4+ fixed the SDK version detection but still requires iOS 15.0+ deployment target
- React Native 0.80.x may have compatibility issues with some Expo modules
- Expo SDK 53 with React Native 0.79.x is more stable for production

**If you still have issues:**

1. Clear all caches:

   ```bash
   cd ios
   rm -rf ~/Library/Developer/Xcode/DerivedData
   pod deintegrate
   pod install
   ```

2. Ensure EAS build uses correct Node version:

   ```json
   // eas.json
   {
     "build": {
       "development": {
         "node": "20.16.0"
       }
     }
   }
   ```

3. Set minimum iOS deployment target to 15.0:

   ```json
   // app.json or app.config.js
   {
     "expo": {
       "plugins": [
         [
           "expo-build-properties",
           {
             "ios": {
               "deploymentTarget": "15.0"
             }
           }
         ]
       ]
     }
   }
   ```

**Related Issues:**

- [GitHub Issue #114](https://github.com/hyochan/react-native-iap/issues/114)
- [GitHub Issue #127](https://github.com/hyochan/react-native-iap/issues/127)

#### Sandbox prices showing in wrong currency/localization

**Issue:** During TestFlight testing, users see prices in USD instead of their local currency (e.g., EUR) in the initial purchase dialog. The correct currency only appears after proceeding to the next step.

**Explanation:** This is normal iOS sandbox behavior and not related to react-native-iap. The same behavior occurs with other IAP libraries like RevenueCat.

**Key Points:**

- This only happens in sandbox/TestFlight environments
- Production builds will show correct localized prices immediately
- It's an Apple sandbox limitation, not a configuration issue

**Related Issue:** [GitHub Issue #126](https://github.com/hyochan/react-native-iap/issues/126)

### Android Issues

#### Build error: kspVersion not defined and Kotlin version conflicts

**Issue:** After upgrading to react-native-iap v2.7.0+, Android builds fail with errors like:

- `kspVersion not being explicitly defined`
- Plugin conflicts between `com.android.library` and `com.android.application`
- Kotlin compatibility errors with other packages

**Root Cause:** Starting with react-native-iap v2.7.0, Google Play Billing Library v8.0.0 is used, which requires Kotlin 2.0+. However, expo-modules-core doesn't support Kotlin 2.x by default yet.

**Solution:** You must define the Kotlin version explicitly using expo-build-properties:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-build-properties",
        {
          "android": {
            "kotlinVersion": "2.0.21"
          }
        }
      ]
    ]
  }
}
```

**Common Follow-up Issues:**

If you have other packages (like `@notifee/react-native`) that rely on Kotlin < 2.0, you may encounter this error:

```sh
Could not find org.jetbrains.kotlin:kotlin-compose-compiler-plugin-embeddable:1.9.25
```

This happens because:

- The billing-ktx package in Google Play Billing v8 is compiled with Kotlin 2.0
- It generates metadata version 2.1.0
- Projects using Kotlin 1.9.x cannot parse this metadata

**The error message:**

```sh
META-INF/.../ktbilling_granule.kotlin_module
was compiled with an incompatible version of Kotlin.
The binary version of its metadata is 2.1.0, expected version is 1.9.0.
```

**Resolution Options:**

1. Upgrade all your packages to be compatible with Kotlin 2.0+
2. Wait for expo-modules-core to officially support Kotlin 2.x
3. Consider staying on react-native-iap v2.6.x if you cannot upgrade Kotlin

**Related Issues:** [GitHub Issue #85](https://github.com/hyochan/react-native-iap/issues/85)

## General Troubleshooting

### My app crashes when making purchases

Common causes:

- Not handling purchase updates properly
- Memory leaks from not cleaning up listeners
- Trying to finish transactions multiple times

### Purchases are successful but features aren't unlocked

This usually indicates:

- Receipt validation is failing
- Purchase handling logic has bugs
- Database/state updates are not working

Check your server logs and purchase handling code.

### I get "Item already owned" errors

This happens when:

- Trying to purchase a non-consumable product again
- Previous transaction wasn't finished properly
- Need to restore purchases instead

## Still Need Help?

If your question isn't answered here:

1. Check the [GitHub issues](https://github.com/hyochan/react-native-iap/issues)
2. Review the [troubleshooting guide](./troubleshooting)
3. Create a [minimal reproduction example](https://github.com/hyochan/react-native-iap/issues/new)
4. Join the community discussions
