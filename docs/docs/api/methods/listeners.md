---
title: Listeners
sidebar_label: Listeners
sidebar_position: 2
---

import IapKitBanner from "@site/src/uis/IapKitBanner";

# Purchase Listeners

<IapKitBanner />

react-native-iap provides event listeners to handle purchase updates and errors. These listeners are essential for handling the asynchronous nature of in-app purchases.

## purchaseUpdatedListener()

Listens for purchase updates from **the** store.

```tsx
import {purchaseUpdatedListener} from 'react-native-iap';

const setupPurchaseListener = () => {
  const subscription = purchaseUpdatedListener((purchase) => {
    console.log('Purchase received:', purchase);
    handlePurchaseUpdate(purchase);
  });

  // Clean up listener when component unmounts
  return () => {
    if (subscription) {
      subscription.remove();
    }
  };
};

const handlePurchaseUpdate = async (purchase) => {
  try {
    // Validate receipt on your server
    const isValid = await validateReceiptOnServer(purchase);

    if (isValid) {
      // Grant purchase to user
      await grantPurchaseToUser(purchase);

      // Finish the transaction
      await finishTransaction({purchase});

      console.log('Purchase completed successfully');
    } else {
      console.error('Purchase verification failed');
    }
  } catch (error) {
    console.error('Error handling purchase:', error);
  }
};
```

**Parameters:**

- `callback` (function): Function to call when a purchase update is received
  - `purchase` (Purchase): The purchase object

**Returns:** Subscription object with `remove()` method

## purchaseErrorListener()

Listens for purchase errors from the store.

```tsx
import {purchaseErrorListener} from 'react-native-iap';

const setupErrorListener = () => {
  const subscription = purchaseErrorListener((error) => {
    console.error('Purchase error:', error);
    handlePurchaseError(error);
  });

  // Clean up listener when component unmounts
  return () => {
    if (subscription) {
      subscription.remove();
    }
  };
};

const handlePurchaseError = (error) => {
  switch (error.code) {
    case ErrorCode.UserCancelled:
      // User cancelled the purchase
      console.log('Purchase cancelled by user');
      break;

    case ErrorCode.NetworkError:
      // Network error occurred
      showErrorMessage(
        'Network error. Please check your connection and try again.',
      );
      break;

    case ErrorCode.ItemUnavailable:
      // Product is not available
      showErrorMessage('This product is currently unavailable.');
      break;

    case ErrorCode.AlreadyOwned:
      // User already owns this product
      showErrorMessage('You already own this product.');
      break;

    default:
      // Other errors
      showErrorMessage(`Purchase failed: ${error.message}`);
      break;
  }
};
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
  getPromotedProductIOS,
  requestPurchaseOnPromotedProductIOS,
} from 'react-native-iap';

const setupPromotedProductListener = () => {
  const subscription = promotedProductListenerIOS((product) => {
    console.log('Promoted product purchase initiated:', product);
    handlePromotedProduct(product);
  });

  return () => {
    if (subscription) {
      subscription.remove();
    }
  };
};

const handlePromotedProduct = async (product) => {
  try {
    // Show your custom purchase UI with the product details
    const confirmed = await showProductConfirmation(product);

    if (confirmed) {
      // Complete the promoted purchase
      await requestPurchaseOnPromotedProductIOS();
    }
  } catch (error) {
    console.error('Error handling promoted product:', error);
  }
};
```

**Parameters:**

- `callback` (function): Function to call when a promoted product is selected
  - `product` (Product): The promoted product object

**Returns:** Subscription object with `remove()` method

**Related Methods:**

- `getPromotedProductIOS()`: Get the promoted product details
- `requestPurchaseOnPromotedProductIOS()`: Complete the promoted product purchase

**Note:** This listener only works on iOS devices and is used for handling App Store promoted products.

## Using Listeners with React Hooks

### Functional Components

