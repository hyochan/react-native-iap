---
title: Available Purchases Example
sidebar_label: Available Purchases
sidebar_position: 3
---

import GreatFrontEndTopFixed from "@site/src/uis/GreatFrontEndTopFixed";

# Available Purchases

<GreatFrontEndTopFixed />

This guide demonstrates how to list and restore previously purchased items (non‑consumables and active subscriptions) using `getAvailablePurchases()` and `getActiveSubscriptions()`.

:::tip
The complete working example can be found at [example/screens/AvailablePurchases.tsx](https://github.com/hyochan/react-native-iap/blob/main/example/screens/AvailablePurchases.tsx).

Note that the example code was heavily vibe-coded with Claude and is quite verbose/messy for demonstration purposes - use it as a reference only.
:::

## Restore Flow

- Ensure the store connection is active (handled by `useIAP`)
- Call both `getAvailablePurchases()` and `getActiveSubscriptions()`
- Validate on your server and grant entitlements

```tsx
import React from 'react';
import {Alert} from 'react-native';
import {useIAP} from 'react-native-iap';

export default function AvailablePurchasesScreen() {
  const {
    connected,
    availablePurchases,
    getAvailablePurchases,
    getActiveSubscriptions,
    finishTransaction,
  } = useIAP();

  const restore = async () => {
    if (!connected) return;

    // These methods update hook state (availablePurchases, activeSubscriptions)
    // and return Promise<void>, so we use the state after calling them
    await Promise.all([getAvailablePurchases(), getActiveSubscriptions()]);

    for (const p of availablePurchases) {
      // TODO: validate on your backend first
      // await grantEntitlement(p)
      // Non-consumables and subscriptions typically don't require consumption
      await finishTransaction({purchase: p, isConsumable: false});
    }

    Alert.alert('Restored', `Restored ${availablePurchases.length} purchases`);
  };

  return null; // Render your UI and call restore() from a button
}
```

:::note Hook vs Root API
The `useIAP` hook methods (`getAvailablePurchases`, `getActiveSubscriptions`) update internal state and return `Promise<void>`. Access the data through hook state properties like `availablePurchases` and `activeSubscriptions`.

If you need the Promise-based return values, import the root API functions directly:
```tsx
import {getAvailablePurchases, getActiveSubscriptions} from 'react-native-iap';

const purchases = await getAvailablePurchases();
```
:::

## Showing Active Subscriptions

The hook exposes `activeSubscriptions`, which you can render directly after calling `getActiveSubscriptions()`:

```tsx
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
