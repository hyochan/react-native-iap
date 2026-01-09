import type { NitroPurchaseResult } from '../specs/RnIap.nitro';
export type PurchaseOperationContext = 'finishTransaction' | 'acknowledgePurchaseAndroid' | 'consumePurchaseAndroid';
export declare const getSuccessFromPurchaseVariant: (variant: NitroPurchaseResult | boolean, context: PurchaseOperationContext) => boolean;
//# sourceMappingURL=purchase.d.ts.map