```tsx
import React, {useEffect} from 'react';
import {purchaseUpdatedListener, purchaseErrorListener} from 'react-native-iap';

export default function PurchaseManager() {
  useEffect(() => {
    // Set up purchase listeners
    const purchaseUpdateSubscription = purchaseUpdatedListener((purchase) => {
      handlePurchaseUpdate(purchase);
    });

    const purchaseErrorSubscription = purchaseErrorListener((error) => {
      handlePurchaseError(error);
    });

    // Cleanup function
    return () => {
      purchaseUpdateSubscription?.remove();
      purchaseErrorSubscription?.remove();
    };
  }, []);

  const handlePurchaseUpdate = async (purchase) => {
    // Handle purchase logic
  };

  const handlePurchaseError = (error) => {
    // Handle error logic
  };

  return <div>{/* Your component JSX */}</div>;
}
```

### Class Components

```tsx
import React, {Component} from 'react';
import {purchaseUpdatedListener, purchaseErrorListener} from 'react-native-iap';

class PurchaseManager extends Component {
  purchaseUpdateSubscription = null;
  purchaseErrorSubscription = null;

  componentDidMount() {
    // Set up listeners
    this.purchaseUpdateSubscription = purchaseUpdatedListener((purchase) => {
      this.handlePurchaseUpdate(purchase);
    });

    this.purchaseErrorSubscription = purchaseErrorListener((error) => {
      this.handlePurchaseError(error);
    });
  }

  componentWillUnmount() {
    // Clean up listeners
    if (this.purchaseUpdateSubscription) {
      this.purchaseUpdateSubscription.remove();
    }

    if (this.purchaseErrorSubscription) {
      this.purchaseErrorSubscription.remove();
    }
  }

  handlePurchaseUpdate = async (purchase) => {
    // Handle purchase logic
  };

  handlePurchaseError = (error) => {
    // Handle error logic
  };

  render() {
    return <div>{/* Your component JSX */}</div>;
  }
}
```

## Custom Hook for Purchase Handling

You can create a custom hook to encapsulate purchase listener logic:

```tsx
import {useEffect, useCallback} from 'react';
import {
  purchaseUpdatedListener,
  purchaseErrorListener,
  finishTransaction,
} from 'react-native-iap';

export const usePurchaseHandler = () => {
  const handlePurchaseUpdate = useCallback(async (purchase) => {
    try {
      // Validate receipt
      const isValid = await validateReceiptOnServer(purchase);

      if (isValid) {
        // Grant purchase
        await grantPurchaseToUser(purchase);

        // Finish transaction
        await finishTransaction({purchase});

        // Show success message
        showSuccessMessage('Purchase completed successfully!');
      } else {
        console.error('Purchase verification failed');
        showErrorMessage('Purchase validation failed. Please contact support.');
      }
    } catch (error) {
      console.error('Error handling purchase:', error);
      showErrorMessage('An error occurred while processing your purchase.');
    }
  }, []);

  const handlePurchaseError = useCallback((error) => {
    console.error('Purchase error:', error);

    switch (error.code) {
      case ErrorCode.UserCancelled:
        // Don't show error for user cancellation
        break;
      default:
        showErrorMessage(`Purchase failed: ${error.message}`);
        break;
    }
  }, []);

  useEffect(() => {
    // Set up listeners
    const purchaseUpdateSubscription =
      purchaseUpdatedListener(handlePurchaseUpdate);
    const purchaseErrorSubscription =
      purchaseErrorListener(handlePurchaseError);

    // Cleanup
    return () => {
      purchaseUpdateSubscription?.remove();
      purchaseErrorSubscription?.remove();
    };
  }, [handlePurchaseUpdate, handlePurchaseError]);
};

// Usage in component
export default function MyStoreComponent() {
  usePurchaseHandler(); // Sets up listeners automatically

  return <div>{/* Your store UI */}</div>;
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
  });

  const purchaseErrorSubscription = purchaseErrorListener((error) => {
    // Handle purchase errors
  });

  return () => {
    purchaseUpdateSubscription?.remove();
    purchaseErrorSubscription?.remove();
  };
}, []);
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
import {useIAP} from 'react-native-iap';

export default function StoreComponent() {
  const {finishTransaction} = useIAP({
    onPurchaseSuccess: async (purchase) => {
      await handlePurchaseUpdate(purchase);
    },
    onPurchaseError: (error) => {
      handlePurchaseError(error);
    },
  });

  // Rest of component
}
```

