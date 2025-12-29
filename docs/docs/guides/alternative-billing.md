---
title: Alternative Billing
sidebar_label: Alternative Billing
sidebar_position: 3.5
---

import IapKitBanner from "@site/src/uis/IapKitBanner";

# Alternative Billing

<IapKitBanner />

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

Android supports two approaches for alternative billing:

### Billing Programs API (8.2.0+) - Recommended

:::tip New in 14.6.0
The Billing Programs API is the recommended approach for apps using Google Play Billing Library 8.2.0+. It replaces the deprecated alternative billing APIs and supports both External Content Links and External Offers programs.
:::

The Billing Programs API provides a cleaner, more unified approach to external billing:

```typescript
import {
  enableBillingProgramAndroid,
  isBillingProgramAvailableAndroid,
  createBillingProgramReportingDetailsAndroid,
  launchExternalLinkAndroid,
  initConnection,
} from 'react-native-iap';

// Step 1: Enable billing program BEFORE initConnection
enableBillingProgramAndroid('external-offer');

// Step 2: Initialize connection
await initConnection();

// Step 3: Check if program is available
const {isAvailable} = await isBillingProgramAvailableAndroid('external-offer');
if (!isAvailable) {
  console.log('External offers not available for this user');
  return;
}

// Step 4: Launch external link
const success = await launchExternalLinkAndroid({
  billingProgram: 'external-offer',
  launchMode: 'launch-in-external-browser-or-app',
  linkType: 'link-to-digital-content-offer',
  linkUri: 'https://your-website.com/purchase',
});

if (success) {
  // Step 5: Get reporting token after external purchase
  const details = await createBillingProgramReportingDetailsAndroid('external-offer');

  // Step 6: Report to Google Play backend
  await reportExternalTransaction(details.externalTransactionToken);
}
```

#### Billing Program Types

| Program | Description | Billing Library |
|---------|-------------|----------------|
| `external-offer` | External offers for digital content purchases | 8.2.0+ |
| `external-content-link` | Links to external content outside the app | 8.2.0+ |
| `user-choice-billing` | User choice between Google Play and alternative billing | 6.1.0+ (unified API in 14.7.0) |
| `external-payments` | Side-by-side payment choice (Japan only) | 8.3.0+ |

#### Launch Modes

- **`launch-in-external-browser-or-app`**: Google Play launches the URL
- **`caller-will-launch-link`**: Your app handles launching the URL after Play returns

#### Link Types

- **`link-to-digital-content-offer`**: Link to a digital content offer
- **`link-to-app-download`**: Link to download an app

### External Payments API (8.3.0+) - Japan Only

:::tip New in 14.6.4
Google Play Billing Library 8.3.0 introduces the External Payments program, which presents a **side-by-side choice** between Google Play Billing and the developer's external payment option directly in the purchase flow. This is currently only available in Japan.
:::

External Payments differs from User Choice Billing in that it shows both options side-by-side within the same dialog, rather than requiring a separate dialog.

```typescript
import {
  enableBillingProgramAndroid,
  developerProvidedBillingListenerAndroid,
  requestPurchase,
  initConnection,
} from 'react-native-iap';

// Option A: Enable External Payments via initConnection config (Recommended)
await initConnection({
  enableBillingProgramAndroid: 'external-payments',
});

// Option B: Enable manually BEFORE initConnection
enableBillingProgramAndroid('external-payments');
await initConnection();

// Set up listener for when user selects developer billing
const subscription = developerProvidedBillingListenerAndroid((details) => {
  console.log('User selected developer billing');
  console.log('External transaction token:', details.externalTransactionToken);

  // Process payment through your external payment system
  processExternalPayment(details.externalTransactionToken);

  // Report to Google Play backend within 24 hours
  reportToGooglePlay(details.externalTransactionToken);
});

// Request purchase with developer billing option
await requestPurchase({
  request: {
    google: {
      skus: ['premium_monthly'],
      developerBillingOption: {
        billingProgram: 'external-payments',
        linkUri: 'https://your-website.com/payment',
        launchMode: 'launch-in-external-browser-or-app',
      },
    },
  },
  type: 'subs',
});

// Clean up
subscription.remove();
```

#### Key Differences: External Payments vs User Choice Billing

| Feature | User Choice Billing | External Payments |
|---------|-------------------|-------------------|
| Billing Library | 7.0+ | 8.3.0+ |
| Availability | Eligible regions | Japan only |
| UI | Separate dialog | Side-by-side in purchase dialog |
| Setup (Recommended) | `enableBillingProgramAndroid: 'user-choice-billing'` | `enableBillingProgramAndroid: 'external-payments'` |
| Setup (Deprecated) | `alternativeBillingModeAndroid: 'user-choice'` | N/A |
| Listener | `userChoiceBillingListenerAndroid` | `developerProvidedBillingListenerAndroid` |
| Purchase Props | ~~`useAlternativeBilling: true`~~ (deprecated, no effect) | `developerBillingOption: {...}` |

#### Developer Billing Launch Modes

- **`launch-in-external-browser-or-app`**: Google Play launches the external URL directly
- **`caller-will-launch-link`**: Your app handles launching the URL after Play returns control

### User Choice Billing (7.0+) - Now via BillingProgramAndroid

:::tip Updated in v14.7.0
User Choice Billing is now configured via `enableBillingProgramAndroid: 'user-choice-billing'` instead of the deprecated `alternativeBillingModeAndroid`. This unifies all billing programs under a single API.
:::

```typescript
import {initConnection} from 'react-native-iap';

// Recommended: Use enableBillingProgramAndroid
await initConnection({
  enableBillingProgramAndroid: 'user-choice-billing',
});

// Or with useIAP hook
import {useIAP} from 'react-native-iap';

const {connected} = useIAP({
  enableBillingProgramAndroid: 'user-choice-billing',
});
```

### Legacy Alternative Billing APIs (Deprecated)

:::warning Deprecated in v14.7.0
The `alternativeBillingModeAndroid` option is deprecated. Use `enableBillingProgramAndroid` instead:
- `'user-choice'` → `'user-choice-billing'`
- `'alternative-only'` → `'external-offer'`
:::

For backwards compatibility, the legacy APIs are still supported:

```typescript
import {initConnection} from 'react-native-iap';

// DEPRECATED: Alternative Billing Only mode
await initConnection({
  alternativeBillingModeAndroid: 'alternative-only', // Use enableBillingProgramAndroid: 'external-offer' instead
});

// DEPRECATED: User Choice Billing mode
await initConnection({
  alternativeBillingModeAndroid: 'user-choice', // Use enableBillingProgramAndroid: 'user-choice-billing' instead
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

- Verify `enableBillingProgramAndroid: 'user-choice-billing'` is set
- Check Google Play Console configuration
- Ensure the user is in an eligible region

## Platform Requirements

- **iOS**: iOS 16.0+ for external purchase URLs
- **Android**:
  - Billing Programs API: Google Play Billing Library 8.2.0+ (recommended)
  - Legacy APIs: Google Play Billing Library 5.0+ with alternative billing enabled
- **Approval**: Both platforms require approval for alternative billing features

## API Reference

For detailed API documentation, see:

- [Core Methods - Alternative Billing APIs](/docs/api/methods/core-methods#alternative-billing-apis)
- [Type Definitions](/docs/api/types)

## See Also

- [OpenIAP Alternative Billing Specification](https://www.openiap.dev/docs/alternative-billing)
- [Example App](https://github.com/hyochan/react-native-iap/tree/main/example) - See `AlternativeBilling.tsx` for a complete working example
