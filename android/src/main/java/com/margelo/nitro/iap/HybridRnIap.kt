package com.margelo.nitro.iap

import com.facebook.react.bridge.ReactApplicationContext
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import dev.hyo.openiap.AndroidSubscriptionOfferInput
import dev.hyo.openiap.DeepLinkOptions as OpenIapDeepLinkOptions
import dev.hyo.openiap.FetchProductsResult
import dev.hyo.openiap.FetchProductsResultAll
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
import dev.hyo.openiap.SubscriptionProductReplacementParamsAndroid as OpenIapSubscriptionProductReplacementParams
import dev.hyo.openiap.SubscriptionReplacementModeAndroid as OpenIapSubscriptionReplacementMode
import dev.hyo.openiap.VerifyPurchaseGoogleOptions
import dev.hyo.openiap.VerifyPurchaseProps
import dev.hyo.openiap.VerifyPurchaseResultAndroid
import dev.hyo.openiap.InitConnectionConfig as OpenIapInitConnectionConfig
import dev.hyo.openiap.listener.OpenIapPurchaseErrorListener
import dev.hyo.openiap.listener.OpenIapPurchaseUpdateListener
import dev.hyo.openiap.listener.OpenIapUserChoiceBillingListener
import dev.hyo.openiap.BillingProgramAndroid as OpenIapBillingProgramAndroid
import dev.hyo.openiap.LaunchExternalLinkParamsAndroid as OpenIapLaunchExternalLinkParams
import dev.hyo.openiap.ExternalLinkLaunchModeAndroid as OpenIapExternalLinkLaunchMode
import dev.hyo.openiap.ExternalLinkTypeAndroid as OpenIapExternalLinkType
import dev.hyo.openiap.listener.OpenIapDeveloperProvidedBillingListener
import dev.hyo.openiap.store.OpenIapStore
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.CompletableDeferred
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale

/**
 * Custom exception for OpenIAP errors that only includes the error JSON without stack traces.
 * This ensures clean error messages are passed to JavaScript without Java/Kotlin stack traces.
 */
class OpenIapException(private val errorJson: String) : Exception() {
    override val message: String
        get() = errorJson

    override fun toString(): String = errorJson