The `useIAP` hook provides a more React-friendly way to handle purchases without manually managing listeners.

## userChoiceBillingListenerAndroid()

Android-only listener for User Choice Billing events. This fires when a user selects alternative billing instead of Google Play billing in the User Choice Billing dialog (only in `user-choice` mode).

```tsx
import {initConnection, userChoiceBillingListenerAndroid} from 'react-native-iap';
import {Platform} from 'react-native';

const setupUserChoiceBillingListener = () => {
  if (Platform.OS !== 'android') return;

  // Initialize with user-choice billing program
  await initConnection({
    enableBillingProgramAndroid: 'user-choice-billing',
  });

  const subscription = userChoiceBillingListenerAndroid((details) => {
    console.log('User selected alternative billing');
    console.log('Token:', details.externalTransactionToken);
    console.log('Products:', details.products);

    handleUserChoiceBilling(details);
  });

  // Clean up listener when component unmounts
  return () => {
    if (subscription) {
      subscription.remove();
    }
  };
};

const handleUserChoiceBilling = async (details) => {
  try {
    // Step 1: Process payment in your payment system
    const paymentResult = await processPaymentInYourSystem(details.products);

    if (!paymentResult.success) {
      console.error('Payment failed');
      return;
    }

    // Step 2: Report token to Google Play backend within 24 hours
    await reportTokenToGooglePlay({
      token: details.externalTransactionToken,
      products: details.products,
      paymentResult,
    });

    console.log('Alternative billing completed successfully');
  } catch (error) {
    console.error('Error handling user choice billing:', error);
  }
};
```

**Parameters:**

- `callback` (function): Function to call when user selects alternative billing
  - `details` (UserChoiceBillingDetails): The user choice billing details
    - `externalTransactionToken` (string): Token that must be reported to Google within 24 hours
    - `products` (string[]): List of product IDs selected by the user

**Returns:** Subscription object with `remove()` method

**Platform:** Android only (requires `user-choice` mode)

**Important:**

- Only fires when using `enableBillingProgramAndroid: 'user-choice-billing'`
- Token must be reported to Google Play backend within 24 hours
- If user selects Google Play billing instead, `purchaseUpdatedListener` will fire as normal

**Example with React:**

```tsx
import {useEffect} from 'react';
import {initConnection, userChoiceBillingListenerAndroid} from 'react-native-iap';
import {Platform} from 'react-native';

export default function AlternativeBillingComponent() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const initialize = async () => {
      // Initialize with user-choice billing program
      await initConnection({
        enableBillingProgramAndroid: 'user-choice-billing',
      });

      // Set up listener
      const subscription = userChoiceBillingListenerAndroid(async (details) => {
        console.log('User chose alternative billing');

        // Process payment and report to Google
        await handleAlternativeBilling(details);
      });

      return () => {
        subscription.remove();
      };
    };

    const cleanup = initialize();

    return () => {
      cleanup.then((fn) => fn?.());
    };
  }, []);

  // Rest of component
}
```

**See also:**

