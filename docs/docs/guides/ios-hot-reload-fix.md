---
sidebar_position: 10
title: iOS Hot Reload Fix
---

## Overview

Version 2.7.7 fixes iOS hot reload issues with concurrent StoreKit operations.

## The Problem

During hot reload, concurrent IAP operations would fail:

```typescript
// Would fail on iOS during hot reload
await Promise.all([
  fetchProducts({ skus: productIds }),
  getAvailablePurchases(), // Returns empty or fails
])
```

## The Solution

The iOS native module now:

- Cleans up state on `initConnection()`
- Validates connections with `ensureConnection()` (like Android)
- Properly manages StoreKit resources

## What Changed

- All iOS IAP methods now handle hot reload correctly
- No code changes needed - works automatically
- Affects: `fetchProducts()`, `getAvailablePurchases()`, `getPurchaseHistories()`, and all other StoreKit methods

## Usage

```typescript
// Now works correctly during hot reload
const [products, purchases] = await Promise.all([
  fetchProducts({ skus: productIds }),
  getAvailablePurchases(),
])
```

## Notes

- iOS only (Android was not affected)
- No performance impact
- Requires react-native-iap 2.7.7+
