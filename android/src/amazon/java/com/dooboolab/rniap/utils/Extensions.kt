package com.dooboolab.rniap.utils

import com.amazon.device.iap.model.Receipt
import com.amazon.device.iap.model.UserData
import com.dooboolab.rniap.typeString
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap

fun Receipt.toMap(userData: UserData): WritableMap {
    return Arguments.createMap().also {
        it.putString("productId", sku)
        it.putDouble("transactionDate", purchaseDate.time.toDouble())
        it.putString("purchaseToken", receiptId)
        it.putString("transactionReceipt", this.toJSON().toString())
        it.putString("userIdAmazon", userData.userId)
        it.putString("userMarketplaceAmazon", userData.marketplace)
        it.putString("userJsonAmazon", userData.toJSON().toString())
        it.putBoolean("isCanceledAmazon", isCanceled)
        it.putString("termSku", termSku)
        it.putString("productType", productType.typeString)
    }
}
