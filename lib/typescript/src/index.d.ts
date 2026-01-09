import 'react-native-nitro-modules';
import type { MutationField, Product, ProductIOS, Purchase, PurchaseError, QueryField } from './types';
import type { BillingProgramAndroid, ExternalLinkLaunchModeAndroid, ExternalLinkTypeAndroid } from './types';
export type { RnIap, NitroProduct, NitroPurchase, NitroPurchaseResult, } from './specs/RnIap.nitro';
export * from './types';
export * from './utils/error';
export type ProductTypeInput = 'inapp' | 'in-app' | 'subs';
export interface EventSubscription {
    remove(): void;
}
export { useIAP } from './hooks/useIAP';
export declare const purchaseUpdatedListener: (listener: (purchase: Purchase) => void) => EventSubscription;
export declare const purchaseErrorListener: (listener: (error: PurchaseError) => void) => EventSubscription;
export declare const promotedProductListenerIOS: (listener: (product: Product) => void) => EventSubscription;
export declare const userChoiceBillingListenerAndroid: (listener: (details: any) => void) => EventSubscription;
export interface DeveloperProvidedBillingDetailsAndroid {
    /**
     * External transaction token used to report transactions made through developer billing.
     * This token must be used when reporting the external transaction to Google Play.
     * Must be reported within 24 hours of the transaction.
     */
    externalTransactionToken: string;
}
export declare const developerProvidedBillingListenerAndroid: (listener: (details: DeveloperProvidedBillingDetailsAndroid) => void) => EventSubscription;
/**
 * Fetch products from the store
 * @param params - Product request configuration
 * @param params.skus - Array of product SKUs to fetch
 * @param params.type - Optional filter: 'in-app' (default) for products, 'subs' for subscriptions, or 'all' for both.
 * @returns Promise<Product[]> - Array of products from the store
 *
 * @example
 * ```typescript
 * // Regular products
 * const products = await fetchProducts({ skus: ['product1', 'product2'] });
 *
 * // Subscriptions
 * const subscriptions = await fetchProducts({ skus: ['sub1', 'sub2'], type: 'subs' });
 * ```
 */
export declare const fetchProducts: QueryField<'fetchProducts'>;
/**
 * Get available purchases (purchased items not yet consumed/finished)
 * @param params - Options for getting available purchases
 * @param params.alsoPublishToEventListener - Whether to also publish to event listener
 * @param params.onlyIncludeActiveItems - Whether to only include active items
 *
 * @example
 * ```typescript
 * const purchases = await getAvailablePurchases({
 *   onlyIncludeActiveItemsIOS: true
 * });
 * ```
 */
export declare const getAvailablePurchases: QueryField<'getAvailablePurchases'>;
/**
 * Request the promoted product from the App Store (iOS only)
 * @returns Promise<Product | null> - The promoted product or null if none available
 * @platform iOS
 */
export declare const getPromotedProductIOS: QueryField<'getPromotedProductIOS'>;
export declare const requestPromotedProductIOS: () => Promise<ProductIOS | null>;
export declare const getStorefrontIOS: QueryField<'getStorefrontIOS'>;
export declare const getStorefront: QueryField<'getStorefront'>;
export declare const getAppTransactionIOS: QueryField<'getAppTransactionIOS'>;
export declare const subscriptionStatusIOS: QueryField<'subscriptionStatusIOS'>;
export declare const currentEntitlementIOS: QueryField<'currentEntitlementIOS'>;
export declare const latestTransactionIOS: QueryField<'latestTransactionIOS'>;
export declare const getPendingTransactionsIOS: QueryField<'getPendingTransactionsIOS'>;
export declare const showManageSubscriptionsIOS: MutationField<'showManageSubscriptionsIOS'>;
export declare const isEligibleForIntroOfferIOS: QueryField<'isEligibleForIntroOfferIOS'>;
export declare const getReceiptDataIOS: QueryField<'getReceiptDataIOS'>;
export declare const getReceiptIOS: () => Promise<string>;
export declare const requestReceiptRefreshIOS: () => Promise<string>;
export declare const isTransactionVerifiedIOS: QueryField<'isTransactionVerifiedIOS'>;
export declare const getTransactionJwsIOS: QueryField<'getTransactionJwsIOS'>;
/**
 * Initialize connection to the store
 * @param config - Optional configuration including alternative billing mode for Android
 * @param config.alternativeBillingModeAndroid - Alternative billing mode: 'none', 'user-choice', or 'alternative-only'
 *
 * @example
 * ```typescript
 * // Standard billing (default)
 * await initConnection();
 *
 * // User choice billing (Android)
 * await initConnection({
 *   alternativeBillingModeAndroid: 'user-choice'
 * });
 *
 * // Alternative billing only (Android)
 * await initConnection({
 *   alternativeBillingModeAndroid: 'alternative-only'
 * });
 * ```
 */
