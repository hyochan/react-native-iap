package com.dooboolab.rniap

import android.app.Activity
import android.util.Log
import com.amazon.device.iap.PurchasingService
import com.dooboolab.rniap.modifysubscription.RNIapAmazonModifySubscriptionListener

/**
 * In order of the IAP process to show correctly, AmazonPurchasingService must be registered on Activity.onCreate
 * registering it in on Application.onCreate will not throw an error but it will now show the Native purchasing screen
 */
class RNIapActivityListener {
    companion object {
        @JvmStatic
        var hasListener = false

        @JvmStatic
        var amazonListener: RNIapAmazonListener? = null

        @JvmStatic
        var amazonModifySubscriptionListener: RNIapAmazonModifySubscriptionListener? = null

        @JvmStatic
        fun initListeners(eventSender: EventSender?, purchasingService: PurchasingServiceProxy?) {
            if (amazonListener == null || amazonModifySubscriptionListener == null) {
                Log.e(
                    RNIapAmazonModule.TAG,
                    "registerActivity should be called on Activity.onCreate ",
                )
            }

            amazonListener?.eventSender = eventSender
            amazonListener?.purchasingService = purchasingService
            amazonModifySubscriptionListener?.eventSender = eventSender
        }

        @JvmStatic
        fun registerActivity(activity: Activity) {
            amazonListener = RNIapAmazonListener(null, null)
            amazonModifySubscriptionListener = RNIapAmazonModifySubscriptionListener(null)

            try {
                PurchasingService.registerListener(activity, amazonListener)
                PurchasingService.registerListener(activity, amazonModifySubscriptionListener)
                hasListener = true

                // Prefetch user and purchases as per Amazon SDK documentation:
                PurchasingService.getUserData()
                PurchasingService.getPurchaseUpdates(false)
            } catch (e: Exception) {
                Log.e(RNIapAmazonModule.TAG, "Error initializing Amazon appstore sdk", e)
            }
        }
    }
}
