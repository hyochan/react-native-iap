"use strict";

// ============================================================================
// AUTO-GENERATED TYPES — DO NOT EDIT DIRECTLY
// Run `bun run generate:types` after updating any *.graphql schema file.
// ============================================================================

/**
 * Alternative billing mode for Android
 * Controls which billing system is used
 * @deprecated Use enableBillingProgramAndroid with BillingProgramAndroid instead.
 * Use USER_CHOICE_BILLING for user choice billing, EXTERNAL_OFFER for alternative only.
 */

/**
 * Billing program types for external content links, external offers, and external payments (Android)
 * Available in Google Play Billing Library 8.2.0+, EXTERNAL_PAYMENTS added in 8.3.0
 */

/**
 * Result of checking billing program availability (Android)
 * Available in Google Play Billing Library 8.2.0+
 */

/**
 * Reporting details for transactions made outside of Google Play Billing (Android)
 * Contains the external transaction token needed for reporting
 * Available in Google Play Billing Library 8.2.0+
 */

/**
 * Launch mode for developer billing option (Android)
 * Determines how the external payment URL is launched
 * Available in Google Play Billing Library 8.3.0+
 */

/**
 * Parameters for developer billing option in purchase flow (Android)
 * Used with BillingFlowParams to enable external payments flow
 * Available in Google Play Billing Library 8.3.0+
 */

/**
 * Details provided when user selects developer billing option (Android)
 * Received via DeveloperProvidedBillingListener callback
 * Available in Google Play Billing Library 8.3.0+
 */

/**
 * Discount amount details for one-time purchase offers (Android)
 * Available in Google Play Billing Library 7.0+
 */

/**
 * Discount display information for one-time purchase offers (Android)
 * Available in Google Play Billing Library 7.0+
 */

export let ErrorCode = /*#__PURE__*/function (ErrorCode) {
  ErrorCode["ActivityUnavailable"] = "activity-unavailable";
  ErrorCode["AlreadyOwned"] = "already-owned";
  ErrorCode["AlreadyPrepared"] = "already-prepared";
  ErrorCode["BillingResponseJsonParseError"] = "billing-response-json-parse-error";
  ErrorCode["BillingUnavailable"] = "billing-unavailable";
  ErrorCode["ConnectionClosed"] = "connection-closed";
  ErrorCode["DeferredPayment"] = "deferred-payment";
  ErrorCode["DeveloperError"] = "developer-error";
  ErrorCode["EmptySkuList"] = "empty-sku-list";
  ErrorCode["FeatureNotSupported"] = "feature-not-supported";
  ErrorCode["IapNotAvailable"] = "iap-not-available";
  ErrorCode["InitConnection"] = "init-connection";
  ErrorCode["Interrupted"] = "interrupted";
  ErrorCode["ItemNotOwned"] = "item-not-owned";
  ErrorCode["ItemUnavailable"] = "item-unavailable";
  ErrorCode["NetworkError"] = "network-error";
  ErrorCode["NotEnded"] = "not-ended";
  ErrorCode["NotPrepared"] = "not-prepared";
  ErrorCode["Pending"] = "pending";
  ErrorCode["PurchaseError"] = "purchase-error";
  ErrorCode["PurchaseVerificationFailed"] = "purchase-verification-failed";
  ErrorCode["PurchaseVerificationFinishFailed"] = "purchase-verification-finish-failed";
  ErrorCode["PurchaseVerificationFinished"] = "purchase-verification-finished";
  ErrorCode["QueryProduct"] = "query-product";
  ErrorCode["ReceiptFailed"] = "receipt-failed";
  ErrorCode["ReceiptFinished"] = "receipt-finished";
  ErrorCode["ReceiptFinishedFailed"] = "receipt-finished-failed";
  ErrorCode["RemoteError"] = "remote-error";
  ErrorCode["ServiceDisconnected"] = "service-disconnected";
  ErrorCode["ServiceError"] = "service-error";
  ErrorCode["SkuNotFound"] = "sku-not-found";
  ErrorCode["SkuOfferMismatch"] = "sku-offer-mismatch";
  ErrorCode["SyncError"] = "sync-error";
  ErrorCode["TransactionValidationFailed"] = "transaction-validation-failed";
  ErrorCode["Unknown"] = "unknown";
  ErrorCode["UserCancelled"] = "user-cancelled";
  ErrorCode["UserError"] = "user-error";
  return ErrorCode;
}({});

/**
 * Launch mode for external link flow (Android)
 * Determines how the external URL is launched
 * Available in Google Play Billing Library 8.2.0+
 */

