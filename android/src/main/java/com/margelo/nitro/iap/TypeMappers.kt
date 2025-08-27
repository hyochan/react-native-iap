package com.margelo.nitro.iap

/**
 * Type mapping functions to convert between Nitro generated types and legacy types
 */

// Extension types for Android-specific request parameters
data class RequestSubscriptionAndroidProps(
    // Properties from RequestPurchaseAndroidProps
    val skus: Array<String>,
    val obfuscatedAccountIdAndroid: String?,
    val obfuscatedProfileIdAndroid: String?,
    val isOfferPersonalized: Boolean?,
    // Additional subscription properties
    val subscriptionOffers: Array<SubscriptionOfferInfo>?,
    val replacementModeAndroid: Double?,
    val purchaseTokenAndroid: String?
)

data class SubscriptionOfferInfo(
    val sku: String,
    val offerToken: String,
    val basePlanId: String? = null
)