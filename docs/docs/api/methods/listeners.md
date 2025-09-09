---
title: Listeners
sidebar_label: Listeners
sidebar_position: 2
---

import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# Purchase Listeners

<AdFitTopFixed />

react-native-iap provides event listeners to handle purchase updates and errors. These listeners are essential for handling the asynchronous nature of in-app purchases.

## purchaseUpdatedListener()

Listens for purchase updates from **the** store.

```tsx
import { purchaseUpdatedListener } from 'react-native-iap'

const setupPurchaseListener = () => {
  const subscription = purchaseUpdatedListener((purchase) => {
    console.log('Purchase received:', purchase)
    handlePurchaseUpdate(purchase)
  })

  // Clean up listener when component unmounts
  return () => {
    if (subscription) {
      subscription.remove()
    }
  }
}

const handlePurchaseUpdate = async (purchase) => {
  try {
    // Validate receipt on your server
    const isValid = await validateReceiptOnServer(purchase)

    if (isValid) {
      // Grant purchase to user
      await grantPurchaseToUser(purchase)

      // Finish the transaction
      await finishTransaction({ purchase })

      console.log('Purchase completed successfully')
    } else {
      console.error('Receipt validation failed')
    }
  } catch (error) {
    console.error('Error handling purchase:', error)
  }
}
```

**Parameters:**

- `callback` (function): Function to call when a purchase update is received
  - `purchase` (Purchase): The purchase object

**Returns:** Subscription object with `remove()` method

## purchaseErrorListener()

Listens for purchase errors from the store.

```tsx
import { purchaseErrorListener } from 'react-native-iap'

const setupErrorListener = () => {
  const subscription = purchaseErrorListener((error) => {
    console.error('Purchase error:', error)
    handlePurchaseError(error)
  })

  // Clean up listener when component unmounts
  return () => {
    if (subscription) {
      subscription.remove()
    }
  }
}

const handlePurchaseError = (error) => {
  switch (error.code) {
    case 'E_USER_CANCELLED':
      // User cancelled the purchase
      console.log('Purchase cancelled by user')
      break

    case 'E_NETWORK_ERROR':
      // Network error occurred
      showErrorMessage(
        'Network error. Please check your connection and try again.'
      )
      break

    case 'E_ITEM_UNAVAILABLE':
      // Product is not available
      showErrorMessage('This product is currently unavailable.')
      break

    case 'E_ALREADY_OWNED':
      // User already owns this product
      showErrorMessage('You already own this product.')
      break

    default:
      // Other errors
      showErrorMessage(`Purchase failed: ${error.message}`)
      break
  }
}
```

**Parameters:**

- `callback` (function): Function to call when a purchase error occurs
  - `error` (PurchaseError): The error object

**Returns:** Subscription object with `remove()` method

## promotedProductListenerIOS() (iOS only)

Listens for promoted product purchases initiated from the App Store. This fires when a user taps on a promoted product in the App Store.

```tsx
import {
  promotedProductListenerIOS,
  requestPromotedProductIOS,
  buyPromotedProductIOS,
} from 'react-native-iap'

const setupPromotedProductListener = () => {
  const subscription = promotedProductListenerIOS((product) => {
    console.log('Promoted product purchase initiated:', product)
    handlePromotedProduct(product)
  })

  return () => {
    if (subscription) {
      subscription.remove()
    }
  }
}

const handlePromotedProduct = async (product) => {
  try {
    // Show your custom purchase UI with the product details
    const confirmed = await showProductConfirmation(product)

    if (confirmed) {
      // Complete the promoted purchase
      await buyPromotedProductIOS()
    }
  } catch (error) {
    console.error('Error handling promoted product:', error)
  }
}
```

**Parameters:**

- `callback` (function): Function to call when a promoted product is selected
  - `product` (Product): The promoted product object

**Returns:** Subscription object with `remove()` method

**Related Methods:**

- `requestPromotedProductIOS()`: Get the promoted product details
- `buyPromotedProductIOS()`: Complete the promoted product purchase

**Note:** This listener only works on iOS devices and is used for handling App Store promoted products.

## Using Listeners with React Hooks

### Functional Components

```tsx
import React, { useEffect } from 'react'
import {
  purchaseUpdatedListener,
  purchaseErrorListener,
} from 'react-native-iap'

export default function PurchaseManager() {
  useEffect(() => {
    // Set up purchase listeners
    const purchaseUpdateSubscription = purchaseUpdatedListener((purchase) => {
      handlePurchaseUpdate(purchase)
    })

    const purchaseErrorSubscription = purchaseErrorListener((error) => {
      handlePurchaseError(error)
    })

    // Cleanup function
    return () => {
      purchaseUpdateSubscription?.remove()
      purchaseErrorSubscription?.remove()
    }
  }, [])

  const handlePurchaseUpdate = async (purchase) => {
    // Handle purchase logic
  }

  const handlePurchaseError = (error) => {
    // Handle error logic
  }

  return <div>{/* Your component JSX */}</div>
}
```

