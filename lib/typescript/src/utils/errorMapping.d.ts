/**
 * Error mapping utilities for react-native-iap.
 * Provides helpers for working with platform-specific error codes
 * and constructing structured purchase errors.
 */
import { ErrorCode, type IapPlatform } from '../types';
export interface PurchaseErrorProps {
    message?: string;
    responseCode?: number;
    debugMessage?: string;
    code?: ErrorCode | string | number;
    productId?: string;
    platform?: IapPlatform;
}
export interface PurchaseError extends Error {
    responseCode?: number;
    debugMessage?: string;
    code?: ErrorCode;
    productId?: string;
    platform?: IapPlatform;
}
export declare const ErrorCodeMapping: {
    readonly ios: Record<ErrorCode, string>;
    readonly android: Record<ErrorCode, string>;
};
export declare const createPurchaseError: (props: PurchaseErrorProps) => PurchaseError;
export declare const createPurchaseErrorFromPlatform: (errorData: PurchaseErrorProps, platform: IapPlatform) => PurchaseError;
export declare const ErrorCodeUtils: {
    getNativeErrorCode: (errorCode: ErrorCode) => string;
    fromPlatformCode: (platformCode: string | number, _platform: IapPlatform) => ErrorCode;
    toPlatformCode: (errorCode: ErrorCode, _platform: IapPlatform) => string | number;
    isValidForPlatform: (errorCode: ErrorCode, platform: IapPlatform) => boolean;
};
type ErrorLike = string | {
    code?: ErrorCode | string;
    message?: string;
};
export declare function isUserCancelledError(error: unknown): boolean;
export declare function isNetworkError(error: unknown): boolean;
export declare function isRecoverableError(error: unknown): boolean;
export declare function getUserFriendlyErrorMessage(error: ErrorLike): string;
export declare const normalizeErrorCodeFromNative: (code: unknown) => ErrorCode;
export {};
//# sourceMappingURL=errorMapping.d.ts.map