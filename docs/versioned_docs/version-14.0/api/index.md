import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# API Reference

<AdFitTopFixed />

Welcome to the React Native IAP API documentation. Here you'll find comprehensive guides and references for all the features and functionality available in React Native IAP.

## Available APIs

### 🎣 [useIAP Hook](./use-iap)

The main React hook for handling in-app purchases in your application.

- Purchase products and subscriptions
- Restore previous purchases
- Handle purchase states and loading
- Complete transactions

### ⚠️ [Error Codes](./error-codes)

Comprehensive list of all error codes that can be returned by React Native IAP.

- Centralized error management
- Platform-specific error mappings
- Troubleshooting guidelines
- Error handling best practices

## Quick Start

```javascript
import { useIAP } from 'react-native-iap'

function MyComponent() {
  const { products, purchaseProduct, restorePurchases, isLoading, error } =
    useIAP()

  // Your component logic here
}
```

## TypeScript Support

React Native IAP is built with TypeScript and provides full type safety for all APIs. All types are automatically exported when you install the package.

## Need Help?

- Check our [Getting Started Guide](/docs/intro)
- Visit our [GitHub repository](https://github.com/hyochan/react-native-iap)
- Read our [Blog](/blog) for latest updates
