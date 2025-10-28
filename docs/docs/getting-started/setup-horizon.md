---
sidebar_position: 4
---

# Horizon OS

This guide covers setting up react-native-iap for Meta Quest devices running Horizon OS. Horizon OS uses Meta's Platform SDK for in-app purchases instead of Google Play Billing.

## Prerequisites

- Meta Quest Developer account
- App created in Meta Quest Developer Hub
- Quest device or Quest Link for testing

## Configuration

:::tip You can refer to the example app for a working configuration. See the commented sections in:

- [`example/android/gradle.properties`](https://github.com/hyochan/react-native-iap/blob/main/example/android/gradle.properties)
- [`example/android/app/src/main/AndroidManifest.xml`](https://github.com/hyochan/react-native-iap/blob/main/example/android/app/src/main/AndroidManifest.xml) :::

### 1. Enable Horizon Mode

Add `horizonEnabled=true` to your `android/gradle.properties`:

```properties
# Enable Horizon OS support (Meta Quest)
horizonEnabled=true
```

### 2. Add Horizon App ID to AndroidManifest.xml

Add the Horizon App ID metadata to your `android/app/src/main/AndroidManifest.xml`:

```xml
<application>
  <!-- Other configurations -->

  <!-- Meta Horizon App ID (required for Horizon OS) -->
  <meta-data
    android:name="com.meta.horizon.platform.ovr.OCULUS_APP_ID"
    android:value="YOUR_HORIZON_APP_ID" />
</application>
```

### 3. Get Your Horizon App ID

1. Go to [Meta Quest Developer Hub](https://developer.oculus.com/)
2. Navigate to your app's dashboard
3. Copy your App ID from the app details
4. Add it to AndroidManifest.xml

### 4. Clean and Rebuild

After configuration, clean and rebuild your app:

```bash
cd android
./gradlew clean
cd ..
npx react-native run-android
```

This will:

- Use `openiap-google-horizon` artifact instead of `openiap-google`
- Add Horizon Platform SDK dependencies
- Configure the app with your Horizon App ID

## Code Integration

The code integration for Horizon OS is identical to standard Android integration. react-native-iap handles the platform differences automatically.

### Basic Setup

```tsx
import {useIAP, ErrorCode} from 'react-native-iap';

const productIds = ['premium_upgrade', 'coins_100', 'monthly_subscription'];

function App() {
  const {connected, products, subscriptions, fetchProducts, requestPurchase} =
    useIAP({
      onPurchaseSuccess: (purchase) => {
        console.log('Purchase successful:', purchase);
        handleSuccessfulPurchase(purchase);
      },
      onPurchaseError: (error) => {
        console.error('Purchase failed:', error);
        handlePurchaseError(error);
      },
    });

  React.useEffect(() => {
    if (connected) {
      // Fetch products - works the same on Horizon OS
      fetchProducts({
        skus: productIds,
        type: 'in-app',
      });
    }
  }, [connected]);

  return (
    <View>
      {products.map((product) => (
        <ProductItem key={product.id} product={product} />
      ))}
    </View>
  );
}
```

### Making Purchases

```tsx
const ProductItem = ({product}: {product: Product}) => {
  const {requestPurchase} = useIAP();

  const handlePurchase = () => {
    requestPurchase({
      request: {skus: [product.id]},
      type: 'in-app',
    });
  };

  return (
    <TouchableOpacity onPress={handlePurchase}>
      <Text>{product.title}</Text>
      <Text>{product.oneTimePurchaseOfferDetails?.formattedPrice}</Text>
    </TouchableOpacity>
  );
};
```

## Platform Detection

You can detect if your app is running on Horizon OS:

```tsx
import {Platform} from 'react-native';

// Check if running on Horizon OS
const isHorizon = Platform.OS === 'android' && Platform.Version >= 29;
// Note: Horizon OS is based on Android, but with Meta's Platform SDK
```

## Differences from Google Play

While react-native-iap provides a unified API, there are some differences in the underlying platform:

### Supported Features

- ✅ In-app purchases (consumable and non-consumable)
- ✅ Subscriptions
- ✅ Purchase restoration
- ✅ Product fetching with localized pricing
- ✅ Purchase verification

### Platform Behavior

1. **Purchase Flow**: Uses Meta's purchase dialog instead of Google Play
2. **User Accounts**: Tied to Meta Quest accounts, not Google accounts
3. **Testing**: Must use Meta Quest test users
4. **Receipt Format**: Different from Google Play receipts

## Testing

### Setting Up Test Users

1. Go to Meta Quest Developer Hub
2. Navigate to your app's settings
3. Add test users under "Test Users" section
4. Test users can make purchases without being charged

### Installing Test Builds

```bash
# Build and install on Quest device
npx react-native run-android --deviceId=<device-id>
```

Or using ADB:

```bash
# Install APK on Quest device
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# View logs
adb logcat | grep RnIap
```

## Troubleshooting

### "Activity not available" Error

**Problem**: Horizon SDK initialization fails with null Activity

**Solution**: This was fixed in react-native-iap 14.4.31+. Make sure you're using the latest version:

```bash
npm install react-native-iap@latest
# or
yarn add react-native-iap@latest
```

### Product IDs Not Found

**Problem**: Products return empty or unavailable

**Solutions**:

- Verify product IDs match in Meta Quest Developer Hub
- Ensure products are published and active
- Check that your Horizon App ID is correct in AndroidManifest.xml
- Clean and rebuild: `cd android && ./gradlew clean`

### Purchase Dialog Not Appearing

**Problem**: Purchase request doesn't show Meta's purchase dialog

**Solutions**:

- Ensure app is running on actual Quest device (not emulator)
- Verify user is logged into Meta Quest account
- Check that product ID exists in Meta Quest Developer Hub
- Review logs for initialization errors: `adb logcat | grep RnIap`

### Wrong Artifact Being Used

**Problem**: Build fails with "openiap-google" instead of "openiap-google-horizon"

**Solutions**:

- Check that `horizonEnabled=true` is in `android/gradle.properties`
- Clean build: `cd android && ./gradlew clean`
- Check build logs to verify correct artifact is being used

## Build Configuration

When you enable Horizon mode, react-native-iap automatically:

1. **Adds Dependencies**: Includes Horizon Platform SDK and Horizon Billing SDK
2. **Uses Correct Artifact**: Switches to `openiap-google-horizon` instead of `openiap-google`
3. **Configures AndroidManifest**: Your manually added Horizon App ID is used

You can verify the configuration by checking:

```bash
# Check gradle.properties
cat android/gradle.properties | grep horizonEnabled

# Check dependency tree
cd android && ./gradlew :react-native-iap:dependencies --configuration debugRuntimeClasspath | grep openiap-google
```

## Manual Configuration Details

For advanced users who want to understand the configuration:

### gradle.properties

```properties
horizonEnabled=true
```

### AndroidManifest.xml

```xml
<meta-data
  android:name="com.meta.horizon.platform.ovr.OCULUS_APP_ID"
  android:value="YOUR_HORIZON_APP_ID" />
```

### Build System

The `android/build.gradle` in react-native-iap automatically:

- Reads `horizonEnabled` from gradle.properties
- Selects the appropriate flavor (`horizon` vs `play`)
- Uses the correct OpenIAP artifact (`openiap-google-horizon` vs `openiap-google`)

## Next Steps

- [Review the installation guide](./installation)
- [Explore the useIAP hook](../guides/purchases)
- [Understand error codes](../api/error-codes)
- [Learn about purchase verification](../guides/subscription-validation)