### Class Components

```tsx
import React, { Component } from 'react'
import {
  purchaseUpdatedListener,
  purchaseErrorListener,
} from 'react-native-iap'

class PurchaseManager extends Component {
  purchaseUpdateSubscription = null
  purchaseErrorSubscription = null

  componentDidMount() {
    // Set up listeners
    this.purchaseUpdateSubscription = purchaseUpdatedListener((purchase) => {
      this.handlePurchaseUpdate(purchase)
    })

    this.purchaseErrorSubscription = purchaseErrorListener((error) => {
      this.handlePurchaseError(error)
    })
  }

  componentWillUnmount() {
    // Clean up listeners
    if (this.purchaseUpdateSubscription) {
      this.purchaseUpdateSubscription.remove()
    }

    if (this.purchaseErrorSubscription) {
      this.purchaseErrorSubscription.remove()
    }
  }

  handlePurchaseUpdate = async (purchase) => {
    // Handle purchase logic
  }

  handlePurchaseError = (error) => {
    // Handle error logic
  }

  render() {
    return <div>{/* Your component JSX */}</div>
  }
}
```

## Custom Hook for Purchase Handling

You can create a custom hook to encapsulate purchase listener logic:

```tsx
import { useEffect, useCallback } from 'react'
import {
  purchaseUpdatedListener,
  purchaseErrorListener,
  finishTransaction,
} from 'react-native-iap'

export const usePurchaseHandler = () => {
  const handlePurchaseUpdate = useCallback(async (purchase) => {
    try {
      // Validate receipt
      const isValid = await validateReceiptOnServer(purchase)

      if (isValid) {
        // Grant purchase
        await grantPurchaseToUser(purchase)

        // Finish transaction
        await finishTransaction({ purchase })

        // Show success message
        showSuccessMessage('Purchase completed successfully!')
      } else {
        console.error('Receipt validation failed')
        showErrorMessage('Purchase validation failed. Please contact support.')
      }
    } catch (error) {
      console.error('Error handling purchase:', error)
      showErrorMessage('An error occurred while processing your purchase.')
    }
  }, [])

  const handlePurchaseError = useCallback((error) => {
    console.error('Purchase error:', error)

    switch (error.code) {
      case 'E_USER_CANCELLED':
        // Don't show error for user cancellation
        break
      default:
        showErrorMessage(`Purchase failed: ${error.message}`)
        break
    }
  }, [])

  useEffect(() => {
    // Set up listeners
    const purchaseUpdateSubscription =
      purchaseUpdatedListener(handlePurchaseUpdate)
    const purchaseErrorSubscription = purchaseErrorListener(handlePurchaseError)

    // Cleanup
    return () => {
      purchaseUpdateSubscription?.remove()
      purchaseErrorSubscription?.remove()
    }
  }, [handlePurchaseUpdate, handlePurchaseError])
}

// Usage in component
export default function MyStoreComponent() {
  usePurchaseHandler() // Sets up listeners automatically

  return <div>{/* Your store UI */}</div>
}
```

## Important Notes

### Listener Lifecycle

1. **Set up early**: Set up listeners as early as possible in your app lifecycle
2. **Clean up properly**: Always remove listeners to prevent memory leaks
3. **Handle app states**: Purchases can complete when your app is in the background

### Error Handling

Always handle both purchase updates and errors:

```tsx
useEffect(() => {
  const purchaseUpdateSubscription = purchaseUpdatedListener((purchase) => {
    // Handle successful/pending purchases
  })

  const purchaseErrorSubscription = purchaseErrorListener((error) => {
    // Handle purchase errors
  })

  return () => {
    purchaseUpdateSubscription?.remove()
    purchaseErrorSubscription?.remove()
  }
}, [])
```

### Purchase States

Purchases can be in different states:

- **Purchased**: Successfully completed
- **Pending**: Awaiting approval (e.g., parental approval)
- **Failed**: Purchase failed

Handle each state appropriately in your purchase listener.

## Alternative: useIAP Hook

For simpler usage, consider using the `useIAP` hook which automatically manages listeners:

```tsx
import { useIAP } from 'react-native-iap'

export default function StoreComponent() {
  const { currentPurchase, currentPurchaseError } = useIAP()

  useEffect(() => {
    if (currentPurchase) {
      handlePurchaseUpdate(currentPurchase)
    }
  }, [currentPurchase])

  useEffect(() => {
    if (currentPurchaseError) {
      handlePurchaseError(currentPurchaseError)
    }
  }, [currentPurchaseError])

  // Rest of component
}
```

The `useIAP` hook provides a more React-friendly way to handle purchases without manually managing listeners.
