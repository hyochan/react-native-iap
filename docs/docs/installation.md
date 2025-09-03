---
sidebar_position: 2
---

import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# Installation

<AdFitTopFixed />

This guide will help you install and configure React Native IAP in your React Native or Expo project.

## Prerequisites

Before installing React Native IAP, make sure you have:

- React Native 0.64 or later, or Expo SDK 45 or later
- Node.js 16 or later
- iOS 15+ for iOS apps (StoreKit 2 requirement)
- Android API level 21+ for Android apps

## Package Installation

Install the package using your favorite package manager:

```bash
npm install react-native-iap react-native-nitro-modules
```

### Important for Expo Managed Workflow

If you're using the Expo managed workflow, you **must** use a [custom development client](https://docs.expo.dev/versions/latest/sdk/dev-client/) since in-app purchases require native modules that aren't available in Expo Go.

After installing the package, you need to:

1. **Configure expo-build-properties for Android** (required for Kotlin 2.0+ support):

   Starting from version 14.0.0-rc, react-native-iap supports Google Play Billing Library v8.0.0, which requires Kotlin 2.0+. Since `expo-modules-core` doesn't support Kotlin 2.0 yet, you need to manually configure the Kotlin version.

   Add the following to your `app.json`:

   ```json
   {
     "expo": {
       "plugins": [
         "react-native-iap",
         [
           "expo-build-properties",
           {
             "android": {
               "kotlinVersion": "2.1.20"
             }
           }
         ]
       ]
     }
   }
   ```

