---
sidebar_position: 1
---

import GreatFrontEndBanner from "@site/src/uis/GreatFrontEndBanner"; import SponsorSection from '@site/src/components/SponsorSection';

# React Native IAP

<GreatFrontEndBanner type="default" />

---

**React Native IAP** is a powerful in-app purchase solution for Expo and React Native applications that **conforms to the [Open IAP specification](https://openiap.dev)**. It provides a unified API for handling in-app purchases across iOS and Android platforms with comprehensive error handling and modern TypeScript support.

If you're shipping an app with react-native-iap, we’d love to hear about it—please share your product and feedback in [Who’s using React Native IAP?](https://github.com/hyochan/react-native-iap/discussions/1343). Community stories help us keep improving the ecosystem.

## Promotion

<div align="center">
  <a href="https://hyodotdev.github.io/kstyled" target="_blank" rel="noopener noreferrer">
    <img src="https://hyodotdev.github.io/kstyled/img/logo.png" alt="kstyled Logo" width="120" />
  </a>

**Compile-time CSS-in-JS for React Native**

✨ Banishing runtime overhead, one style at a time with **[kstyled](https://hyodotdev.github.io/kstyled)** - fully type-safe styling that compiles away.

🚀 **[Explore kstyled →](https://hyodotdev.github.io/kstyled)**

</div>

## Sponsors & Community Support

We're building the OpenIAP ecosystem—defining the spec at [openiap.dev](https://www.openiap.dev), maintaining [openiap](https://github.com/hyodotdev/openiap) for the shared type system, and shipping native SDKs such as [openiap Apple](https://github.com/hyodotdev/openiap/tree/main/packages/apple) and [openiap Google](https://github.com/hyodotdev/openiap/tree/main/packages/google). These modules power [react-native-iap](https://github.com/hyochan/react-native-iap), [flutter_inapp_purchase](https://github.com/hyochan/flutter_inapp_purchase), [kmp-iap](https://github.com/hyochan/kmp-iap), and [react-native-iap](https://github.com/hyochan/react-native-iap). After simplifying fragmented APIs, the next milestone is a streamlined purchase flow: `initConnection → fetchProducts → requestPurchase → (server receipt validation) → finishTransaction`.

Your sponsorship keeps this work moving—ensuring more developers across platforms, OS, and frameworks can implement IAPs without headaches while we expand to additional plugins and payment systems. Sponsors receive shout-outs in each release and, depending on tier, can request tailored support. If you’re interested—or have rollout feedback to share—you can view sponsorship options at [openiap.dev/sponsors](https://www.openiap.dev/sponsors).

<SponsorSection variant="compact" showLabel />

## 📚 Guides

- [**Installation**](./getting-started/installation): Complete guide to implementing in-app purchases
- [**Purchase Lifecycle**](./guides/lifecycle): Understanding connection management and best practices
- [**Purchase Implementation**](./guides/purchases): Detailed purchase flow and event handling
- [**FAQ**](./guides/faq): Frequently asked questions and solutions
- [**Support**](./guides/support): Getting help and community resources

## 🚀 Quick Start

### Installation

Install the package using your favorite package manager:

```bash
npm install react-native-iap react-native-nitro-modules
```

:::tip Nitro Modules Dependency
Starting from v14.4.0, react-native-iap uses [Nitro Modules](https://github.com/margelo/nitro) for native bridging. For more details, see the [announcement discussion](https://github.com/hyochan/react-native-iap/discussions/2985).
:::

### Basic Usage

```tsx
import {useIAP, ErrorCode} from 'react-native-iap';

const {connected, products, fetchProducts, requestPurchase, finishTransaction} =
  useIAP({
    onPurchaseSuccess: async (purchase) => {
      // Validate on your server, then finish
      await finishTransaction({purchase, isConsumable: true});
    },
    onPurchaseError: (error) => {
      if (error.code !== ErrorCode.UserCancelled) {
        console.error('Purchase error:', error.message);
      }
    },
  });

// Fetch products when connected
useEffect(() => {
  if (connected) {
    fetchProducts({skus: ['product_id'], type: 'in-app'});
  }
}, [connected]);

// Purchase (platform-specific)
await requestPurchase({
  request: {
    apple: {sku: 'product_id'},
    google: {skus: ['product_id']},
  },
  type: 'in-app',
});
```

For complete examples, see [Purchase Flow](./examples/purchase-flow) and [Subscription Flow](./examples/subscription-flow).

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
- [**Purchase Flow Example**](./examples/purchase-flow): Simple product purchase flow
- [**Available Purchases Example**](./examples/available-purchases): Restore and list prior purchases

### 📚 Guides

- [**Installation**](./getting-started/installation): Complete guide to implementing in-app purchases
- [**Purchase Lifecycle**](./guides/lifecycle): Understanding connection management and best practices
- [**Purchase Implementation**](./guides/purchases): Detailed purchase flow and event handling
- [**FAQ**](./guides/faq): Frequently asked questions and solutions
- [**Support**](./guides/support): Getting help and community resources

### 🛠️ Advanced Topics

- [**Purchase Verification**](./guides/purchases): Secure purchase verification
- [**Error Handling**](./guides/error-handling): Comprehensive error management
- [**Subscriptions Flow Example**](./examples/subscription-flow): Handle recurring subscriptions
- [**Troubleshooting**](./guides/troubleshooting): Common issues and solutions

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](https://github.com/hyochan/react-native-iap/blob/main/CONTRIBUTING.md) for details.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/hyochan/react-native-iap/blob/main/LICENSE) file for details.
