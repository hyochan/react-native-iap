"use strict";

import { normalizeErrorCodeFromNative } from "./errorMapping.js";
export const getSuccessFromPurchaseVariant = (variant, context) => {
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
    purchaseToken: variant.purchaseToken
  };
  throw new Error(JSON.stringify(errorPayload));
};
//# sourceMappingURL=purchase.js.map