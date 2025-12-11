---
sidebar_position: 4
---

import GreatFrontEndTopFixed from "@site/src/uis/GreatFrontEndTopFixed";

# Horizon OS

<GreatFrontEndTopFixed />

This guide covers setting up react-native-iap for Meta Quest devices running Horizon OS. Horizon OS uses Meta's Platform SDK for in-app purchases instead of Google Play Billing.

:::info OpenIAP Horizon Setup

For detailed Horizon OS setup instructions including environment configuration, SDK setup, and platform integration details, refer to the official OpenIAP documentation:

**[OpenIAP Horizon OS Setup Guide](https://www.openiap.dev/docs/horizon-setup)**

This guide focuses on react-native-iap specific configuration.

:::

## Prerequisites

- Meta Quest Developer account
- App created in Meta Quest Developer Hub
- Quest device or Quest Link for testing

## React Native IAP Configuration

:::tip Example Configuration

You can refer to the example app for a working configuration. See the commented sections in:

- [`example/android/gradle.properties`](https://github.com/hyochan/react-native-iap/blob/main/example/android/gradle.properties)
- [`example/android/app/src/main/AndroidManifest.xml`](https://github.com/hyochan/react-native-iap/blob/main/example/android/app/src/main/AndroidManifest.xml)

:::

### 1. Enable Horizon Mode

Add `horizonEnabled=true` to your `android/gradle.properties`:

```properties
# Enable Horizon OS support (Meta Quest)
horizonEnabled=true
```

### 2. Add Horizon App ID to AndroidManifest.xml

Add the Horizon App ID metadata to your `android/app/src/main/AndroidManifest.xml`:

```xml
<application>
  <!-- Other configurations -->

  <!-- Meta Horizon App ID (required for Horizon OS) -->
  <meta-data
    android:name="com.meta.horizon.platform.ovr.OCULUS_APP_ID"
    android:value="YOUR_HORIZON_APP_ID" />
</application>
```

Get your App ID from [Meta Quest Developer Hub](https://developer.oculus.com/).

### 3. Clean and Rebuild

After configuration, clean and rebuild your app:

```bash
cd android
./gradlew clean
cd ..
npx react-native run-android
```

This will:

- Use `openiap-google-horizon` artifact instead of `openiap-google`
- Add Horizon Platform SDK dependencies
- Configure the app with your Horizon App ID

## Code Integration

The code integration for Horizon OS is identical to standard Android integration. react-native-iap handles the platform differences automatically.

Use the same `useIAP` hook and API methods as you would for Android or iOS. See the [Purchases Guide](../guides/purchases) for complete examples.

## Build Configuration

When you enable Horizon mode, react-native-iap automatically:

1. **Adds Dependencies**: Includes Horizon Platform SDK and Horizon Billing SDK
2. **Uses Correct Artifact**: Switches to `openiap-google-horizon` instead of `openiap-google`
3. **Configures AndroidManifest**: Your manually added Horizon App ID is used

You can verify the configuration by checking:

```bash
# Check gradle.properties
cat android/gradle.properties | grep horizonEnabled

# Check dependency tree
cd android && ./gradlew :react-native-iap:dependencies --configuration debugRuntimeClasspath | grep openiap-google
```

## Troubleshooting

### "Activity not available" Error

**Solution**: This was fixed in react-native-iap 14.4.31+. Update to the latest version:

```bash
npm install react-native-iap@latest
# or
yarn add react-native-iap@latest
```

### Product IDs Not Found

**Solutions**:

- Verify product IDs match in Meta Quest Developer Hub
- Ensure products are published and active
- Check that your Horizon App ID is correct in AndroidManifest.xml
- Clean and rebuild: `cd android && ./gradlew clean`

### Wrong Artifact Being Used

**Solutions**:

- Check that `horizonEnabled=true` is in `android/gradle.properties`
- Clean build: `cd android && ./gradlew clean`
- Check build logs to verify correct artifact is being used

## Next Steps

- [Purchases Guide](../guides/purchases) - Learn how to implement purchases
- [Error Codes](../api/error-codes) - Understand error handling
- [OpenIAP Horizon Setup](https://www.openiap.dev/docs/horizon-setup) - Detailed platform setup
