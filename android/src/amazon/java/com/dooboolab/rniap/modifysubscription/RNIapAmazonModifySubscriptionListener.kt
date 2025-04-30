package com.dooboolab.rniap.modifysubscription

import android.util.Log
import com.amazon.device.iap.ModifySubscriptionListener
import com.amazon.device.iap.model.ModifySubscriptionResponse
import com.dooboolab.rniap.EventSender
import com.dooboolab.rniap.PromiseUtils
import com.dooboolab.rniap.RNIapAmazonModule
import com.dooboolab.rniap.utils.toMap
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap

class RNIapAmazonModifySubscriptionListener(
    var eventSender: EventSender?,
) : ModifySubscriptionListener {

    companion object {
        private const val TAG = "AmazonModifySbnListener"
    }

    override fun onModifySubscriptionResponse(response: ModifySubscriptionResponse) {
        Log.d(TAG, "onModifySubscriptionResponse ${response.requestStatus}")

        when (response.requestStatus) {
            ModifySubscriptionResponse.RequestStatus.SUCCESSFUL -> {
                response.receipts.map { receipt ->
                    val item = receipt.toMap(response.userData)
                    val promiseItem: WritableMap = Arguments.createMap()
                    promiseItem.merge(item)
                    eventSender?.sendEvent("purchase-updated", item)
                    PromiseUtils
                        .resolvePromisesForKey(
                            RNIapAmazonModule.PROMISE_BUY_ITEM,
                            promiseItem,
                        )
                }
            }

            else -> {
                val messageAndCode = when (response.requestStatus) {
                    ModifySubscriptionResponse.RequestStatus.FAILED -> Pair(
                        "An unknown or unexpected error has occurred. Please try again later.",
                        PromiseUtils.E_UNKNOWN,
                    )

                    ModifySubscriptionResponse.RequestStatus.INVALID_SKU -> Pair(
                        "That item is unavailable.",
                        PromiseUtils.E_ITEM_UNAVAILABLE,
                    )

                    ModifySubscriptionResponse.RequestStatus.NOT_SUPPORTED -> Pair(
                        "This feature is not available on your device.",
                        PromiseUtils.E_SERVICE_ERROR,
                    )

                    else -> null
                }

                if (messageAndCode == null) {
                    Log.d(
                        TAG,
                        "onModifySubscriptionResponse: ${response.requestStatus} is not handled",
                    )
                    return
                }

                val debugMessage = messageAndCode.first
                val errorCode = messageAndCode.second

                Arguments.createMap().also {
                    it.putInt("responseCode", 0)
                    it.putString("debugMessage", debugMessage)
                    it.putString("code", errorCode)
                    it.putString("message", debugMessage)
                    eventSender?.sendEvent("purchase-error", it)
                }

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
}