export declare const initConnection: MutationField<'initConnection'>;
/**
 * End connection to the store
 */
export declare const endConnection: MutationField<'endConnection'>;
export declare const restorePurchases: MutationField<'restorePurchases'>;
/**
 * Request a purchase for products or subscriptions
 * ⚠️ Important: This is an event-based operation, not promise-based.
 * Listen for events through purchaseUpdatedListener or purchaseErrorListener.
 */
export declare const requestPurchase: MutationField<'requestPurchase'>;
/**
 * Finish a transaction (consume or acknowledge)
 * @param params - Transaction finish parameters
 * @param params.purchase - The purchase to finish
 * @param params.isConsumable - Whether this is a consumable product (Android only)
 * @returns Promise<void> - Resolves when the transaction is successfully finished
 *
 * @example
 * ```typescript
 * await finishTransaction({
 *   purchase: myPurchase,
 *   isConsumable: true
 * });
 * ```
 */
export declare const finishTransaction: MutationField<'finishTransaction'>;
/**
 * Acknowledge a purchase (Android only)
 * @param purchaseToken - The purchase token to acknowledge
 * @returns Promise<boolean> - Indicates whether the acknowledgement succeeded
 *
 * @example
 * ```typescript
 * await acknowledgePurchaseAndroid('purchase_token_here');
 * ```
 */
export declare const acknowledgePurchaseAndroid: MutationField<'acknowledgePurchaseAndroid'>;
/**
 * Consume a purchase (Android only)
 * @param purchaseToken - The purchase token to consume
 * @returns Promise<boolean> - Indicates whether the consumption succeeded
 *
 * @example
 * ```typescript
 * await consumePurchaseAndroid('purchase_token_here');
 * ```
 */
export declare const consumePurchaseAndroid: MutationField<'consumePurchaseAndroid'>;
/**
 * Validate receipt on both iOS and Android platforms
 * @deprecated Use `verifyPurchase` instead. This function will be removed in a future version.
 * @param options - Platform-specific verification options
 * @param options.apple - Apple App Store verification options (iOS)
 * @param options.google - Google Play verification options (Android)
 * @param options.horizon - Meta Horizon (Quest) verification options
 * @returns Promise<VerifyPurchaseResultIOS | VerifyPurchaseResultAndroid> - Platform-specific receipt validation result
 *
 * @example
 * ```typescript
 * // Use verifyPurchase instead:
 * const result = await verifyPurchase({
 *   apple: { sku: 'premium_monthly' },
 *   google: {
 *     sku: 'premium_monthly',
 *     packageName: 'com.example.app',
 *     purchaseToken: 'token...',
 *     accessToken: 'oauth_token...',
 *     isSub: true
 *   }
 * });
 * ```
 */
export declare const validateReceipt: MutationField<'validateReceipt'>;
/**
 * Verify purchase with the configured providers
 *
 * This function uses the native OpenIAP verifyPurchase implementation
 * which validates purchases using platform-specific methods.
 * This is an alias for validateReceipt for API consistency with OpenIAP.
 *
 * @param options - Receipt validation options containing the SKU
 * @returns Promise resolving to receipt validation result
 */
export declare const verifyPurchase: MutationField<'verifyPurchase'>;
/**
 * Verify purchase with a specific provider (e.g., IAPKit)
 *
 * This function allows you to verify purchases using external verification
 * services like IAPKit, which provide additional validation and security.
 *
 * @param options - Verification options including provider and credentials
 * @returns Promise resolving to provider-specific verification result
 *
 * @example
 * ```typescript
 * const result = await verifyPurchaseWithProvider({
 *   provider: 'iapkit',
 *   iapkit: {
 *     apiKey: 'your-api-key',
 *     apple: { jws: purchase.purchaseToken },
 *     google: { purchaseToken: purchase.purchaseToken },
 *   },
 * });
 * ```
 */
export declare const verifyPurchaseWithProvider: MutationField<'verifyPurchaseWithProvider'>;
/**
 * Sync iOS purchases with App Store (iOS only)
 * @returns Promise<boolean>
 * @platform iOS
 */
export declare const syncIOS: MutationField<'syncIOS'>;
/**
 * Present the code redemption sheet for offer codes (iOS only)
 * @returns Promise<boolean> - Indicates whether the redemption sheet was presented
 * @platform iOS
 */
