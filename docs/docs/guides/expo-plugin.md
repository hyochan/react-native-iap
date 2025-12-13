---
title: Expo Plugin
---

import GreatFrontEndTopFixed from "@site/src/uis/GreatFrontEndTopFixed";

<GreatFrontEndTopFixed />

`react-native-iap` comes with a config plugin to automatically configure your project for both iOS and Android. This guide explains how to use it and what it does.

## Usage

To use the plugin, add it to the `plugins` array in your `app.json` or `app.config.js`:

```json
{
  "expo": {
    "plugins": ["react-native-iap"]
  }
}
```

This is the most basic configuration. The plugin also accepts options for local development.

## What it does

### Android

- Adds the `com.android.vending.BILLING` permission to `AndroidManifest.xml`.
- Adds the `io.github.hyochan.openiap:openiap-google` dependency to your app's `build.gradle`.

### iOS

- Ensures the CocoaPods CDN source is present in your `Podfile`.
- Removes any stale local OpenIAP pod entries to avoid conflicts.

### iOS Folly Workaround

The plugin includes a workaround (`withIapIosFollyWorkaround`) to prevent iOS build failures related to Folly coroutines. This is particularly useful when encountering issues with non-vendored `<folly/coro/*>` headers.

To enable this workaround, you can pass the `ios.with-folly-no-coroutines` option to the plugin in your `app.json` or `app.config.js`:

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-iap",
        {
          "ios": {
            "with-folly-no-coroutines": true
          }
        }
      ]
    ]
  }
}
```

When enabled, this option injects preprocessor definitions (`FOLLY_NO_CONFIG=1`, `FOLLY_CFG_NO_COROUTINES=1`, `FOLLY_HAS_COROUTINES=0`) into your Podfile's `post_install` hook. These definitions disable Folly coroutine support, resolving potential build conflicts.

### IAPKit API Key

If you're using [IAPKit](https://iapkit.com) for purchase verification, you can configure your API key directly in the plugin. The key will be automatically added to both platforms:

- **Android**: Added as `<meta-data android:name="dev.iapkit.API_KEY" android:value="your-key" />` in `AndroidManifest.xml`
- **iOS**: Added as `IAPKitAPIKey` in `Info.plist`

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-iap",
        {
          "iapkitApiKey": "your-iapkit-api-key"
        }
      ]
    ]
  }
}
```

You can then use `verifyPurchaseWithProvider` to verify purchases:

```typescript
import {verifyPurchaseWithProvider} from 'react-native-iap';

const result = await verifyPurchaseWithProvider({
  provider: 'iapkit',
  iapkit: {
    apiKey: 'your-iapkit-api-key', // Or read from native config
    apple: {jws: purchase.purchaseToken},
    google: {purchaseToken: purchase.purchaseToken},
  },
});
```
