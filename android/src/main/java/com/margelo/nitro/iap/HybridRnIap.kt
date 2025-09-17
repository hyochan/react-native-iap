package com.margelo.nitro.iap

import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import dev.hyo.openiap.OpenIapError as OpenIAPError
import dev.hyo.openiap.OpenIapModule
import dev.hyo.openiap.listener.OpenIapPurchaseErrorListener
import dev.hyo.openiap.listener.OpenIapPurchaseUpdateListener
import dev.hyo.openiap.models.DeepLinkOptions
import dev.hyo.openiap.models.OpenIapProduct
import dev.hyo.openiap.models.OpenIapPurchase
import dev.hyo.openiap.models.ProductRequest
import dev.hyo.openiap.models.OpenIapRequestPurchaseProps
import dev.hyo.openiap.models.OpenIapSerialization
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.CompletableDeferred

class HybridRnIap : HybridRnIapSpec() {
    companion object {
        const val TAG = "RnIap"
    }
    
    // Get ReactApplicationContext lazily from NitroModules
    private val context: ReactApplicationContext by lazy {
        NitroModules.applicationContext as ReactApplicationContext
    }

    // OpenIAP backend + local cache for product types
    private val openIap: OpenIapModule by lazy { OpenIapModule(context) }
    private val productTypeBySku = mutableMapOf<String, String>()

    // Event listeners
    private val purchaseUpdatedListeners = mutableListOf<(NitroPurchase) -> Unit>()
    private val purchaseErrorListeners = mutableListOf<(NitroPurchaseResult) -> Unit>()
    private val promotedProductListenersIOS = mutableListOf<(NitroProduct) -> Unit>()
    private var listenersAttached = false
    private var isInitialized = false
    private var initDeferred: CompletableDeferred<Boolean>? = null
    private val initLock = Any()
    
    // Connection methods
    override fun initConnection(): Promise<Boolean> {
        return Promise.async {
            // Fast-path: if already initialized, return immediately
            if (isInitialized) return@async true

            // Set current activity best-effort; don't fail init if missing
            withContext(Dispatchers.Main) {
                runCatching { openIap.setActivity(context.currentActivity) }
            }

            // Single-flight: capture or create the shared Deferred atomically
            val wasExisting = synchronized(initLock) {
                if (initDeferred == null) {
                    initDeferred = CompletableDeferred()
                    false
                } else true
            }
            if (wasExisting) return@async initDeferred!!.await()

            if (!listenersAttached) {
                listenersAttached = true
                openIap.addPurchaseUpdateListener(OpenIapPurchaseUpdateListener { p ->
                    runCatching { sendPurchaseUpdate(convertToNitroPurchase(p)) }
                        .onFailure { Log.e(TAG, "Failed to forward purchase update", it) }
                })
                openIap.addPurchaseErrorListener(OpenIapPurchaseErrorListener { e ->
                    val code = OpenIAPError.toCode(e)
                    val message = e.message ?: OpenIAPError.defaultMessage(code)
                    runCatching {
                        sendPurchaseError(
                            NitroPurchaseResult(
                                responseCode = -1.0,
                                debugMessage = null,
                                code = code,
                                message = message,
                                purchaseToken = null
                            )
                        )
                    }.onFailure { Log.e(TAG, "Failed to forward purchase error", it) }
                })
            }

            // We created it above; reuse the shared instance
            val deferred = initDeferred!!
            try {
                val ok = runCatching { openIap.initConnection() }.getOrElse { err ->
                    val error = OpenIAPError.InitConnection()
                    throw Exception(
                        toErrorJson(
                            error = error,
                            debugMessage = err.message,
                            messageOverride = err.message
                        )
                    )
                }
                if (!ok) {
                    val error = OpenIAPError.InitConnection()
                    throw Exception(
                        toErrorJson(
                            error = error,
                            messageOverride = "Failed to initialize connection"
                        )
                    )
                }
                isInitialized = true
                deferred.complete(true)
                true
            } catch (e: Exception) {
                // Complete exceptionally so all concurrent awaiters receive the same failure
                if (!deferred.isCompleted) deferred.completeExceptionally(e)
                isInitialized = false
                throw e
            } finally {
                initDeferred = null
            }
        }
    }
    
    override fun endConnection(): Promise<Boolean> {
        return Promise.async {
            runCatching { openIap.endConnection() }
            productTypeBySku.clear()
            isInitialized = false
            initDeferred = null
            true
        }
    }
    
