import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# Types

<AdFitTopFixed />

## OpenIAP Type Definitions

For comprehensive type definitions and interfaces, please refer to the **[OpenIAP Types Documentation](https://www.openiap.dev/docs/types)**.

React Native IAP conforms to the OpenIAP specification, which provides standardized type definitions across all in-app purchase implementations.

## Nitro Modules Integration

React Native IAP uses Nitro Modules for high-performance native bridge communication. The core types are imported from `react-native-nitro-modules`:

```typescript
import type {HybridObject} from 'react-native-nitro-modules';
```

## Key Type Categories

### Product Types

- `NitroProduct` - Product data from the store
- `Product` - TypeScript-friendly product interface

### Purchase Types

- `NitroPurchase` - Purchase transaction data
- `Purchase` - TypeScript-friendly purchase interface
- `NitroPurchaseResult` - Purchase operation result

> **Note (3.0.0)**:
>
> - `purchaseToken` is the unified field for both iOS and Android
> - On iOS: Contains the JWS representation (StoreKit 2)
> - On Android: Contains the purchase token
> - **Deprecated fields**: `jwsRepresentationIOS` and `purchaseTokenAndroid` are deprecated and will be removed in a future version

### Request Types

- `NitroPurchaseRequest` - Unified purchase request
- `RequestPurchaseProps` - Platform-specific purchase parameters
- `RequestSubscriptionProps` - Subscription purchase parameters

### Platform-Specific Types

- iOS: Types suffixed with `IOS` (e.g., `NitroRequestPurchaseIos`)
- Android: Types suffixed with `Android` (e.g., `NitroRequestPurchaseAndroid`)

## Type Conversion Utilities

The library provides type conversion utilities to bridge between Nitro types and TypeScript interfaces:

```typescript
import {
  convertNitroProductToProduct,
  convertNitroPurchaseToPurchase,
  validateNitroProduct,
  validateNitroPurchase,
} from 'react-native-iap/utils/type-bridge';
```

## Error Types

Error handling types follow the OpenIAP specification:

```typescript
interface NitroPurchaseResult {
  responseCode: number;
  debugMessage?: string;
  code: string;
  message: string;
  purchaseToken?: string;
}
```

For detailed error codes, see the [Error Codes](./error-codes) documentation.

## Migration Notes

### From v13.x to v14.0.0-rc

- All types now use the `Nitro` prefix for native bridge types
- Platform-specific types use clear suffixes (`IOS`, `Android`)
- Type conversion utilities handle the bridge between Nitro and TypeScript types

For complete type definitions, refer to:

- **[OpenIAP Types Documentation](https://www.openiap.dev/docs/types)**
- Source code: `src/specs/RnIap.nitro.ts`
