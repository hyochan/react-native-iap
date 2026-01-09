/**
 * Type Bridge Utilities
 *
 * Converts the loose Nitro shapes coming from native into the strongly typed
 * structures that our generated TypeScript types expect.
 */
import type { NitroProduct, NitroPurchase, NitroSubscriptionStatus } from '../specs/RnIap.nitro';
import type { Product, ProductSubscription, Purchase, SubscriptionStatusIOS } from '../types';
/**
 * Convert NitroProduct (from native) to generated Product type
 */
export declare function convertNitroProductToProduct(nitroProduct: NitroProduct): Product;
/**
 * Convert Product to ProductSubscription (type-safe casting helper)
 */
export declare function convertProductToProductSubscription(product: Product): ProductSubscription;
/**
 * Convert NitroPurchase (from native) to generated Purchase type
 */
export declare function convertNitroPurchaseToPurchase(nitroPurchase: NitroPurchase): Purchase;
/**
 * Convert Nitro subscription status (iOS) to generated type
 */
export declare function convertNitroSubscriptionStatusToSubscriptionStatusIOS(nitro: NitroSubscriptionStatus): SubscriptionStatusIOS;
/**
 * Validate that a NitroProduct has the expected shape
 */
export declare function validateNitroProduct(nitroProduct: NitroProduct): boolean;
/**
 * Validate that a NitroPurchase has the expected shape
 */
export declare function validateNitroPurchase(nitroPurchase: NitroPurchase): boolean;
/**
 * Development helper to check that type conversions stay valid
 */
export declare function checkTypeSynchronization(): {
    isSync: boolean;
    issues: string[];
};
//# sourceMappingURL=type-bridge.d.ts.map