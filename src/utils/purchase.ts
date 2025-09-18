import {normalizeErrorCodeFromNative} from './errorMapping';
import type {NitroPurchaseResult} from '../specs/RnIap.nitro';

export type PurchaseOperationContext =
  | 'finishTransaction'
  | 'acknowledgePurchaseAndroid'
  | 'consumePurchaseAndroid';

export const getSuccessFromPurchaseVariant = (
  variant: NitroPurchaseResult | boolean,
  context: PurchaseOperationContext,
): boolean => {
  if (typeof variant === 'boolean') {
    return variant;
  }

  if (variant.responseCode === 0) {
    return true;
  }

  const normalizedCode = normalizeErrorCodeFromNative(variant.code);
  const errorPayload = {
    code: normalizedCode,
    nativeCode: variant.code,
    message: variant.message || `Failed to ${context}`,
    responseCode: variant.responseCode,
    debugMessage: variant.debugMessage,
    purchaseToken: variant.purchaseToken,
  };

  throw new Error(JSON.stringify(errorPayload));
};