2. **Install the plugin and run prebuild**:

   ```bash
   npx expo prebuild --clean
   ```

   This will generate the native iOS and Android directories with the necessary configurations. Learn more about [adopting prebuild](https://docs.expo.dev/guides/adopting-prebuild/).

3. **Create a development build** (see the Platform Configuration section below for details)

## Platform Configuration

### For Expo Managed Workflow

If you're using Expo managed workflow, you'll need to create a [custom development client](https://docs.expo.dev/development/create-development-builds/) since in-app purchases require native modules that aren't available in Expo Go.

1. **Install EAS CLI** (if not already installed):

   ```bash
   npm install -g eas-cli
   ```

2. **Create a development build**:
   ```bash
   eas build --platform ios --profile development
   eas build --platform android --profile development
   ```

### For React Native CLI Projects

#### iOS

1. **Install pods**:

   ```bash
   cd ios && pod install
   // or npx pod-install
   ```

2. **Add StoreKit capability** to your iOS app in Xcode:
   - Open your project in Xcode
   - Select your app target
   - Go to "Signing & Capabilities"
   - Click "+ Capability" and add "In-App Purchase"

#### Android

**Important:** Starting from version 14.0.0-rc, react-native-iap supports Google Play Billing Library v8.0.0, which requires Kotlin 2.0+.

1. **Configure Kotlin version** in your root `android/build.gradle`:

   ```gradle
   buildscript {
       ext {
           kotlinVersion = "2.1.20"
       }
       dependencies {
           classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion"
       }
   }
   ```

2. **Add billing dependencies** to your `android/app/build.gradle`:

   ```gradle
   dependencies {
       implementation "com.android.billingclient:billing-ktx:8.0.0"
       implementation "com.google.android.gms:play-services-base:18.1.0"
   }
   ```

## Quick Start

### 1. Basic Setup

First, import and initialize the IAP hook:

```tsx
import { useIAP } from 'react-native-iap'

function MyStore() {
  const {
    connected,
    products,
    fetchProducts,
    requestPurchase,
    currentPurchase,
    finishTransaction,
  } = useIAP()

  const productIds = ['your.product.id', 'your.premium.subscription']
}
```

### 2. Fetch Products

Load your products when the store connects:

```tsx
useEffect(() => {
  if (connected) {
    // Fetch your products
    fetchProducts({ skus: productIds, type: 'inapp' })
  }
}, [connected])
```

### 3. Display Products

Show available products to users:

```tsx
return (
  <View>
    <Text>Store Status: {connected ? 'Connected' : 'Connecting...'}</Text>

    {products.map((product) => (
      <View key={product.id} style={styles.productItem}>
        <Text style={styles.productTitle}>{product.title}</Text>
        <Text style={styles.productPrice}>{product.displayPrice}</Text>
        <Button title="Buy Now" onPress={() => handlePurchase(product.id)} />
      </View>
    ))}
  </View>
)
```

### 4. Handle Purchases

Process purchase requests with our platform-specific API (v14.0.0-rc Current):

```tsx
const handlePurchase = async (productId: string) => {
  try {
    await requestPurchase({
      request: {
        ios: {
          sku: productId,
        },
        android: {
          skus: [productId],
        },
      },
    })
  } catch (error) {
    console.error('Purchase failed:', error)
  }
}
```

> **Note:** No more Platform.OS checks! The new API automatically handles platform differences. iOS can only purchase one product at a time, while Android supports purchasing multiple products in a single transaction.

### 5. Complete Transactions

Finish purchases when they complete:

```tsx
useEffect(() => {
  if (currentPurchase) {
    const completePurchase = async () => {
      try {
        // Grant the purchase to user here
        console.log('Purchase completed:', currentPurchase.id)

        // Finish the transaction
        await finishTransaction({
          purchase: currentPurchase,
          isConsumable: true, // Set based on your product type
        })
      } catch (error) {
        console.error('Failed to complete purchase:', error)
      }
    }

    completePurchase()
  }
}, [currentPurchase])
```

### Complete Basic Example

Here's a complete working example:

```tsx
import React, { useEffect } from 'react'
import { View, Text, Button, StyleSheet } from 'react-native'
import { useIAP } from 'react-native-iap'

export default function SimpleStore() {
  const {
    connected,
    products,
    fetchProducts,
    requestPurchase,
    currentPurchase,
    finishTransaction,
  } = useIAP()

  const productIds = ['com.example.coins.pack1', 'com.example.premium']

  useEffect(() => {
    if (connected) {
      fetchProducts({ skus: productIds, type: 'inapp' })
    }
  }, [connected])

  useEffect(() => {
    if (currentPurchase) {
      const completePurchase = async () => {
        try {
          console.log('Purchase completed:', currentPurchase.id)
          await finishTransaction({
            purchase: currentPurchase,
            isConsumable: true,
          })
        } catch (error) {
          console.error('Failed to complete purchase:', error)
        }
      }
      completePurchase()
    }
  }, [currentPurchase])

  const handlePurchase = async (productId: string) => {
    try {
      await requestPurchase({
        request: {
          ios: {
            sku: productId,
          },
          android: {
            skus: [productId],
          },
        },
      })
    } catch (error) {
      console.error('Purchase failed:', error)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.status}>
        Store: {connected ? 'Connected ✅' : 'Connecting...'}
      </Text>

      {products.map((product) => (
        <View key={product.id} style={styles.product}>
          <Text style={styles.title}>{product.title}</Text>
          <Text style={styles.price}>{product.displayPrice}</Text>
          <Button title="Buy Now" onPress={() => handlePurchase(product.id)} />
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  status: { fontSize: 16, marginBottom: 20 },
  product: {
    padding: 15,
    marginVertical: 5,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  title: { fontSize: 16, fontWeight: 'bold' },
  price: { fontSize: 14, color: '#666', marginVertical: 5 },
})
```

## Store Configuration

React Native IAP is OpenIAP compliant. For detailed instructions on setting up your products in each store:

- **iOS**: [OpenIAP iOS Setup Guide](https://www.openiap.dev/docs/ios-setup) - App Store Connect configuration
- **Android**: [OpenIAP Android Setup Guide](https://www.openiap.dev/docs/android-setup) - Google Play Console configuration

## Verification

To verify that React Native IAP is properly installed, create a simple test:

```tsx
import { useIAP } from 'react-native-iap'

function TestComponent() {
  const { connected } = useIAP()

  console.log('IAP Connection status:', connected)

  return null
}
```

If everything is set up correctly, you should see the connection status logged in your console.

## Next Steps

Now that you have React Native IAP installed, you can:

- [Set up iOS configuration](./getting-started/setup-ios)
- [Set up Android configuration](./getting-started/setup-android)
- [Learn basic usage](./guides/getting-started)

## Troubleshooting

If you encounter issues during installation:

1. **Clear node_modules and reinstall**:

   ```bash
   rm -rf node_modules
   npm install
   ```

2. **For iOS, clean and rebuild pods**:

   ```bash
   cd ios
   rm -rf Pods Podfile.lock
   pod install
   ```

   **For Expo projects**, use prebuild instead:

   ```bash
   npx expo prebuild --clean
   ```

3. **For React Native, reset Metro cache**:
   ```bash
   npx react-native start --reset-cache
   ```

For more help, check our [Troubleshooting Guide](./guides/troubleshooting) or [open an issue](https://github.com/hyochan/react-native-iap/issues) on GitHub.