    override fun fillInStackTrace(): Throwable {
        // Don't fill in stack trace to avoid it being serialized
        return this
    }
}

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
    private val userChoiceBillingListenersAndroid = mutableListOf<(UserChoiceBillingDetails) -> Unit>()
    private val developerProvidedBillingListenersAndroid = mutableListOf<(DeveloperProvidedBillingDetailsAndroid) -> Unit>()
    private var listenersAttached = false
    private var isInitialized = false
    private var initDeferred: CompletableDeferred<Boolean>? = null
    private val initLock = Any()
    
    // Connection methods
    override fun initConnection(config: InitConnectionConfig?): Promise<Boolean> {
        return Promise.async {
            RnIapLog.payload("initConnection", config)
            // Fast-path: if already initialized, return immediately
            if (isInitialized) {
                RnIapLog.result("initConnection", true)
                return@async true
            }

            // CRITICAL: Set Activity BEFORE calling initConnection
            // Horizon SDK needs Activity to initialize OVRPlatform with proper returnComponent
            // https://github.com/meta-quest/Meta-Spatial-SDK-Samples/issues/82#issuecomment-3452577530
            withContext(Dispatchers.Main) {
                runCatching { context.currentActivity }
                    .onSuccess { activity ->
                        if (activity != null) {
                            RnIapLog.debug("Activity available: ${activity.javaClass.name}")
                            openIap.setActivity(activity)
                        } else {
                            RnIapLog.warn("Activity is null during initConnection")
                        }
                    }
                    .onFailure {
                        RnIapLog.warn("Activity not available during initConnection - OpenIAP will use Context")
                    }
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
                openIap.addUserChoiceBillingListener(OpenIapUserChoiceBillingListener { details ->
                    runCatching {
                        RnIapLog.result(
                            "userChoiceBillingListener",
                            mapOf("products" to details.products, "token" to details.externalTransactionToken)
                        )
                        val nitroDetails = UserChoiceBillingDetails(
                            externalTransactionToken = details.externalTransactionToken,
                            products = details.products.toTypedArray()
                        )
                        sendUserChoiceBilling(nitroDetails)
                    }.onFailure { RnIapLog.failure("userChoiceBillingListener", it) }
                })
                // Developer Provided Billing listener (External Payments - 8.3.0+)
                openIap.addDeveloperProvidedBillingListener(OpenIapDeveloperProvidedBillingListener { details ->
                    runCatching {
                        RnIapLog.result(
                            "developerProvidedBillingListener",
                            mapOf("token" to details.externalTransactionToken)
                        )
                        val nitroDetails = DeveloperProvidedBillingDetailsAndroid(
                            externalTransactionToken = details.externalTransactionToken
                        )
                        sendDeveloperProvidedBilling(nitroDetails)
                    }.onFailure { RnIapLog.failure("developerProvidedBillingListener", it) }
                })
                RnIapLog.result("listeners.attach", "attached")
            }

            // We created it above; reuse the shared instance
            val deferred = initDeferred!!
            try {
                // Convert Nitro config to OpenIAP config
                // Note: enableBillingProgramAndroid is passed to OpenIapInitConnectionConfig
                // which handles enabling the billing program internally
                val openIapConfig = config?.let {
                    OpenIapInitConnectionConfig(
                        alternativeBillingModeAndroid = when (it.alternativeBillingModeAndroid) {
                            com.margelo.nitro.iap.AlternativeBillingModeAndroid.USER_CHOICE -> dev.hyo.openiap.AlternativeBillingModeAndroid.UserChoice
                            com.margelo.nitro.iap.AlternativeBillingModeAndroid.ALTERNATIVE_ONLY -> dev.hyo.openiap.AlternativeBillingModeAndroid.AlternativeOnly
                            else -> null
                        },
                        enableBillingProgramAndroid = config.enableBillingProgramAndroid?.let { program ->
                            mapBillingProgram(program)
                        }
                    )
                }
                val ok = try {
                    RnIapLog.payload("initConnection.native", openIapConfig)
                    withContext(Dispatchers.Main) {
                        openIap.initConnection(openIapConfig)
                    }
                } catch (err: Throwable) {
                    val error = OpenIAPError.InitConnection
                    RnIapLog.failure("initConnection.native", err)
                    throw OpenIapException(
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
                    throw OpenIapException(
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
                throw OpenIapException(toErrorJson(OpenIAPError.EmptySkuList))
            }

            initConnection(null).await()

            val queryType = parseProductQueryType(type)
            val skusList = skus.toList()

            val products: List<ProductCommon> = when (queryType) {
                ProductQueryType.All -> {
                    // Fetch both InApp and Subs products
                    val byId = mutableMapOf<String, ProductCommon>()

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

                        // Collect products by ID (no duplicates possible in Play Billing)
                        fetched.forEach { product ->
                            byId.putIfAbsent(product.id, product)
                        }
                    }

                    // Return products in the same order as input skusList
                    skusList.mapNotNull { byId[it] }
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

                    // Preserve input order for non-All queries
                    val byId = fetched.associateBy { it.id }
                    skusList.mapNotNull { byId[it] }
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
                initConnection(null).await()

                // Ensure Activity is available for purchase flow
                val activity = withContext(Dispatchers.Main) {
                    runCatching { context.currentActivity }
                        .getOrNull()
                }

                if (activity == null) {
                    RnIapLog.warn("requestPurchase: Activity is null - cannot start purchase flow")
                    sendPurchaseError(toErrorResult(OpenIAPError.MissingCurrentActivity))
                    return@async defaultResult
                }

                withContext(Dispatchers.Main) {
                    openIap.setActivity(activity)
                }

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
                        val replacementMode = (androidRequest.replacementMode as? Number)?.toInt()

                        // Parse subscriptionProductReplacementParams (8.1.0+)
                        val subscriptionProductReplacementParams = androidRequest.subscriptionProductReplacementParams?.let { params ->
                            OpenIapSubscriptionProductReplacementParams(
                                oldProductId = params.oldProductId,
                                replacementMode = parseSubscriptionReplacementMode(params.replacementMode)
                            )
                        }

                        val androidProps = RequestSubscriptionAndroidProps(
                            isOfferPersonalized = androidRequest.isOfferPersonalized,
                            obfuscatedAccountId = androidRequest.obfuscatedAccountId,
                            obfuscatedProfileId = androidRequest.obfuscatedProfileId,
                            purchaseToken = androidRequest.purchaseToken,
                            replacementMode = replacementMode,
                            skus = androidRequest.skus.toList(),
                            subscriptionOffers = normalizedOffers,
                            subscriptionProductReplacementParams = subscriptionProductReplacementParams
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
                            obfuscatedAccountId = androidRequest.obfuscatedAccountId,
                            obfuscatedProfileId = androidRequest.obfuscatedProfileId,
                            offerToken = androidRequest.offerToken,
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
            initConnection(null).await()

            val includeSuspended = androidOptions?.includeSuspended ?: false

            RnIapLog.payload(
                "getAvailablePurchases",
                mapOf("type" to androidOptions?.type?.name, "includeSuspended" to includeSuspended)
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

            // Create PurchaseOptions with includeSuspendedAndroid
            val purchaseOptions = dev.hyo.openiap.PurchaseOptions(
                includeSuspendedAndroid = includeSuspended
            )

            val result: List<OpenIapPurchase> = if (normalizedType != null) {
                val typeEnum = parseProductQueryType(normalizedType)
                RnIapLog.payload(
                    "getAvailablePurchases.native",
                    mapOf("type" to typeEnum.rawValue, "includeSuspended" to includeSuspended)
                )
                // Note: getAvailableItems doesn't accept PurchaseOptions
                // includeSuspended only applies when fetching all types
                openIap.getAvailableItems(typeEnum)
            } else {
                RnIapLog.payload("getAvailablePurchases.native", mapOf("type" to "all", "includeSuspended" to includeSuspended))
                openIap.getAvailablePurchases(purchaseOptions)
            }
            RnIapLog.result(
                "getAvailablePurchases",
                result.map { mapOf("id" to it.id, "sku" to it.productId) }
            )
            result.map { convertToNitroPurchase(it) }.toTypedArray()
        }
    }

    override fun getActiveSubscriptions(subscriptionIds: Array<String>?): Promise<Array<NitroActiveSubscription>> {
        return Promise.async {
            initConnection(null).await()

            RnIapLog.payload(
                "getActiveSubscriptions",
                mapOf("subscriptionIds" to (subscriptionIds?.toList() ?: "all"))
            )

            try {
                // Use OpenIapModule's native getActiveSubscriptions method
                RnIapLog.payload("getActiveSubscriptions.native", mapOf("type" to "subs"))
                val activeSubscriptions = openIap.getActiveSubscriptions(subscriptionIds?.toList())

                val nitroSubscriptions = activeSubscriptions.map { sub ->
                    NitroActiveSubscription(
                        productId = sub.productId,
                        isActive = sub.isActive,
                        transactionId = sub.transactionId,
                        purchaseToken = sub.purchaseToken,
                        transactionDate = sub.transactionDate,
                        // Android specific fields
                        autoRenewingAndroid = sub.autoRenewingAndroid,
                        basePlanIdAndroid = sub.basePlanIdAndroid,
                        currentPlanId = sub.currentPlanId,
                        purchaseTokenAndroid = sub.purchaseTokenAndroid,
                        // iOS specific fields (null on Android)
                        expirationDateIOS = null,
                        environmentIOS = null,
                        willExpireSoon = null,
                        daysUntilExpirationIOS = null,
                        renewalInfoIOS = null
                    )
                }

                RnIapLog.result(
                    "getActiveSubscriptions",
                    nitroSubscriptions.map { mapOf("productId" to it.productId, "isActive" to it.isActive) }
                )

                nitroSubscriptions.toTypedArray()
            } catch (e: Exception) {
                RnIapLog.failure("getActiveSubscriptions", e)
                val error = OpenIAPError.ServiceUnavailable
                throw OpenIapException(
                    toErrorJson(
                        error = error,
                        debugMessage = e.message,
                        messageOverride = "Failed to get active subscriptions: ${e.message}"
                    )
                )
            }
        }
    }

    override fun hasActiveSubscriptions(subscriptionIds: Array<String>?): Promise<Boolean> {
        return Promise.async {
            initConnection(null).await()

            RnIapLog.payload(
                "hasActiveSubscriptions",
                mapOf("subscriptionIds" to (subscriptionIds?.toList() ?: "all"))
            )

            try {
                val hasActive = openIap.hasActiveSubscriptions(subscriptionIds?.toList())
                RnIapLog.result("hasActiveSubscriptions", hasActive)
                hasActive
            } catch (e: Exception) {
                RnIapLog.failure("hasActiveSubscriptions", e)
                val error = OpenIAPError.ServiceUnavailable
                throw OpenIapException(
                    toErrorJson(
                        error = error,
                        debugMessage = e.message,
                        messageOverride = "Failed to check active subscriptions: ${e.message}"
                    )
                )
            }
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
                initConnection(null).await()
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

    override fun getStorefront(): Promise<String> {
        return Promise.async {
            try {
                initConnection(null).await()
                RnIapLog.payload("getStorefront", null)
                val value = openIap.getStorefront()
                RnIapLog.result("getStorefront", value)
                value
            } catch (e: Exception) {
                RnIapLog.failure("getStorefront", e)
                ""
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

    /**
     * Parse subscription replacement mode from Nitro enum to OpenIAP enum (8.1.0+)
     */
    private fun parseSubscriptionReplacementMode(mode: SubscriptionReplacementModeAndroid): OpenIapSubscriptionReplacementMode {
        return when (mode) {
            SubscriptionReplacementModeAndroid.WITH_TIME_PRORATION -> OpenIapSubscriptionReplacementMode.WithTimeProration
            SubscriptionReplacementModeAndroid.CHARGE_PRORATED_PRICE -> OpenIapSubscriptionReplacementMode.ChargeProratedPrice
            SubscriptionReplacementModeAndroid.CHARGE_FULL_PRICE -> OpenIapSubscriptionReplacementMode.ChargeFullPrice
            SubscriptionReplacementModeAndroid.WITHOUT_PRORATION -> OpenIapSubscriptionReplacementMode.WithoutProration
            SubscriptionReplacementModeAndroid.DEFERRED -> OpenIapSubscriptionReplacementMode.Deferred
            SubscriptionReplacementModeAndroid.KEEP_EXISTING -> OpenIapSubscriptionReplacementMode.KeepExisting
            SubscriptionReplacementModeAndroid.UNKNOWN_REPLACEMENT_MODE -> OpenIapSubscriptionReplacementMode.UnknownReplacementMode
        }
    }

    private fun FetchProductsResult.productsOrEmpty(): List<ProductCommon> = when (this) {
        is FetchProductsResultProducts -> this.value.orEmpty().filterIsInstance<ProductCommon>()
        is FetchProductsResultSubscriptions -> this.value.orEmpty().filterIsInstance<ProductCommon>()
        is FetchProductsResultAll -> this.value.orEmpty().filterIsInstance<ProductCommon>()
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

    /**
     * Serialize standardized SubscriptionOffer list to JSON string (OpenIAP 1.3.10+)
     */
    private fun serializeStandardizedSubscriptionOffers(offers: List<dev.hyo.openiap.SubscriptionOffer>): String {
        val array = JSONArray()
        offers.forEach { offer ->
            val offerJson = JSONObject()
            offerJson.put("id", offer.id)
            offerJson.put("displayPrice", offer.displayPrice)
            offerJson.put("price", offer.price)
            offerJson.put("type", offer.type.rawValue)
            offer.currency?.let { offerJson.put("currency", it) }
            offer.basePlanIdAndroid?.let { offerJson.put("basePlanIdAndroid", it) }
            offer.offerTokenAndroid?.let { offerJson.put("offerTokenAndroid", it) }
            offer.offerTagsAndroid?.let { offerJson.put("offerTagsAndroid", JSONArray(it)) }
            offer.paymentMode?.let { offerJson.put("paymentMode", it.rawValue) }
            offer.periodCount?.let { offerJson.put("periodCount", it) }
            offer.numberOfPeriodsIOS?.let { offerJson.put("numberOfPeriodsIOS", it) }
            offer.period?.let { period ->
                val periodJson = JSONObject()
                periodJson.put("unit", period.unit.rawValue)
                periodJson.put("value", period.value)
                offerJson.put("period", periodJson)
            }
            offer.pricingPhasesAndroid?.let { phases ->
                val phasesJson = JSONObject()
                val phaseList = JSONArray()
                phases.pricingPhaseList.forEach { phase ->
                    val phaseJson = JSONObject()
                    phaseJson.put("billingCycleCount", phase.billingCycleCount)
                    phaseJson.put("billingPeriod", phase.billingPeriod)
                    phaseJson.put("formattedPrice", phase.formattedPrice)
                    phaseJson.put("priceAmountMicros", phase.priceAmountMicros)
                    phaseJson.put("priceCurrencyCode", phase.priceCurrencyCode)
                    phaseJson.put("recurrenceMode", phase.recurrenceMode)
                    phaseList.put(phaseJson)
                }
                phasesJson.put("pricingPhaseList", phaseList)
                offerJson.put("pricingPhasesAndroid", phasesJson)
            }
            array.put(offerJson)
        }
        return array.toString()
    }

    /**
     * Serialize standardized DiscountOffer list to JSON string (OpenIAP 1.3.10+)
     */
    private fun serializeStandardizedDiscountOffers(offers: List<dev.hyo.openiap.DiscountOffer>): String {
        val array = JSONArray()
        offers.forEach { offer ->
            val offerJson = JSONObject()
            offerJson.put("currency", offer.currency)
            offerJson.put("displayPrice", offer.displayPrice)
            offerJson.put("price", offer.price)
            offer.id?.let { offerJson.put("id", it) }
            offer.offerTagsAndroid?.let { offerJson.put("offerTagsAndroid", JSONArray(it)) }
            offer.offerTokenAndroid?.let { offerJson.put("offerTokenAndroid", it) }
            offer.discountAmountMicrosAndroid?.let { offerJson.put("discountAmountMicrosAndroid", it) }
            offer.formattedDiscountAmountAndroid?.let { offerJson.put("formattedDiscountAmountAndroid", it) }
            offer.fullPriceMicrosAndroid?.let { offerJson.put("fullPriceMicrosAndroid", it) }
            offer.limitedQuantityInfoAndroid?.let { info ->
                val infoJson = JSONObject()
                infoJson.put("maximumQuantity", info.maximumQuantity)
                infoJson.put("remainingQuantity", info.remainingQuantity)
                offerJson.put("limitedQuantityInfoAndroid", infoJson)
            }
            offer.validTimeWindowAndroid?.let { window ->
                val windowJson = JSONObject()
                windowJson.put("startTimeMillis", window.startTimeMillis)
                windowJson.put("endTimeMillis", window.endTimeMillis)
                offerJson.put("validTimeWindowAndroid", windowJson)
            }
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
        val oneTimeOffers = when (product) {
            is ProductSubscriptionAndroid -> product.oneTimePurchaseOfferDetailsAndroid
            is ProductAndroid -> product.oneTimePurchaseOfferDetailsAndroid
            else -> null
        }

        val subscriptionOffersJson = subscriptionOffers.takeIf { it.isNotEmpty() }?.let { serializeSubscriptionOffers(it) }
        val oneTimeOffersNitro = oneTimeOffers?.map { otp ->
            NitroOneTimePurchaseOfferDetail(
                formattedPrice = otp.formattedPrice,
                priceAmountMicros = otp.priceAmountMicros,
                priceCurrencyCode = otp.priceCurrencyCode,
                offerId = otp.offerId,
                offerToken = otp.offerToken,
                offerTags = otp.offerTags.toTypedArray(),
                fullPriceMicros = otp.fullPriceMicros,
                discountDisplayInfo = otp.discountDisplayInfo?.let { discount ->
                    NitroDiscountDisplayInfoAndroid(
                        percentageDiscount = discount.percentageDiscount?.toDouble(),
                        discountAmount = discount.discountAmount?.let { amount ->
                            NitroDiscountAmountAndroid(
                                discountAmountMicros = amount.discountAmountMicros,
                                formattedDiscountAmount = amount.formattedDiscountAmount
                            )
                        }
                    )
                },
                validTimeWindow = otp.validTimeWindow?.let { window ->
                    NitroValidTimeWindowAndroid(
                        startTimeMillis = window.startTimeMillis,
                        endTimeMillis = window.endTimeMillis
                    )
                },
                limitedQuantityInfo = otp.limitedQuantityInfo?.let { info ->
                    NitroLimitedQuantityInfoAndroid(
                        maximumQuantity = info.maximumQuantity.toDouble(),
                        remainingQuantity = info.remainingQuantity.toDouble()
                    )
                },
                preorderDetailsAndroid = otp.preorderDetailsAndroid?.let { preorder ->
                    NitroPreorderDetailsAndroid(
                        preorderPresaleEndTimeMillis = preorder.preorderPresaleEndTimeMillis,
                        preorderReleaseTimeMillis = preorder.preorderReleaseTimeMillis
                    )
                },
                rentalDetailsAndroid = otp.rentalDetailsAndroid?.let { rental ->
                    NitroRentalDetailsAndroid(
                        rentalPeriod = rental.rentalPeriod,
                        rentalExpirationPeriod = rental.rentalExpirationPeriod
                    )
                }
            )
        }?.toTypedArray()

        var originalPriceAndroid: String? = null
        var originalPriceAmountMicrosAndroid: Double? = null
        var introductoryPriceValueAndroid: Double? = null
        var introductoryPriceCyclesAndroid: Double? = null
        var introductoryPricePeriodAndroid: String? = null
        var subscriptionPeriodAndroid: String? = null
        var freeTrialPeriodAndroid: String? = null

        if (product.type == ProductType.InApp) {
            oneTimeOffers?.firstOrNull()?.let { otp ->
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

        val nameAndroid = when (product) {
            is ProductAndroid -> product.nameAndroid
            is ProductSubscriptionAndroid -> product.nameAndroid
            else -> null
        }

        // Extract productStatusAndroid (OpenIAP 1.3.14+, Billing Library 8.0+)
        val productStatusAndroid = when (product) {
            is ProductAndroid -> product.productStatusAndroid?.rawValue
            is ProductSubscriptionAndroid -> product.productStatusAndroid?.rawValue
            else -> null
        }

        // Serialize standardized cross-platform subscriptionOffers (OpenIAP 1.3.10+)
        val standardizedSubsOffers = when (product) {
            is ProductSubscriptionAndroid -> product.subscriptionOffers
            is ProductAndroid -> product.subscriptionOffers
            else -> null
        }
        val subscriptionOffersStandardizedJson = standardizedSubsOffers?.takeIf { it.isNotEmpty() }?.let {
            serializeStandardizedSubscriptionOffers(it)
        }

        // Serialize standardized cross-platform discountOffers (OpenIAP 1.3.10+)
        val standardizedDiscountOffers = when (product) {
            is ProductSubscriptionAndroid -> product.discountOffers
            is ProductAndroid -> product.discountOffers
            else -> null
        }
        val discountOffersJson = standardizedDiscountOffers?.takeIf { it.isNotEmpty() }?.let {
            serializeStandardizedDiscountOffers(it)
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
            discountsIOS = null,
            subscriptionPeriodUnitIOS = null,
            subscriptionPeriodNumberIOS = null,
            introductoryPriceIOS = null,
            introductoryPriceAsAmountIOS = null,
            introductoryPricePaymentModeIOS = PaymentModeIOS.EMPTY,
            introductoryPriceNumberOfPeriodsIOS = null,
            introductoryPriceSubscriptionPeriodIOS = null,
            subscriptionOffers = subscriptionOffersStandardizedJson,
            discountOffers = discountOffersJson,
            nameAndroid = nameAndroid,
            originalPriceAndroid = originalPriceAndroid,
            originalPriceAmountMicrosAndroid = originalPriceAmountMicrosAndroid,
            introductoryPriceValueAndroid = introductoryPriceValueAndroid,
            introductoryPriceCyclesAndroid = introductoryPriceCyclesAndroid,
            introductoryPricePeriodAndroid = introductoryPricePeriodAndroid,
            subscriptionPeriodAndroid = subscriptionPeriodAndroid,
            freeTrialPeriodAndroid = freeTrialPeriodAndroid,
            subscriptionOfferDetailsAndroid = subscriptionOffersJson,
            oneTimePurchaseOfferDetailsAndroid = oneTimeOffersNitro,
            productStatusAndroid = productStatusAndroid
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
            store = mapIapStore(purchase.store),
            quantity = purchase.quantity.toDouble(),
            purchaseState = mapPurchaseState(purchase.purchaseState),
            isAutoRenewing = purchase.isAutoRenewing,
            quantityIOS = null,
            originalTransactionDateIOS = null,
            originalTransactionIdentifierIOS = null,
            appAccountToken = null,
            appBundleIdIOS = null,
            countryCodeIOS = null,
            currencyCodeIOS = null,
            currencySymbolIOS = null,
            environmentIOS = null,
            expirationDateIOS = null,
            isUpgradedIOS = null,
            offerIOS = null,
            ownershipTypeIOS = null,
            reasonIOS = null,
            reasonStringRepresentationIOS = null,
            revocationDateIOS = null,
            revocationReasonIOS = null,
            storefrontCountryCodeIOS = null,
            subscriptionGroupIdIOS = null,
            transactionReasonIOS = null,
            webOrderLineItemIdIOS = null,
            renewalInfoIOS = null,
            purchaseTokenAndroid = androidPurchase?.purchaseToken,
            dataAndroid = androidPurchase?.dataAndroid,
            signatureAndroid = androidPurchase?.signatureAndroid,
            autoRenewingAndroid = androidPurchase?.autoRenewingAndroid,
            purchaseStateAndroid = purchaseStateAndroidNumeric,
            isAcknowledgedAndroid = androidPurchase?.isAcknowledgedAndroid,
            packageNameAndroid = androidPurchase?.packageNameAndroid,
            obfuscatedAccountIdAndroid = androidPurchase?.obfuscatedAccountIdAndroid,
            obfuscatedProfileIdAndroid = androidPurchase?.obfuscatedProfileIdAndroid,
            developerPayloadAndroid = androidPurchase?.developerPayloadAndroid,
            isSuspendedAndroid = androidPurchase?.isSuspendedAndroid
        )
    }

    private fun mapPurchaseState(state: dev.hyo.openiap.PurchaseState): PurchaseState {
        return when (state) {
            dev.hyo.openiap.PurchaseState.Purchased -> PurchaseState.PURCHASED
            dev.hyo.openiap.PurchaseState.Pending -> PurchaseState.PENDING
            dev.hyo.openiap.PurchaseState.Unknown -> PurchaseState.UNKNOWN
        }
    }

    private fun mapIapStore(store: dev.hyo.openiap.IapStore): IapStore {
        return when (store) {
            dev.hyo.openiap.IapStore.Apple -> IapStore.APPLE
            dev.hyo.openiap.IapStore.Google -> IapStore.GOOGLE
            dev.hyo.openiap.IapStore.Horizon -> IapStore.HORIZON
            dev.hyo.openiap.IapStore.Unknown -> IapStore.UNKNOWN
        }
    }

    // Billing error messages handled by OpenIAP
    
    // iOS-specific method - not supported on Android
    override fun getStorefrontIOS(): Promise<String> {
        return Promise.async {
            throw OpenIapException(toErrorJson(OpenIAPError.FeatureNotSupported))
        }
    }

    // iOS-specific method - not supported on Android
    override fun getAppTransactionIOS(): Promise<String?> {
        return Promise.async {
            throw OpenIapException(toErrorJson(OpenIAPError.FeatureNotSupported))
        }
    }

    // Android-specific deep link to subscription management
    override fun deepLinkToSubscriptionsAndroid(options: NitroDeepLinkOptionsAndroid): Promise<Unit> {
        return Promise.async {
            try {
                initConnection(null).await()
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

    // Receipt validation - calls OpenIAP's verifyPurchase
    override fun validateReceipt(params: NitroReceiptValidationParams): Promise<Variant_NitroReceiptValidationResultIOS_NitroReceiptValidationResultAndroid> {
        return Promise.async {
            try {
                // For Android, we need the google options to be provided (new platform-specific structure)
                val nitroGoogleOptions = params.google
                    ?: throw OpenIapException(toErrorJson(OpenIAPError.DeveloperError, debugMessage = "Missing required parameter: google options"))

                // Validate required google fields
                val validations = mapOf(
                    "google.sku" to nitroGoogleOptions.sku,
                    "google.accessToken" to nitroGoogleOptions.accessToken,
                    "google.packageName" to nitroGoogleOptions.packageName,
                    "google.purchaseToken" to nitroGoogleOptions.purchaseToken
                )
                for ((name, value) in validations) {
                    if (value.isEmpty()) {
                        throw OpenIapException(toErrorJson(OpenIAPError.DeveloperError, debugMessage = "Missing or empty required parameter: $name"))
                    }
                }

                RnIapLog.payload("validateReceipt", mapOf(
                    "sku" to nitroGoogleOptions.sku,
                    "packageName" to nitroGoogleOptions.packageName,
                    "isSub" to nitroGoogleOptions.isSub
                ))

                // Create OpenIAP VerifyPurchaseGoogleOptions
                val googleOptions = VerifyPurchaseGoogleOptions(
                    sku = nitroGoogleOptions.sku,
                    accessToken = nitroGoogleOptions.accessToken,
                    packageName = nitroGoogleOptions.packageName,
                    purchaseToken = nitroGoogleOptions.purchaseToken,
                    isSub = nitroGoogleOptions.isSub
                )

                // Create OpenIAP VerifyPurchaseProps
                val props = VerifyPurchaseProps(google = googleOptions)

                // Call OpenIAP's verifyPurchase - this makes the actual Google Play API call
                val verifyResult = openIap.verifyPurchase(props)
                RnIapLog.result("validateReceipt", verifyResult.toString())

                // Cast to Android result type (on Android, verifyPurchase returns VerifyPurchaseResultAndroid)
                val androidResult = verifyResult as? VerifyPurchaseResultAndroid
                    ?: throw OpenIapException(toErrorJson(OpenIAPError.InvalidPurchaseVerification, debugMessage = "Unexpected result type from verifyPurchase"))

                // Convert OpenIAP result to Nitro result
                val result = NitroReceiptValidationResultAndroid(
                    autoRenewing = androidResult.autoRenewing,
                    betaProduct = androidResult.betaProduct,
                    cancelDate = androidResult.cancelDate,
                    cancelReason = androidResult.cancelReason,
                    deferredDate = androidResult.deferredDate,
                    deferredSku = androidResult.deferredSku,
                    freeTrialEndDate = androidResult.freeTrialEndDate,
                    gracePeriodEndDate = androidResult.gracePeriodEndDate,
                    parentProductId = androidResult.parentProductId,
                    productId = androidResult.productId,
                    productType = androidResult.productType,
                    purchaseDate = androidResult.purchaseDate,
                    quantity = androidResult.quantity.toDouble(),
                    receiptId = androidResult.receiptId,
                    renewalDate = androidResult.renewalDate,
                    term = androidResult.term,
                    termSku = androidResult.termSku,
                    testTransaction = androidResult.testTransaction
                )

                Variant_NitroReceiptValidationResultIOS_NitroReceiptValidationResultAndroid.Second(result)

            } catch (e: OpenIapException) {
                RnIapLog.failure("validateReceipt", e)
                throw e
            } catch (e: Exception) {
                RnIapLog.failure("validateReceipt", e)
                val debugMessage = e.message
                val error = OpenIAPError.InvalidPurchaseVerification
                throw OpenIapException(
                    toErrorJson(
                        error = error,
                        debugMessage = debugMessage,
                        messageOverride = "Receipt validation failed: ${debugMessage ?: "unknown reason"}"
                    )
                )
            }
        }
    }

    override fun verifyPurchaseWithProvider(params: NitroVerifyPurchaseWithProviderProps): Promise<NitroVerifyPurchaseWithProviderResult> {
        return Promise.async {
            try {
                // Convert Nitro enum to string (e.g., IAPKIT -> "iapkit")
                val providerString = params.provider.name.lowercase()
                RnIapLog.payload("verifyPurchaseWithProvider", mapOf("provider" to providerString))

                // Build the props map for OpenIAP - use string value for provider
                val propsMap = mutableMapOf<String, Any?>("provider" to providerString)
                params.iapkit?.let { iapkit ->
                    val iapkitMap = mutableMapOf<String, Any?>()
                    // Use provided apiKey, or fallback to AndroidManifest meta-data (set by config plugin)
                    val apiKey = iapkit.apiKey ?: getIapkitApiKeyFromManifest()
                    apiKey?.let { iapkitMap["apiKey"] = it }
                    iapkit.google?.let { google ->
                        iapkitMap["google"] = mapOf("purchaseToken" to google.purchaseToken)
                    }
                    iapkit.apple?.let { apple ->
                        iapkitMap["apple"] = mapOf("jws" to apple.jws)
                    }
                    propsMap["iapkit"] = iapkitMap
                }

                val props = dev.hyo.openiap.VerifyPurchaseWithProviderProps.fromJson(propsMap)
                    ?: throw Exception("Failed to parse VerifyPurchaseWithProviderProps")
                val result = openIap.verifyPurchaseWithProvider(props)

                RnIapLog.result("verifyPurchaseWithProvider", mapOf("provider" to result.provider, "hasIapkit" to (result.iapkit != null)))

                // Convert result to Nitro types
                val nitroIapkitResult = result.iapkit?.let { item ->
                    NitroVerifyPurchaseWithIapkitResult(
                        isValid = item.isValid,
                        state = mapIapkitPurchaseState(item.state.name),
                        store = mapIapkitStore(item.store.name)
                    )
                }

                // Convert errors if present
                val nitroErrors = result.errors?.map { error ->
                    NitroVerifyPurchaseWithProviderError(
                        code = error.code,
                        message = error.message
                    )
                }?.toTypedArray()

                NitroVerifyPurchaseWithProviderResult(
                    iapkit = nitroIapkitResult,
                    errors = nitroErrors,
                    provider = mapPurchaseVerificationProvider(result.provider.name)
                )
            } catch (e: Exception) {
                RnIapLog.failure("verifyPurchaseWithProvider", e)
                val error = OpenIAPError.VerificationFailed
                throw OpenIapException(
                    toErrorJson(
                        error = error,
                        debugMessage = e.message,
                        messageOverride = "Verification failed: ${e.message ?: "unknown reason"}"
                    )
                )
            }
        }
    }

    // iOS-specific methods - Not applicable on Android, return appropriate defaults
    override fun subscriptionStatusIOS(sku: String): Promise<Array<NitroSubscriptionStatus>?> {
        return Promise.async {
            throw OpenIapException(toErrorJson(OpenIAPError.FeatureNotSupported))
        }
    }
    
    override fun currentEntitlementIOS(sku: String): Promise<NitroPurchase?> {
        return Promise.async {
            throw OpenIapException(toErrorJson(OpenIAPError.FeatureNotSupported))
        }
    }
    
    override fun latestTransactionIOS(sku: String): Promise<NitroPurchase?> {
        return Promise.async {
            throw OpenIapException(toErrorJson(OpenIAPError.FeatureNotSupported))
        }
    }
    
    override fun getPendingTransactionsIOS(): Promise<Array<NitroPurchase>> {
        return Promise.async {
            throw OpenIapException(toErrorJson(OpenIAPError.FeatureNotSupported))
        }
    }
    
    override fun syncIOS(): Promise<Boolean> {
        return Promise.async {
            throw OpenIapException(toErrorJson(OpenIAPError.FeatureNotSupported))
        }
    }
    
    
    
    override fun isEligibleForIntroOfferIOS(groupID: String): Promise<Boolean> {
        return Promise.async {
            throw OpenIapException(toErrorJson(OpenIAPError.FeatureNotSupported))
        }
    }
    
    override fun getReceiptDataIOS(): Promise<String> {
        return Promise.async {
            throw OpenIapException(toErrorJson(OpenIAPError.FeatureNotSupported))
        }
    }

    override fun getReceiptIOS(): Promise<String> {
        return Promise.async {
            throw OpenIapException(toErrorJson(OpenIAPError.FeatureNotSupported))
        }
    }

    override fun requestReceiptRefreshIOS(): Promise<String> {
        return Promise.async {
            throw OpenIapException(toErrorJson(OpenIAPError.FeatureNotSupported))
        }
    }

    override fun isTransactionVerifiedIOS(sku: String): Promise<Boolean> {
        return Promise.async {
            throw OpenIapException(toErrorJson(OpenIAPError.FeatureNotSupported))
        }
    }
    
    override fun getTransactionJwsIOS(sku: String): Promise<String?> {
        return Promise.async {
            throw OpenIapException(toErrorJson(OpenIAPError.FeatureNotSupported))
        }
    }

    // -------------------------------------------------------------------------
    // Alternative Billing (Android)
    // -------------------------------------------------------------------------

    override fun checkAlternativeBillingAvailabilityAndroid(): Promise<Boolean> {
        return Promise.async {
            RnIapLog.payload("checkAlternativeBillingAvailabilityAndroid", null)
            try {
                val isAvailable = withContext(Dispatchers.Main) {
                    openIap.checkAlternativeBillingAvailability()
                }
                RnIapLog.result("checkAlternativeBillingAvailabilityAndroid", isAvailable)
                isAvailable
            } catch (err: Throwable) {
                RnIapLog.failure("checkAlternativeBillingAvailabilityAndroid", err)
                val errorType = parseOpenIapError(err)
                throw OpenIapException(toErrorJson(errorType, debugMessage = err.message))
            }
        }
    }

    override fun showAlternativeBillingDialogAndroid(): Promise<Boolean> {
        return Promise.async {
            RnIapLog.payload("showAlternativeBillingDialogAndroid", null)
            try {
                val activity = context.currentActivity
                    ?: throw OpenIapException(toErrorJson(OpenIAPError.DeveloperError, debugMessage = "Activity not available"))

                val userAccepted = withContext(Dispatchers.Main) {
                    openIap.setActivity(activity)
                    openIap.showAlternativeBillingInformationDialog(activity)
                }
                RnIapLog.result("showAlternativeBillingDialogAndroid", userAccepted)
                userAccepted
            } catch (err: Throwable) {
                RnIapLog.failure("showAlternativeBillingDialogAndroid", err)
                val errorType = parseOpenIapError(err)
                throw OpenIapException(toErrorJson(errorType, debugMessage = err.message))
            }
        }
    }

    override fun createAlternativeBillingTokenAndroid(sku: String?): Promise<String?> {
        return Promise.async {
            RnIapLog.payload("createAlternativeBillingTokenAndroid", mapOf("sku" to sku))
            try {
                // Note: OpenIapModule.createAlternativeBillingReportingToken() doesn't accept sku parameter
                // The sku parameter is ignored for now - may be used in future versions
                val token = withContext(Dispatchers.Main) {
                    openIap.createAlternativeBillingReportingToken()
                }
                RnIapLog.result("createAlternativeBillingTokenAndroid", token)
                token
            } catch (err: Throwable) {
                RnIapLog.failure("createAlternativeBillingTokenAndroid", err)
                val errorType = parseOpenIapError(err)
                throw OpenIapException(toErrorJson(errorType, debugMessage = err.message))
            }
        }
    }

    // User Choice Billing listener
    override fun addUserChoiceBillingListenerAndroid(listener: (UserChoiceBillingDetails) -> Unit) {
        synchronized(userChoiceBillingListenersAndroid) {
            userChoiceBillingListenersAndroid.add(listener)
        }
    }

    override fun removeUserChoiceBillingListenerAndroid(listener: (UserChoiceBillingDetails) -> Unit) {
        synchronized(userChoiceBillingListenersAndroid) {
            userChoiceBillingListenersAndroid.remove(listener)
        }
    }

    private fun sendUserChoiceBilling(details: UserChoiceBillingDetails) {
        synchronized(userChoiceBillingListenersAndroid) {
            userChoiceBillingListenersAndroid.forEach { it(details) }
        }
    }

    // Developer Provided Billing listener (External Payments - 8.3.0+)
    override fun addDeveloperProvidedBillingListenerAndroid(listener: (DeveloperProvidedBillingDetailsAndroid) -> Unit) {
        synchronized(developerProvidedBillingListenersAndroid) {
            developerProvidedBillingListenersAndroid.add(listener)
        }
    }

    override fun removeDeveloperProvidedBillingListenerAndroid(listener: (DeveloperProvidedBillingDetailsAndroid) -> Unit) {
        synchronized(developerProvidedBillingListenersAndroid) {
            developerProvidedBillingListenersAndroid.remove(listener)
        }
    }

    private fun sendDeveloperProvidedBilling(details: DeveloperProvidedBillingDetailsAndroid) {
        synchronized(developerProvidedBillingListenersAndroid) {
            developerProvidedBillingListenersAndroid.forEach { it(details) }
        }
    }

    // -------------------------------------------------------------------------
    // Billing Programs API (Android 8.2.0+)
    // -------------------------------------------------------------------------

    // Create OpenIapStore lazily for Billing Programs API
    private val openIapStore: OpenIapStore by lazy { OpenIapStore(openIap) }

    override fun enableBillingProgramAndroid(program: BillingProgramAndroid) {
        RnIapLog.payload("enableBillingProgramAndroid", mapOf("program" to program.name))
        try {
            val openIapProgram = mapBillingProgram(program)
            openIapStore.enableBillingProgram(openIapProgram)
            RnIapLog.result("enableBillingProgramAndroid", true)
        } catch (err: Throwable) {
            RnIapLog.failure("enableBillingProgramAndroid", err)
            // enableBillingProgram is void, so we just log the error
        }
    }

    override fun isBillingProgramAvailableAndroid(program: BillingProgramAndroid): Promise<NitroBillingProgramAvailabilityResultAndroid> {
        return Promise.async {
            RnIapLog.payload("isBillingProgramAvailableAndroid", mapOf("program" to program.name))
            try {
                initConnection(null).await()
                val openIapProgram = mapBillingProgram(program)
                val result = openIapStore.isBillingProgramAvailable(openIapProgram)
                val nitroResult = NitroBillingProgramAvailabilityResultAndroid(
                    billingProgram = program,
                    isAvailable = result.isAvailable
                )
                RnIapLog.result("isBillingProgramAvailableAndroid", mapOf("isAvailable" to result.isAvailable))
                nitroResult
            } catch (err: Throwable) {
                RnIapLog.failure("isBillingProgramAvailableAndroid", err)
                val errorType = parseOpenIapError(err)
                throw OpenIapException(toErrorJson(errorType, debugMessage = err.message))
            }
        }
    }

    override fun createBillingProgramReportingDetailsAndroid(program: BillingProgramAndroid): Promise<NitroBillingProgramReportingDetailsAndroid> {
        return Promise.async {
            RnIapLog.payload("createBillingProgramReportingDetailsAndroid", mapOf("program" to program.name))
            try {
                initConnection(null).await()
                val openIapProgram = mapBillingProgram(program)
                val result = openIapStore.createBillingProgramReportingDetails(openIapProgram)
                val nitroResult = NitroBillingProgramReportingDetailsAndroid(
                    billingProgram = program,
                    externalTransactionToken = result.externalTransactionToken
                )
                RnIapLog.result("createBillingProgramReportingDetailsAndroid", mapOf("hasToken" to true))
                nitroResult
            } catch (err: Throwable) {
                RnIapLog.failure("createBillingProgramReportingDetailsAndroid", err)
                val errorType = parseOpenIapError(err)
                throw OpenIapException(toErrorJson(errorType, debugMessage = err.message))
            }
        }
    }

    override fun launchExternalLinkAndroid(params: NitroLaunchExternalLinkParamsAndroid): Promise<Boolean> {
        return Promise.async {
            RnIapLog.payload("launchExternalLinkAndroid", mapOf(
                "billingProgram" to params.billingProgram.name,
                "launchMode" to params.launchMode.name,
                "linkType" to params.linkType.name,
                "linkUri" to params.linkUri
            ))
            try {
                initConnection(null).await()

                val activity = withContext(Dispatchers.Main) {
                    runCatching { context.currentActivity }.getOrNull()
                } ?: throw OpenIapException(toErrorJson(OpenIAPError.DeveloperError, debugMessage = "Activity not available"))

                val openIapParams = OpenIapLaunchExternalLinkParams(
                    billingProgram = mapBillingProgram(params.billingProgram),
                    launchMode = mapExternalLinkLaunchMode(params.launchMode),
                    linkType = mapExternalLinkType(params.linkType),
                    linkUri = params.linkUri
                )

                val result = withContext(Dispatchers.Main) {
                    openIapStore.launchExternalLink(activity, openIapParams)
                }
                RnIapLog.result("launchExternalLinkAndroid", result)
                result
            } catch (err: Throwable) {
                RnIapLog.failure("launchExternalLinkAndroid", err)
                val errorType = parseOpenIapError(err)
                throw OpenIapException(toErrorJson(errorType, debugMessage = err.message))
            }
        }
    }

    // Billing Programs helper functions
    private fun mapBillingProgram(program: BillingProgramAndroid): OpenIapBillingProgramAndroid {
        return when (program) {
            BillingProgramAndroid.UNSPECIFIED -> OpenIapBillingProgramAndroid.Unspecified
            BillingProgramAndroid.EXTERNAL_CONTENT_LINK -> OpenIapBillingProgramAndroid.ExternalContentLink
            BillingProgramAndroid.EXTERNAL_OFFER -> OpenIapBillingProgramAndroid.ExternalOffer
            BillingProgramAndroid.EXTERNAL_PAYMENTS -> OpenIapBillingProgramAndroid.ExternalPayments
            BillingProgramAndroid.USER_CHOICE_BILLING -> OpenIapBillingProgramAndroid.UserChoiceBilling
        }
    }

    private fun mapExternalLinkLaunchMode(mode: ExternalLinkLaunchModeAndroid): OpenIapExternalLinkLaunchMode {
        return when (mode) {
            ExternalLinkLaunchModeAndroid.UNSPECIFIED -> OpenIapExternalLinkLaunchMode.Unspecified
            ExternalLinkLaunchModeAndroid.LAUNCH_IN_EXTERNAL_BROWSER_OR_APP -> OpenIapExternalLinkLaunchMode.LaunchInExternalBrowserOrApp
            ExternalLinkLaunchModeAndroid.CALLER_WILL_LAUNCH_LINK -> OpenIapExternalLinkLaunchMode.CallerWillLaunchLink
        }
    }

    private fun mapExternalLinkType(type: ExternalLinkTypeAndroid): OpenIapExternalLinkType {
        return when (type) {
            ExternalLinkTypeAndroid.UNSPECIFIED -> OpenIapExternalLinkType.Unspecified
            ExternalLinkTypeAndroid.LINK_TO_DIGITAL_CONTENT_OFFER -> OpenIapExternalLinkType.LinkToDigitalContentOffer
            ExternalLinkTypeAndroid.LINK_TO_APP_DOWNLOAD -> OpenIapExternalLinkType.LinkToAppDownload
        }
    }

    // -------------------------------------------------------------------------
    // External Purchase (iOS) - Not supported on Android
    // -------------------------------------------------------------------------

    override fun canPresentExternalPurchaseNoticeIOS(): Promise<Boolean> {
        return Promise.async {
            throw OpenIapException(toErrorJson(OpenIAPError.FeatureNotSupported))
        }
    }

    override fun presentExternalPurchaseNoticeSheetIOS(): Promise<ExternalPurchaseNoticeResultIOS> {
        return Promise.async {
            throw OpenIapException(toErrorJson(OpenIAPError.FeatureNotSupported))
        }
    }

    override fun presentExternalPurchaseLinkIOS(url: String): Promise<ExternalPurchaseLinkResultIOS> {
        return Promise.async {
            throw OpenIapException(toErrorJson(OpenIAPError.FeatureNotSupported))
        }
    }

    // ExternalPurchaseCustomLink (iOS 18.1+) - iOS only stubs
    override fun isEligibleForExternalPurchaseCustomLinkIOS(): Promise<Boolean> {
        return Promise.async {
            throw OpenIapException(toErrorJson(OpenIAPError.FeatureNotSupported))
        }
    }

    override fun getExternalPurchaseCustomLinkTokenIOS(tokenType: ExternalPurchaseCustomLinkTokenTypeIOS): Promise<ExternalPurchaseCustomLinkTokenResultIOS> {
        return Promise.async {
            throw OpenIapException(toErrorJson(OpenIAPError.FeatureNotSupported))
        }
    }

    override fun showExternalPurchaseCustomLinkNoticeIOS(noticeType: ExternalPurchaseCustomLinkNoticeTypeIOS): Promise<ExternalPurchaseCustomLinkNoticeResultIOS> {
        return Promise.async {
            throw OpenIapException(toErrorJson(OpenIAPError.FeatureNotSupported))
        }
    }

    // ---------------------------------------------------------------------
    // OpenIAP error helpers: unify error codes/messages from library
    // ---------------------------------------------------------------------
    private fun parseOpenIapError(err: Throwable): OpenIAPError {
        // Try to extract OpenIAPError from the exception chain
        var cause: Throwable? = err
        while (cause != null) {
            val message = cause.message ?: ""
            // Check if message contains OpenIAP error patterns
            when {
                message.contains("not prepared", ignoreCase = true) ||
                message.contains("not initialized", ignoreCase = true) -> return OpenIAPError.NotPrepared
                message.contains("developer error", ignoreCase = true) ||
                message.contains("activity not available", ignoreCase = true) -> return OpenIAPError.DeveloperError
                message.contains("network", ignoreCase = true) -> return OpenIAPError.NetworkError
                message.contains("service unavailable", ignoreCase = true) ||
                message.contains("billing unavailable", ignoreCase = true) -> return OpenIAPError.ServiceUnavailable
            }
            cause = cause.cause
        }
        // Default to ServiceUnavailable if we can't determine the error type
        return OpenIAPError.ServiceUnavailable
    }

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

        val errorMap = mutableMapOf<String, Any>(
            "code" to code,
            "message" to message
        )

        errorMap["responseCode"] = -1
        debugMessage?.let { errorMap["debugMessage"] = it } ?: error.message?.let { errorMap["debugMessage"] = it }
        productId?.let { errorMap["productId"] = it }

        return try {
            val jsonPairs = errorMap.map { (key, value) ->
                val valueStr = when (value) {
                    is String -> "\"${value.replace("\"", "\\\"")}\""
                    is Number -> value.toString()
                    is Boolean -> value.toString()
                    else -> "\"$value\""
                }
                "\"$key\":$valueStr"
            }
            "{${jsonPairs.joinToString(",")}}"
        } catch (e: Exception) {
            "$code: $message"
        }
    }

    // Helper functions to map OpenIAP enum values to Nitro enum values
    private fun mapIapkitPurchaseState(stateName: String): IapkitPurchaseState {
        return when (stateName.uppercase()) {
            "ENTITLED" -> IapkitPurchaseState.ENTITLED
            "PENDING_ACKNOWLEDGMENT", "PENDING-ACKNOWLEDGMENT" -> IapkitPurchaseState.PENDING_ACKNOWLEDGMENT
            "PENDING" -> IapkitPurchaseState.PENDING
            "CANCELED" -> IapkitPurchaseState.CANCELED
            "EXPIRED" -> IapkitPurchaseState.EXPIRED
            "READY_TO_CONSUME", "READY-TO-CONSUME" -> IapkitPurchaseState.READY_TO_CONSUME
            "CONSUMED" -> IapkitPurchaseState.CONSUMED
            "INAUTHENTIC" -> IapkitPurchaseState.INAUTHENTIC
            else -> IapkitPurchaseState.UNKNOWN
        }
    }

    private fun mapIapkitStore(storeName: String): IapStore {
        return when (storeName.uppercase()) {
            "APPLE" -> IapStore.APPLE
            "GOOGLE" -> IapStore.GOOGLE
            "HORIZON" -> IapStore.HORIZON
            else -> IapStore.UNKNOWN
        }
    }

    private fun mapPurchaseVerificationProvider(providerName: String): PurchaseVerificationProvider {
        return when (providerName.uppercase()) {
            "IAPKIT" -> PurchaseVerificationProvider.IAPKIT
            else -> PurchaseVerificationProvider.NONE
        }
    }

    /**
     * Read IAPKit API key from AndroidManifest.xml meta-data (set by config plugin).
     * Config plugin sets: <meta-data android:name="dev.iapkit.API_KEY" android:value="..." />
     */
    private fun getIapkitApiKeyFromManifest(): String? {
        return try {
            val appInfo = context.packageManager.getApplicationInfo(
                context.packageName,
                android.content.pm.PackageManager.GET_META_DATA
            )
            appInfo.metaData?.getString("dev.iapkit.API_KEY")
        } catch (e: Exception) {
            null
        }
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