    // Product methods
    override fun fetchProducts(skus: Array<String>, type: String): Promise<Array<NitroProduct>> {
        return Promise.async {
            Log.d(TAG, "fetchProducts (OpenIAP) skus=${skus.joinToString()} type=$type")

            if (skus.isEmpty()) {
                throw Exception(toErrorJson(OpenIAPError.EmptySkuList))
            }

            initConnection().await()
            val reqType = ProductRequest.ProductRequestType.fromString(type)
            val products = openIap.fetchProducts(ProductRequest(skus.toList(), reqType))

            // populate type cache
            products.forEach { p -> productTypeBySku[p.id] = p.type.value }

            products.map { convertToNitroProduct(it) }.toTypedArray()
        }
    }
    
    // Purchase methods
    // Purchase methods (Unified)
    override fun requestPurchase(request: NitroPurchaseRequest): Promise<RequestPurchaseResult> {
        return Promise.async {
            val defaultResult = RequestPurchaseResult(null, null)

            val androidRequest = request.android ?: run {
                // Programming error: no Android params provided
                sendPurchaseError(toErrorResult(OpenIAPError.DeveloperError))
                return@async defaultResult
            }

            if (androidRequest.skus.isEmpty()) {
                sendPurchaseError(toErrorResult(OpenIAPError.EmptySkuList))
                return@async defaultResult
            }

            try {
                initConnection().await()
                withContext(Dispatchers.Main) { runCatching { openIap.setActivity(context.currentActivity) } }

                val missing = androidRequest.skus.firstOrNull { !productTypeBySku.containsKey(it) }
                if (missing != null) {
                    sendPurchaseError(toErrorResult(OpenIAPError.SkuNotFound(missing), missing))
                    return@async defaultResult
                }
                val typeStr = androidRequest.skus.firstOrNull()?.let { productTypeBySku[it] } ?: "inapp"
                val typeEnum = ProductRequest.ProductRequestType.fromString(typeStr)

                val result = openIap.requestPurchase(
                    OpenIapRequestPurchaseProps(
                        skus = androidRequest.skus.toList(),
                        obfuscatedAccountIdAndroid = androidRequest.obfuscatedAccountIdAndroid,
                        obfuscatedProfileIdAndroid = androidRequest.obfuscatedProfileIdAndroid,
                        isOfferPersonalized = androidRequest.isOfferPersonalized
                    ),
                    typeEnum
                )

                result.forEach { p ->
                    runCatching { sendPurchaseUpdate(convertToNitroPurchase(p)) }
                        .onFailure { Log.e(TAG, "Failed to forward PURCHASE_UPDATED", it) }
                }

                defaultResult
            } catch (e: Exception) {
                sendPurchaseError(
                    toErrorResult(
                        error = OpenIAPError.PurchaseFailed(),
                        debugMessage = e.message,
                        messageOverride = e.message
                    )
                )
                defaultResult
            }
        }
    }
    
    // Purchase history methods (Unified)
    override fun getAvailablePurchases(options: NitroAvailablePurchasesOptions?): Promise<Array<NitroPurchase>> {
        return Promise.async {
            val androidOptions = options?.android
            initConnection().await()

            val result: List<OpenIapPurchase> = if (androidOptions?.type != null) {
                val typeEnum = ProductRequest.ProductRequestType.fromString(androidOptions.type ?: "inapp")
                openIap.getAvailableItems(typeEnum)
            } else {
                openIap.getAvailablePurchases()
            }
            result.map { convertToNitroPurchase(it) }.toTypedArray()
        }
    }
    
