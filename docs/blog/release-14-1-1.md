---
slug: release-14-1-1
title: v14.1.1 - iOS Product Cache Invalidation
authors: [hyochan]
tags: [release, react-native-iap, bugfix, ios]
date: 2025-09-06
---

# v14.1.1 - iOS Product Fetching Fix

We're releasing v14.1.1 with an important fix for iOS subscription management.

## 🐛 Bug Fix

### iOS: Fixed Product Fetching in Subscription Management

Fixed an issue where `showManageSubscriptionsIOS()` would fail to detect subscription changes when products weren't pre-cached in the ProductStore. The method now includes a fallback mechanism that:

- Fetches products directly from StoreKit when not found in cache
- Derives subscription SKUs from `Transaction.currentEntitlements` when ProductStore is empty
- Ensures subscription status changes are properly detected even without calling `fetchProducts()` first

This fix improves the reliability of subscription management UI interactions on iOS.

## 📦 Installation

```bash
npm install react-native-iap@14.1.1
# or
yarn add react-native-iap@14.1.1
```

## 🙏 Acknowledgments

Thanks to the CodeRabbit AI reviewer for identifying this edge case and suggesting the improvement.

---

For the complete changelog, see [CHANGELOG.md](https://github.com/hyochan/react-native-iap/blob/main/CHANGELOG.md)
