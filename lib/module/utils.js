"use strict";

import { RnIapConsole } from "./utils/debug.js";

/**
 * Parse the string payload returned by the native getAppTransactionIOS call into
 * a strongly typed AppTransaction object. Returns null when the payload cannot
 * be safely converted.
 */
export const parseAppTransactionPayload = payload => {
  try {
    const raw = JSON.parse(payload);
    if (raw == null || typeof raw !== 'object') {
      return null;
    }
    const appId = Number(raw.appId);
    const appVersionId = Number(raw.appVersionId);
    const originalPurchaseDate = Number(raw.originalPurchaseDate);
    const signedDate = Number(raw.signedDate);
    if (Number.isNaN(appId) || Number.isNaN(appVersionId) || Number.isNaN(originalPurchaseDate) || Number.isNaN(signedDate)) {
      return null;
    }
    const preorderDateRaw = raw.preorderDate;
    const preorderDate = preorderDateRaw == null ? null : Number(preorderDateRaw);
    return {
      appId,
      appTransactionId: typeof raw.appTransactionId === 'string' ? raw.appTransactionId : null,
      appVersion: typeof raw.appVersion === 'string' ? raw.appVersion : '',
      appVersionId,
      bundleId: typeof raw.bundleId === 'string' ? raw.bundleId : '',
      deviceVerification: typeof raw.deviceVerification === 'string' ? raw.deviceVerification : '',
      deviceVerificationNonce: typeof raw.deviceVerificationNonce === 'string' ? raw.deviceVerificationNonce : '',
      environment: typeof raw.environment === 'string' ? raw.environment : '',
      originalAppVersion: typeof raw.originalAppVersion === 'string' ? raw.originalAppVersion : '',
      originalPlatform: typeof raw.originalPlatform === 'string' ? raw.originalPlatform : null,
      originalPurchaseDate,
      preorderDate: preorderDate != null && !Number.isNaN(preorderDate) ? preorderDate : null,
      signedDate
    };
  } catch (error) {
    RnIapConsole.warn('[parseAppTransactionPayload] Failed to parse payload', error);
    return null;
  }
};
//# sourceMappingURL=utils.js.map