    // Transaction management methods (Unified)
    override fun finishTransaction(params: NitroFinishTransactionParams): Promise<Variant_Boolean_NitroPurchaseResult> {
        return Promise.async {
            val androidParams = params.android ?: return@async Variant_Boolean_NitroPurchaseResult.First(true)
            val purchaseToken = androidParams.purchaseToken
            val isConsumable = androidParams.isConsumable ?: false

            // Validate token early to avoid confusing native errors
            if (purchaseToken.isNullOrBlank()) {
                return@async Variant_Boolean_NitroPurchaseResult.Second(
                    NitroPurchaseResult(
                        responseCode = -1.0,
                        debugMessage = "Missing purchaseToken",
                        code = OpenIAPError.toCode(OpenIAPError.DeveloperError),
                        message = "Missing purchaseToken",
                        purchaseToken = null
                    )
                )
            }

            // Ensure connection; if it fails, return an error result instead of throwing
            try {
                initConnection().await()
            } catch (e: Exception) {
                val err = OpenIAPError.InitConnection()
                return@async Variant_Boolean_NitroPurchaseResult.Second(
                    NitroPurchaseResult(
                        responseCode = -1.0,
                        debugMessage = e.message,
                        code = OpenIAPError.toCode(err),
                        message = e.message?.takeIf { it.isNotBlank() } ?: err.message,
                        purchaseToken = purchaseToken
                    )
                )
            }

            try {
                if (isConsumable) {
                    openIap.consumePurchaseAndroid(purchaseToken)
                } else {
                    openIap.acknowledgePurchaseAndroid(purchaseToken)
                }
                Variant_Boolean_NitroPurchaseResult.Second(
                    NitroPurchaseResult(
                        responseCode = 0.0,
                        debugMessage = null,
                        code = "0",
                        message = "OK",
                        purchaseToken = purchaseToken
                    )
                )
            } catch (e: Exception) {
                val err = OpenIAPError.BillingError()
                Variant_Boolean_NitroPurchaseResult.Second(
                    NitroPurchaseResult(
                        responseCode = -1.0,
                        debugMessage = e.message,
                        code = OpenIAPError.toCode(err),
                        message = e.message?.takeIf { it.isNotBlank() } ?: err.message,
                        purchaseToken = purchaseToken
                    )
                )
            }
        }
    }
    
    override val memorySize: Long
        get() = 0L
    
    // Event listener methods
    override fun addPurchaseUpdatedListener(listener: (purchase: NitroPurchase) -> Unit) {
        purchaseUpdatedListeners.add(listener)
    }
    
    override fun addPurchaseErrorListener(listener: (error: NitroPurchaseResult) -> Unit) {
        purchaseErrorListeners.add(listener)
    }
    
    override fun removePurchaseUpdatedListener(listener: (purchase: NitroPurchase) -> Unit) {
        // Note: Kotlin doesn't have easy closure comparison, so we'll clear all listeners
        purchaseUpdatedListeners.clear()
    }
    
    override fun removePurchaseErrorListener(listener: (error: NitroPurchaseResult) -> Unit) {
        // Note: Kotlin doesn't have easy closure comparison, so we'll clear all listeners
        purchaseErrorListeners.clear()
    }
    
    override fun addPromotedProductListenerIOS(listener: (product: NitroProduct) -> Unit) {
        // Promoted products are iOS-only, but we implement the interface for consistency
        promotedProductListenersIOS.add(listener)
        Log.w(TAG, "addPromotedProductListenerIOS called on Android - promoted products are iOS-only")
    }
    
    override fun removePromotedProductListenerIOS(listener: (product: NitroProduct) -> Unit) {
        // Promoted products are iOS-only, but we implement the interface for consistency
        promotedProductListenersIOS.clear()
        Log.w(TAG, "removePromotedProductListenerIOS called on Android - promoted products are iOS-only")
    }
    
    // Billing callbacks handled internally by OpenIAP
    
    // Helper methods
    
    /**
     * Send purchase update event to listeners
     */
    private fun sendPurchaseUpdate(purchase: NitroPurchase) {
        for (listener in purchaseUpdatedListeners) {
            listener(purchase)
        }
    }
    
    /**
     * Send purchase error event to listeners
     */
    private fun sendPurchaseError(error: NitroPurchaseResult) {
        for (listener in purchaseErrorListeners) {
            listener(error)
        }
    }
    
    /**
     * Create purchase error result with proper format
     */
    private fun createPurchaseErrorResult(
        errorCode: String,
        message: String,
        sku: String? = null,
        responseCode: Int? = null,
        debugMessage: String? = null
    ): NitroPurchaseResult {
        return NitroPurchaseResult(
            responseCode = responseCode?.toDouble() ?: -1.0,
            debugMessage = debugMessage,
            code = errorCode,
            message = message,
            purchaseToken = null
        )
    }
    