- [checkAlternativeBillingAvailabilityAndroid()](/docs/api/methods/core-methods#checkalternativebillingavailabilityandroid)
- [showAlternativeBillingDialogAndroid()](/docs/api/methods/core-methods#showalternativebillingdialogandroid)
- [createAlternativeBillingTokenAndroid()](/docs/api/methods/core-methods#createalternativebillingtokenandroid)
- [Google Play Alternative Billing documentation](https://developer.android.com/google/play/billing/alternative)

## developerProvidedBillingListenerAndroid()

Android-only listener for Developer Provided Billing events (External Payments program). This fires when a user selects the developer's payment option in the External Payments side-by-side choice dialog during purchase flow.

**Requires:** Google Play Billing Library 8.3.0+

**Availability:** Japan only

```tsx
import {
  initConnection,
  developerProvidedBillingListenerAndroid,
  requestPurchase,
} from 'react-native-iap';
import {Platform} from 'react-native';

const setupDeveloperProvidedBillingListener = async () => {
  if (Platform.OS !== 'android') return;

  // Initialize with External Payments program enabled
  await initConnection({
    enableBillingProgramAndroid: 'external-payments',
  });

  const subscription = developerProvidedBillingListenerAndroid((details) => {
    console.log('User selected developer billing');
    console.log('Token:', details.externalTransactionToken);

    handleDeveloperProvidedBilling(details);
  });

  // Clean up listener when component unmounts
  return () => {
    if (subscription) {
      subscription.remove();
    }
  };
};

const handleDeveloperProvidedBilling = async (details) => {
  try {
    // Step 1: Process payment with your payment gateway
    const paymentResult = await processPaymentWithYourGateway(
      details.externalTransactionToken,
    );

    if (!paymentResult.success) {
      console.error('Payment failed');
      return;
    }

    // Step 2: IMPORTANT - Report token to Google Play within 24 hours
    await reportExternalTransactionToGoogle(details.externalTransactionToken);

    console.log('Developer billing completed successfully');
  } catch (error) {
    console.error('Error handling developer provided billing:', error);
  }
};
```

**Parameters:**

- `callback` (function): Function to call when user selects developer billing
  - `details` (DeveloperProvidedBillingDetailsAndroid): The developer billing details
    - `externalTransactionToken` (string): Token that must be reported to Google within 24 hours

**Returns:** Subscription object with `remove()` method

**Platform:** Android only (8.3.0+, Japan only)

### Comparison: User Choice vs Developer Provided Billing

| Feature | User Choice Billing | Developer Provided Billing |
|---------|---------------------|---------------------------|
| Billing Library | 7.0+ | 8.3.0+ |
| Availability | Eligible regions | Japan only |
| When presented | After initConnection() | During requestPurchase() |
| UI | Separate dialog | Side-by-side choice in purchase dialog |
| Listener | `userChoiceBillingListenerAndroid` | `developerProvidedBillingListenerAndroid` |
| Setup | `enableBillingProgramAndroid: 'user-choice-billing'` | `enableBillingProgramAndroid: 'external-payments'` + `developerBillingOption` in requestPurchase |

### Example with External Payments Flow

```tsx
import {useEffect} from 'react';
import {
  initConnection,
  isBillingProgramAvailableAndroid,
  developerProvidedBillingListenerAndroid,
  requestPurchase,
} from 'react-native-iap';
import {Platform} from 'react-native';

export default function ExternalPaymentsComponent() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const initialize = async () => {
      // Initialize with External Payments program
      await initConnection({
        enableBillingProgramAndroid: 'external-payments',
      });

      // Check availability (Japan only)
      const result = await isBillingProgramAvailableAndroid('external-payments');
      if (!result.isAvailable) {
        console.log('External Payments not available (not in Japan)');
        return;
      }

      // Set up listener
      const subscription = developerProvidedBillingListenerAndroid(
        async (details) => {
          console.log('User selected developer billing');

          // Process payment and report to Google
          await handleExternalPayment(details.externalTransactionToken);
        },
      );

      return () => {
        subscription.remove();
      };
    };

    const cleanup = initialize();

    return () => {
      cleanup.then((fn) => fn?.());
    };
  }, []);

  const purchaseWithExternalPayments = async (sku: string) => {
    await requestPurchase({
      request: {
        google: {
          skus: [sku],
          developerBillingOption: {
            billingProgram: 'external-payments',
            linkUri: 'https://your-payment-site.com/checkout',
            launchMode: 'launch-in-external-browser-or-app',
          },
        },
      },
      type: 'in-app',
    });
  };

  // Rest of component
}
```

**Important:**

- Token must be reported to Google Play within 24 hours
- User sees a side-by-side choice between Google Play billing and your payment option
- If user selects Google Play billing, `purchaseUpdatedListener` fires as normal
- If user selects developer billing, this listener fires with the token

**See also:**

- [isBillingProgramAvailableAndroid()](/docs/api/methods/android-specific#isbillingprogramavailableandroid)
- [Google Play External Payment Links](https://developer.android.com/google/play/billing/externalpaymentlinks)
