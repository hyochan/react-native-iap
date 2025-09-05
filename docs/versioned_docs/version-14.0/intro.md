---
sidebar_position: 1
---

import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# React Native IAP

<AdFitTopFixed />

**React Native IAP** is a high-performance in-app purchase library using Nitro Modules that **conforms to the [Open IAP specification](https://openiap.dev)**. It provides a unified API for handling in-app purchases across iOS and Android platforms with comprehensive error handling and modern TypeScript support.

## 📚 Guides

- [**Getting Started**](./guides/getting-started): Complete guide to implementing in-app purchases
- [**Purchase Lifecycle**](./guides/lifecycle): Understanding connection management and best practices
- [**Purchase Implementation**](./guides/purchases): Detailed purchase flow and event handling
- [**FAQ**](./guides/faq): Frequently asked questions and solutions
- [**Support**](./guides/support): Getting help and community resources

### 🛠️ Advanced Topicsnd modern TypeScript support.

## ✨ Features

- 🔄 **Cross-platform Support**: Works seamlessly on both iOS and Android
- ⚡ **Nitro Modules**: High-performance native bridge with minimal overhead
- 🎯 **TypeScript First**: Full TypeScript support with comprehensive type definitions
- 🛡️ **Centralized Error Handling**: Unified error management with platform-specific error code mapping
- 🎣 **React Hooks**: Modern React hooks API with `useIAP`
- 📱 **Expo Compatible**: Works with Expo development builds
- 🔍 **Receipt Validation**: Built-in receipt validation for both platforms
- 💎 **Products & Subscriptions**: Support for both one-time purchases and subscriptions
- 🚀 **Performance Optimized**: Efficient caching and minimal re-renders

## 🚀 Quick Start

### Installation

Install the package using your favorite package manager:

```bash
npm install react-native-iap react-native-nitro-modules
```

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

Process purchase requests with our platform-specific API (v14.0.0-rc):

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

**No more Platform.OS checks!** The new API automatically handles platform differences. iOS can only purchase one product at a time, while Android supports purchasing multiple products in a single transaction.

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

## 🏗️ Architecture

React Native IAP is built with a modern architecture that emphasizes:

- **Type Safety**: Comprehensive TypeScript definitions for all APIs
- **Error Resilience**: Centralized error handling with meaningful error codes
- **Platform Abstraction**: Unified API that handles platform differences internally
- **Performance**: Optimized for minimal bundle size and runtime performance

## 📱 Platform Support

| Platform          | Support | Notes                                        |
| ----------------- | ------- | -------------------------------------------- |
| iOS               | ✅      | StoreKit 1 & 2 (StoreKit 2 requires iOS 15+) |
| Android           | ✅      | Google Play Billing v5+                      |
| Expo Go           | ⚠️      | Limited (requires custom development client) |
| Expo Dev Client   | ✅      | Full support                                 |
| Bare React Native | ✅      | Full support                                 |

## 🎯 What's Next?

### 📦 Setup & Configuration

- [**Installation Guide**](./installation): Install and configure React Native IAP
- [**iOS Setup**](./getting-started/setup-ios): App Store Connect and Xcode configuration
- [**Android Setup**](./getting-started/setup-android): Google Play Console setup

### 🔧 Implementation

- [**API Reference**](./api/use-iap): Complete useIAP hook documentation
- [**Basic Store Example**](./examples/basic-store): Simple product store implementation
- [**Complete Store Example**](./examples/complete-impl): Production-ready store with validation

### 📚 Guides

- [**Getting Started**](./guides/getting-started): Complete guide to implementing in-app purchases
- [**Purchase Lifecycle**](./guides/lifecycle): Understanding connection management and best practices
- [**Purchase Implementation**](./guides/purchases): Detailed purchase flow and event handling
- [**FAQ**](./guides/faq): Frequently asked questions and solutions
- [**Support**](./guides/support): Getting help and community resources

### 🛠️ Advanced Topics

- [**Receipt Validation**](./guides/purchases): Secure purchase validation
- [**Error Handling**](./api/error-codes): Comprehensive error management
- [**Subscription Management**](./examples/subscription-manager): Handle recurring subscriptions
- [**Troubleshooting**](./guides/troubleshooting): Common issues and solutions

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](https://github.com/hyochan/react-native-iap/blob/main/CONTRIBUTING.md) for details.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/hyochan/react-native-iap/blob/main/LICENSE) file for details.