    private fun convertToNitroProduct(product: OpenIapProduct): NitroProduct {
        val subOffers = product.subscriptionOfferDetailsAndroid
        val subOffersJson = subOffers?.let { OpenIapSerialization.toJson(it) }

        // Derive Android-specific fields from OpenIAP models
        var originalPriceAndroid: String? = null
        var originalPriceAmountMicrosAndroid: Double? = null
        var introductoryPriceValueAndroid: Double? = null
        var introductoryPriceCyclesAndroid: Double? = null
        var introductoryPricePeriodAndroid: String? = null
        var subscriptionPeriodAndroid: String? = null
        var freeTrialPeriodAndroid: String? = null

        if (product.type == OpenIapProduct.ProductType.InApp) {
            product.oneTimePurchaseOfferDetailsAndroid?.let { otp ->
                originalPriceAndroid = otp.formattedPrice
                // priceAmountMicros is a string; parse to number if possible
                originalPriceAmountMicrosAndroid = otp.priceAmountMicros.toDoubleOrNull()
            }
        } else {
            // SUBS: inspect pricing phases
            val phases = subOffers?.firstOrNull()?.pricingPhases?.pricingPhaseList
            if (!phases.isNullOrEmpty()) {
                // Base recurring phase: recurrenceMode == 2 (INFINITE), else last non-zero priced phase
                val basePhase = phases.firstOrNull { it.recurrenceMode == 2 } ?: phases.last()
                originalPriceAndroid = basePhase.formattedPrice
                originalPriceAmountMicrosAndroid = basePhase.priceAmountMicros.toDoubleOrNull()
                subscriptionPeriodAndroid = basePhase.billingPeriod

                // Introductory phase: finite cycles (>0) and priced (>0)
                val introPhase = phases.firstOrNull {
                    it.billingCycleCount > 0 && (it.priceAmountMicros.toLongOrNull() ?: 0L) > 0L
                }
                if (introPhase != null) {
                    introductoryPriceValueAndroid = (introPhase.priceAmountMicros.toDoubleOrNull() ?: 0.0) / 1_000_000.0
                    introductoryPriceCyclesAndroid = introPhase.billingCycleCount.toDouble()
                    introductoryPricePeriodAndroid = introPhase.billingPeriod
                }

                // Free trial: zero-priced phase
                val trialPhase = phases.firstOrNull { (it.priceAmountMicros.toLongOrNull() ?: 0L) == 0L }
                if (trialPhase != null) {
                    freeTrialPeriodAndroid = trialPhase.billingPeriod
                }
            }
        }

        return NitroProduct(
            id = product.id,
            title = product.title,
            description = product.description,
            type = product.type.value,
            displayName = product.displayName,
            displayPrice = product.displayPrice,
            currency = product.currency,
            price = product.price,
            platform = "android",
            // iOS fields (null on Android)
            typeIOS = null,
            isFamilyShareableIOS = null,
            jsonRepresentationIOS = null,
            subscriptionPeriodUnitIOS = null,
            subscriptionPeriodNumberIOS = null,
            introductoryPriceIOS = null,
            introductoryPriceAsAmountIOS = null,
            introductoryPricePaymentModeIOS = null,
            introductoryPriceNumberOfPeriodsIOS = null,
            introductoryPriceSubscriptionPeriodIOS = null,
            // Android derivations
            originalPriceAndroid = originalPriceAndroid,
            originalPriceAmountMicrosAndroid = originalPriceAmountMicrosAndroid,
            introductoryPriceValueAndroid = introductoryPriceValueAndroid,
            introductoryPriceCyclesAndroid = introductoryPriceCyclesAndroid,
            introductoryPricePeriodAndroid = introductoryPricePeriodAndroid,
            subscriptionPeriodAndroid = subscriptionPeriodAndroid,
            freeTrialPeriodAndroid = freeTrialPeriodAndroid,
            subscriptionOfferDetailsAndroid = subOffersJson
        )
    }
    
    // Purchase state is provided as enum value by OpenIAP
    
    private fun convertToNitroPurchase(purchase: OpenIapPurchase): NitroPurchase {
        // Map OpenIAP purchase state back to legacy numeric Android state for compatibility
        val purchaseStateAndroidNumeric = when (purchase.purchaseState) {
            OpenIapPurchase.PurchaseState.Purchased -> 1.0
            OpenIapPurchase.PurchaseState.Pending -> 2.0
            else -> 0.0 // UNSPECIFIED/UNKNOWN/other
        }
        return NitroPurchase(
            id = purchase.id,
            productId = purchase.productId,
            transactionDate = purchase.transactionDate.toDouble(),
            purchaseToken = purchase.purchaseToken,
            platform = "android",
            // Common fields
            quantity = purchase.quantity.toDouble(),
            purchaseState = purchase.purchaseState.value,
            isAutoRenewing = purchase.isAutoRenewing,
            // iOS fields
            quantityIOS = null,
            originalTransactionDateIOS = null,
            originalTransactionIdentifierIOS = null,
            appAccountToken = null,
            // Android fields
            purchaseTokenAndroid = purchase.purchaseTokenAndroid,
            dataAndroid = purchase.dataAndroid,
            signatureAndroid = purchase.signatureAndroid,
            autoRenewingAndroid = purchase.autoRenewingAndroid,
            purchaseStateAndroid = purchaseStateAndroidNumeric,
            isAcknowledgedAndroid = purchase.isAcknowledgedAndroid,
            packageNameAndroid = purchase.packageNameAndroid,
            obfuscatedAccountIdAndroid = purchase.obfuscatedAccountIdAndroid,
            obfuscatedProfileIdAndroid = purchase.obfuscatedProfileIdAndroid
        )
    }
    
