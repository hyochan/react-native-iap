import type { AppTransaction } from './types';
/**
 * Parse the string payload returned by the native getAppTransactionIOS call into
 * a strongly typed AppTransaction object. Returns null when the payload cannot
 * be safely converted.
 */
export declare const parseAppTransactionPayload: (payload: string) => AppTransaction | null;
//# sourceMappingURL=utils.d.ts.map