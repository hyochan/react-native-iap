---
title: Offer Code Redemption Example
sidebar_label: Offer Code
sidebar_position: 4
---

import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# Offer Code Redemption

<AdFitTopFixed />

This guide demonstrates how to redeem App Store offer/promo codes using the native iOS sheet. This is useful for subscription promotional codes and requires a real iOS device.

:::note
The complete working example can be found at [example/screens/OfferCode.tsx](https://github.com/hyochan/react-native-iap/blob/main/example/screens/OfferCode.tsx). Note that the example code was heavily vibe-coded with Claude and is quite verbose/messy for demonstration purposes - use it as a reference only.
:::

## Usage

```tsx
import {Platform, Button} from 'react-native';
import {presentCodeRedemptionSheetIOS} from 'react-native-iap';

function OfferCodeButton() {
  const onPress = async () => {
    if (Platform.OS !== 'ios') return;
    try {
      await presentCodeRedemptionSheetIOS();
      // The system sheet is presented; no result is returned
    } catch (e) {
      console.warn('Failed to present offer code sheet:', e);
    }
  };

  return <Button title="Redeem Offer Code" onPress={onPress} />;
}
```

## Android

Android does not support an in‑app offer code redemption sheet. Instead, direct users to the Google Play redeem page, then refresh entitlements in your app.

```tsx
import {Platform, Button, Linking} from 'react-native';
import {useIAP} from 'react-native-iap';

function RedeemOrRefresh() {
  const {getAvailablePurchases, getActiveSubscriptions} = useIAP();

  const onPress = async () => {
    if (Platform.OS === 'android') {
      // Open Play redeem (web/Store)
      await Linking.openURL('https://play.google.com/redeem');
      // After redeeming, have users come back and refresh
      await Promise.all([getAvailablePurchases(), getActiveSubscriptions()]);
    }
  };

  return <Button title="Redeem (Android)" onPress={onPress} />;
}
```

## Notes

- Platform: iOS only; requires a real device (not supported on simulators)
- App Store Connect: Offer codes must be configured for your subscription
- See also: Core Methods → iOS Specific → `presentCodeRedemptionSheetIOS()`
- Android: Use Google Play redeem flow via `Linking.openURL('https://play.google.com/redeem')` and then refresh with `getAvailablePurchases()` and `getActiveSubscriptions()`
