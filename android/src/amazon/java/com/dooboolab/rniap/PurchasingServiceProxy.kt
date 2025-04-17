package com.dooboolab.rniap

import android.content.Context
import com.amazon.device.iap.PurchasingListener
import com.amazon.device.iap.model.FulfillmentResult
import com.amazon.device.iap.model.ProrationMode
import com.amazon.device.iap.model.RequestId

interface PurchasingServiceProxy {
    fun registerListener(
        var0: Context?,
        var1: PurchasingListener?,
    )

    fun getUserData(): RequestId

    fun purchase(var0: String?): RequestId

    fun getProductData(var0: Set<String?>?): RequestId

    fun getPurchaseUpdates(var0: Boolean): RequestId

    fun notifyFulfillment(
        var0: String?,
        var1: FulfillmentResult?,
    )

    fun modifySubscription(var0: String?, var1: ProrationMode): RequestId
}
