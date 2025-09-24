package com.margelo.nitro.iap

import com.facebook.react.bridge.ReactApplicationContext
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import dev.hyo.openiap.AndroidSubscriptionOfferInput
import dev.hyo.openiap.DeepLinkOptions as OpenIapDeepLinkOptions
import dev.hyo.openiap.FetchProductsResult
import dev.hyo.openiap.FetchProductsResultProducts
import dev.hyo.openiap.FetchProductsResultSubscriptions
import dev.hyo.openiap.OpenIapError as OpenIAPError
import dev.hyo.openiap.OpenIapModule
import dev.hyo.openiap.ProductAndroid
import dev.hyo.openiap.ProductQueryType
import dev.hyo.openiap.ProductRequest
import dev.hyo.openiap.ProductSubscriptionAndroid
import dev.hyo.openiap.ProductSubscriptionAndroidOfferDetails
import dev.hyo.openiap.ProductCommon
import dev.hyo.openiap.ProductType
import dev.hyo.openiap.Purchase as OpenIapPurchase
import dev.hyo.openiap.PurchaseAndroid
import dev.hyo.openiap.RequestPurchaseAndroidProps
import dev.hyo.openiap.RequestPurchaseProps
import dev.hyo.openiap.RequestPurchasePropsByPlatforms
import dev.hyo.openiap.RequestPurchaseResultPurchase
import dev.hyo.openiap.RequestPurchaseResultPurchases
import dev.hyo.openiap.RequestSubscriptionAndroidProps
import dev.hyo.openiap.RequestSubscriptionPropsByPlatforms
import dev.hyo.openiap.listener.OpenIapPurchaseErrorListener
import dev.hyo.openiap.listener.OpenIapPurchaseUpdateListener
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.CompletableDeferred
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale

class HybridRnIap : HybridRnIapSpec() {
    
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
            RnIapLog.payload("initConnection", null)
            // Fast-path: if already initialized, return immediately
            if (isInitialized) {
                RnIapLog.result("initConnection", true)
                return@async true
            }

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
            if (wasExisting) {
                val result = initDeferred!!.await()
                RnIapLog.result("initConnection.await", result)
                return@async result
            }

            if (!listenersAttached) {
                listenersAttached = true
                RnIapLog.payload("listeners.attach", null)
                openIap.addPurchaseUpdateListener(OpenIapPurchaseUpdateListener { p ->
                    runCatching {
                        RnIapLog.result(
                            "purchaseUpdatedListener",
                            mapOf("id" to p.id, "sku" to p.productId)
                        )
                        sendPurchaseUpdate(convertToNitroPurchase(p))
                    }.onFailure { RnIapLog.failure("purchaseUpdatedListener", it) }
                })
                openIap.addPurchaseErrorListener(OpenIapPurchaseErrorListener { e ->
                    val code = OpenIAPError.toCode(e)
                    val message = e.message ?: OpenIAPError.defaultMessage(code)
                    runCatching {
                        RnIapLog.result(
                            "purchaseErrorListener",
                            mapOf("code" to code, "message" to message)
                        )
                        sendPurchaseError(
                            NitroPurchaseResult(
                                responseCode = -1.0,
                                debugMessage = null,
                                code = code,
                                message = message,
                                purchaseToken = null
                            )
                        )
                    }.onFailure { RnIapLog.failure("purchaseErrorListener", it) }
                })
                RnIapLog.result("listeners.attach", "attached")
            }

