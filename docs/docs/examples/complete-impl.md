---
sidebar_position: 3
---

import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# Complete Purchase

<AdFitTopFixed />

This example shows how to properly complete a purchase transaction with validation and finishTransaction.

## Complete Example

For a production-ready purchase implementation, please refer to our complete example:

**📱 [PurchaseFlow.tsx](https://github.com/hyochan/react-native-iap/blob/main/example/screens/PurchaseFlow.tsx)**

This example demonstrates:

- ✅ Complete purchase flow with event listeners
- ✅ Product loading and display
- ✅ Purchase request handling
- ✅ Transaction completion with finishTransaction
- ✅ Platform-specific receipt handling
- ✅ Error handling and user feedback
- ✅ Purchase result display

## Complete Purchase Flow

The critical steps after initiating a purchase are handling the purchase event, validating the receipt, and finishing the transaction.

### 1. Setup Purchase Listeners

```tsx
import {
  purchaseUpdatedListener,
  purchaseErrorListener,
  type Purchase,
  type NitroPurchaseResult,
} from 'react-native-iap';

useEffect(() => {
  // Set up purchase success listener
  const updateSubscription = purchaseUpdatedListener((purchase: Purchase) => {
    handlePurchaseUpdate(purchase);
  });

  // Set up purchase error listener
  const errorSubscription = purchaseErrorListener(
    (error: NitroPurchaseResult) => {
      handlePurchaseError(error);
    },
  );

  // Cleanup
  return () => {
    updateSubscription.remove();
    errorSubscription.remove();
  };
}, []);
```

### 2. Handle Successful Purchase

```tsx
const handlePurchaseUpdate = async (purchase: Purchase) => {
  console.log('✅ Purchase successful:', purchase);

  try {
    // Step 1: Validate receipt (implement server-side validation)
    const isValid = await validateReceiptOnServer(purchase);

    if (isValid) {
      // Step 2: Grant purchase to user
      await grantPurchaseToUser(purchase);

      // Step 3: Finish the transaction (required)
      await finishTransaction({
        purchase,
        isConsumable: true, // Set based on your product type
      });

      console.log('Transaction finished successfully');
      Alert.alert('Success', 'Thank you for your purchase!');
    } else {
      Alert.alert('Error', 'Purchase validation failed');
    }
  } catch (error) {
    console.error('Failed to complete purchase:', error);
    Alert.alert('Error', 'Failed to process purchase');
  }
};
```

### 3. Handle Purchase Errors

```tsx
const handlePurchaseError = (error: NitroPurchaseResult) => {
  console.error('❌ Purchase failed:', error);

  if (error.code === 'E_USER_CANCELLED') {
    // User cancelled - no action needed
    console.log('User cancelled the purchase');
  } else {
    Alert.alert('Purchase Failed', error.message || 'Unknown error');
  }
};
```

### 4. Initiate Purchase

```tsx
const handlePurchase = async (productId: string) => {
  try {
    // Request purchase - results come through event listeners
    await requestPurchase({
      request: {
        ios: {
          sku: productId,
          quantity: 1,
        },
        android: {
          skus: [productId],
        },
      },
      type: 'inapp',
    });

    // Purchase result will be handled by purchaseUpdatedListener
    console.log('Purchase request sent - waiting for result');
  } catch (error) {
    console.error('Purchase request failed:', error);
    Alert.alert('Error', 'Failed to initiate purchase');
  }
};
```

## Key Implementation Points

### Receipt Validation

Always validate receipts server-side before granting purchases:

```tsx
const validateReceiptOnServer = async (purchase: Purchase) => {
  const receipt = purchase.purchaseToken;

  const response = await fetch('https://your-server.com/validate', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      platform: Platform.OS,
      productId: purchase.productId,
      receipt,
      transactionId: purchase.id,
    }),
  });

  const result = await response.json();
  return result.isValid;
};
```

### Platform-Specific Receipt Data

Different platforms provide different receipt formats:

```tsx
// iOS & Android
const purchaseToken = purchase.purchaseToken; // iOS: JWS (StoreKit 2), Android: purchaseToken

// Android Receipt
const androidReceipt = (purchase as any).dataAndroid; // Purchase data JSON
const signature = (purchase as any).signatureAndroid; // Signature for validation
```

### Transaction Completion

Always call `finishTransaction` after processing:

```tsx
await finishTransaction({
  purchase,
  isConsumable: true, // true for consumable products
});
```

- **Consumable products**: Set `isConsumable: true` (can be purchased multiple times)
- **Non-consumables & Subscriptions**: Set `isConsumable: false` (one-time purchase)

## Best Practices

1. **Always use event listeners** - Purchase results come through listeners, not return values
2. **Validate receipts server-side** - Never trust client-side validation alone
3. **Call finishTransaction** - Required to complete the transaction
4. **Handle all error cases** - Including user cancellation
5. **Provide user feedback** - Show loading states and results
6. **Store transaction records** - Keep purchase history in your backend

## Complete Working Example

See the full implementation: **[PurchaseFlow.tsx](https://github.com/hyochan/react-native-iap/tree/main/example/screens/PurchaseFlow.tsx)**

## See Also

- [Basic Store Example](./basic-store) - Simple product purchase flow
- [Subscription Manager](./subscription-manager) - Subscription-specific implementation
- [useIAP Hook](../api/use-iap) - Alternative React Hook approach
- [Error Handling](../api/error-codes) - Comprehensive error management
