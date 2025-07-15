package com.dooboolab.rniap

import android.util.Log
import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingConfig
import com.android.billingclient.api.BillingConfigResponseListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingFlowParams.SubscriptionUpdateParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.ConsumeParams
import com.android.billingclient.api.ConsumeResponseListener
import com.android.billingclient.api.GetBillingConfigParams
import com.android.billingclient.api.GetBillingConfigParams.Builder
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchaseHistoryRecord
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchaseHistoryParams
import com.android.billingclient.api.QueryPurchasesParams
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.PromiseImpl
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableType
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.bridge.WritableNativeMap
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability

@ReactModule(name = RNIapModule.TAG)
class RNIapModule(
    private val reactContext: ReactApplicationContext,
    private val builder: BillingClient.Builder = BillingClient.newBuilder(reactContext).enablePendingPurchases(),
    private val googleApiAvailability: GoogleApiAvailability = GoogleApiAvailability.getInstance(),
) : ReactContextBaseJavaModule(reactContext),
    PurchasesUpdatedListener {
    private var billingClientCache: BillingClient? = null
    private val skus: MutableMap<String, ProductDetails> = mutableMapOf()

    override fun getName(): String = TAG

    fun ensureConnection(
        promise: Promise,
        callback: (billingClient: BillingClient) -> Unit,
    ) {
        val billingClient = billingClientCache
        if (billingClient?.isReady == true) {
            callback(billingClient)
            return
        } else {
            val nested =
                PromiseImpl(
                    {
                        if (it.isNotEmpty() && it[0] is Boolean && it[0] as Boolean) {
                            val connectedBillingClient = billingClientCache
                            if (connectedBillingClient?.isReady == true) {
                                callback(connectedBillingClient)
                            } else {
                                promise.safeReject(PromiseUtils.E_NOT_PREPARED, "Unable to auto-initialize connection")
                            }
                        } else {
                            promise.safeReject(PromiseUtils.E_UNKNOWN, "ensureConnection - incorrect parameter in resolve")
                            Log.i(TAG, "Incorrect parameter in resolve")
                        }
                    },
                    {
                        var errorCode: String? = null
                        var errorMessage: String? = null
                        if (it.size > 1 && it[0] is String && it[1] is String) {
                            errorCode = it[0] as String
                            errorMessage = it[1] as String
                        } else if (it.isNotEmpty() && it[0] is WritableNativeMap) {
                            val errorMap = it[0] as WritableNativeMap
                            errorCode = errorMap.getString("code")
                            errorMessage = errorMap.getString("message")
                        }

                        if (errorCode is String && errorMessage is String) {
                            promise.safeReject(
                                errorCode,
                                errorMessage,
                            )
                        } else {
                            promise.safeReject(PromiseUtils.E_UNKNOWN, "ensureConnection - incorrect parameter in reject")
                            Log.i(TAG, "Incorrect parameters in reject")
                        }
                    },
                )
            initConnection(nested)
        }
    }

    @ReactMethod
    fun isFeatureSupported(
        feature: String,
        promise: Promise,
    ) {
        ensureConnection(
            promise,
        ) { billingClient ->
            val f =
                when (feature) {
                    "IN_APP_MESSAGING" ->
                        BillingClient.FeatureType.IN_APP_MESSAGING
                    "PRICE_CHANGE_CONFIRMATION" ->
                        BillingClient.FeatureType.PRICE_CHANGE_CONFIRMATION
                    "PRODUCT_DETAILS" ->
                        BillingClient.FeatureType.PRODUCT_DETAILS
                    "SUBSCRIPTIONS" ->
                        BillingClient.FeatureType.SUBSCRIPTIONS
                    "SUBSCRIPTIONS_UPDATE" ->
                        BillingClient.FeatureType.SUBSCRIPTIONS_UPDATE
                    else -> {
                        promise.safeReject("Invalid Feature name")
                        return@ensureConnection
                    }
                }
            promise.safeResolve(billingClient.isFeatureSupported(f))
        }
    }

    @ReactMethod
    fun initConnection(promise: Promise) {
        if (googleApiAvailability.isGooglePlayServicesAvailable(reactContext)
            != ConnectionResult.SUCCESS
        ) {
            Log.i(TAG, "Google Play Services are not available on this device")
            promise.safeReject(PromiseUtils.E_NOT_PREPARED, "Google Play Services are not available on this device")
            return
        }

        if (billingClientCache?.isReady == true) {
            Log.i(
                TAG,
                "Already initialized, you should only call initConnection() once when your app starts",
            )
            promise.safeResolve(true)
            return
        }
        builder.setListener(this).build().also {
            billingClientCache = it
            it.startConnection(
                object : BillingClientStateListener {
                    override fun onBillingSetupFinished(billingResult: BillingResult) {
                        if (!isValidResult(billingResult, promise)) return

                        promise.safeResolve(true)
                    }

                    override fun onBillingServiceDisconnected() {
                        Log.i(TAG, "Billing service disconnected")
                    }
                },
            )
        }
    }

    @ReactMethod
    fun endConnection(promise: Promise) {
        billingClientCache?.endConnection()
        billingClientCache = null
        skus.clear()
        PromiseUtils.rejectAllPendingPromises()
        promise.safeResolve(true)
    }

    private fun consumeItems(
        purchases: List<Purchase>,
        promise: Promise,
        expectedResponseCode: Int = BillingClient.BillingResponseCode.OK,
    ) {
        for (purchase in purchases) {
            ensureConnection(
                promise,
            ) { billingClient ->
                val consumeParams =
                    ConsumeParams
                        .newBuilder()
                        .setPurchaseToken(purchase.purchaseToken)
                        .build()
                val listener =
                    ConsumeResponseListener { billingResult: BillingResult, outToken: String? ->
                        if (billingResult.responseCode != expectedResponseCode) {
                            PlayUtils.rejectPromiseWithBillingError(
                                promise,
                                billingResult.responseCode,
                            )
                            return@ConsumeResponseListener
                        }

                        promise.safeResolve(true)
                    }
                billingClient.consumeAsync(consumeParams, listener)
            }
        }
    }

    @ReactMethod
    fun flushFailedPurchasesCachedAsPending(promise: Promise) {
        ensureConnection(
            promise,
        ) { billingClient ->
            billingClient.queryPurchasesAsync(
                QueryPurchasesParams
                    .newBuilder()
                    .setProductType(
                        BillingClient.ProductType.INAPP,
                    ).build(),
            ) { billingResult: BillingResult, list: List<Purchase>? ->
                if (!isValidResult(billingResult, promise)) return@queryPurchasesAsync
                if (list == null) {
                    // No purchases found
                    promise.safeResolve(false)
                    return@queryPurchasesAsync
                }
                // we only want to try to consume PENDING items, in order to force cache-refresh
                // for  them
                val pendingPurchases = list.filter { it.purchaseState == Purchase.PurchaseState.PENDING }

                if (pendingPurchases.isEmpty()) {
                    promise.safeResolve(false)
                    return@queryPurchasesAsync
                }
                consumeItems(
                    pendingPurchases,
                    promise,
                    BillingClient.BillingResponseCode.ITEM_NOT_OWNED,
                )
            }
        }
    }

    @ReactMethod
    fun getItemsByType(
        type: String,
        skuArr: ReadableArray,
        promise: Promise,
    ) {
        ensureConnection(promise) { billingClient ->
            val skuList = mutableListOf<QueryProductDetailsParams.Product>()
            for (i in 0 until skuArr.size()) {
                if (skuArr.getType(i) == ReadableType.String) {
                    skuArr.getString(i)?.let { sku ->
                        skuList.add(
                            QueryProductDetailsParams.Product
                                .newBuilder()
                                .setProductId(sku)
                                .setProductType(type)
                                .build(),
                        )
                    }
                }
            }

            if (skuList.isEmpty()) {
                promise.safeReject("EMPTY_SKU_LIST", "The SKU list is empty.")
                return@ensureConnection
            }

            val params =
                QueryProductDetailsParams
                    .newBuilder()
                    .setProductList(skuList)
                    .build()

            billingClient.queryProductDetailsAsync(params) { billingResult, skuDetailsList ->
                if (!isValidResult(billingResult, promise)) return@queryProductDetailsAsync

                val items = Arguments.createArray()
                for (skuDetails in skuDetailsList) {
                    skus[skuDetails.productId] = skuDetails

                    val item = Arguments.createMap()
                    // Add both field names for compatibility
                    item.putString("productId", skuDetails.productId)
                    item.putString("id", skuDetails.productId)
                    item.putString("title", skuDetails.title)
                    item.putString("description", skuDetails.description)
                    item.putString("productType", skuDetails.productType)
                    item.putString("type", skuDetails.productType)
                    item.putString("name", skuDetails.name)
                    item.putString("displayName", skuDetails.name)
                    item.putString("platform", "android")

                    skuDetails.oneTimePurchaseOfferDetails?.let {
                        val oneTimePurchaseOfferDetails =
                            Arguments.createMap().apply {
                                putString("priceCurrencyCode", it.priceCurrencyCode)
                                putString("formattedPrice", it.formattedPrice)
                                putString("priceAmountMicros", it.priceAmountMicros.toString())
                            }
                        item.putMap("oneTimePurchaseOfferDetails", oneTimePurchaseOfferDetails)
                        // Add expo-iap compatible fields
                        item.putString("currency", it.priceCurrencyCode)
                        item.putString("displayPrice", it.formattedPrice)
                    }

                    skuDetails.subscriptionOfferDetails?.let {
                        val subscriptionOfferDetails = Arguments.createArray()
                        it.forEach { subscriptionOfferDetailsItem ->
                            val offerDetails =
                                Arguments.createMap().apply {
                                    putString("basePlanId", subscriptionOfferDetailsItem.basePlanId)
                                    putString("offerId", subscriptionOfferDetailsItem.offerId)
                                    putString("offerToken", subscriptionOfferDetailsItem.offerToken)

                                    val offerTags = Arguments.createArray()
                                    subscriptionOfferDetailsItem.offerTags.forEach { offerTag ->
                                        offerTags.pushString(offerTag)
                                    }
                                    putArray("offerTags", offerTags)

                                    val pricingPhasesList = Arguments.createArray()
                                    subscriptionOfferDetailsItem.pricingPhases.pricingPhaseList.forEach { pricingPhaseItem ->
                                        val pricingPhase =
                                            Arguments.createMap().apply {
                                                putString("formattedPrice", pricingPhaseItem.formattedPrice)
                                                putString("priceCurrencyCode", pricingPhaseItem.priceCurrencyCode)
                                                putString("billingPeriod", pricingPhaseItem.billingPeriod)
                                                putInt("billingCycleCount", pricingPhaseItem.billingCycleCount)
                                                putString("priceAmountMicros", pricingPhaseItem.priceAmountMicros.toString())
                                                putInt("recurrenceMode", pricingPhaseItem.recurrenceMode)
                                            }
                                        pricingPhasesList.pushMap(pricingPhase)
                                    }
                                    val pricingPhases =
                                        Arguments.createMap().apply {
                                            putArray("pricingPhaseList", pricingPhasesList)
                                        }
                                    putMap("pricingPhases", pricingPhases)
                                }
                            subscriptionOfferDetails.pushMap(offerDetails)
                        }
                        item.putArray("subscriptionOfferDetails", subscriptionOfferDetails)
                    }
                    items.pushMap(item)
                }
                promise.safeResolve(items)
            }
        }
    }

    /**
     * Rejects promise with billing code if BillingResult is not OK
     */
    private fun isValidResult(
        billingResult: BillingResult,
        promise: Promise,
    ): Boolean {
        Log.d(TAG, "responseCode: " + billingResult.responseCode)
        if (billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
            PlayUtils.rejectPromiseWithBillingError(promise, billingResult.responseCode)
            return false
        }
        return true
    }

    @ReactMethod
    fun getAvailableItemsByType(
        type: String,
        promise: Promise,
    ) {
        ensureConnection(
            promise,
        ) { billingClient ->
            val items = WritableNativeArray()
            billingClient.queryPurchasesAsync(
                QueryPurchasesParams
                    .newBuilder()
                    .setProductType(
                        if (type == "subs") BillingClient.ProductType.SUBS else BillingClient.ProductType.INAPP,
                    ).build(),
            ) { billingResult: BillingResult, purchases: List<Purchase>? ->
                if (!isValidResult(billingResult, promise)) return@queryPurchasesAsync
                purchases?.forEach { purchase ->
                    val item = WritableNativeMap()
                    // Add both field names for compatibility
                    item.putString("productId", purchase.products[0]) // kept for convenience/backward-compatibility
                    item.putString("id", purchase.products[0])
                    val products = Arguments.createArray()
                    purchase.products.forEach { products.pushString(it) }
                    item.putArray("productIds", products)
                    item.putArray("ids", products)
                    item.putString("transactionId", purchase.orderId)
                    item.putDouble("transactionDate", purchase.purchaseTime.toDouble())
                    item.putString("transactionReceipt", purchase.originalJson)
                    item.putString("orderId", purchase.orderId)
                    item.putString("purchaseToken", purchase.purchaseToken)
                    item.putString("purchaseTokenAndroid", purchase.purchaseToken)
                    item.putString("developerPayloadAndroid", purchase.developerPayload)
                    item.putString("signatureAndroid", purchase.signature)
                    item.putInt("purchaseStateAndroid", purchase.purchaseState)
                    item.putBoolean("isAcknowledgedAndroid", purchase.isAcknowledged)
                    item.putString("packageNameAndroid", purchase.packageName)
                    item.putString(
                        "obfuscatedAccountIdAndroid",
                        purchase.accountIdentifiers?.obfuscatedAccountId,
                    )
                    item.putString(
                        "obfuscatedProfileIdAndroid",
                        purchase.accountIdentifiers?.obfuscatedProfileId,
                    )
                    if (type == BillingClient.ProductType.SUBS) {
                        item.putBoolean("autoRenewingAndroid", purchase.isAutoRenewing)
                    }
                    item.putString("platform", "android")
                    items.pushMap(item)
                }
                promise.safeResolve(items)
            }
        }
    }

    @ReactMethod
    fun getPurchaseHistoryByType(
        type: String,
        promise: Promise,
    ) {
        ensureConnection(
            promise,
        ) { billingClient ->
            billingClient.queryPurchaseHistoryAsync(
                QueryPurchaseHistoryParams
                    .newBuilder()
                    .setProductType(
                        if (type == "subs") BillingClient.ProductType.SUBS else BillingClient.ProductType.INAPP,
                    ).build(),
            ) { billingResult: BillingResult, purchaseHistoryRecordList: MutableList<PurchaseHistoryRecord>? ->

                if (!isValidResult(billingResult, promise)) return@queryPurchaseHistoryAsync

                Log.d(TAG, purchaseHistoryRecordList.toString())
                val items = Arguments.createArray()
                purchaseHistoryRecordList?.forEach { purchase ->
                    val item = Arguments.createMap()
                    // Add both field names for compatibility
                    item.putString("productId", purchase.products[0])
                    item.putString("id", purchase.products[0])
                    val products = Arguments.createArray()
                    purchase.products.forEach { products.pushString(it) }
                    item.putArray("productIds", products)
                    item.putArray("ids", products)
                    item.putDouble("transactionDate", purchase.purchaseTime.toDouble())
                    item.putString("transactionReceipt", purchase.originalJson)
                    item.putString("purchaseToken", purchase.purchaseToken)
                    item.putString("purchaseTokenAndroid", purchase.purchaseToken)
                    item.putString("dataAndroid", purchase.originalJson)
                    item.putString("signatureAndroid", purchase.signature)
                    item.putString("developerPayload", purchase.developerPayload.orEmpty())
                    item.putString("platform", "android")
                    items.pushMap(item)
                }
                promise.safeResolve(items)
            }
        }
    }

    @ReactMethod
    fun buyItemByType(
        type: String,
        skuArr: ReadableArray,
        purchaseToken: String?,
        replacementMode: Int,
        obfuscatedAccountId: String?,
        obfuscatedProfileId: String?,
        offerTokenArr: ReadableArray, // New parameter in V5
        isOfferPersonalized: Boolean, // New parameter in V5
        promise: Promise,
    ) {
        val activity = currentActivity
        if (activity == null) {
            promise.safeReject(PromiseUtils.E_UNKNOWN, "getCurrentActivity returned null")
            return
        }
        ensureConnection(
            promise,
        ) { billingClient ->
            PromiseUtils.addPromiseForKey(
                PROMISE_BUY_ITEM,
                promise,
            )
            if (type == BillingClient.ProductType.SUBS && skuArr.size() != offerTokenArr.size()) {
                val debugMessage =
                    "The number of skus (${skuArr.size()}) must match: the number of offerTokens (${offerTokenArr.size()}) for Subscriptions"
                val error = Arguments.createMap()
                error.putString("debugMessage", debugMessage)
                error.putString("code", PROMISE_BUY_ITEM)
                error.putString("message", debugMessage)
                sendEvent(reactContext, "purchase-error", error)
                promise.safeReject(PROMISE_BUY_ITEM, debugMessage)
                return@ensureConnection
            }
            val productParamsList =
                skuArr.toArrayList().map { it.toString() }.mapIndexed { index, sku ->
                    val selectedSku: ProductDetails? = skus[sku]
                    if (selectedSku == null) {
                        val debugMessage =
                            "The sku was not found. Please fetch products first by calling getItems"
                        val error = Arguments.createMap()
                        error.putString("debugMessage", debugMessage)
                        error.putString("code", PROMISE_BUY_ITEM)
                        error.putString("message", debugMessage)
                        error.putString("productId", sku)
                        sendEvent(reactContext, "purchase-error", error)
                        promise.safeReject(PROMISE_BUY_ITEM, debugMessage)
                        return@ensureConnection
                    }
                    var productDetailParams = BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(selectedSku)
                    if (type == BillingClient.ProductType.SUBS) {
                        offerTokenArr.getString(index)?.let { offerToken ->
                            productDetailParams = productDetailParams.setOfferToken(offerToken)
                        }
                    }
                    productDetailParams.build()
                }
            val builder = BillingFlowParams.newBuilder()
            builder.setProductDetailsParamsList(productParamsList).setIsOfferPersonalized(isOfferPersonalized)

            val subscriptionUpdateParamsBuilder = SubscriptionUpdateParams.newBuilder()
            if (purchaseToken != null) {
                subscriptionUpdateParamsBuilder.setOldPurchaseToken(purchaseToken)

                if (type == BillingClient.ProductType.SUBS && replacementMode != -1) {
                    val replacementMode =
                        when (replacementMode) {
                            BillingFlowParams.SubscriptionUpdateParams.ReplacementMode.CHARGE_PRORATED_PRICE -> BillingFlowParams.SubscriptionUpdateParams.ReplacementMode.CHARGE_PRORATED_PRICE
                            BillingFlowParams.SubscriptionUpdateParams.ReplacementMode.WITHOUT_PRORATION -> BillingFlowParams.SubscriptionUpdateParams.ReplacementMode.WITHOUT_PRORATION
                            BillingFlowParams.SubscriptionUpdateParams.ReplacementMode.DEFERRED -> BillingFlowParams.SubscriptionUpdateParams.ReplacementMode.DEFERRED
                            BillingFlowParams.SubscriptionUpdateParams.ReplacementMode.WITH_TIME_PRORATION -> BillingFlowParams.SubscriptionUpdateParams.ReplacementMode.WITH_TIME_PRORATION
                            BillingFlowParams.SubscriptionUpdateParams.ReplacementMode.CHARGE_FULL_PRICE -> BillingFlowParams.SubscriptionUpdateParams.ReplacementMode.CHARGE_FULL_PRICE
                            else -> BillingFlowParams.SubscriptionUpdateParams.ReplacementMode.UNKNOWN_REPLACEMENT_MODE
                        }
                    subscriptionUpdateParamsBuilder.setSubscriptionReplacementMode(replacementMode)
                }
                val subscriptionUpdateParams = subscriptionUpdateParamsBuilder.build()
                builder.setSubscriptionUpdateParams(subscriptionUpdateParams)
            }
            if (obfuscatedAccountId != null) {
                builder.setObfuscatedAccountId(obfuscatedAccountId)
            }
            if (obfuscatedProfileId != null) {
                builder.setObfuscatedProfileId(obfuscatedProfileId)
            }

            val flowParams = builder.build()
            val billingResultCode = billingClient.launchBillingFlow(activity, flowParams).responseCode
            if (billingResultCode != BillingClient.BillingResponseCode.OK) {
                val errorData = PlayUtils.getBillingResponseData(billingResultCode)
                promise.safeReject(errorData.code, errorData.message)
            }
        }
    }

    @ReactMethod
    fun acknowledgePurchase(
        token: String,
        developerPayLoad: String?,
        promise: Promise,
    ) {
        ensureConnection(
            promise,
        ) { billingClient ->
            val acknowledgePurchaseParams =
                AcknowledgePurchaseParams
                    .newBuilder()
                    .setPurchaseToken(
                        token,
                    ).build()
            billingClient.acknowledgePurchase(
                acknowledgePurchaseParams,
            ) { billingResult: BillingResult ->
                if (!isValidResult(billingResult, promise)) return@acknowledgePurchase

                val map = Arguments.createMap()
                map.putInt("responseCode", billingResult.responseCode)
                map.putString("debugMessage", billingResult.debugMessage)
                val errorData = PlayUtils.getBillingResponseData(billingResult.responseCode)
                map.putString("code", errorData.code)
                map.putString("message", errorData.message)
                promise.safeResolve(map)
            }
        }
    }

    @ReactMethod
    fun consumeProduct(
        token: String,
        developerPayLoad: String?,
        promise: Promise,
    ) {
        val params = ConsumeParams.newBuilder().setPurchaseToken(token).build()
        ensureConnection(
            promise,
        ) { billingClient ->
            billingClient.consumeAsync(
                params,
            ) { billingResult: BillingResult, purchaseToken: String? ->
                if (!isValidResult(billingResult, promise)) return@consumeAsync

                val map = Arguments.createMap()
                map.putInt("responseCode", billingResult.responseCode)
                map.putString("debugMessage", billingResult.debugMessage)
                val errorData = PlayUtils.getBillingResponseData(billingResult.responseCode)
                map.putString("code", errorData.code)
                map.putString("message", errorData.message)
                map.putString("purchaseToken", purchaseToken)
                map.putString("purchaseTokenAndroid", purchaseToken)
                promise.safeResolve(map)
            }
        }
    }

    override fun onPurchasesUpdated(
        billingResult: BillingResult,
        purchases: List<Purchase>?,
    ) {
        val responseCode = billingResult.responseCode
        if (responseCode != BillingClient.BillingResponseCode.OK) {
            val error = Arguments.createMap()
            error.putInt("responseCode", responseCode)
            error.putString("debugMessage", billingResult.debugMessage)
            val errorData = PlayUtils.getBillingResponseData(responseCode)
            error.putString("code", errorData.code)
            error.putString("message", errorData.message)
            sendEvent(reactContext, "purchase-error", error)
            PlayUtils.rejectPromisesWithBillingError(PROMISE_BUY_ITEM, responseCode)
            return
        }
        if (purchases != null) {
            val promiseItems: WritableArray = Arguments.createArray()
            purchases.forEach { purchase ->
                val item = Arguments.createMap()
                // Add both productId (for backward compatibility) and id (for expo-iap compatibility)
                item.putString("productId", purchase.products[0])
                item.putString("id", purchase.products[0])
                val products = Arguments.createArray()
                purchase.products.forEach { products.pushString(it) }
                item.putArray("productIds", products)
                // Create a new array for "ids" to avoid "Array already consumed" error
                val productsForIds = Arguments.createArray()
                purchase.products.forEach { productsForIds.pushString(it) }
                item.putArray("ids", productsForIds)
                item.putString("transactionId", purchase.orderId)
                item.putDouble("transactionDate", purchase.purchaseTime.toDouble())
                item.putString("transactionReceipt", purchase.originalJson)
                item.putString("purchaseToken", purchase.purchaseToken)
                item.putString("purchaseTokenAndroid", purchase.purchaseToken)
                item.putString("dataAndroid", purchase.originalJson)
                item.putString("signatureAndroid", purchase.signature)
                item.putBoolean("autoRenewingAndroid", purchase.isAutoRenewing)
                item.putBoolean("isAcknowledgedAndroid", purchase.isAcknowledged)
                item.putInt("purchaseStateAndroid", purchase.purchaseState)
                item.putString("packageNameAndroid", purchase.packageName)
                item.putString("developerPayloadAndroid", purchase.developerPayload)
                val accountIdentifiers = purchase.accountIdentifiers
                if (accountIdentifiers != null) {
                    item.putString(
                        "obfuscatedAccountIdAndroid",
                        accountIdentifiers.obfuscatedAccountId,
                    )
                    item.putString(
                        "obfuscatedProfileIdAndroid",
                        accountIdentifiers.obfuscatedProfileId,
                    )
                }
                item.putString("platform", "android")
                promiseItems.pushMap(item.copy())
                sendEvent(reactContext, "purchase-updated", item)
            }
            PromiseUtils.resolvePromisesForKey(PROMISE_BUY_ITEM, promiseItems)
        } else {
            val result = Arguments.createMap()
            result.putInt("responseCode", billingResult.responseCode)
            result.putString("debugMessage", billingResult.debugMessage)
            result.putString(
                "extraMessage",
                "The purchases are null. This is a normal behavior if you have requested DEFERRED" +
                    " proration. If not please report an issue.",
            )
            sendEvent(reactContext, "purchase-updated", result)
            PromiseUtils.resolvePromisesForKey(PROMISE_BUY_ITEM, null)
        }
    }

    private fun sendUnconsumedPurchases(promise: Promise) {
        ensureConnection(
            promise,
        ) { billingClient ->
            val types = arrayOf(BillingClient.ProductType.INAPP, BillingClient.ProductType.SUBS)
            for (type in types) {
                billingClient.queryPurchasesAsync(
                    QueryPurchasesParams
                        .newBuilder()
                        .setProductType(
                            type,
                        ).build(),
                ) { billingResult: BillingResult, list: List<Purchase> ->
                    if (!isValidResult(billingResult, promise)) return@queryPurchasesAsync

                    val unacknowledgedPurchases = list.filter { !it.isAcknowledged }
                    onPurchasesUpdated(billingResult, unacknowledgedPurchases)
                }
            }
            promise.safeResolve(true)
        }
    }

    @ReactMethod
    fun startListening(promise: Promise) {
        sendUnconsumedPurchases(promise)
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Keep: Required for RN built-in Event Emitter Calls.
    }

    @ReactMethod
    fun removeListeners(count: Double) {
        // Keep: Required for RN built-in Event Emitter Calls.
    }

    @ReactMethod
    fun getPackageName(promise: Promise) = promise.resolve(reactApplicationContext.packageName)

    @ReactMethod
    fun getStorefront(promise: Promise) {
        ensureConnection(
            promise,
        ) { billingClient ->
            billingClient.getBillingConfigAsync(
                GetBillingConfigParams.newBuilder().build(),
                BillingConfigResponseListener { result: BillingResult, config: BillingConfig? ->
                    if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                        promise.safeResolve(config?.countryCode.orEmpty())
                    } else {
                        val debugMessage = result.debugMessage.orEmpty()
                        promise.safeReject(result.responseCode.toString(), debugMessage)
                    }
                },
            )
        }
    }

    private fun sendEvent(
        reactContext: ReactContext,
        eventName: String,
        params: WritableMap?,
    ) {
        reactContext
            .getJSModule(RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    companion object {
        private const val PROMISE_BUY_ITEM = "PROMISE_BUY_ITEM"
        const val TAG = "RNIapModule"
    }

    init {
        val lifecycleEventListener: LifecycleEventListener =
            object : LifecycleEventListener {
                override fun onHostResume() {}

                override fun onHostPause() {}

                override fun onHostDestroy() {
                    billingClientCache?.endConnection()
                    billingClientCache = null
                }
            }
        reactContext.addLifecycleEventListener(lifecycleEventListener)
    }
}