export declare const presentCodeRedemptionSheetIOS: MutationField<'presentCodeRedemptionSheetIOS'>;
/**
 * Buy promoted product on iOS
 * @deprecated In StoreKit 2, promoted products can be purchased directly via the standard `requestPurchase()` flow.
 * Use `promotedProductListenerIOS` to receive the product ID when a user taps a promoted product,
 * then call `requestPurchase()` with the received SKU directly.
 *
 * @example
 * ```typescript
 * // Recommended approach
 * promotedProductListenerIOS(async (product) => {
 *   await requestPurchase({
 *     request: { apple: { sku: product.id } },
 *     type: 'in-app'
 *   });
 * });
 * ```
 *
 * @returns Promise<boolean> - true when the request triggers successfully
 * @platform iOS
 */
export declare const requestPurchaseOnPromotedProductIOS: () => Promise<boolean>;
/**
 * Clear unfinished transactions on iOS
 * @returns Promise<boolean>
 * @platform iOS
 */
export declare const clearTransactionIOS: MutationField<'clearTransactionIOS'>;
/**
 * Begin a refund request for a product on iOS 15+
 * @param sku - The product SKU to refund
 * @returns Promise<string | null> - The refund status or null if not available
 * @platform iOS
 */
export declare const beginRefundRequestIOS: MutationField<'beginRefundRequestIOS'>;
/**
 * Get subscription status for a product (iOS only)
 * @param sku - The product SKU
 * @returns Promise<SubscriptionStatusIOS[]> - Array of subscription status objects
 * @throws Error when called on non-iOS platforms or when IAP is not initialized
 * @platform iOS
 */
/**
 * Get current entitlement for a product (iOS only)
 * @param sku - The product SKU
 * @returns Promise<Purchase | null> - Current entitlement or null
 * @platform iOS
 */
/**
 * Get latest transaction for a product (iOS only)
 * @param sku - The product SKU
 * @returns Promise<Purchase | null> - Latest transaction or null
 * @platform iOS
 */
/**
 * Get pending transactions (iOS only)
 * @returns Promise<Purchase[]> - Array of pending transactions
 * @platform iOS
 */
/**
 * Show manage subscriptions screen (iOS only)
 * @returns Promise<Purchase[]> - Subscriptions where auto-renewal status changed
 * @platform iOS
 */
/**
 * Check if user is eligible for intro offer (iOS only)
 * @param groupID - The subscription group ID
 * @returns Promise<boolean> - Eligibility status
 * @platform iOS
 */
/**
 * Get receipt data (iOS only)
 * @returns Promise<string> - Base64 encoded receipt data
 * @platform iOS
 */
/**
 * Check if transaction is verified (iOS only)
 * @param sku - The product SKU
 * @returns Promise<boolean> - Verification status
 * @platform iOS
 */
/**
 * Get transaction JWS representation (iOS only)
 * @param sku - The product SKU
 * @returns Promise<string | null> - JWS representation or null
 * @platform iOS
 */
/**
 * Get the storefront identifier for the user's App Store account (iOS only)
 * @returns Promise<string> - The storefront identifier (e.g., 'USA' for United States)
 * @platform iOS
 *
 * @example
 * ```typescript
 * const storefront = await getStorefrontIOS();
 * console.log('User storefront:', storefront); // e.g., 'USA', 'GBR', 'KOR'
 * ```
 */
/**
 * Deeplinks to native interface that allows users to manage their subscriptions
 * Cross-platform alias aligning with expo-iap
 */
export declare const deepLinkToSubscriptions: MutationField<'deepLinkToSubscriptions'>;
export declare const deepLinkToSubscriptionsIOS: () => Promise<boolean>;
/**
 * iOS only - Gets the original app transaction ID if the app was purchased from the App Store
 * @platform iOS
 * @description
 * This function retrieves the original app transaction information if the app was purchased
 * from the App Store. Returns null if the app was not purchased (e.g., free app or TestFlight).
 *
 * @returns {Promise<string | null>} The original app transaction ID or null
 *
 * @example
 * ```typescript
 * const appTransaction = await getAppTransactionIOS();
 * if (appTransaction) {
 *   console.log('App was purchased, transaction ID:', appTransaction);
 * } else {
 *   console.log('App was not purchased from App Store');
 * }
 * ```
 */
