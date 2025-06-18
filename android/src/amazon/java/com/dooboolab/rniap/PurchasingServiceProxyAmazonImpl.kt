package com.dooboolab.rniap

import android.content.Context
import com.amazon.device.iap.PurchasingListener
import com.amazon.device.iap.PurchasingService
import com.amazon.device.iap.model.FulfillmentResult
import com.amazon.device.iap.model.ProrationMode
import com.amazon.device.iap.model.RequestId

class PurchasingServiceProxyAmazonImpl : PurchasingServiceProxy {
    override fun registerListener(
        var0: Context?,
        var1: PurchasingListener?,
    ) = PurchasingService.registerListener(var0, var1)

    override fun getUserData(): RequestId = PurchasingService.getUserData()

    override fun purchase(var0: String?): RequestId = PurchasingService.purchase(var0)

    override fun getProductData(var0: Set<String?>?): RequestId = PurchasingService.getProductData(var0)

    override fun getPurchaseUpdates(var0: Boolean): RequestId = PurchasingService.getPurchaseUpdates(var0)

    override fun notifyFulfillment(
        var0: String?,
        var1: FulfillmentResult?,
    ) = PurchasingService.notifyFulfillment(var0, var1)

    override fun modifySubscription(var0: String?, var1: ProrationMode): RequestId =
        PurchasingService.modifySubscription(var0, var1)
}
