package com.dooboolab.rniap

import android.util.Log
import com.android.billingclient.api.BillingClient
import com.facebook.react.bridge.Promise

data class BillingResponse(
    val code: String,
    val message: String,
)

object PlayUtils {
    fun rejectPromiseWithBillingError(
        promise: Promise,
        responseCode: Int,
    ) {
        val errorData = getBillingResponseData(responseCode)
        promise.safeReject(errorData.code, errorData.message)
    }

    fun getBillingResponseData(responseCode: Int): BillingResponse {
        val errorData =
            when (responseCode) {
                BillingClient.BillingResponseCode.FEATURE_NOT_SUPPORTED -> {
                    BillingResponse(
                        PromiseUtils.E_SERVICE_ERROR,
                        "This feature is not available on your device.",
                    )
                }
                BillingClient.BillingResponseCode.SERVICE_DISCONNECTED -> {
                    BillingResponse(
                        PromiseUtils.E_NETWORK_ERROR,
                        "The service is disconnected (check your internet connection.)",
                    )
                }
                BillingClient.BillingResponseCode.NETWORK_ERROR -> {
                    BillingResponse(
                        PromiseUtils.E_NETWORK_ERROR,
                        "You have problem with network connection.",
                    )
                }
                BillingClient.BillingResponseCode.OK -> {
                    BillingResponse(
                        "OK",
                        "",
                    )
                }
                BillingClient.BillingResponseCode.USER_CANCELED -> {
                    BillingResponse(
                        PromiseUtils.E_USER_CANCELLED,
                        "Payment is Cancelled.",
                    )
                }
                BillingClient.BillingResponseCode.SERVICE_UNAVAILABLE -> {
                    BillingResponse(
                        PromiseUtils.E_SERVICE_ERROR,
                        "The service is unreachable. This may be your internet connection, or the Play Store may be down.",
                    )
                }
                BillingClient.BillingResponseCode.BILLING_UNAVAILABLE -> {
                    BillingResponse(
                        PromiseUtils.E_SERVICE_ERROR,
                        "Billing is unavailable. This may be a problem with your device, or the Play Store may be down.",
                    )
                }
                BillingClient.BillingResponseCode.ITEM_UNAVAILABLE -> {
                    BillingResponse(
                        PromiseUtils.E_ITEM_UNAVAILABLE,
                        "That item is unavailable.",
                    )
                }
                BillingClient.BillingResponseCode.DEVELOPER_ERROR -> {
                    BillingResponse(
                        PromiseUtils.E_DEVELOPER_ERROR,
                        "Google is indicating that we have some issue connecting to payment.",
                    )
                }
                BillingClient.BillingResponseCode.ERROR -> {
                    BillingResponse(
                        PromiseUtils.E_UNKNOWN,
                        "An unknown or unexpected error has occurred. Please try again later.",
                    )
                }
                BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED -> {
                    BillingResponse(
                        PromiseUtils.E_ALREADY_OWNED,
                        "You already own this item.",
                    )
                }
                BillingClient.BillingResponseCode.ITEM_NOT_OWNED -> {
                    BillingResponse(
                        PromiseUtils.E_ITEM_UNAVAILABLE,
                        "Item not owned. It may have already been consumed.",
                    )
                }
                else -> {
                    BillingResponse(
                        PromiseUtils.E_UNKNOWN,
                        "Purchase failed with code: $responseCode",
                    )
                }
            }
        Log.e(TAG, "Error Code : $responseCode")
        return errorData
    }

    fun rejectPromisesWithBillingError(
        key: String,
        responseCode: Int,
    ) {
        val errorData = getBillingResponseData(responseCode)
        PromiseUtils.rejectPromisesForKey(key, errorData.code, errorData.message, null)
    }
}
