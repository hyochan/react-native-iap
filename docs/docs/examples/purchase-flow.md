---
title: Purchase Flow Example
sidebar_label: Purchase Flow
sidebar_position: 1
---

import GreatFrontEndTopFixed from "@site/src/uis/GreatFrontEndTopFixed";

# Purchase Flow

<GreatFrontEndTopFixed />

This guide demonstrates a clean purchase flow using react-native-iap with the `useIAP` hook and the new platform‑specific request shape.

:::tip The complete working example can be found at [example/screens/PurchaseFlow.tsx](https://github.com/hyochan/react-native-iap/blob/main/example/screens/PurchaseFlow.tsx).

Note that the example code was heavily vibe-coded with Claude and is quite verbose/messy for demonstration purposes - use it as a reference only. :::

## Flow Overview

- Initialize: `useIAP` manages the store connection lifecycle

- Load products:

  `fetchProducts({ skus, type: 'in-app' })`

- Start purchase:

  `requestPurchase({ request: { ios: { sku }, android: { skus: [sku] } }, type: 'in-app' })`

- Receive callbacks: `onPurchaseSuccess` / `onPurchaseError` (from `useIAP`)

- Validate server‑side: send receipt/JWS or token to your backend

- Finish transaction:

  `finishTransaction({ purchase, isConsumable })`

```txt
Connect → Fetch Products → Request Purchase → Server Validate → Finish Transaction
```

## Key Concepts

### 1. Connection Management

- `useIAP` automatically opens/closes the connection
- Exposes `connected`, convenient for showing loading states

### 2. Product Loading

- Load in‑app products or subscriptions (set `type`)
- Handle and log failed product fetches

### 3. Purchase Flow

- Start purchases via unified request shape (no `Platform.OS` branching)
- Use `onPurchaseSuccess`/`onPurchaseError` from `useIAP`
- Always call `finishTransaction` after server validation

### 4. Receipt Validation

- Perform validation on your backend (never only on device)
- iOS: validate the receipt/JWS; Android: validate purchase token + package name

### 5. User Experience

- Provide clear states for loading, success, and error
- Show subscription management/deep‑links when appropriate

## Platform Differences

### Purchase Request Parameters

Use the modern, platform‑specific request container (v2.7.0+). This avoids manual `Platform.OS` checks:

```tsx
await requestPurchase({
  request: {
    ios: {sku: productId, quantity: 1},
    android: {skus: [productId]},
  },
  type: 'in-app',
});
```

Notes:

- Keep `andDangerouslyFinishTransactionAutomatically` off (default) to validate first.

### Key iOS Options

- `appAccountToken`: set per user to correlate receipts on your backend
- `quantity`: purchase quantity for iOS (consumables)

### Purchase Object Properties

Purchase objects have different properties on iOS and Android. When accessing platform-specific properties, TypeScript type casting is required:

```tsx
// Unified fields
const token = purchase.purchaseToken; // iOS JWS or Android token

// Android-only helpers
// const pkg = (purchase as PurchaseAndroid).packageNameAndroid;
```

### Receipt Validation

Receipt validation requires different approaches:

- iOS: verify receipt/JWS on your server against Apple
- Android: verify token and package name against Google Play Developer API

## Usage

```tsx
import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import PurchaseFlow from './purchase-flow';

export default function App() {
  return (
    <NavigationContainer>
      <PurchaseFlow />
    </NavigationContainer>
  );
}
```

## Customization

You can customize this example by:

1. **Styling**: Modify the `styles` object to match your app's design
2. **Product IDs**: Update `PRODUCT_IDS` with your actual product IDs
3. **Validation**: Implement proper server-side receipt validation
4. **Error Handling**: Add more specific error handling for your use case
5. **Features**: Add features like purchase restoration, subscription management, etc.

## IAPKit Verification Setup

For server-side receipt validation without managing your own infrastructure, you can use [IAPKit](https://iapkit.com).

### 1. Install react-native-dotenv

```bash
yarn add react-native-dotenv
```

### 2. Configure babel.config.js

```js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
      },
    ],
  ],
};
```

### 3. Create .env file

```bash
IAPKIT_API_KEY=your_iapkit_api_key_here
```

### 4. Add TypeScript declarations

Create `src/types/env.d.ts`:

```ts
declare module '@env' {
  export const IAPKIT_API_KEY: string;
}
```

### 5. Verify purchases with IAPKit

```tsx
import {Platform} from 'react-native';
import {verifyPurchaseWithProvider, Purchase} from 'react-native-iap';
import {IAPKIT_API_KEY} from '@env';

const verifyWithIAPKit = async (purchase: Purchase) => {
  const result = await verifyPurchaseWithProvider({
    provider: 'iapkit',
    iapkit: {
      apiKey: IAPKIT_API_KEY,
      environment: __DEV__ ? 'sandbox' : 'production',
      apple:
        Platform.OS === 'ios'
          ? {
              jws: purchase.purchaseToken!,
            }
          : undefined,
      google:
        Platform.OS === 'android'
          ? {
              purchaseToken: purchase.purchaseToken!,
              packageName: 'com.your.app',
              productId: purchase.productId,
            }
          : undefined,
    },
  });

  return result;
};
```

### 6. Integrate with useIAP

```tsx
const {finishTransaction} = useIAP({
  onPurchaseSuccess: async (purchase) => {
    try {
      // Verify with IAPKit before finishing
      const result = await verifyWithIAPKit(purchase);

      if (result.iapkit.isValid) {
        await finishTransaction({purchase, isConsumable: true});
        Alert.alert('Success', 'Purchase verified and completed!');
      } else {
        Alert.alert('Error', 'Purchase verification failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
    }
  },
});
```

## Next Steps

- Implement proper [receipt validation](../guides/purchases#receipt-validation)
- Add [purchase restoration](../guides/purchases#purchase-restoration)
- Handle [subscription management](../api/methods/core-methods#deeplinktosubscriptions)
- Add comprehensive [error handling](../api/error-handling)