    // Billing error messages handled by OpenIAP
    
    // iOS-specific method - not supported on Android
    override fun getStorefrontIOS(): Promise<String> {
        return Promise.async {
            throw Exception(toErrorJson(OpenIAPError.NotSupported))
        }
    }

    // iOS-specific method - not supported on Android
    override fun getAppTransactionIOS(): Promise<String?> {
        return Promise.async {
            throw Exception(toErrorJson(OpenIAPError.NotSupported))
        }
    }

    // Android-specific storefront getter
    override fun getStorefrontAndroid(): Promise<String> {
        return Promise.async {
            try {
                initConnection().await()
                openIap.getStorefront()
            } catch (e: Exception) {
                Log.w(TAG, "getStorefrontAndroid failed", e)
                ""
            }
        }
    }

    // Android-specific deep link to subscription management
    override fun deepLinkToSubscriptionsAndroid(options: NitroDeepLinkOptionsAndroid): Promise<Unit> {
        return Promise.async {
            try {
                initConnection().await()
                DeepLinkOptions(
                    skuAndroid = options.skuAndroid,
                    packageNameAndroid = options.packageNameAndroid
                ).let { openIap.deepLinkToSubscriptions(it) }
            } catch (e: Exception) {
                Log.e(TAG, "deepLinkToSubscriptionsAndroid failed", e)
                throw e
            }
        }
    }

    // iOS-specific method - not supported on Android
    override fun requestPromotedProductIOS(): Promise<NitroProduct?> {
        return Promise.async {
            // Android doesn't have promoted products like iOS App Store
            // Return null as this feature is iOS-only
            null
        }
    }

    override fun buyPromotedProductIOS(): Promise<Unit> {
        return Promise.async {
            // Android doesn't have promoted products like iOS App Store
            // This is an iOS-only feature, so we do nothing on Android
        }
    }

    override fun presentCodeRedemptionSheetIOS(): Promise<Boolean> {
        return Promise.async {
            // Android doesn't have a code redemption sheet like iOS App Store
            // This is an iOS-only feature, so we return false on Android
            false
        }
    }

    override fun clearTransactionIOS(): Promise<Unit> {
        return Promise.async {
            // This is an iOS-only feature for clearing unfinished transactions
            // On Android, we don't need to do anything
        }
    }

    override fun beginRefundRequestIOS(sku: String): Promise<String?> {
        return Promise.async {
            // Android doesn't have in-app refund requests like iOS
            // Refunds on Android are handled through Google Play Console
            null
        }
    }

    // Updated signature to follow spec: returns updated subscriptions
    override fun showManageSubscriptionsIOS(): Promise<Array<NitroPurchase>> {
        return Promise.async {
            // Not supported on Android. Return empty list for iOS-only API.
            emptyArray()
        }
    }

