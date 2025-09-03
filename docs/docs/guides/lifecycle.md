---
title: Lifecycle
sidebar_label: Lifecycle
sidebar_position: 4
---

import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# Lifecycle

<AdFitTopFixed />

For complete understanding of the in-app purchase lifecycle, flow diagrams, and state management, please visit:

👉 **[Lifecycle Documentation - openiap.dev](https://openiap.dev/docs/lifecycle)**

![Purchase Flow](https://openiap.dev/purchase-flow.png)

The Open IAP specification provides detailed documentation on:

- Complete purchase flow
- State transitions and management
- Connection lifecycle
- Error recovery patterns
- Platform-specific considerations

## Implementation with react-native-iap

## Connection Management with useIAP

The `useIAP` hook automatically manages the connection lifecycle for you, but it's important to understand what happens under the hood.

### Automatic Connection

When you use the `useIAP` hook, it automatically:

1. Initializes the connection to the store
2. Sets up purchase listeners
3. Manages connection state
4. Cleans up when the component unmounts

```tsx
import { useIAP } from 'react-native-iap'

export default function App() {
  const { connected, products, fetchProducts } = useIAP()

  useEffect(() => {
    // Connection is automatically established
    if (connected) {
      console.log('Connected to store')
      // You can now safely call store methods
      fetchProducts({ skus: ['product1', 'product2'], type: 'inapp' })
    }
  }, [connected, fetchProducts])

  return <YourAppContent />
}
```

### Connection States

The connection can be in several states:

- **Disconnected**: Initial state, no connection to store
- **Connecting**: Attempting to establish connection
- **Connected**: Successfully connected, ready for operations
- **Error**: Connection failed

```tsx
const { connected, connectionError } = useIAP()

if (connectionError) {
  return <ErrorView error={connectionError} />
}

if (!connected) {
  return <LoadingView message="Connecting to store..." />
}

return <StoreView />
```

## Component Lifecycle Integration

### Class Components

```tsx
import React, { Component } from 'react'
import {
  initConnection,
  endConnection,
  purchaseUpdatedListener,
  purchaseErrorListener,
} from 'react-native-iap'

class StoreComponent extends Component {
  purchaseUpdateSubscription = null
  purchaseErrorSubscription = null

  async componentDidMount() {
    try {
      await initConnection()

      // Set up purchase listeners
      this.purchaseUpdateSubscription = purchaseUpdatedListener((purchase) => {
        this.handlePurchaseUpdate(purchase)
      })

      this.purchaseErrorSubscription = purchaseErrorListener((error) => {
        this.handlePurchaseError(error)
      })
    } catch (error) {
      console.error('Failed to initialize:', error)
    }
  }

  componentWillUnmount() {
    // Clean up listeners
    if (this.purchaseUpdateSubscription) {
      this.purchaseUpdateSubscription.remove()
    }

    if (this.purchaseErrorSubscription) {
      this.purchaseErrorSubscription.remove()
    }

    // End connection
    endConnection()
  }

  handlePurchaseUpdate = (purchase) => {
    // Handle purchase updates
  }

  handlePurchaseError = (error) => {
    // Handle purchase errors
  }

  render() {
    return <div>Your store UI</div>
  }
}
```

### Functional Components

```tsx
import React, { useEffect, useRef } from 'react'
import {
  initConnection,
  endConnection,
  purchaseUpdatedListener,
  purchaseErrorListener,
} from 'react-native-iap'

export default function StoreComponent() {
  const listenersRef = useRef([])

  useEffect(() => {
    const setupStore = async () => {
      try {
        await initConnection()

        // Set up listeners
        const purchaseUpdateSubscription = purchaseUpdatedListener(
          (purchase) => {
            handlePurchaseUpdate(purchase)
          }
        )

        const purchaseErrorSubscription = purchaseErrorListener((error) => {
          handlePurchaseError(error)
        })

        // Store references for cleanup
        listenersRef.current = [
          purchaseUpdateSubscription,
          purchaseErrorSubscription,
        ]
      } catch (error) {
        console.error('Failed to setup store:', error)
      }
    }

    setupStore()

    // Cleanup function
    return () => {
      // Remove listeners
      listenersRef.current.forEach((subscription) => {
        if (subscription && subscription.remove) {
          subscription.remove()
        }
      })

      // End connection
      endConnection()
    }
  }, [])

  const handlePurchaseUpdate = (purchase) => {
    // Handle purchase updates
  }

  const handlePurchaseError = (error) => {
    // Handle purchase errors
  }

  return <div>Your store UI</div>
}
```

## Best Practices

### ✅ Do:

1. **Use useIAP hook**: Simplifies lifecycle management
2. **Initialize early**: Connect to store as early as possible in app lifecycle
3. **Handle connection states**: Provide feedback to users about connection status
4. **Clean up properly**: Always remove listeners and end connections

```tsx
// ✅ Good: Using useIAP hook
function MyApp() {
  const { connected, products, fetchProducts } = useIAP()

  useEffect(() => {
    if (connected) {
      fetchProducts({ skus: productIds, type: 'inapp' })
    }
  }, [connected])

  return <AppContent />
}
```

### ❌ Don't:

1. **Initialize and end repeatedly**: Don't call initConnection/endConnection for every operation
2. **Ignore connection state**: Don't attempt store operations when disconnected
3. **Forget cleanup**: Always clean up listeners to prevent memory leaks

```tsx
// ❌ Bad: Initializing for every operation
const badPurchaseFlow = async (productId) => {
  await initConnection() // Don't do this
  await requestPurchase({ sku: productId })
  await endConnection() // Don't do this
}

// ✅ Good: Use existing connection
const goodPurchaseFlow = async (productId) => {
  if (connected) {
    await requestPurchase({ sku: productId })
  }
}
```

## Purchase Flow Best Practices

### Receipt Validation and Security

1. **Server-side receipt validation is recommended**: For production apps, it's highly recommended to validate receipts on your secure server before granting access to content or features. See [Apple's receipt validation guide](https://developer.apple.com/documentation/storekit/in-app_purchase/validating_receipts_with_the_app_store) and [Google Play's verification guide](https://developer.android.com/google/play/billing/security#verify).

2. **Finish transactions after validation**: Always call `finishTransaction` after successfully validating a purchase on your server. Failing to do so will cause the purchase to remain in a pending state and may trigger repeated purchase prompts.

3. **Never trust client-side data**: Always validate receipts server-side before granting premium content or features.

### Purchase State Management

4. **Handle all purchase states**: Including pending, failed, restored, and cancelled purchases. Each state requires different handling logic.

5. **Handle pending purchases**: Some purchases may require approval (e.g., parental consent) and remain in pending state for extended periods.

6. **Restore purchases properly**: Implement purchase restoration for non-consumable products and subscriptions. This is required by app store guidelines.

### Error Handling and User Experience

7. **Implement comprehensive error handling**: Provide meaningful feedback to users for different error scenarios including network errors, cancelled purchases, and validation failures.

8. **Graceful degradation**: Your app should work even if purchases fail or the store is unavailable. Don't block core functionality.

9. **User feedback**: Keep users informed about purchase status with appropriate loading states and success/error messages.

### Testing and Development

10. **Test thoroughly**: Use real devices and official test accounts. In-app purchases don't work in simulators/emulators.

11. **Monitor purchase flow**: Log important events for debugging, but never log sensitive information like receipts or tokens.

12. **Check server-side validation libraries**: Consider using open-source libraries like [node-app-store-receipt-verify](https://github.com/ladeiko/node-app-store-receipt-verify) for iOS or [google-play-billing-validator](https://github.com/macklinu/google-play-billing-validator) for Android.

## Common Pitfalls and Solutions

### Transaction Management Issues

❌ **Not finishing transactions**:

```tsx
// Wrong - forgetting to finish transaction
const handlePurchase = async (purchase) => {
  await validateReceipt(purchase)
  // Missing: finishTransaction call
}
```

✅ **Always finish transactions after validation**:

```tsx
// Correct - always finish transaction
const handlePurchase = async (purchase) => {
  const isValid = await validateReceipt(purchase)
  if (isValid) {
    await finishTransaction({ purchase, isConsumable: true })
  }
}
```

### Security Issues

❌ **Trusting client-side validation**:

```tsx
// Wrong - never trust client-side validation alone
const handlePurchase = async (purchase) => {
  // This is not secure for production
  grantPremiumFeature()
}
```

✅ **Always validate server-side**:

```tsx
// Correct - validate on secure server
const handlePurchase = async (purchase) => {
  const isValid = await yourAPI.validateReceipt(purchase.transactionReceipt)
  if (isValid) {
    grantPremiumFeature()
    await finishTransaction({ purchase })
  }
}
```

### Development and Testing Issues

❌ **Testing on simulators**: In-app purchases only work on real devices with proper app store configurations.

❌ **Ignoring error codes**: Different errors require different handling strategies.

✅ **Proper error handling**:

```tsx
// Correct - handle different error types appropriately
const handlePurchaseError = (error) => {
  switch (error.code) {
    case 'E_USER_CANCELLED':
      // Silent - user intentionally cancelled
      break
    case 'E_NETWORK_ERROR':
      showRetryDialog()
      break
    case 'E_ITEM_UNAVAILABLE':
      showUnavailableMessage()
      break
    default:
      showGenericErrorMessage()
      break
  }
}
```

### App Lifecycle Issues

❌ **Not handling app crashes**: Purchases can complete after app restart, so always check for pending purchases on app launch.

✅ **Handle background purchases**:

```tsx
// Correct - check for purchases on app launch
useEffect(() => {
  const checkPendingPurchases = async () => {
    if (connected) {
      // Check for any purchases that completed while app was closed
      const purchases = await getAvailablePurchases()
      for (const purchase of purchases) {
        await processPurchase(purchase)
      }
    }
  }

  checkPendingPurchases()
}, [connected])
```

### Connection Management Issues

❌ **Initializing connection repeatedly**:

```tsx
// Wrong - don't initialize for every operation
const purchaseProduct = async (sku) => {
  await initConnection() // Don't do this
  await requestPurchase({ sku })
  await endConnection() // Don't do this
}
```

✅ **Maintain single connection**:

```tsx
// Correct - use existing connection
const purchaseProduct = async (sku) => {
  if (connected) {
    await requestPurchase({ sku })
  } else {
    console.error('Store not connected')
  }
}
```

## Next Steps

- Review [Purchase Implementation Guide](./purchases) for detailed code examples
- Check out [Error Handling Guide](./troubleshooting) for debugging tips
- Explore [Complete Store Example](../examples/complete-impl) for production-ready code
- See [API Reference](../api/) for detailed method documentation
