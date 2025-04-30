package com.dooboolab.rniap

import android.util.Log
import com.amazon.device.iap.PurchasingListener
import com.amazon.device.iap.model.ProductDataResponse
import com.amazon.device.iap.model.ProductType
import com.amazon.device.iap.model.PurchaseResponse
import com.amazon.device.iap.model.PurchaseUpdatesResponse
import com.amazon.device.iap.model.UserDataResponse
import com.dooboolab.rniap.utils.toMap
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.bridge.WritableNativeMap
import java.lang.NumberFormatException

val ProductType.typeString: String
    get() = if (this == ProductType.ENTITLED || this == ProductType.CONSUMABLE) "inapp" else "subs"

class RNIapAmazonListener(
    var eventSender: EventSender?,
    var purchasingService: PurchasingServiceProxy?,
) : PurchasingListener {
    override fun onProductDataResponse(response: ProductDataResponse) {
        when (response.requestStatus) {
            ProductDataResponse.RequestStatus.SUCCESSFUL -> {
                val productData = response.productData
                val items = WritableNativeArray()
                for ((_, product) in productData) {
                    var priceNumber: Number = 0.00
                    val priceString = product.price
                    try {
                        if (priceString?.isNotEmpty() == true) {
                            priceNumber = priceString.replace("[^\\d.,]+".toRegex(), "").toDouble()
                        }
                    } catch (e: NumberFormatException) {
                        Log.w(
                            TAG,
                            "onProductDataResponse: Failed to parse price for product: " + product.sku,
                        )
                    }
                    val item = Arguments.createMap()
                    val coinsReward = product.coinsReward
                    item.putString("productId", product.sku)
                    item.putString("price", priceNumber.toString())
                    item.putString("type", product.productType.typeString)
                    item.putString("localizedPrice", priceString)
                    item.putString("title", product.title)
                    item.putString("description", product.description)
                    item.putString("iconUrl", product.smallIconUrl)
                    item.putString("originalJson", product.toString())
                    item.putString("originalPrice", priceString)
                    // item.putString("userMarketplaceAmazon", marketplace);
                    if (coinsReward != null) {
                        item.putInt("coinsRewardAmountAmazon", coinsReward.amount)
                    }
                    items.pushMap(item)
                }
                PromiseUtils
                    .resolvePromisesForKey(
                        RNIapAmazonModule.PROMISE_GET_PRODUCT_DATA,
                        items,
                    )
            }
            ProductDataResponse.RequestStatus.FAILED ->
                PromiseUtils
                    .rejectPromisesForKey(
                        RNIapAmazonModule.PROMISE_GET_PRODUCT_DATA,
                        E_PRODUCT_DATA_RESPONSE_FAILED,
                        null,
                        null,
                    )
            ProductDataResponse.RequestStatus.NOT_SUPPORTED ->
                PromiseUtils
                    .rejectPromisesForKey(
                        RNIapAmazonModule.PROMISE_GET_PRODUCT_DATA,
                        E_PRODUCT_DATA_RESPONSE_NOT_SUPPORTED,
                        null,
                        null,
                    )
        }
    }

    override fun onPurchaseUpdatesResponse(response: PurchaseUpdatesResponse) {
        when (response.requestStatus) {
            PurchaseUpdatesResponse.RequestStatus.SUCCESSFUL -> {
                val availableItems = Arguments.createArray()
                val userData = response.userData
                var promiseItem: WritableMap? = null
                val purchases = response.receipts
                for (receipt in purchases) {
                    val item = receipt.toMap(userData)
                    promiseItem = WritableNativeMap()
                    promiseItem.merge(item)
                    eventSender?.sendEvent("purchase-updated", item)
                    availableItems.pushMap(promiseItem)
                }
                if (response.hasMore()) {
                    purchasingService?.getPurchaseUpdates(false)
                } else {
                    if (purchases.size > 0 && promiseItem != null) {
                        PromiseUtils
                            .resolvePromisesForKey(
                                RNIapAmazonModule.PROMISE_BUY_ITEM,
                                promiseItem,
                            )
                    }
                    PromiseUtils
                        .resolvePromisesForKey(
                            RNIapAmazonModule.PROMISE_QUERY_PURCHASES,
                            true,
                        )
                    PromiseUtils
                        .resolvePromisesForKey(
                            RNIapAmazonModule.PROMISE_QUERY_AVAILABLE_ITEMS,
                            availableItems,
                        )
                }
            }
            PurchaseUpdatesResponse.RequestStatus.FAILED -> {
                val error = Arguments.createMap()
                val debugMessage = "An unknown or unexpected error has occured. Please try again later."
                val errorCode = PromiseUtils.E_UNKNOWN
                error.putInt("responseCode", 0)
                error.putString("debugMessage", debugMessage)
                error.putString("code", errorCode)
                error.putString("message", debugMessage)
                eventSender?.sendEvent("purchase-error", error)
                PromiseUtils
                    .rejectPromisesForKey(
                        RNIapAmazonModule.PROMISE_QUERY_PURCHASES,
                        errorCode,
                        debugMessage,
                        null,
                    )
                PromiseUtils
                    .rejectPromisesForKey(
                        RNIapAmazonModule.PROMISE_QUERY_AVAILABLE_ITEMS,
                        errorCode,
                        debugMessage,
                        null,
                    )
            }
            PurchaseUpdatesResponse.RequestStatus.NOT_SUPPORTED -> {
                val error = Arguments.createMap()
                val debugMessage = "This feature is not available on your device."
                val errorCode = PromiseUtils.E_SERVICE_ERROR
                error.putInt("responseCode", 0)
                error.putString("debugMessage", debugMessage)
                error.putString("code", errorCode)
                error.putString("message", debugMessage)
                eventSender?.sendEvent("purchase-error", error)
                PromiseUtils
                    .rejectPromisesForKey(
                        RNIapAmazonModule.PROMISE_QUERY_PURCHASES,
                        errorCode,
                        debugMessage,
                        null,
                    )
                PromiseUtils
                    .rejectPromisesForKey(
                        RNIapAmazonModule.PROMISE_QUERY_AVAILABLE_ITEMS,
                        errorCode,
                        debugMessage,
                        null,
                    )
            }
        }
    }

    override fun onPurchaseResponse(response: PurchaseResponse) {
        val requestId = response.requestId.toString()
        val userId = response.userData.userId

        when (response.requestStatus) {
            PurchaseResponse.RequestStatus.SUCCESSFUL -> {
                val receipt = response.receipt
                val userData = response.userData
                val item = receipt.toMap(userData)
                val promiseItem: WritableMap = Arguments.createMap()
                promiseItem.merge(item)
                eventSender?.sendEvent("purchase-updated", item)
                PromiseUtils
                    .resolvePromisesForKey(
                        RNIapAmazonModule.PROMISE_BUY_ITEM,
                        promiseItem,
                    )
            }
            PurchaseResponse.RequestStatus.ALREADY_PURCHASED -> {
                val error = Arguments.createMap()
                val debugMessage = "You already own this item."
                val errorCode = PromiseUtils.E_ALREADY_OWNED
                error.putInt("responseCode", 0)
                error.putString("debugMessage", debugMessage)
                error.putString("code", errorCode)
                error.putString("message", debugMessage)
                eventSender?.sendEvent("purchase-error", error)
                PromiseUtils
                    .rejectPromisesForKey(
                        RNIapAmazonModule.PROMISE_BUY_ITEM,
                        errorCode,
                        debugMessage,
                        null,
                    )
            }
            PurchaseResponse.RequestStatus.FAILED -> {
                val error = Arguments.createMap()
                val debugMessage =
                    "An unknown or unexpected error has occurred. Please try again later."
                val errorCode = PromiseUtils.E_UNKNOWN
                error.putInt("responseCode", 0)
                error.putString("debugMessage", debugMessage)
                error.putString("code", errorCode)
                error.putString("message", debugMessage)
                eventSender?.sendEvent("purchase-error", error)
                PromiseUtils
                    .rejectPromisesForKey(
                        RNIapAmazonModule.PROMISE_BUY_ITEM,
                        errorCode,
                        debugMessage,
                        null,
                    )
            }
            PurchaseResponse.RequestStatus.INVALID_SKU -> {
                val error = Arguments.createMap()
                val debugMessage = "That item is unavailable."
                val errorCode = PromiseUtils.E_ITEM_UNAVAILABLE
                error.putInt("responseCode", 0)
                error.putString("debugMessage", debugMessage)
                error.putString("code", errorCode)
                error.putString("message", debugMessage)
                eventSender?.sendEvent("purchase-error", error)
                PromiseUtils
                    .rejectPromisesForKey(
                        RNIapAmazonModule.PROMISE_BUY_ITEM,
                        errorCode,
                        debugMessage,
                        null,
                    )
            }
            PurchaseResponse.RequestStatus.PENDING -> {
                val error = Arguments.createMap()
                val debugMessage = "Purchase is pending. Please wait for the transaction to complete."
                val errorCode = PromiseUtils.E_PENDING
                error.putInt("responseCode", 0)
                error.putString("code", errorCode)
                error.putString("debugMessage", debugMessage)
                error.putString("message", debugMessage)
                eventSender?.sendEvent("purchase-error", error)
                PromiseUtils
                    .rejectPromisesForKey(
                        RNIapAmazonModule.PROMISE_BUY_ITEM,
                        errorCode,
                        debugMessage,
                        null,
                    )
            }
            PurchaseResponse.RequestStatus.NOT_SUPPORTED -> {
                val error = Arguments.createMap()
                val debugMessage = "This feature is not available on your device."
                val errorCode = PromiseUtils.E_SERVICE_ERROR
                error.putInt("responseCode", 0)
                error.putString("debugMessage", debugMessage)
                error.putString("code", errorCode)
                error.putString("message", debugMessage)
                eventSender?.sendEvent("purchase-error", error)
                PromiseUtils
                    .rejectPromisesForKey(
                        RNIapAmazonModule.PROMISE_BUY_ITEM,
                        errorCode,
                        debugMessage,
                        null,
                    )
            }
        }
    }

    override fun onUserDataResponse(response: UserDataResponse) {
        when (response.requestStatus) {
            UserDataResponse.RequestStatus.SUCCESSFUL -> {
                val userData = response.userData
                val item = Arguments.createMap()
                item.putString("userIdAmazon", userData.userId)
                item.putString("userMarketplaceAmazon", userData.marketplace)
                item.putString("userCountryCode", userData.countryCode)
                item.putString("userJsonAmazon", userData.toJSON().toString())
                PromiseUtils
                    .resolvePromisesForKey(RNIapAmazonModule.PROMISE_GET_USER_DATA, item)
            }
            UserDataResponse.RequestStatus.NOT_SUPPORTED ->
                PromiseUtils
                    .rejectPromisesForKey(
                        RNIapAmazonModule.PROMISE_GET_USER_DATA,
                        E_USER_DATA_RESPONSE_NOT_SUPPORTED,
                        null,
                        null,
                    )
            UserDataResponse.RequestStatus.FAILED ->
                PromiseUtils
                    .rejectPromisesForKey(
                        RNIapAmazonModule.PROMISE_GET_USER_DATA,
                        E_USER_DATA_RESPONSE_FAILED,
                        null,
                        null,
                    )
        }
    }

    companion object {
        private const val E_PRODUCT_DATA_RESPONSE_FAILED = "E_PRODUCT_DATA_RESPONSE_FAILED"
        private const val E_PRODUCT_DATA_RESPONSE_NOT_SUPPORTED =
            "E_PRODUCT_DATA_RESPONSE_NOT_SUPPORTED"
        private const val E_PURCHASE_UPDATES_RESPONSE_FAILED = "E_PURCHASE_UPDATES_RESPONSE_FAILED"
        private const val E_PURCHASE_UPDATES_RESPONSE_NOT_SUPPORTED =
            "E_PURCHASE_UPDATES_RESPONSE_NOT_SUPPORTED"
        private const val E_PURCHASE_RESPONSE_FAILED = "E_PURCHASE_RESPONSE_FAILED"
        private const val E_PURCHASE_RESPONSE_ALREADY_PURCHASED =
            "E_PURCHASE_RESPONSE_ALREADY_PURCHASED"
        private const val E_PURCHASE_RESPONSE_NOT_SUPPORTED = "E_PURCHASE_RESPONSE_NOT_SUPPORTED"
        private const val E_PURCHASE_RESPONSE_INVALID_SKU = "E_PURCHASE_RESPONSE_INVALID_SKU"
        private const val E_USER_DATA_RESPONSE_FAILED = "E_USER_DATA_RESPONSE_FAILED"
        private const val E_USER_DATA_RESPONSE_NOT_SUPPORTED = "E_USER_DATA_RESPONSE_NOT_SUPPORTED"
        const val TAG = "RNIapAmazonListener"
    }
}
