import type { ProductQueryType, RequestPurchaseProps, RequestPurchaseResult, AlternativeBillingModeAndroid, BillingProgramAndroid, UserChoiceBillingDetails, VerifyPurchaseProps, VerifyPurchaseResult, VerifyPurchaseWithProviderProps, VerifyPurchaseWithProviderResult } from '../types';
import type { ActiveSubscription, Product, Purchase, PurchaseError, ProductSubscription } from '../types';
import type { MutationFinishTransactionArgs } from '../types';
type UseIap = {
    connected: boolean;
    products: Product[];
    subscriptions: ProductSubscription[];
    availablePurchases: Purchase[];
    promotedProductIOS?: Product;
    activeSubscriptions: ActiveSubscription[];
    finishTransaction: (args: MutationFinishTransactionArgs) => Promise<void>;
    getAvailablePurchases: (skus?: string[]) => Promise<void>;
    fetchProducts: (params: {
        skus: string[];
        type?: ProductQueryType | null;
    }) => Promise<void>;
    requestPurchase: (params: RequestPurchaseProps) => Promise<RequestPurchaseResult | null>;
    /**
     * @deprecated Use `verifyPurchase` instead. This function will be removed in a future version.
     */
    validateReceipt: (options: VerifyPurchaseProps) => Promise<VerifyPurchaseResult>;
    /** Verify purchase with the configured providers */
    verifyPurchase: (options: VerifyPurchaseProps) => Promise<VerifyPurchaseResult>;
    /** Verify purchase with a specific provider (e.g., IAPKit) */
    verifyPurchaseWithProvider: (options: VerifyPurchaseWithProviderProps) => Promise<VerifyPurchaseWithProviderResult>;
    restorePurchases: () => Promise<void>;
    getPromotedProductIOS: () => Promise<Product | null>;
    requestPurchaseOnPromotedProductIOS: () => Promise<boolean>;
    getActiveSubscriptions: (subscriptionIds?: string[]) => Promise<ActiveSubscription[]>;
    hasActiveSubscriptions: (subscriptionIds?: string[]) => Promise<boolean>;
    checkAlternativeBillingAvailabilityAndroid?: () => Promise<boolean>;
    showAlternativeBillingDialogAndroid?: () => Promise<boolean>;
    createAlternativeBillingTokenAndroid?: (sku?: string) => Promise<string | null>;
};
export interface UseIapOptions {
    onPurchaseSuccess?: (purchase: Purchase) => void;
    onPurchaseError?: (error: PurchaseError) => void;
    onPromotedProductIOS?: (product: Product) => void;
    onUserChoiceBillingAndroid?: (details: UserChoiceBillingDetails) => void;
    /**
     * @deprecated Use enableBillingProgramAndroid instead.
     * - 'user-choice' → 'user-choice-billing'
     * - 'alternative-only' → 'external-offer'
     */
    alternativeBillingModeAndroid?: AlternativeBillingModeAndroid;
    /**
     * Enable a specific billing program for Android (8.2.0+)
     * Use 'user-choice-billing' for User Choice Billing (7.0+).
     * Use 'external-offer' for External Offer program.
     * Use 'external-payments' for Developer Provided Billing (Japan only, 8.3.0+).
     */
    enableBillingProgramAndroid?: BillingProgramAndroid;
}
/**
 * React Hook for managing In-App Purchases.
 * See documentation at https://react-native-iap.hyo.dev/docs/hooks/useIAP
 */
export declare function useIAP(options?: UseIapOptions): UseIap;
export {};
//# sourceMappingURL=useIAP.d.ts.map