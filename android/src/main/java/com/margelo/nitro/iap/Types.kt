package com.margelo.nitro.iap

import com.android.billingclient.api.BillingClient

/**
 * Error codes for IAP operations - centralized error code management
 * Single source of truth for all error codes used across the module
 */
object IapErrorCode {
    // Connection and initialization errors
    const val E_NOT_PREPARED = "E_NOT_PREPARED"
    const val E_INIT_CONNECTION = "E_INIT_CONNECTION"
    const val E_SERVICE_DISCONNECTED = "E_SERVICE_DISCONNECTED"
    const val E_ALREADY_PREPARED = "E_ALREADY_PREPARED"
    const val E_CONNECTION_CLOSED = "E_CONNECTION_CLOSED"
    
    // Product and purchase errors
    const val E_QUERY_PRODUCT = "E_QUERY_PRODUCT"
    const val E_SKU_NOT_FOUND = "E_SKU_NOT_FOUND"
    const val E_SKU_OFFER_MISMATCH = "E_SKU_OFFER_MISMATCH"
    const val E_PURCHASE_ERROR = "E_PURCHASE_ERROR"
    const val E_USER_CANCELLED = "E_USER_CANCELLED"
    const val E_PENDING = "E_PENDING"
    
    // Service and developer errors
    const val E_SERVICE_ERROR = "E_SERVICE_ERROR"
    const val E_DEVELOPER_ERROR = "E_DEVELOPER_ERROR"
    const val E_ITEM_UNAVAILABLE = "E_ITEM_UNAVAILABLE"
    const val E_ALREADY_OWNED = "E_ALREADY_OWNED"
    const val E_ITEM_NOT_OWNED = "E_ITEM_NOT_OWNED"
    
    // Network and billing errors
    const val E_NETWORK_ERROR = "E_NETWORK_ERROR"
    const val E_BILLING_UNAVAILABLE = "E_BILLING_UNAVAILABLE"
    const val E_FEATURE_NOT_SUPPORTED = "E_FEATURE_NOT_SUPPORTED"
    const val E_BILLING_RESPONSE_JSON_PARSE_ERROR = "E_BILLING_RESPONSE_JSON_PARSE_ERROR"
    
    // Activity and UI errors
    const val E_ACTIVITY_UNAVAILABLE = "E_ACTIVITY_UNAVAILABLE"
    
    // User and remote errors
    const val E_USER_ERROR = "E_USER_ERROR"
    const val E_REMOTE_ERROR = "E_REMOTE_ERROR"
    const val E_NOT_ENDED = "E_NOT_ENDED"
    
    // Validation errors
    const val E_EMPTY_SKU_LIST = "E_EMPTY_SKU_LIST"
    const val E_RECEIPT_FAILED = "E_RECEIPT_FAILED"
    
    // Unknown error
    const val E_UNKNOWN = "E_UNKNOWN"
}

/**
 * Data class for billing error information
 */
data class BillingErrorData(
    val code: String,
    val message: String
)

/**
 * Helper object for billing response handling
 */
object BillingUtils {
    
    /**
     * Get error data from billing response code
     */
    fun getBillingErrorData(responseCode: Int): BillingErrorData {
        return when (responseCode) {
            BillingClient.BillingResponseCode.OK -> 
                BillingErrorData("OK", "Success")
            
            BillingClient.BillingResponseCode.USER_CANCELED -> 
                BillingErrorData(IapErrorCode.E_USER_CANCELLED, "User cancelled the purchase")
            
            BillingClient.BillingResponseCode.SERVICE_UNAVAILABLE -> 
                BillingErrorData(IapErrorCode.E_SERVICE_ERROR, "Network connection is down")
            
            BillingClient.BillingResponseCode.BILLING_UNAVAILABLE -> 
                BillingErrorData(IapErrorCode.E_BILLING_UNAVAILABLE, "Billing API version is not supported for the type requested")
            
            BillingClient.BillingResponseCode.ITEM_UNAVAILABLE -> 
                BillingErrorData(IapErrorCode.E_ITEM_UNAVAILABLE, "Requested product is not available for purchase")
            
            BillingClient.BillingResponseCode.DEVELOPER_ERROR -> 
                BillingErrorData(IapErrorCode.E_DEVELOPER_ERROR, "Invalid arguments provided to the API")
            
            BillingClient.BillingResponseCode.ERROR -> 
                BillingErrorData(IapErrorCode.E_UNKNOWN, "Fatal error during the API action")
            
            BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED -> 
                BillingErrorData(IapErrorCode.E_ALREADY_OWNED, "Failure to purchase since item is already owned")
            
            BillingClient.BillingResponseCode.ITEM_NOT_OWNED -> 
                BillingErrorData(IapErrorCode.E_ITEM_NOT_OWNED, "Failure to consume since item is not owned")
            
            BillingClient.BillingResponseCode.SERVICE_DISCONNECTED -> 
                BillingErrorData(IapErrorCode.E_SERVICE_DISCONNECTED, "Play Store service is not connected now")
            
            BillingClient.BillingResponseCode.FEATURE_NOT_SUPPORTED -> 
                BillingErrorData(IapErrorCode.E_FEATURE_NOT_SUPPORTED, "The requested feature is not supported by Play Store on the current device")
            
            BillingClient.BillingResponseCode.NETWORK_ERROR -> 
                BillingErrorData(IapErrorCode.E_NETWORK_ERROR, "A network error occurred during the operation")
            
            else -> 
                BillingErrorData(IapErrorCode.E_UNKNOWN, "Unknown billing error (code: $responseCode)")
        }
    }
    
    /**
     * Get error message for Google Play Services availability
     */
    fun getPlayServicesErrorMessage(resultCode: Int): String {
        return when (resultCode) {
            com.google.android.gms.common.ConnectionResult.SERVICE_MISSING -> 
                "Google Play Services is missing on this device"
            
            com.google.android.gms.common.ConnectionResult.SERVICE_VERSION_UPDATE_REQUIRED -> 
                "Google Play Services needs to be updated"
            
            com.google.android.gms.common.ConnectionResult.SERVICE_DISABLED -> 
                "Google Play Services is disabled"
            
            com.google.android.gms.common.ConnectionResult.SERVICE_INVALID -> 
                "Google Play Services is invalid"
            
            else -> 
                "Google Play Services is not available (error code: $resultCode)"
        }
    }
    
    /**
     * Create JSON error string from error data and additional info
     */
    fun createErrorJson(
        code: String, 
        message: String, 
        responseCode: Int? = null, 
        debugMessage: String? = null,
        productId: String? = null,
        additionalData: Map<String, Any> = emptyMap()
    ): String {
        val errorMap = mutableMapOf<String, Any>(
            "code" to code,
            "message" to message
        )
        
        responseCode?.let { errorMap["responseCode"] = it }
        debugMessage?.let { errorMap["debugMessage"] = it }
        productId?.let { errorMap["productId"] = it }
        errorMap.putAll(additionalData)
        
        return try {
            // Simple JSON serialization for basic types
            val jsonPairs = errorMap.map { (key, value) ->
                val valueStr = when (value) {
                    is String -> "\"${value.replace("\"", "\\\"")}\""
                    is Number -> value.toString()
                    is Boolean -> value.toString()
                    else -> "\"$value\""
                }
                "\"$key\":$valueStr"
            }
            "{${jsonPairs.joinToString(",")}}"
        } catch (e: Exception) {
            // Fallback to simple format
            "$code: $message"
        }
    }
}