/**
 * Get all active subscriptions with detailed information (OpenIAP compliant)
 * Returns an array of active subscriptions. If subscriptionIds is not provided,
 * returns all active subscriptions. Platform-specific fields are populated based
 * on the current platform.
 *
 * On iOS, this uses the native getActiveSubscriptions method which includes
 * renewalInfoIOS with details about subscription renewal status, pending
 * upgrades/downgrades, and auto-renewal preferences.
 *
 * @param subscriptionIds - Optional array of subscription IDs to filter by
 * @returns Promise<ActiveSubscription[]> - Array of active subscriptions
 */
export declare const getActiveSubscriptions: QueryField<'getActiveSubscriptions'>;
export declare const hasActiveSubscriptions: QueryField<'hasActiveSubscriptions'>;
export { convertNitroProductToProduct, convertNitroPurchaseToPurchase, convertProductToProductSubscription, validateNitroProduct, validateNitroPurchase, checkTypeSynchronization, } from './utils/type-bridge';
/**
 * @deprecated Use acknowledgePurchaseAndroid instead
 */
export declare const acknowledgePurchase: (args: string) => Promise<boolean>;
/**
 * @deprecated Use consumePurchaseAndroid instead
 */
export declare const consumePurchase: (args: string) => Promise<boolean>;
/**
 * Check if alternative billing is available for this user/device (Android only).
 * Step 1 of alternative billing flow.
 *
 * @returns Promise<boolean> - true if available, false otherwise
 * @throws Error if billing client not ready
 * @platform Android
 *
 * @example
 * ```typescript
 * const isAvailable = await checkAlternativeBillingAvailabilityAndroid();
 * if (isAvailable) {
 *   // Proceed with alternative billing flow
 * }
 * ```
 */
export declare const checkAlternativeBillingAvailabilityAndroid: MutationField<'checkAlternativeBillingAvailabilityAndroid'>;
/**
 * Show alternative billing information dialog to user (Android only).
 * Step 2 of alternative billing flow.
 * Must be called BEFORE processing payment in your payment system.
 *
 * @returns Promise<boolean> - true if user accepted, false if user canceled
 * @throws Error if billing client not ready
 * @platform Android
 *
 * @example
 * ```typescript
 * const userAccepted = await showAlternativeBillingDialogAndroid();
 * if (userAccepted) {
 *   // Process payment in your payment system
 *   const success = await processCustomPayment();
 *   if (success) {
 *     // Create reporting token
 *     const token = await createAlternativeBillingTokenAndroid();
 *     // Send token to your backend for Google Play reporting
 *   }
 * }
 * ```
 */
export declare const showAlternativeBillingDialogAndroid: MutationField<'showAlternativeBillingDialogAndroid'>;
/**
 * Create external transaction token for Google Play reporting (Android only).
 * Step 3 of alternative billing flow.
 * Must be called AFTER successful payment in your payment system.
 * Token must be reported to Google Play backend within 24 hours.
 *
 * @param sku - Optional product SKU that was purchased
 * @returns Promise<string | null> - Token string or null if creation failed
 * @throws Error if billing client not ready
 * @platform Android
 *
 * @example
 * ```typescript
 * const token = await createAlternativeBillingTokenAndroid('premium_subscription');
 * if (token) {
 *   // Send token to your backend
 *   await fetch('/api/report-transaction', {
 *     method: 'POST',
 *     body: JSON.stringify({ token, sku: 'premium_subscription' })
 *   });
 * }
 * ```
 */
export declare const createAlternativeBillingTokenAndroid: MutationField<'createAlternativeBillingTokenAndroid'>;
/**
 * Parameters for launching an external link (Android 8.2.0+).
 */
export interface LaunchExternalLinkParamsAndroid {
    /** The billing program (external-content-link or external-offer) */
    billingProgram: BillingProgramAndroid;
    /** The external link launch mode */
    launchMode: ExternalLinkLaunchModeAndroid;
    /** The type of the external link */
    linkType: ExternalLinkTypeAndroid;
    /** The URI where the content will be accessed from */
    linkUri: string;
}
/**
 * Result of checking billing program availability (Android 8.2.0+).
 */
export interface BillingProgramAvailabilityResultAndroid {
    /** The billing program that was checked */
    billingProgram: BillingProgramAndroid;
    /** Whether the billing program is available for the user */
    isAvailable: boolean;
}
/**
 * Reporting details for external transactions (Android 8.2.0+).
 */
