---
title: Available Purchases Example
sidebar_label: Available Purchases
sidebar_position: 3
---

import IapKitBanner from "@site/src/uis/IapKitBanner";

# Available Purchases

<IapKitBanner />

This guide demonstrates how to list and restore previously purchased items (non‑consumables and active subscriptions) using `getAvailablePurchases()` and `getActiveSubscriptions()`.

:::tip
The complete working example can be found at [example/screens/AvailablePurchases.tsx](https://github.com/hyochan/react-native-iap/blob/main/example/screens/AvailablePurchases.tsx).

Note that the example code was heavily vibe-coded with Claude and is quite verbose/messy for demonstration purposes - use it as a reference only.
:::

## Important: Hook vs Root API

There are two ways to use `getAvailablePurchases()`, and they behave differently:

| API | Return Type | How to Access Data |
|-----|-------------|-------------------|
| **useIAP Hook** | `Promise<void>` | Read from `availablePurchases` state after calling |
| **Root API** (direct import) | `Promise<Purchase[]>` | Returned directly from the function |

```tsx
// ✅ useIAP Hook - returns void, updates state
const { getAvailablePurchases, availablePurchases } = useIAP();
await getAvailablePurchases(); // returns void
console.log(availablePurchases); // read from state

// ✅ Root API - returns data directly
import { getAvailablePurchases } from 'react-native-iap';
const purchases = await getAvailablePurchases(); // returns Purchase[]
```

## Restore Flow (Using Hook)

- Ensure the store connection is active (handled by `useIAP`)
- Call both `getAvailablePurchases()` and `getActiveSubscriptions()`
- Read restored items from hook state (`availablePurchases`, `activeSubscriptions`)
- Validate on your server and grant entitlements

```tsx
import React, {useCallback} from 'react';
import {Alert} from 'react-native';
import {useIAP} from 'react-native-iap';

export default function AvailablePurchasesScreen() {
  const {
    connected,
    getAvailablePurchases,
    getActiveSubscriptions,
    availablePurchases,
    activeSubscriptions,
    finishTransaction,
  } = useIAP();

  const restore = useCallback(async () => {
    if (!connected) return;

    // Both methods return void and update internal state
    await Promise.all([
      getAvailablePurchases(),
      getActiveSubscriptions(),
    ]);

    // Read from hook state (availablePurchases is now updated)
    for (const p of availablePurchases) {
      // TODO: validate on your backend first
      // await grantEntitlement(p)
      // Non-consumables and subscriptions typically don't require consumption
      await finishTransaction({purchase: p, isConsumable: false});
    }

    Alert.alert('Restored', `Restored ${availablePurchases.length} purchases`);
  }, [connected, getAvailablePurchases, getActiveSubscriptions, availablePurchases, finishTransaction]);

  return null; // Render your UI and call restore() from a button
}
```

## Showing Active Subscriptions

The hook exposes `activeSubscriptions`, which you can render directly after calling `getActiveSubscriptions()`:

```tsx
import {useEffect} from 'react';
import {View, Text} from 'react-native';
import {useIAP} from 'react-native-iap';

function ActiveSubscriptionsList() {
  const {activeSubscriptions, getActiveSubscriptions} = useIAP();

  useEffect(() => {
    getActiveSubscriptions();
  }, [getActiveSubscriptions]);

  return (
    <View>
      {activeSubscriptions.map((s) => (
        <Text key={s.productId}>{s.productId}</Text>
      ))}
    </View>
  );
}
```

## Tips

- Only non‑consumables and subscriptions are returned; consumables are not restorable
- Always perform server‑side validation before granting access
- On iOS, you can optionally filter for active items using `onlyIncludeActiveItemsIOS`
- Android tip: If users redeem a promo code in Google Play, open `https://play.google.com/redeem` with `Linking.openURL(...)` and then refresh with `getAvailablePurchases()` and `getActiveSubscriptions()`