    // Receipt validation
    override fun validateReceipt(params: NitroReceiptValidationParams): Promise<Variant_NitroReceiptValidationResultIOS_NitroReceiptValidationResultAndroid> {
        return Promise.async {
            try {
                // For Android, we need the androidOptions to be provided
                val androidOptions = params.androidOptions
                    ?: throw Exception(toErrorJson(OpenIAPError.DeveloperError))

                // Android receipt validation would typically involve server-side validation
                // using Google Play Developer API. Here we provide a simplified implementation
                // that demonstrates the expected structure.
                
                // In a real implementation, you would make an HTTP request to Google Play API
                // using the androidOptions.accessToken, androidOptions.packageName, etc.
                
                // For now, we'll return a mock successful validation result
                // This should be replaced with actual Google Play Developer API calls
                val currentTime = System.currentTimeMillis()
                
                val result = NitroReceiptValidationResultAndroid(
                    autoRenewing = androidOptions.isSub ?: false,
                    betaProduct = false,
                    cancelDate = null,
                    cancelReason = "",
                    deferredDate = null,
                    deferredSku = null,
                    freeTrialEndDate = 0.0,
                    gracePeriodEndDate = 0.0,
                    parentProductId = params.sku,
                    productId = params.sku,
                    productType = if (androidOptions.isSub == true) "subs" else "inapp",
                    purchaseDate = currentTime.toDouble(),
                    quantity = 1.0,
                    receiptId = androidOptions.productToken,
                    renewalDate = if (androidOptions.isSub == true) (currentTime + (30L * 24 * 60 * 60 * 1000)).toDouble() else 0.0, // 30 days from now if subscription
                    term = if (androidOptions.isSub == true) "P1M" else "", // P1M = 1 month
                    termSku = params.sku,
                    testTransaction = false
                )
                
                Variant_NitroReceiptValidationResultIOS_NitroReceiptValidationResultAndroid.Second(result)
                
            } catch (e: Exception) {
                val debugMessage = e.message
                val error = OpenIAPError.InvalidReceipt()
                throw Exception(
                    toErrorJson(
                        error = error,
                        debugMessage = debugMessage,
                        messageOverride = "Receipt validation failed: ${debugMessage ?: "unknown reason"}"
                    )
                )
            }
        }
    }
    
    // iOS-specific methods - Not applicable on Android, return appropriate defaults
    override fun subscriptionStatusIOS(sku: String): Promise<Array<NitroSubscriptionStatus>?> {
        return Promise.async {
            throw Exception(toErrorJson(OpenIAPError.NotSupported))
        }
    }
    
    override fun currentEntitlementIOS(sku: String): Promise<NitroPurchase?> {
        return Promise.async {
            throw Exception(toErrorJson(OpenIAPError.NotSupported))
        }
    }
    
    override fun latestTransactionIOS(sku: String): Promise<NitroPurchase?> {
        return Promise.async {
            throw Exception(toErrorJson(OpenIAPError.NotSupported))
        }
    }
    
    override fun getPendingTransactionsIOS(): Promise<Array<NitroPurchase>> {
        return Promise.async {
            throw Exception(toErrorJson(OpenIAPError.NotSupported))
        }
    }
    
    override fun syncIOS(): Promise<Boolean> {
        return Promise.async {
            throw Exception(toErrorJson(OpenIAPError.NotSupported))
        }
    }
    
    
    
    override fun isEligibleForIntroOfferIOS(groupID: String): Promise<Boolean> {
        return Promise.async {
            throw Exception(toErrorJson(OpenIAPError.NotSupported))
        }
    }
    
    override fun getReceiptDataIOS(): Promise<String> {
        return Promise.async {
            throw Exception(toErrorJson(OpenIAPError.NotSupported))
        }
    }
    
    override fun isTransactionVerifiedIOS(sku: String): Promise<Boolean> {
        return Promise.async {
            throw Exception(toErrorJson(OpenIAPError.NotSupported))
        }
    }
    
    override fun getTransactionJwsIOS(sku: String): Promise<String?> {
        return Promise.async {
            throw Exception(toErrorJson(OpenIAPError.NotSupported))
        }
    }

    // ---------------------------------------------------------------------
    // OpenIAP error helpers: unify error codes/messages from library
    // ---------------------------------------------------------------------
    private fun toErrorJson(
        error: OpenIAPError,
        productId: String? = null,
        debugMessage: String? = null,
        messageOverride: String? = null
    ): String {
        val code = OpenIAPError.toCode(error)
        val message = messageOverride?.takeIf { it.isNotBlank() }
            ?: error.message.ifEmpty { OpenIAPError.defaultMessage(code) }
        return BillingUtils.createErrorJson(
            code = code,
            message = message,
            responseCode = -1,
            debugMessage = debugMessage ?: error.message,
            productId = productId
        )
    }

    private fun toErrorResult(
        error: OpenIAPError,
        productId: String? = null,
        debugMessage: String? = null,
        messageOverride: String? = null
    ): NitroPurchaseResult {
        val code = OpenIAPError.toCode(error)
        val message = messageOverride?.takeIf { it.isNotBlank() }
            ?: error.message.ifEmpty { OpenIAPError.defaultMessage(code) }
        return NitroPurchaseResult(
            responseCode = -1.0,
            debugMessage = debugMessage ?: error.message,
            code = code,
            message = message,
            purchaseToken = null
        )
    }
}