            // We created it above; reuse the shared instance
            val deferred = initDeferred!!
            try {
                val ok = try {
                    RnIapLog.payload("initConnection.native", null)
                    withContext(Dispatchers.Main) {
                        openIap.initConnection()
                    }
                } catch (err: Throwable) {
                    val error = OpenIAPError.InitConnection
                    RnIapLog.failure("initConnection.native", err)
                    throw Exception(
                        toErrorJson(
                            error = error,
                            debugMessage = err.message,
                            messageOverride = err.message
                        )
                    )
                }
                if (!ok) {
                    val error = OpenIAPError.InitConnection
                    RnIapLog.failure("initConnection.native", Exception(error.message))
                    throw Exception(
                        toErrorJson(
                            error = error,
                            messageOverride = "Failed to initialize connection"
                        )
                    )
                }
                isInitialized = true
                deferred.complete(true)
                RnIapLog.result("initConnection", true)
                true
            } catch (e: Exception) {
                // Complete exceptionally so all concurrent awaiters receive the same failure
                if (!deferred.isCompleted) deferred.completeExceptionally(e)
                isInitialized = false
                RnIapLog.failure("initConnection", e)
                throw e
            } finally {
                initDeferred = null
            }
        }
    }
    
    override fun endConnection(): Promise<Boolean> {
        return Promise.async {
            RnIapLog.payload("endConnection", null)
            runCatching { openIap.endConnection() }
            productTypeBySku.clear()
            isInitialized = false
            initDeferred = null
            RnIapLog.result("endConnection", true)
            true
        }
    }
    
    // Product methods
    override fun fetchProducts(skus: Array<String>, type: String): Promise<Array<NitroProduct>> {
        return Promise.async {
            RnIapLog.payload(
                "fetchProducts",
                mapOf(
                    "skus" to skus.toList(),
                    "type" to type
                )
            )

            if (skus.isEmpty()) {
                throw Exception(toErrorJson(OpenIAPError.EmptySkuList))
            }

            initConnection().await()

            val queryType = parseProductQueryType(type)
            val skusList = skus.toList()

            val products: List<ProductCommon> = when (queryType) {
                ProductQueryType.All -> {
                    val collected = linkedMapOf<String, ProductCommon>()
                    listOf(ProductQueryType.InApp, ProductQueryType.Subs).forEach { kind ->
                        RnIapLog.payload(
                            "fetchProducts.native",
                            mapOf("skus" to skusList, "type" to kind.rawValue)
                        )
                        val fetched = openIap.fetchProducts(ProductRequest(skusList, kind)).productsOrEmpty()
                        RnIapLog.result(
                            "fetchProducts.native",
                            fetched.map { mapOf("id" to it.id, "type" to it.type.rawValue) }
                        )
                        fetched.forEach { collected[it.id] = it }
                    }
                    collected.values.toList()
                }
                else -> {
                    RnIapLog.payload(
                        "fetchProducts.native",
                        mapOf("skus" to skusList, "type" to queryType.rawValue)
                    )
                    val fetched = openIap.fetchProducts(ProductRequest(skusList, queryType)).productsOrEmpty()
                    RnIapLog.result(
                        "fetchProducts.native",
                        fetched.map { mapOf("id" to it.id, "type" to it.type.rawValue) }
                    )
                    fetched
                }
            }

            products.forEach { p -> productTypeBySku[p.id] = p.type.rawValue }

            RnIapLog.result(
                "fetchProducts",
                products.map { mapOf("id" to it.id, "type" to it.type.rawValue) }
            )
            products.map { convertToNitroProduct(it) }.toTypedArray()
        }
    }
    
    // Purchase methods
    // Purchase methods (Unified)
    override fun requestPurchase(request: NitroPurchaseRequest): Promise<RequestPurchaseResult?> {
        return Promise.async {
            val defaultResult = RequestPurchaseResult.create(emptyArray<com.margelo.nitro.iap.Purchase>())

            RnIapLog.payload(
                "requestPurchase",
                mapOf(
                    "androidSkus" to (request.android?.skus?.toList() ?: emptyList()),
                    "hasIOS" to (request.ios != null)
                )
            )

            val androidRequest = request.android ?: run {
                RnIapLog.warn("requestPurchase called without android payload")
                sendPurchaseError(toErrorResult(OpenIAPError.DeveloperError))
                return@async defaultResult
            }

            if (androidRequest.skus.isEmpty()) {
                RnIapLog.warn("requestPurchase received empty SKU list")
                sendPurchaseError(toErrorResult(OpenIAPError.EmptySkuList))
                return@async defaultResult
            }

            try {
                initConnection().await()
                withContext(Dispatchers.Main) { runCatching { openIap.setActivity(context.currentActivity) } }

                val missingSkus = androidRequest.skus.filterNot { productTypeBySku.containsKey(it) }
                if (missingSkus.isNotEmpty()) {
                    missingSkus.forEach { sku ->
                        RnIapLog.warn("requestPurchase missing cached type for $sku; attempting fetch")
                        val fetched = runCatching {
                            openIap.fetchProducts(
                                ProductRequest(listOf(sku), ProductQueryType.All)
                            ).productsOrEmpty()
                        }.getOrElse { error ->
                            RnIapLog.failure("requestPurchase.fetchMissing", error)
                            emptyList()
                        }
                        fetched.firstOrNull()?.let { productTypeBySku[it.id] = it.type.rawValue }
                        if (!productTypeBySku.containsKey(sku)) {
                            sendPurchaseError(toErrorResult(OpenIAPError.SkuNotFound(sku)))
                            return@async defaultResult
                        }
                    }
                }

                val typeHint = androidRequest.skus.firstOrNull()?.let { productTypeBySku[it] } ?: "inapp"
                val queryType = parseProductQueryType(typeHint)

                val subscriptionOffers = androidRequest.subscriptionOffers
                    ?.mapNotNull { offer ->
                        val sku = offer.sku
                        val token = offer.offerToken
                        if (sku.isBlank() || token.isBlank()) {
                            null
                        } else {
                            AndroidSubscriptionOfferInput(sku = sku, offerToken = token)
                        }
                    }
                    ?: emptyList()
                val normalizedOffers = subscriptionOffers.takeIf { it.isNotEmpty() }

                val requestProps = when (queryType) {
                    ProductQueryType.Subs -> {
                        val replacementMode = (androidRequest.replacementModeAndroid as? Number)?.toInt()
                        val androidProps = RequestSubscriptionAndroidProps(
                            isOfferPersonalized = androidRequest.isOfferPersonalized,
                            obfuscatedAccountIdAndroid = androidRequest.obfuscatedAccountIdAndroid,
                            obfuscatedProfileIdAndroid = androidRequest.obfuscatedProfileIdAndroid,
                            purchaseTokenAndroid = androidRequest.purchaseTokenAndroid,
                            replacementModeAndroid = replacementMode,
                            skus = androidRequest.skus.toList(),
                            subscriptionOffers = normalizedOffers
                        )
                        RequestPurchaseProps(
                            request = RequestPurchaseProps.Request.Subscription(
                                RequestSubscriptionPropsByPlatforms(android = androidProps)
                            ),
                            type = ProductQueryType.Subs
                        )
                    }
                    ProductQueryType.InApp, ProductQueryType.All -> {
                        val androidProps = RequestPurchaseAndroidProps(
                            isOfferPersonalized = androidRequest.isOfferPersonalized,
                            obfuscatedAccountIdAndroid = androidRequest.obfuscatedAccountIdAndroid,
                            obfuscatedProfileIdAndroid = androidRequest.obfuscatedProfileIdAndroid,
                            skus = androidRequest.skus.toList()
                        )
                        RequestPurchaseProps(
                            request = RequestPurchaseProps.Request.Purchase(
                                RequestPurchasePropsByPlatforms(android = androidProps)
                            ),
                            type = ProductQueryType.InApp
                        )
                    }
                }

                RnIapLog.payload(
                    "requestPurchase.native",
                    mapOf(
                        "skus" to androidRequest.skus.toList(),
                        "type" to requestProps.type.rawValue,
                        "offerCount" to (normalizedOffers?.size ?: 0)
                    )
                )

                val result = withContext(Dispatchers.Main) {
                    openIap.requestPurchase(requestProps)
                }
                val purchases = result.purchasesOrEmpty()
                purchases.forEach { p ->
                    runCatching {
                        RnIapLog.result(
                            "requestPurchase.native",
                            mapOf("id" to p.id, "sku" to p.productId)
                        )
                    }.onFailure { RnIapLog.failure("requestPurchase.native", it) }
                }

                defaultResult
            } catch (e: Exception) {
                RnIapLog.failure("requestPurchase", e)
                sendPurchaseError(
                    toErrorResult(
                        error = OpenIAPError.PurchaseFailed,
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

            RnIapLog.payload(
                "getAvailablePurchases",
                mapOf("type" to androidOptions?.type?.name)
            )

            val typeName = androidOptions?.type?.name?.lowercase()
            val normalizedType = when (typeName) {
                "inapp" -> {
                    RnIapLog.warn("getAvailablePurchases received legacy type 'inapp'; forwarding as 'in-app'")
                    "in-app"
                }
                "in-app", "subs" -> typeName
                else -> null
            }

            val result: List<OpenIapPurchase> = if (normalizedType != null) {
                val typeEnum = parseProductQueryType(normalizedType)
                RnIapLog.payload(
                    "getAvailablePurchases.native",
                    mapOf("type" to typeEnum.rawValue)
                )
                openIap.getAvailableItems(typeEnum)
            } else {
                RnIapLog.payload("getAvailablePurchases.native", mapOf("type" to "all"))
                openIap.getAvailablePurchases(null)
            }
            RnIapLog.result(
                "getAvailablePurchases",
                result.map { mapOf("id" to it.id, "sku" to it.productId) }
            )
            result.map { convertToNitroPurchase(it) }.toTypedArray()
        }
    }
    
    // Transaction management methods (Unified)
    override fun finishTransaction(params: NitroFinishTransactionParams): Promise<Variant_Boolean_NitroPurchaseResult> {
        return Promise.async {
            val androidParams = params.android ?: return@async Variant_Boolean_NitroPurchaseResult.First(true)
            val purchaseToken = androidParams.purchaseToken
            val isConsumable = androidParams.isConsumable ?: false

            RnIapLog.payload(
                "finishTransaction",
                mapOf(
                    "purchaseToken" to purchaseToken?.let { "<hidden>" },
                    "isConsumable" to isConsumable
                )
            )

            // Validate token early to avoid confusing native errors
            if (purchaseToken.isNullOrBlank()) {
                RnIapLog.warn("finishTransaction called with missing purchaseToken")
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
                val err = OpenIAPError.InitConnection
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
                val result = Variant_Boolean_NitroPurchaseResult.Second(
                    NitroPurchaseResult(
                        responseCode = 0.0,
                        debugMessage = null,
                        code = "0",
                        message = "OK",
                        purchaseToken = purchaseToken
                    )
                )
                RnIapLog.result("finishTransaction", mapOf("success" to true))
                result
            } catch (e: Exception) {
                val err = OpenIAPError.BillingError
                RnIapLog.failure("finishTransaction", e)
                Variant_Boolean_NitroPurchaseResult.Second(
                    NitroPurchaseResult(
                        responseCode = -1.0,
                        debugMessage = e.message,
                        code = OpenIAPError.toCode(err),
                        message = e.message?.takeIf { it.isNotBlank() } ?: err.message,
                        purchaseToken = null
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
        RnIapLog.warn("addPromotedProductListenerIOS called on Android - promoted products are iOS-only")
    }

    override fun removePromotedProductListenerIOS(listener: (product: NitroProduct) -> Unit) {
        // Promoted products are iOS-only, but we implement the interface for consistency
        val removed = promotedProductListenersIOS.remove(listener)
        if (!removed) RnIapLog.warn("removePromotedProductListenerIOS: listener not found")
        RnIapLog.warn("removePromotedProductListenerIOS called on Android - promoted products are iOS-only")
    }
    
    // Billing callbacks handled internally by OpenIAP
    
    // Helper methods
    
    /**
     * Send purchase update event to listeners
     */
    private fun sendPurchaseUpdate(purchase: NitroPurchase) {
        RnIapLog.result(
            "sendPurchaseUpdate",
            mapOf("productId" to purchase.productId, "platform" to purchase.platform)
        )
        for (listener in purchaseUpdatedListeners) {
            listener(purchase)
        }
    }
    
    /**
     * Send purchase error event to listeners
     */
    private fun sendPurchaseError(error: NitroPurchaseResult) {
        RnIapLog.result(
            "sendPurchaseError",
            mapOf("code" to error.code, "message" to error.message)
        )
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

    private fun parseProductQueryType(rawType: String): ProductQueryType {
        val normalized = rawType
            .trim()
            .lowercase(Locale.US)
            .replace("_", "")
            .replace("-", "")
        return when (normalized) {
            "subs", "subscription", "subscriptions" -> ProductQueryType.Subs
            "all" -> ProductQueryType.All
            else -> ProductQueryType.InApp
        }
    }

    private fun FetchProductsResult.productsOrEmpty(): List<ProductCommon> = when (this) {
        is FetchProductsResultProducts -> this.value.orEmpty().filterIsInstance<ProductCommon>()
        is FetchProductsResultSubscriptions -> this.value.orEmpty().filterIsInstance<ProductCommon>()
    }

    private fun dev.hyo.openiap.RequestPurchaseResult?.purchasesOrEmpty(): List<OpenIapPurchase> = when (this) {
        is RequestPurchaseResultPurchases -> this.value.orEmpty().mapNotNull { it }
        is RequestPurchaseResultPurchase -> this.value?.let(::listOf).orEmpty()
        else -> emptyList()
    }

    private fun serializeSubscriptionOffers(offers: List<ProductSubscriptionAndroidOfferDetails>): String {
        val array = JSONArray()
        offers.forEach { offer ->
            val offerJson = JSONObject()
            offerJson.put("basePlanId", offer.basePlanId)
            offerJson.put("offerId", offer.offerId)
            offerJson.put("offerTags", JSONArray(offer.offerTags))
            offerJson.put("offerToken", offer.offerToken)

            val phasesArray = JSONArray()
            offer.pricingPhases.pricingPhaseList.forEach { phase ->
                val phaseJson = JSONObject()
                phaseJson.put("billingCycleCount", phase.billingCycleCount)
                phaseJson.put("billingPeriod", phase.billingPeriod)
                phaseJson.put("formattedPrice", phase.formattedPrice)
                phaseJson.put("priceAmountMicros", phase.priceAmountMicros)
                phaseJson.put("priceCurrencyCode", phase.priceCurrencyCode)
                phaseJson.put("recurrenceMode", phase.recurrenceMode)
                phasesArray.put(phaseJson)
            }

            val pricingPhasesJson = JSONObject()
            pricingPhasesJson.put("pricingPhaseList", phasesArray)
            offerJson.put("pricingPhases", pricingPhasesJson)

            array.put(offerJson)
        }
        return array.toString()
    }

    private fun convertToNitroProduct(product: ProductCommon): NitroProduct {
        val subscriptionOffers = when (product) {
            is ProductSubscriptionAndroid -> product.subscriptionOfferDetailsAndroid.orEmpty()
            is ProductAndroid -> product.subscriptionOfferDetailsAndroid.orEmpty()
            else -> emptyList()
        }
        val oneTimeOffer = when (product) {
            is ProductSubscriptionAndroid -> product.oneTimePurchaseOfferDetailsAndroid
            is ProductAndroid -> product.oneTimePurchaseOfferDetailsAndroid
            else -> null
        }

        val subscriptionOffersJson = subscriptionOffers.takeIf { it.isNotEmpty() }?.let { serializeSubscriptionOffers(it) }

        var originalPriceAndroid: String? = null
        var originalPriceAmountMicrosAndroid: Double? = null
        var introductoryPriceValueAndroid: Double? = null
        var introductoryPriceCyclesAndroid: Double? = null
        var introductoryPricePeriodAndroid: String? = null
        var subscriptionPeriodAndroid: String? = null
        var freeTrialPeriodAndroid: String? = null

        if (product.type == ProductType.InApp) {
            oneTimeOffer?.let { otp ->
                originalPriceAndroid = otp.formattedPrice
                originalPriceAmountMicrosAndroid = otp.priceAmountMicros.toDoubleOrNull()
            }
        } else {
            val phases = subscriptionOffers.firstOrNull()?.pricingPhases?.pricingPhaseList.orEmpty()
            if (phases.isNotEmpty()) {
                val basePhase = phases.firstOrNull { it.recurrenceMode == 2 } ?: phases.last()
                originalPriceAndroid = basePhase.formattedPrice
                originalPriceAmountMicrosAndroid = basePhase.priceAmountMicros.toDoubleOrNull()
                subscriptionPeriodAndroid = basePhase.billingPeriod

                val introPhase = phases.firstOrNull {
                    it.billingCycleCount > 0 && (it.priceAmountMicros.toLongOrNull() ?: 0L) > 0L
                }
                if (introPhase != null) {
                    introductoryPriceValueAndroid = introPhase.priceAmountMicros.toDoubleOrNull()?.div(1_000_000.0)
                    introductoryPriceCyclesAndroid = introPhase.billingCycleCount.toDouble()
                    introductoryPricePeriodAndroid = introPhase.billingPeriod
                }

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
            type = product.type.rawValue,
            displayName = product.displayName,
            displayPrice = product.displayPrice,
            currency = product.currency,
            price = product.price,
            platform = IapPlatform.ANDROID,
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
            originalPriceAndroid = originalPriceAndroid,
            originalPriceAmountMicrosAndroid = originalPriceAmountMicrosAndroid,
            introductoryPriceValueAndroid = introductoryPriceValueAndroid,
            introductoryPriceCyclesAndroid = introductoryPriceCyclesAndroid,
            introductoryPricePeriodAndroid = introductoryPricePeriodAndroid,
            subscriptionPeriodAndroid = subscriptionPeriodAndroid,
            freeTrialPeriodAndroid = freeTrialPeriodAndroid,
            subscriptionOfferDetailsAndroid = subscriptionOffersJson
        )
    }
    
    // Purchase state is provided as enum value by OpenIAP
    
    private fun convertToNitroPurchase(purchase: OpenIapPurchase): NitroPurchase {
        val androidPurchase = purchase as? PurchaseAndroid
        val purchaseStateAndroidNumeric = when (purchase.purchaseState) {
            dev.hyo.openiap.PurchaseState.Purchased -> 1.0
            dev.hyo.openiap.PurchaseState.Pending -> 2.0
            else -> 0.0
        }
        return NitroPurchase(
            id = purchase.id,
            productId = purchase.productId,
            transactionDate = purchase.transactionDate,
            purchaseToken = purchase.purchaseToken,
            platform = IapPlatform.ANDROID,
            quantity = purchase.quantity.toDouble(),
            purchaseState = mapPurchaseState(purchase.purchaseState),
            isAutoRenewing = purchase.isAutoRenewing,
            quantityIOS = null,
            originalTransactionDateIOS = null,
            originalTransactionIdentifierIOS = null,
            appAccountToken = null,
            purchaseTokenAndroid = androidPurchase?.purchaseToken,
            dataAndroid = androidPurchase?.dataAndroid,
            signatureAndroid = androidPurchase?.signatureAndroid,
            autoRenewingAndroid = androidPurchase?.autoRenewingAndroid,
            purchaseStateAndroid = purchaseStateAndroidNumeric,
            isAcknowledgedAndroid = androidPurchase?.isAcknowledgedAndroid,
            packageNameAndroid = androidPurchase?.packageNameAndroid,
            obfuscatedAccountIdAndroid = androidPurchase?.obfuscatedAccountIdAndroid,
            obfuscatedProfileIdAndroid = androidPurchase?.obfuscatedProfileIdAndroid
        )
    }

    private fun mapPurchaseState(state: dev.hyo.openiap.PurchaseState): PurchaseState {
        return when (state) {
            dev.hyo.openiap.PurchaseState.Purchased -> PurchaseState.PURCHASED
            dev.hyo.openiap.PurchaseState.Pending -> PurchaseState.PENDING
            dev.hyo.openiap.PurchaseState.Deferred -> PurchaseState.DEFERRED
            dev.hyo.openiap.PurchaseState.Restored -> PurchaseState.RESTORED
            dev.hyo.openiap.PurchaseState.Failed -> PurchaseState.FAILED
            dev.hyo.openiap.PurchaseState.Unknown -> PurchaseState.UNKNOWN
        }
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
                RnIapLog.payload("getStorefrontAndroid", null)
                val value = openIap.getStorefront()
                RnIapLog.result("getStorefrontAndroid", value)
                value
            } catch (e: Exception) {
                RnIapLog.failure("getStorefrontAndroid", e)
                ""
            }
        }
    }

    // Android-specific deep link to subscription management
    override fun deepLinkToSubscriptionsAndroid(options: NitroDeepLinkOptionsAndroid): Promise<Unit> {
        return Promise.async {
            try {
                initConnection().await()
                OpenIapDeepLinkOptions(
                    skuAndroid = options.skuAndroid,
                    packageNameAndroid = options.packageNameAndroid
                ).let { openIap.deepLinkToSubscriptions(it) }
                RnIapLog.result("deepLinkToSubscriptionsAndroid", true)
            } catch (e: Exception) {
                RnIapLog.failure("deepLinkToSubscriptionsAndroid", e)
                throw e
            }
        }
    }

    // iOS-specific method - not supported on Android
    override fun getPromotedProductIOS(): Promise<NitroProduct?> {
        return Promise.async {
            null
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

    override fun deepLinkToSubscriptionsIOS(): Promise<Boolean> {
        return Promise.async {
            false
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
                val error = OpenIAPError.InvalidReceipt
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

    override fun getReceiptIOS(): Promise<String> {
        return Promise.async {
            throw Exception(toErrorJson(OpenIAPError.NotSupported))
        }
    }

    override fun requestReceiptRefreshIOS(): Promise<String> {
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
        val code = OpenIAPError.Companion.toCode(error)
        val message = messageOverride?.takeIf { it.isNotBlank() }
            ?: error.message?.takeIf { it.isNotBlank() }
            ?: OpenIAPError.Companion.defaultMessage(code)
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
        val code = OpenIAPError.Companion.toCode(error)
        val message = messageOverride?.takeIf { it.isNotBlank() }
            ?: error.message?.takeIf { it.isNotBlank() }
            ?: OpenIAPError.Companion.defaultMessage(code)
        return NitroPurchaseResult(
            responseCode = -1.0,
            debugMessage = debugMessage ?: error.message,
            code = code,
            message = message,
            purchaseToken = null
        )
    }
}