/**
 * Link type for external link flow (Android)
 * Specifies the type of external link destination
 * Available in Google Play Billing Library 8.2.0+
 */

/**
 * External offer availability result (Android)
 * @deprecated Use BillingProgramAvailabilityResultAndroid with isBillingProgramAvailableAsync instead
 * Available in Google Play Billing Library 6.2.0+, deprecated in 8.2.0
 */

/**
 * External offer reporting details (Android)
 * @deprecated Use BillingProgramReportingDetailsAndroid with createBillingProgramReportingDetailsAsync instead
 * Available in Google Play Billing Library 6.2.0+, deprecated in 8.2.0
 */

/** Result of presenting an external purchase link (iOS 18.2+) */

/** User actions on external purchase notice sheet (iOS 18.2+) */

/** Result of presenting external purchase notice sheet (iOS 18.2+) */

/** Unified purchase states from IAPKit verification response. */

/** Connection initialization configuration */

/**
 * Parameters for launching an external link (Android)
 * Used with launchExternalLink to initiate external offer or app install flows
 * Available in Google Play Billing Library 8.2.0+
 */

/**
 * Limited quantity information for one-time purchase offers (Android)
 * Available in Google Play Billing Library 7.0+
 */

/**
 * Pre-order details for one-time purchase products (Android)
 * Available in Google Play Billing Library 8.1.0+
 */

/**
 * One-time purchase offer details (Android)
 * Available in Google Play Billing Library 7.0+
 */

/**
 * Subscription renewal information from Product.SubscriptionInfo.RenewalInfo
 * https://developer.apple.com/documentation/storekit/product/subscriptioninfo/renewalinfo
 */

/**
 * Rental details for one-time purchase products that can be rented (Android)
 * Available in Google Play Billing Library 7.0+
 */

/**
 * Platform-specific purchase request parameters.
 *
 * Note: "Platforms" refers to the SDK/OS level (apple, google), not the store.
 * - apple: Always targets App Store
 * - google: Targets Play Store by default, or Horizon when built with horizon flavor
 *   (determined at build time, not runtime)
 */

/**
 * Platform-specific subscription request parameters.
 *
 * Note: "Platforms" refers to the SDK/OS level (apple, google), not the store.
 * - apple: Always targets App Store
 * - google: Targets Play Store by default, or Horizon when built with horizon flavor
 *   (determined at build time, not runtime)
 */

/**
 * Platform-specific verification parameters for IAPKit.
 *
 * - apple: Verifies via App Store (JWS token)
 * - google: Verifies via Play Store (purchase token)
 */

/**
 * Product-level subscription replacement parameters (Android)
 * Used with setSubscriptionProductReplacementParams in BillingFlowParams.ProductDetailsParams
 * Available in Google Play Billing Library 8.1.0+
 */

/**
 * Replacement mode for subscription changes (Android)
 * These modes determine how the subscription replacement affects billing.
 * Available in Google Play Billing Library 8.1.0+
 */

/**
 * User Choice Billing event details (Android)
 * Fired when a user selects alternative billing in the User Choice Billing dialog
 */

/**
 * Valid time window for when an offer is available (Android)
 * Available in Google Play Billing Library 7.0+
 */

/**
 * Apple App Store verification parameters.
 * Used for server-side receipt validation via App Store Server API.
 */

/**
 * Google Play Store verification parameters.
 * Used for server-side receipt validation via Google Play Developer API.
 *
 * ⚠️ SECURITY: Contains sensitive tokens (accessToken, purchaseToken). Do not log or persist this data.
 */

/**
 * Meta Horizon (Quest) verification parameters.
 * Used for server-side entitlement verification via Meta's S2S API.
 * POST https://graph.oculus.com/$APP_ID/verify_entitlement
 *
 * ⚠️ SECURITY: Contains sensitive token (accessToken). Do not log or persist this data.
 */

/**
 * Platform-specific purchase verification parameters.
 *
 * - apple: Verifies via App Store Server API
 * - google: Verifies via Google Play Developer API
 * - horizon: Verifies via Meta's S2S API (verify_entitlement endpoint)
 */

/**
 * Result from Meta Horizon verify_entitlement API.
 * Returns verification status and grant time for the entitlement.
 */

// -- Query helper types (auto-generated)

// -- End query helper types

// -- Mutation helper types (auto-generated)

// -- End mutation helper types

// -- Subscription helper types (auto-generated)

// -- End subscription helper types
//# sourceMappingURL=types.js.map