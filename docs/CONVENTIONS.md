# Coding Conventions

This document outlines the coding conventions and best practices for the react-native-iap project.

## Table of Contents

- [General Guidelines](#general-guidelines)
- [TypeScript Conventions](#typescript-conventions)
- [Platform-Specific Naming](#platform-specific-naming)
- [Code Style](#code-style)
- [Documentation](#documentation)
- [Testing](#testing)
- [Git Commit Guidelines](#git-commit-guidelines)

## General Guidelines

### Language & Syntax

- Use TypeScript for all new code
- Use ES6+ syntax (arrow functions, destructuring, template literals)
- Prefer functional programming patterns
- Avoid `any` type - use proper TypeScript types

### File Naming

- Use PascalCase for TypeScript module files: `ExpoIapModule.ts`
- Test files: `*.test.ts` or `*.test.tsx`
- Type definition files: `*.types.ts`
- Hook files: use camelCase: `useIAP.ts`

### Import Order

1. External dependencies
2. Internal modules
3. Types
4. Styles/Assets

```typescript
// External
import React from 'react';
import {Platform} from 'react-native';

// Internal modules
import {ExpoIapModule} from '../ExpoIapModule';
import {validateReceipt} from '../utils';

// Types
import type {Product, Purchase} from '../types';
```

## TypeScript Conventions

### Type Definitions

- Use `interface` for object types that can be extended
- Use `type` for unions, primitives, and functional types
- Export types that are used across modules
- Prefix type-only exports with `type`

```typescript
// ✅ Good
export interface Product {
  id: string;
  title: string;
  price: string;
}

export type Platform = 'ios' | 'android';
export type PurchaseResult = Success | Failure;

// ❌ Bad
export interface Platform {
  // Should be type
  name: 'ios' | 'android';
}
```

### Function Types

```typescript
// ✅ Good - Clear parameter and return types
export const fetchProducts = async (params: {
  skus: string[];
  type?: 'in-app' | 'subs';
}): Promise<Product[]> => {
  // implementation
};

// ❌ Bad - Missing types
export const fetchProducts = async (params) => {
  // implementation
};
```

## Platform-Specific Naming

### Naming Rules

Functions that only work on one platform MUST have platform suffixes:

- iOS-specific: `functionNameIOS()` (uppercase IOS)
- Android-specific: `functionNameAndroid()`

Functions that handle platform differences internally do NOT need suffixes.

### Examples

#### ✅ Correct: Platform-Specific Functions

```typescript
// iOS-only functions (no Platform.OS check needed in iOS module)
export const validateReceiptIOS = async (sku: string): Promise<boolean> => {
  // iOS implementation
  return ExpoIapModule.validateReceiptIOS(sku);
};

export const getStorefrontIOS = async (): Promise<string> => {
  return ExpoIapModule.getStorefront();
};

// Android-only functions (no Platform.OS check needed in Android module)
export const deepLinkToSubscriptionsAndroid = async ({
  sku,
  packageName,
}: {
  sku: string;
  packageName: string;
}): Promise<void> => {
  // Android implementation
  return Linking.openURL(
    `https://play.google.com/store/account/subscriptions?package=${packageName}&sku=${sku}`,
  );
};
```

**Note**: Platform-specific modules (ios.ts, android.ts) don't need Platform.OS checks. The main API (index.ts) handles platform routing.

#### ✅ Correct: Cross-Platform Functions

```typescript
// These functions handle platform differences internally
export const fetchProducts = async (params: {
  skus: string[];
  type?: 'in-app' | 'subs';
}): Promise<Product[]> => {
  return (
    Platform.select({
      ios: async () => {
        /* iOS implementation */
      },
      android: async () => {
        /* Android implementation */
      },
    })() || []
  );
};

// New v2.7.0+ API - No Platform.OS checks needed!
export const requestPurchase = async (productId: string): Promise<Purchase> => {
  return requestPurchase({
    request: {
      ios: {
        sku: productId,
      },
      android: {
        skus: [productId],
      },
    },
  });
};
```

#### ❌ Incorrect: Missing Platform Suffix

```typescript
// BAD: iOS-only function without suffix
export const getStorefront = (): Promise<string> => {
  return ExpoIapModule.getStorefront(); // Only works on iOS!
};

// GOOD: Should be
export const getStorefrontIOS = (): Promise<string> => {
  // Platform check and implementation
};
```

### Type Naming Convention

Platform-specific types:

- `ProductIOS`, `ProductAndroid`
- `PurchaseErrorIOS`, `PurchaseErrorAndroid`
- `AppTransactionIOS`, `SubscriptionOfferAndroid`

Cross-platform types:

- `Product`, `Purchase`, `PurchaseError`

## Code Style

### Formatting

- Use 2 spaces for indentation
- Use single quotes for strings (except JSX)
- No semicolons (configure Prettier)
- Max line length: 100 characters
- Add trailing commas in multi-line objects/arrays

### Variable Naming

- Use camelCase for variables and functions
- Use PascalCase for types, interfaces, and classes
- Use SCREAMING_SNAKE_CASE for constants
- Use descriptive names (avoid abbreviations)

```typescript
// ✅ Good
const purchaseHistory: Purchase[] = [];
const MAX_RETRY_COUNT = 3;

// ❌ Bad
const ph = []; // Too abbreviated
const maxretrycount = 3; // Wrong case
```

### Error Handling

Always use descriptive error messages and proper error types:

```typescript
// ✅ Good - Clear error message
try {
  await requestPurchase({request: {ios: {sku: 'invalid'}}});
} catch (error) {
  if (error.code === 'E_ITEM_UNAVAILABLE') {
    console.error('Product not found in store');
  }
}

// ❌ Bad - Generic error handling
try {
  await requestPurchase({request: {sku: 'invalid'}});
} catch (error) {
  console.error('Error');
}
```

When using platform-specific functions, handle errors gracefully:

```typescript
// ✅ Good - Let the function handle platform checks internally
getStorefrontIOS()
  .then((storefront) => {
    console.log('Storefront:', storefront);
  })
  .catch((error) => {
    // Will throw on non-iOS platforms
    console.log('Storefront not available:', error.message);
  });

// ❌ Bad - Redundant platform check
if (Platform.OS === 'ios') {
  getStorefrontIOS().then((storefront) => {
    console.log('Storefront:', storefront);
  });
}
```

### Async/Await

Always use async/await over promises:

```typescript
// ✅ Good
export const fetchProducts = async (params: {
  skus: string[];
  type?: 'in-app' | 'subs';
}): Promise<Product[]> => {
  try {
    const products = await ExpoIapModule.fetchProducts(params);
    return products;
  } catch (error) {
    console.error('Failed to get products:', error);
    throw error;
  }
};

// ❌ Bad
export const fetchProducts = (params): Promise<Product[]> => {
  return ExpoIapModule.fetchProducts(params)
    .then((products) => products)
    .catch((error) => {
      console.error('Failed to get products:', error);
      throw error;
    });
};
```

## Documentation

### JSDoc Comments

All public APIs must have JSDoc comments:

````typescript
/**
 * Retrieves products from the iOS App Store
 *
 * @param skus - Array of product SKUs to fetch
 * @returns Promise resolving to array of products
 * @throws Error if called on non-iOS platform
 *
 * @example
 * ```typescript
 * const products = await fetchProducts({ skus: ['com.example.premium'], type: 'in-app' });
 * ```
 *
 * @platform iOS
 */
export const fetchProductsIOS = async (params: {
  skus: string[];
  type?: 'in-app' | 'subs';
}): Promise<ProductIOS[]> => {
  // implementation
};
````

### README Files

- Keep README files concise and focused
- Include usage examples
- Document platform-specific behavior
- Link to detailed documentation

### Hook vs Root API Semantics

- The `useIAP` hook methods are designed for React state flows and generally return `Promise<void>` while updating internal state. Do not expect data from these methods.
  - Examples: `fetchProducts`, `requestProducts` (if available), `requestPurchase`, `getAvailablePurchases`.
  - Pattern: call the method, then read from hook state like `products`, `subscriptions`, `availablePurchases`.
- Exceptions in the hook API:
  - `getActiveSubscriptions(subscriptionIds?) => Promise<ActiveSubscription[]>` returns computed subscription info and updates `activeSubscriptions` state.
  - `hasActiveSubscriptions(subscriptionIds?) => Promise<boolean>` convenience boolean.
- Root (index) API functions return data directly and can be awaited for values.
  - Use these when not relying on React state or when writing non-React utilities.

## Testing

### Test Structure

```typescript
describe('PurchaseManager', () => {
  describe('iOS', () => {
    beforeEach(() => {
      Platform.OS = 'ios';
    });

    it('should get products on iOS', async () => {
      const products = await fetchProductsIOS({
        skus: ['com.example.product'],
        type: 'in-app',
      });
      expect(products).toHaveLength(1);
    });
  });

  describe('Android', () => {
    beforeEach(() => {
      Platform.OS = 'android';
    });

    it('should throw error on Android', async () => {
      await expect(
        fetchProductsIOS({skus: ['com.example.product'], type: 'in-app'}),
      ).rejects.toThrow('This method is only available on iOS');
    });
  });
});
```

### Test Naming

- Use descriptive test names
- Start with "should" for behavior tests
- Group related tests with `describe` blocks

## Git Commit Guidelines

### Commit Message Format

```text
type(scope): subject

body

footer
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions or modifications
- `chore`: Maintenance tasks
- `perf`: Performance improvements

### Examples

```bash
feat(ios): add getStorefrontIOS function

Implements iOS-specific storefront retrieval using StoreKit.
Follows platform-specific naming convention.

Closes #123
```

```bash
fix(android): handle null purchase token in acknowledgePurchaseAndroid

Some Android devices return null tokens for pending purchases.
Added null check and proper error handling.
```

```bash
chore: update dependencies and fix vulnerabilities

- Update expo-modules-core to 2.0.0
- Fix security vulnerabilities in dev dependencies
```

### Rules

- Use present tense ("add" not "added")
- Use imperative mood ("fix" not "fixes")
- Keep subject line under 72 characters
- Reference issues and PRs in footer

## Migration Guide

When updating existing code to follow conventions:

1. Identify platform-specific functions
2. Add appropriate suffix to function names
3. Update all imports and usages
4. Add deprecation notices if needed
5. Update documentation

Example:

```typescript
// Step 1: Add new function with correct naming
export const getStorefrontIOS = async (): Promise<string> => {
  return ExpoIapModule.getStorefront();
};

// Step 2: Deprecate old function
/**
 * @deprecated Use getStorefrontIOS instead
 */
export const getStorefront = async (): Promise<string> => {
  console.warn('getStorefront is deprecated. Use getStorefrontIOS instead.');
  return getStorefrontIOS();
};
```

## New v2.7.0 API Guidelines

### Platform-Specific Request Structure

Use the new platform-specific API to avoid Platform.OS checks:

```typescript
// ✅ Good - New v2.7.0 API
await requestPurchase({
  request: {
    ios: {
      sku: productId,
      quantity: 1,
      appAccountToken: 'user-123',
    },
    android: {
      skus: [productId],
      obfuscatedAccountIdAndroid: 'user-123',
    },
  },
  type: 'in-app',
});

// ❌ Bad - Old API with Platform.OS checks
if (Platform.OS === 'ios') {
  await requestPurchase({
    request: {sku: productId},
  });
} else {
  await requestPurchase({
    request: {skus: [productId]},
  });
}
```

### Subscription Purchases

```typescript
// ✅ Good - Unified subscription API
await requestPurchase({
  request: {
    ios: {
      sku: subscriptionId,
      appAccountToken: 'user-123',
    },
    android: {
      skus: [subscriptionId],
      subscriptionOffers: [
        {
          sku: subscriptionId,
          offerToken: offer.offerToken,
        },
      ],
    },
  },
  type: 'subs',
});

// ❌ Bad - Using deprecated requestSubscription
await requestSubscription({
  sku: subscriptionId,
  skus: [subscriptionId],
});
```

## Benefits

Following these conventions provides:

1. **Clarity**: Code intent is immediately clear
2. **Consistency**: Uniform codebase that's easier to maintain
3. **Type Safety**: Better TypeScript inference and error prevention
4. **Documentation**: Self-documenting code
5. **Platform Safety**: Prevents platform-specific bugs
6. **Developer Experience**: Easier onboarding and collaboration
7. **No Platform Checks**: New API eliminates Platform.OS branching
