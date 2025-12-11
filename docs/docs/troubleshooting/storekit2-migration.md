---
sidebar_position: 3
title: StoreKit 2 Migration Issues
---

# StoreKit 2 Migration Issues

When upgrading from `react-native-iap` v12/v13 (StoreKit 1) to v14+ (StoreKit 2), you may encounter the following error:

```plaintext
[RN-IAP] Error fetching products: Error: PurchaseError(code: OpenIAP.ErrorCode.queryProduct,
message: "The operation couldn't be completed. (StoreKit.StoreKitError error 1.)", productId: nil)
```

This guide covers the common causes and solutions.

## 1. App Store Connect Agreements

StoreKit 2 requires up-to-date agreements. Check in App Store Connect:

1. Go to **Agreements, Tax, and Banking**
2. Verify **Paid Applications** contract is **Active**
3. If expired or pending, accept the new agreement

:::warning Important
Even if your app was working before, Apple periodically requires agreement renewals. This is the most common cause of StoreKit 2 errors.
:::

## 2. iOS Version Requirements

StoreKit 2 has minimum version requirements:

- **iOS 15.0+** on device
- **Xcode 13+** for building

Verify your `Podfile` has the correct minimum version:

```ruby
platform :ios, '15.0'
```

## 3. Product Configuration

Verify your products in App Store Connect:

| Check | Description |
|-------|-------------|
| Product Status | Must be "Ready to Submit" or "Approved" |
| Bundle ID | Must match your app's bundle identifier |
| Product ID | Case-sensitive, must be exact match |
| Pricing | Must have a price configured |

## 4. Sandbox Testing

For development testing:

1. Go to **App Store Connect → Users and Access → Sandbox → Testers**
2. Create a sandbox tester account
3. On your test device, sign out of your Apple ID
4. When prompted during purchase, use the sandbox account

:::tip
On iOS 14+, you can add sandbox accounts in **Settings → App Store → Sandbox Account** without signing out of your main Apple ID.
:::

## 5. StoreKit Configuration File (Local Testing)

For local testing without App Store Connect:

1. In Xcode: **File → New → File → StoreKit Configuration File**
2. Add your products (Product IDs must match exactly)
3. Go to **Scheme → Edit Scheme → Run → Options**
4. Select your StoreKit Configuration file

This allows testing purchases without network connectivity to Apple's servers.

## 6. Clean Build

StoreKit caching can cause issues. Perform a clean build:

```bash
# Clean iOS build
cd ios
rm -rf Pods Podfile.lock build
pod install --repo-update
cd ..

# Clean React Native
watchman watch-del-all
rm -rf node_modules
npm install  # or yarn

# In Xcode: Product → Clean Build Folder (Cmd+Shift+K)
```

## 7. Code Implementation

Ensure proper error handling when using `useIAP`:

```tsx
import { useIAP } from 'react-native-iap';

const { connected, subscriptions, fetchProducts } = useIAP({
  onPurchaseError: (error) => {
    console.log('Purchase error:', error.code, error.message);
  },
});

useEffect(() => {
  const loadProducts = async () => {
    if (connected) {
      try {
        await fetchProducts({
          skus: ['product_id_1', 'product_id_2'],
          type: 'subs'
        });
      } catch (error) {
        console.log('Fetch products error:', error);
      }
    }
  };
  loadProducts();
}, [connected, fetchProducts]);
```

## 8. Understanding StoreKitError Codes

| Error Code | Meaning | Solution |
|------------|---------|----------|
| 0 | Unknown error | Check console for details |
| 1 | Product not found | Verify Product ID and App Store Connect setup |
| 2 | Network error | Check internet connection |
| 3 | System error | Restart device, try again |

`StoreKitError error 1` typically means:

- **Product ID mismatch** - The SKU doesn't exist in App Store Connect
- **Product not active** - Product is not in "Ready to Submit" or "Approved" status
- **Agreement issue** - App Store Connect agreements need renewal
- **Bundle ID mismatch** - App's bundle ID doesn't match the product's app

## Debugging Checklist

- [ ] App Store Connect agreements are active
- [ ] iOS deployment target is 15.0+
- [ ] Product IDs match exactly (case-sensitive)
- [ ] Products are in "Ready to Submit" or "Approved" status
- [ ] Bundle ID matches between app and App Store Connect
- [ ] Testing on physical device (not simulator for production testing)
- [ ] Using sandbox account for testing
- [ ] Performed clean build after upgrade

## Common Migration Issues

### Products worked in v12/v13 but not in v14+

StoreKit 2 uses a different API that may have stricter requirements:

1. Ensure all agreements are current
2. Verify product configuration hasn't changed
3. Check that your Apple Developer account is in good standing

### Simulator vs Device

- **Simulator**: Use StoreKit Configuration file for testing
- **Physical Device**: Use sandbox account with actual App Store Connect products

### Receipt Validation Changes

StoreKit 2 uses JWS (JSON Web Signature) instead of the old receipt format. If you have server-side validation, you'll need to update it. See [Receipt Validation](/docs/guides/receipt-validation) for details.

## Still Having Issues?

If you've tried all the above:

1. Create a minimal reproduction project
2. Test with the [example app](https://github.com/hyochan/react-native-iap/tree/main/example)
3. Open an issue on [GitHub](https://github.com/hyochan/react-native-iap/issues) with:
   - iOS version
   - react-native-iap version
   - Full error message
   - Code snippet
   - Steps to reproduce