export interface BillingProgramReportingDetailsAndroid {
    /** The billing program that the reporting details are associated with */
    billingProgram: BillingProgramAndroid;
    /** External transaction token used to report transactions to Google */
    externalTransactionToken: string;
}
/**
 * Enable a billing program before initConnection (Android only).
 * Must be called BEFORE initConnection() to configure the BillingClient.
 *
 * @param program - The billing program to enable (external-content-link or external-offer)
 * @platform Android
 * @since Google Play Billing Library 8.2.0+
 *
 * @example
 * ```typescript
 * // Enable external offers before connecting
 * enableBillingProgramAndroid('external-offer');
 * await initConnection();
 * ```
 */
export declare const enableBillingProgramAndroid: (program: BillingProgramAndroid) => void;
/**
 * Check if a billing program is available for this user/device (Android only).
 *
 * @param program - The billing program to check
 * @returns Promise with availability result
 * @platform Android
 * @since Google Play Billing Library 8.2.0+
 *
 * @example
 * ```typescript
 * const result = await isBillingProgramAvailableAndroid('external-offer');
 * if (result.isAvailable) {
 *   // External offers are available for this user
 * }
 * ```
 */
export declare const isBillingProgramAvailableAndroid: MutationField<'isBillingProgramAvailableAndroid'>;
/**
 * Create billing program reporting details for external transactions (Android only).
 * Used to get the external transaction token needed for reporting to Google.
 *
 * @param program - The billing program to create reporting details for
 * @returns Promise with reporting details including external transaction token
 * @platform Android
 * @since Google Play Billing Library 8.2.0+
 *
 * @example
 * ```typescript
 * const details = await createBillingProgramReportingDetailsAndroid('external-offer');
 * // Use details.externalTransactionToken to report the transaction
 * await fetch('/api/report-external-transaction', {
 *   method: 'POST',
 *   body: JSON.stringify({ token: details.externalTransactionToken })
 * });
 * ```
 */
export declare const createBillingProgramReportingDetailsAndroid: MutationField<'createBillingProgramReportingDetailsAndroid'>;
/**
 * Launch external link for external offers or app download (Android only).
 *
 * @param params - Parameters for launching the external link
 * @returns Promise<boolean> - true if user accepted, false otherwise
 * @platform Android
 * @since Google Play Billing Library 8.2.0+
 *
 * @example
 * ```typescript
 * const success = await launchExternalLinkAndroid({
 *   billingProgram: 'external-offer',
 *   launchMode: 'launch-in-external-browser-or-app',
 *   linkType: 'link-to-digital-content-offer',
 *   linkUri: 'https://your-website.com/purchase'
 * });
 * if (success) {
 *   console.log('User accepted external link');
 * }
 * ```
 */
export declare const launchExternalLinkAndroid: MutationField<'launchExternalLinkAndroid'>;
/**
 * Check if the device can present an external purchase notice sheet (iOS 18.2+).
 *
 * @returns Promise<boolean> - true if notice sheet can be presented
 * @platform iOS
 *
 * @example
 * ```typescript
 * const canPresent = await canPresentExternalPurchaseNoticeIOS();
 * if (canPresent) {
 *   // Present notice before external purchase
 *   const result = await presentExternalPurchaseNoticeSheetIOS();
 * }
 * ```
 */
export declare const canPresentExternalPurchaseNoticeIOS: QueryField<'canPresentExternalPurchaseNoticeIOS'>;
/**
 * Present an external purchase notice sheet to inform users about external purchases (iOS 18.2+).
 * This must be called before opening an external purchase link.
 *
 * @returns Promise<ExternalPurchaseNoticeResultIOS> - Result with action and error if any
 * @platform iOS
 *
 * @example
 * ```typescript
 * const result = await presentExternalPurchaseNoticeSheetIOS();
 * if (result.result === 'continue') {
 *   // User chose to continue, open external purchase link
 *   await presentExternalPurchaseLinkIOS('https://your-website.com/purchase');
 * }
 * ```
 */
export declare const presentExternalPurchaseNoticeSheetIOS: MutationField<'presentExternalPurchaseNoticeSheetIOS'>;
/**
 * Present an external purchase link to redirect users to your website (iOS 16.0+).
 *
 * @param url - The external purchase URL to open
 * @returns Promise<ExternalPurchaseLinkResultIOS> - Result with success status and error if any
 * @platform iOS
 *
 * @example
 * ```typescript
 * const result = await presentExternalPurchaseLinkIOS('https://your-website.com/purchase');
 * if (result.success) {
 *   console.log('User completed external purchase');
 * }
 * ```
 */
export declare const presentExternalPurchaseLinkIOS: MutationField<'presentExternalPurchaseLinkIOS'>;
//# sourceMappingURL=index.d.ts.map