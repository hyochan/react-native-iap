---
title: Alternative Billing
sidebar_label: Alternative Billing
sidebar_position: 3.5
---

import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# Alternative Billing

<AdFitTopFixed />

This guide explains how to implement alternative billing functionality in your app using react-native-iap, allowing you to use external payment systems alongside or instead of the App Store/Google Play billing.

## Official Documentation

### Apple (iOS)

- [StoreKit External Purchase Documentation](https://developer.apple.com/documentation/storekit/external-purchase) - Official StoreKit external purchase API reference
- [External Purchase Link Entitlement](https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.storekit.external-purchase-link) - Entitlement configuration
- [ExternalPurchaseCustomLink API](https://developer.apple.com/documentation/storekit/externalpurchasecustomlink) - Custom link API documentation
- [OpenIAP External Purchase](https://www.openiap.dev/docs/external-purchase) - OpenIAP external purchase specification

### Google Play (Android)

- [Alternative Billing APIs](https://developer.android.com/google/play/billing/alternative) - Official Android alternative billing API guide
- [User Choice Billing Overview](https://support.google.com/googleplay/android-developer/answer/13821247) - Understanding user choice billing
- [User Choice Billing Pilot](https://support.google.com/googleplay/android-developer/answer/12570971) - Enrollment and setup
- [Payments Policy](https://support.google.com/googleplay/android-developer/answer/10281818) - Google Play's payment policy
- [UX Guidelines (User Choice)](https://developer.android.com/google/play/billing/alternative/interim-ux/user-choice) - User choice billing UX guidelines
- [UX Guidelines (Alternative Billing)](https://developer.android.com/google/play/billing/alternative/interim-ux/billing-choice) - Alternative billing UX guidelines
- [EEA Alternative Billing](https://support.google.com/googleplay/android-developer/answer/12348241) - European Economic Area specific guidance

### Platform Updates (2024)

#### iOS

- US apps can use StoreKit External Purchase Link Entitlement
- System disclosure sheet shown each time external link is accessed
- Commission: 27% (reduced from 30%) for first year, 12% for subsequent years
- EU apps have additional flexibility for external purchases

#### Android

- As of March 13, 2024: Alternative billing APIs must be used (manual reporting deprecated)
- Service fee reduced by 4% when using alternative billing (e.g., 15% → 11%)
- Available in South Korea, India, and EEA
- Gaming and non-gaming apps eligible (varies by region)

## Overview

Alternative billing enables developers to offer payment options outside of the platform's standard billing systems:

- **iOS**: Redirect users to external websites for payment (iOS 16.0+)
- **Android**: Use Google Play's alternative billing options (requires approval)

:::warning Platform Approval Required

Both platforms require special approval to use alternative billing:

- **iOS**: Must be approved for external purchase entitlement
- **Android**: Must be approved for alternative billing in Google Play Console

:::

## iOS Alternative Billing (External Purchase URLs)

On iOS, alternative billing works by redirecting users to an external website where they complete the purchase.

### Configuration (Expo Projects)

For Expo projects, configure iOS alternative billing in your `app.config.ts`:

```typescript
export default {
  // ... other config
  plugins: [
    [
      'react-native-iap',
      {
        iosAlternativeBilling: {
          // Required: Countries where external purchases are supported (ISO 3166-1 alpha-2)
          countries: ['kr', 'nl', 'de', 'fr', 'it', 'es'],

          // Optional: External purchase URLs per country (iOS 15.4+)
          links: {
            kr: 'https://your-site.com/kr/checkout',
            nl: 'https://your-site.com/nl/checkout',
            de: 'https://your-site.com/de/checkout',
          },

          // Optional: Multiple URLs per country (iOS 17.5+, up to 5)
          multiLinks: {
            fr: [
              'https://your-site.com/fr',
              'https://your-site.com/global-sale',
            ],
            it: ['https://your-site.com/global-sale'],
          },

          // Optional: Custom link regions (iOS 18.1+)
          customLinkRegions: ['de', 'fr', 'nl'],

          // Optional: Streaming regions for music apps (iOS 18.2+)
          streamingLinkRegions: ['at', 'de', 'fr', 'nl', 'is', 'no'],

          // Enable external purchase link entitlement
          enableExternalPurchaseLink: true,

          // Enable streaming entitlement (music apps only)
          enableExternalPurchaseLinkStreaming: false,
        },
      },
    ],
  ],
};
```

This automatically adds the required configuration to your iOS app:

**Entitlements:**

```xml
<plist>
<dict>
    <!-- Automatically added when countries are specified -->
    <key>com.apple.developer.storekit.external-purchase</key>
    <true/>

    <!-- Added when enableExternalPurchaseLink is true -->
    <key>com.apple.developer.storekit.external-purchase-link</key>
    <true/>

    <!-- Added when enableExternalPurchaseLinkStreaming is true -->
    <key>com.apple.developer.storekit.external-purchase-link-streaming</key>
    <true/>
</dict>
</plist>
```

**Info.plist:**

```xml
<plist>
<dict>
    <!-- Countries where external purchases are supported -->
    <key>SKExternalPurchase</key>
    <array>
        <string>kr</string>
        <string>nl</string>
        <string>de</string>
    </array>

    <!-- External purchase URLs (optional) -->
    <key>SKExternalPurchaseLink</key>
    <dict>
        <key>kr</key>
        <string>https://your-site.com/kr/checkout</string>
    </dict>

    <!-- Multiple URLs per country (optional) -->
    <key>SKExternalPurchaseMultiLink</key>
    <dict>
        <key>fr</key>
        <array>
            <string>https://your-site.com/fr</string>
            <string>https://your-site.com/global-sale</string>
        </array>
    </dict>
</dict>
</plist>
```

### Configuration (React Native CLI)

For React Native CLI projects, manually add the entitlements and Info.plist configuration shown above to your iOS project.

:::warning Requirements

- **Approval Required**: You must obtain approval from Apple to use external purchase features
- **URL Format**: URLs must use HTTPS, have no query parameters, and be 1,000 characters or fewer
- **Link Limits**:
  - Music streaming apps: up to 5 links per country (EU + Iceland, Norway)
  - Other apps: 1 link per country
- **Supported Regions**: Different features support different regions (EU, US, etc.)

See [External Purchase Link Entitlement](https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.storekit.external-purchase-link) for details.

:::

### iOS API Usage

#### Check Notice Sheet Availability (iOS 18.2+)

```typescript
import {canPresentExternalPurchaseNoticeIOS} from 'react-native-iap';

const canPresent = await canPresentExternalPurchaseNoticeIOS();
if (canPresent) {
  // Device supports notice sheets
}
```

#### Present Notice Sheet (iOS 18.2+)

```typescript
import {presentExternalPurchaseNoticeSheetIOS} from 'react-native-iap';

const result = await presentExternalPurchaseNoticeSheetIOS();

if (result.result === 'continue') {
  // User chose to continue - proceed to external purchase
  console.log('User accepted notice');
} else if (result.result === 'cancel') {
  console.log('User cancelled');
}
```

#### Present External Purchase Link (iOS 16.0+)

```typescript
import {presentExternalPurchaseLinkIOS} from 'react-native-iap';

const result = await presentExternalPurchaseLinkIOS(
  'https://your-website.com/purchase',
);

if (result.success) {
  console.log('User was redirected to external website');
  // Complete purchase on your website
  // Implement deep link to return to app
} else if (result.error) {
  console.error('Error:', result.error);
}
```

### Complete iOS Example

See [AlternativeBilling.tsx](https://github.com/hyochan/react-native-iap/blob/main/example/screens/AlternativeBilling.tsx) for a complete working example that includes:

- Notice sheet handling (iOS 18.2+)
- External purchase link presentation
- Error handling and user feedback

### Important iOS Notes

- **iOS 16.0+ Required**: External purchase links only work on iOS 16.0 and later
- **No Purchase Callback**: The `purchaseUpdatedListener` will NOT fire when using external URLs
- **Deep Link Required**: Implement deep linking to return users to your app after purchase
- **Manual Validation**: You must validate purchases on your backend server

## Android Alternative Billing

Android supports two alternative billing modes:

1. **Alternative Billing Only**: Users can ONLY use your payment system
2. **User Choice Billing**: Users choose between Google Play or your payment system

### Configuring Alternative Billing Mode

Set the billing mode when initializing the connection:

```typescript
import {initConnection} from 'react-native-iap';

// Alternative Billing Only mode
await initConnection({
  alternativeBillingModeAndroid: 'alternative-only',
});

// User Choice Billing mode
await initConnection({
  alternativeBillingModeAndroid: 'user-choice',
});
```

Or use the `useIAP` hook:

```typescript
import {useIAP} from 'react-native-iap';

const {connected} = useIAP({
  alternativeBillingModeAndroid: 'alternative-only', // or 'user-choice'
});
```

### Mode 1: Alternative Billing Only

This mode requires a manual 3-step flow. See [AlternativeBilling.tsx](https://github.com/hyochan/react-native-iap/blob/main/example/screens/AlternativeBilling.tsx) for a complete example that demonstrates:

1. Checking alternative billing availability
2. Showing the information dialog to users
3. Processing payments with your payment system
4. Creating and reporting tokens to Google Play

### Mode 2: User Choice Billing

With user choice, Google automatically shows a selection dialog. See [AlternativeBilling.tsx](https://github.com/hyochan/react-native-iap/blob/main/example/screens/AlternativeBilling.tsx) for a complete example that shows:

- Setting up user choice mode with `useIAP` hook
- Handling both Google Play and alternative billing selections
- Processing `onUserChoiceBillingAndroid` callbacks
- Backend token reporting

### User Choice Billing Event Listener

For root API usage without the `useIAP` hook:

```typescript
import {userChoiceBillingListenerAndroid} from 'react-native-iap';

const subscription = userChoiceBillingListenerAndroid((details) => {
  console.log('User chose alternative billing');
  console.log('Products:', details.products);
  console.log('Token:', details.externalTransactionToken);

  // Send token to backend for Google Play reporting
  reportToGooglePlay(details.externalTransactionToken);
});

// Later, remove the listener
subscription.remove();
```

## Complete Cross-Platform Example

For a complete working example with full implementation details, see the [AlternativeBilling.tsx](https://github.com/hyochan/react-native-iap/blob/main/example/screens/AlternativeBilling.tsx) component in the example app.

The example demonstrates:

- iOS external purchase URL flow with notice sheets
- Android alternative billing only mode (3-step flow)
- Android user choice billing mode
- Cross-platform error handling
- Backend token reporting integration

## Best Practices

### General

1. **Backend Validation**: Always validate purchases on your backend server
2. **Clear Communication**: Inform users they're leaving the app for external payment

### iOS Specific

1. **iOS Version Check**: Verify iOS 16.0+ before enabling alternative billing
2. **URL Validation**: Ensure external URLs are valid and secure (HTTPS)
3. **No Purchase Events**: Don't rely on `purchaseUpdatedListener` when using external URLs
4. **Deep Link Implementation**: Crucial for returning users to your app

### Android Specific

1. **24-Hour Reporting**: Report tokens to Google within 24 hours
2. **Mode Selection**: Choose the appropriate mode for your use case
3. **User Experience**: User Choice mode provides better UX but shares revenue with Google
4. **Backend Integration**: Implement proper token reporting to Google Play

## Testing

### iOS Testing

1. Test on real devices running iOS 16.0+
2. Verify external URL opens correctly in Safari
3. Test deep link return flow
4. Ensure StoreKit is configured for alternative billing

### Android Testing

1. Configure alternative billing in Google Play Console
2. Test both billing modes separately
3. Verify token generation and reporting
4. Test user choice dialog behavior

## Troubleshooting

### iOS Issues

#### "Feature not supported"

- Ensure iOS 16.0 or later
- Verify external purchase entitlement is approved

#### "External URL not opening"

- Check URL format (must be valid HTTPS)
- Verify Info.plist configuration

#### "User stuck on external site"

- Implement deep linking to return to app
- Test deep link handling

### Android Issues

#### "Alternative billing not available"

- Verify Google Play approval
- Check device and Play Store version
- Ensure billing mode is configured

#### "Token creation failed"

- Verify product ID is correct
- Check billing mode configuration
- Ensure user completed info dialog

#### "User choice dialog not showing"

- Verify `alternativeBillingModeAndroid: 'user-choice'`
- Ensure `useAlternativeBilling: true` in request
- Check Google Play configuration

## Platform Requirements

- **iOS**: iOS 16.0+ for external purchase URLs
- **Android**: Google Play Billing Library 5.0+ with alternative billing enabled
- **Approval**: Both platforms require approval for alternative billing features

## API Reference

For detailed API documentation, see:

- [Core Methods - Alternative Billing APIs](/docs/api/methods/core-methods#alternative-billing-apis)
- [Type Definitions](/docs/api/types)

## See Also

- [OpenIAP Alternative Billing Specification](https://www.openiap.dev/docs/alternative-billing)
- [Example App](https://github.com/hyochan/react-native-iap/tree/main/example) - See `AlternativeBilling.tsx` for a complete working example
