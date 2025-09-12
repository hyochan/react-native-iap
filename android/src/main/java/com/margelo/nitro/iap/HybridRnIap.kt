package com.margelo.nitro.iap

import android.app.Activity
import android.content.Context
import android.util.Log
import com.android.billingclient.api.*
import com.facebook.react.bridge.ReactApplicationContext
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import org.json.JSONArray
import org.json.JSONObject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

class HybridRnIap : HybridRnIapSpec(), PurchasesUpdatedListener, BillingClientStateListener {
    companion object {
        const val TAG = "RnIap"
        private const val MICROS_PER_UNIT = 1_000_000.0
    }
    
    // Get ReactApplicationContext lazily from NitroModules
    private val context: ReactApplicationContext by lazy {
        NitroModules.applicationContext as ReactApplicationContext
    }
    
    private var billingClient: BillingClient? = null
    private val skuDetailsCache = mutableMapOf<String, ProductDetails>()
    
    // Event listeners
    private val purchaseUpdatedListeners = mutableListOf<(NitroPurchase) -> Unit>()
    private val purchaseErrorListeners = mutableListOf<(NitroPurchaseResult) -> Unit>()
    private val promotedProductListenersIOS = mutableListOf<(NitroProduct) -> Unit>()
    
    
    // Connection methods
    override fun initConnection(): Promise<Boolean> {
        return Promise.async {
            if (billingClient?.isReady == true) {
                return@async true
            }
            
            // Check if Google Play Services is available
            val googleApiAvailability = GoogleApiAvailability.getInstance()
            val resultCode = googleApiAvailability.isGooglePlayServicesAvailable(context)
            if (resultCode != ConnectionResult.SUCCESS) {
                val errorMsg = BillingUtils.getPlayServicesErrorMessage(resultCode)
                val errorJson = BillingUtils.createErrorJson(
                    IapErrorCode.E_NOT_PREPARED, 
                    errorMsg,
                    resultCode
                )
                throw Exception(errorJson)
            }
            
            withContext(Dispatchers.Main) {
                initBillingClient()
            }
        }
    }
    
    override fun endConnection(): Promise<Boolean> {
        return Promise.async {
            billingClient?.endConnection()
            billingClient = null
            true
        }
    }
    
    // Product methods
    override fun fetchProducts(skus: Array<String>, type: String): Promise<Array<NitroProduct>> {
        return Promise.async {
            Log.d(TAG, "fetchProducts called with SKUs: ${skus.joinToString()}, type: $type")
            
            // Validate SKU list
            if (skus.isEmpty()) {
                throw Exception(BillingUtils.createErrorJson(
                    IapErrorCode.E_EMPTY_SKU_LIST,
                    "SKU list is empty"
                ))
            }
            
            // Initialize billing client if not already done
            // Auto-reconnection will handle service disconnections automatically
            if (billingClient == null) {
                initConnection().await()
            }
            
            val productType = if (type == "subs") {
                BillingClient.ProductType.SUBS
            } else {
                BillingClient.ProductType.INAPP
            }
            
            val productList = skus.map { sku ->
                QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(sku)
                    .setProductType(productType)
                    .build()
            }
            
            val params = QueryProductDetailsParams.newBuilder()
                .setProductList(productList)
                .build()
            
            val result = suspendCancellableCoroutine<List<ProductDetails>> { continuation ->
                billingClient?.queryProductDetailsAsync(params) { billingResult, productDetailsResult ->
                    Log.d(TAG, "queryProductDetailsAsync response: code=${billingResult.responseCode}")
                    if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                        val productDetailsList = productDetailsResult.productDetailsList ?: emptyList()
                        Log.d(TAG, "Retrieved ${productDetailsList.size} products")
                        // Cache the product details
                        if (productDetailsList.isNotEmpty()) {
                            for (details in productDetailsList) {
                                Log.d(TAG, "Product: ${details.productId}, has offers: ${details.subscriptionOfferDetails?.size ?: 0}")
                                skuDetailsCache[details.productId] = details
                            }
                            continuation.resume(productDetailsList)
                        } else {
                            continuation.resume(emptyList())
                        }
                    } else {
                        continuation.resumeWithException(
                            Exception(getBillingErrorMessage(billingResult.responseCode))
                        )
                    }
                }
            }
            
            Log.d(TAG, "Converting ${result.size} products to NitroProducts")
            
            val nitroProducts = result.map { productDetails ->
                convertToNitroProduct(productDetails, type)
            }.toTypedArray()
            
            Log.d(TAG, "Returning ${nitroProducts.size} NitroProducts to JS")
            nitroProducts
        }
    }
    
    // Purchase methods
    // Purchase methods (Unified)
    override fun requestPurchase(request: NitroPurchaseRequest): Promise<Unit> {
        return Promise.async {
            // Android implementation
            val androidRequest = request.android ?: run {
                sendPurchaseError(createPurchaseErrorResult(
                    IapErrorCode.E_USER_ERROR,
                    "No Android request provided"
                ))
                return@async
            }
            
            // Validate SKU list
            if (androidRequest.skus.isEmpty()) {
                sendPurchaseError(createPurchaseErrorResult(
                    IapErrorCode.E_EMPTY_SKU_LIST,
                    "SKU list is empty"
                ))
                return@async
            }
            
            try {
                // Initialize billing client if not already done
                if (billingClient == null) {
                    initConnection().await()
                }
                
                // Get current activity - this should be done on Main thread
                val activity = withContext(Dispatchers.Main) {
                    context.currentActivity
                } ?: run {
                    sendPurchaseError(createPurchaseErrorResult(
                        IapErrorCode.E_ACTIVITY_UNAVAILABLE,
                        "Current activity is null. Please ensure the app is in foreground."
                    ))
                    return@async
                }
                
                withContext(Dispatchers.Main) {
                    val productDetailsList = mutableListOf<BillingFlowParams.ProductDetailsParams>()
                    
                    // Build product details list
                    for (sku in androidRequest.skus) {
                        val productDetails = skuDetailsCache[sku] ?: run {
                            sendPurchaseError(createPurchaseErrorResult(
                                IapErrorCode.E_SKU_NOT_FOUND,
                                "Product not found: $sku. Call requestProducts first.",
                                sku
                            ))
                            return@withContext
                        }
                        
                        val productDetailsParams = BillingFlowParams.ProductDetailsParams.newBuilder()
                            .setProductDetails(productDetails)
                        
                        // Add offer token for subscriptions (required for SUBS on Play Billing 5+)
                        // Prefer developer-provided token, otherwise fall back to the first available offer/base-plan.
                        val subscriptionOffers = androidRequest.subscriptionOffers
                        var appliedOfferToken: String? = null

                        if (!subscriptionOffers.isNullOrEmpty()) {
                            val offer = subscriptionOffers.find { it.sku == sku }
                            appliedOfferToken = offer?.offerToken
                        }

                        if (appliedOfferToken == null && productDetails.productType == BillingClient.ProductType.SUBS) {
                            val firstAvailable = productDetails.subscriptionOfferDetails?.firstOrNull()?.offerToken
                            appliedOfferToken = firstAvailable
                        }

                        appliedOfferToken?.let { productDetailsParams.setOfferToken(it) }
                        productDetailsList.add(productDetailsParams.build())
                    }
                    
                    val billingFlowParams = BillingFlowParams.newBuilder()
                        .setProductDetailsParamsList(productDetailsList)
                        .setIsOfferPersonalized(androidRequest.isOfferPersonalized ?: false)
                    
                    // Set subscription update params if replacing
                    val purchaseToken = androidRequest.purchaseTokenAndroid
                    val replacementMode = androidRequest.replacementModeAndroid
                    if (!purchaseToken.isNullOrEmpty() && replacementMode != null) {
                        val updateParams = BillingFlowParams.SubscriptionUpdateParams.newBuilder()
                            .setOldPurchaseToken(purchaseToken)
                            .setSubscriptionReplacementMode(replacementMode.toInt())
                            .build()
                        billingFlowParams.setSubscriptionUpdateParams(updateParams)
                    }
                    
                    // Set obfuscated identifiers
                    androidRequest.obfuscatedAccountIdAndroid?.let { billingFlowParams.setObfuscatedAccountId(it) }
                    androidRequest.obfuscatedProfileIdAndroid?.let { billingFlowParams.setObfuscatedProfileId(it) }
                    
                    // Launch billing flow - results will be handled by onPurchasesUpdated
                    val billingResult = billingClient?.launchBillingFlow(activity, billingFlowParams.build())
                    if (billingResult?.responseCode != BillingClient.BillingResponseCode.OK) {
                        sendPurchaseError(createPurchaseErrorResult(
                            getBillingErrorCode(billingResult?.responseCode ?: -1),
                            getBillingErrorMessage(billingResult?.responseCode ?: -1)
                        ))
                    }
                    
                    // Purchase results will be handled by onPurchasesUpdated callback
                }
            } catch (e: Exception) {
                sendPurchaseError(createPurchaseErrorResult(
                    IapErrorCode.E_UNKNOWN,
                    e.message ?: "Unknown error occurred"
                ))
            }
        }
    }
    
    // Purchase history methods (Unified)
    override fun getAvailablePurchases(options: NitroAvailablePurchasesOptions?): Promise<Array<NitroPurchase>> {
        return Promise.async {
            // Android implementation
            val androidOptions = options?.android
            val type = androidOptions?.type ?: "inapp"
            
            // Initialize billing client if not already done
            // Auto-reconnection will handle service disconnections automatically
            if (billingClient == null) {
                initConnection().await()
            }
            
            val productType = if (type == "subs") {
                BillingClient.ProductType.SUBS
            } else {
                BillingClient.ProductType.INAPP
            }
            
            val params = QueryPurchasesParams.newBuilder()
                .setProductType(productType)
                .build()
            
            val result = suspendCancellableCoroutine<List<Purchase>> { continuation ->
                billingClient?.queryPurchasesAsync(params) { billingResult, purchases ->
                    if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                        continuation.resume(purchases)
                    } else {
                        continuation.resumeWithException(
                            Exception(getBillingErrorMessage(billingResult.responseCode))
                        )
                    }
                }
            }
            
            result.map { purchase ->
                convertToNitroPurchase(purchase)
            }.toTypedArray()
        }
    }
    
    // Transaction management methods (Unified)
    override fun finishTransaction(params: NitroFinishTransactionParams): Promise<Variant_Boolean_NitroPurchaseResult> {
        return Promise.async {
            // Android implementation
            val androidParams = params.android ?: return@async Variant_Boolean_NitroPurchaseResult.First(true)
            val purchaseToken = androidParams.purchaseToken
            val isConsumable = androidParams.isConsumable ?: false
            
            // Initialize billing client if not already done
            // Auto-reconnection will handle service disconnections automatically
            if (billingClient == null) {
                initConnection().await()
            }
            
            if (isConsumable) {
                // Consume the purchase
                val consumeParams = ConsumeParams.newBuilder()
                    .setPurchaseToken(purchaseToken)
                    .build()
                
                val result = suspendCancellableCoroutine<Pair<BillingResult, String>> { continuation ->
                    billingClient?.consumeAsync(consumeParams) { billingResult, token ->
                        continuation.resume(Pair(billingResult, token))
                    }
                }
                
                Variant_Boolean_NitroPurchaseResult.Second(
                    NitroPurchaseResult(
                        responseCode = result.first.responseCode.toDouble(),
                        debugMessage = result.first.debugMessage,
                        code = result.first.responseCode.toString(),
                        message = getBillingErrorMessage(result.first.responseCode),
                        purchaseToken = result.second
                    )
                )
            } else {
                // Acknowledge the purchase
                val acknowledgeParams = AcknowledgePurchaseParams.newBuilder()
                    .setPurchaseToken(purchaseToken)
                    .build()
                
                val result = suspendCancellableCoroutine<BillingResult> { continuation ->
                    billingClient?.acknowledgePurchase(acknowledgeParams) { billingResult ->
                        continuation.resume(billingResult)
                    }
                }
                
                Variant_Boolean_NitroPurchaseResult.Second(
                    NitroPurchaseResult(
                        responseCode = result.responseCode.toDouble(),
                        debugMessage = result.debugMessage,
                        code = result.responseCode.toString(),
                        message = getBillingErrorMessage(result.responseCode),
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
    
    // BillingClientStateListener implementation
    override fun onBillingSetupFinished(billingResult: BillingResult) {
        // Handled inline in initConnection
    }
    
    override fun onBillingServiceDisconnected() {
        // Try to restart the connection on the next request
        // For now, just log the disconnection
    }
    
    // PurchasesUpdatedListener implementation
    override fun onPurchasesUpdated(billingResult: BillingResult, purchases: List<Purchase>?) {
        Log.d(TAG, "onPurchasesUpdated: responseCode=${billingResult.responseCode}")
        
        if (billingResult.responseCode == BillingClient.BillingResponseCode.OK && purchases != null) {
            // Send successful purchases via events
            for (purchase in purchases) {
                sendPurchaseUpdate(convertToNitroPurchase(purchase))
            }
        } else {
            // Send error via events
            val errorCode = getBillingErrorCode(billingResult.responseCode)
            val errorMessage = getBillingErrorMessage(billingResult.responseCode)
            sendPurchaseError(createPurchaseErrorResult(
                errorCode,
                errorMessage,
                null,
                billingResult.responseCode,
                billingResult.debugMessage
            ))
        }
    }
    
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
    
    /**
     * Convert billing response code to IAP error code
     */
    private fun getBillingErrorCode(responseCode: Int): String {
        return when (responseCode) {
            BillingClient.BillingResponseCode.USER_CANCELED -> IapErrorCode.E_USER_CANCELLED
            BillingClient.BillingResponseCode.SERVICE_UNAVAILABLE -> IapErrorCode.E_SERVICE_ERROR
            BillingClient.BillingResponseCode.BILLING_UNAVAILABLE -> IapErrorCode.E_NOT_PREPARED
            BillingClient.BillingResponseCode.ITEM_UNAVAILABLE -> IapErrorCode.E_SKU_NOT_FOUND
            BillingClient.BillingResponseCode.DEVELOPER_ERROR -> IapErrorCode.E_DEVELOPER_ERROR
            BillingClient.BillingResponseCode.ERROR -> IapErrorCode.E_UNKNOWN
            BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED -> IapErrorCode.E_ALREADY_OWNED
            BillingClient.BillingResponseCode.ITEM_NOT_OWNED -> IapErrorCode.E_ITEM_NOT_OWNED
            BillingClient.BillingResponseCode.NETWORK_ERROR -> IapErrorCode.E_NETWORK_ERROR
            else -> IapErrorCode.E_UNKNOWN
        }
    }
    
    private suspend fun initBillingClient(): Boolean {
        return suspendCancellableCoroutine { continuation ->
            // For Google Play Billing v8.0.0+, use PendingPurchasesParams
            val pendingPurchasesParams = PendingPurchasesParams.newBuilder()
                .enableOneTimeProducts()
                .build()
            
            billingClient = BillingClient.newBuilder(context)
                .setListener(this@HybridRnIap)
                .enablePendingPurchases(pendingPurchasesParams)
                .enableAutoServiceReconnection() // Automatically handle service disconnections
                .build()
            
            billingClient?.startConnection(object : BillingClientStateListener {
                override fun onBillingSetupFinished(billingResult: BillingResult) {
                    if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                        continuation.resume(true)
                    } else {
                        val errorData = BillingUtils.getBillingErrorData(billingResult.responseCode)
                        val errorJson = BillingUtils.createErrorJson(
                            errorData.code,
                            errorData.message,
                            billingResult.responseCode,
                            billingResult.debugMessage
                        )
                        continuation.resumeWithException(Exception(errorJson))
                    }
                }
                
                override fun onBillingServiceDisconnected() {
                    Log.i(TAG, "Billing service disconnected")
                    // Will try to reconnect on next operation
                }
            })
        }
    }
    
    private fun convertToNitroProduct(productDetails: ProductDetails, type: String): NitroProduct {
        // Get price info from either one-time purchase or subscription
        val (currency, displayPrice, priceAmountMicros) = when {
            productDetails.oneTimePurchaseOfferDetails != null -> {
                val offer = productDetails.oneTimePurchaseOfferDetails!!
                Triple(
                    offer.priceCurrencyCode,
                    offer.formattedPrice,
                    offer.priceAmountMicros
                )
            }
            productDetails.subscriptionOfferDetails?.isNotEmpty() == true -> {
                val firstOffer = productDetails.subscriptionOfferDetails!![0]
                val firstPhase = firstOffer.pricingPhases.pricingPhaseList[0]
                Triple(
                    firstPhase.priceCurrencyCode,
                    firstPhase.formattedPrice,
                    firstPhase.priceAmountMicros
                )
            }
            else -> Triple("", "N/A", 0L)
        }
        
        // Convert subscription offer details to JSON string if available
        val subscriptionOfferDetailsJson = productDetails.subscriptionOfferDetails?.let { offers ->
            Log.d(TAG, "Product ${productDetails.productId} has ${offers.size} subscription offers")
            
            val jsonArray = JSONArray().apply {
                offers.forEach { offer ->
                    Log.d(TAG, "Offer: basePlanId=${offer.basePlanId}, offerId=${offer.offerId}, offerToken=${offer.offerToken}")
                    
                    val offerJson = JSONObject().apply {
                        put("offerToken", offer.offerToken)
                        put("basePlanId", offer.basePlanId)
                        offer.offerId?.let { put("offerId", it) }

                        put("offerTags", JSONArray(offer.offerTags))
                        
                        val pricingPhasesArray = JSONArray().apply {
                            offer.pricingPhases.pricingPhaseList.forEach { phase ->
                                put(JSONObject().apply {
                                    put("formattedPrice", phase.formattedPrice)
                                    put("priceCurrencyCode", phase.priceCurrencyCode)
                                    put("priceAmountMicros", phase.priceAmountMicros)
                                    put("billingCycleCount", phase.billingCycleCount)
                                    put("billingPeriod", phase.billingPeriod)
                                    put("recurrenceMode", phase.recurrenceMode)
                                })
                            }
                        }
                        put("pricingPhases", JSONObject().apply {
                            put("pricingPhaseList", pricingPhasesArray)
                        })
                    }
                    put(offerJson)
                }
            }
            
            val jsonString = jsonArray.toString()
            Log.d(TAG, "Subscription offer details JSON: $jsonString")
            jsonString
        }

        // Derive introductory/trial/base period information from subscription offers (if any)
        var derivedIntroValue: Double? = null
        var derivedIntroCycles: Double? = null
        var derivedIntroPeriod: String? = null
        var derivedSubPeriod: String? = null
        var derivedFreeTrialPeriod: String? = null

        productDetails.subscriptionOfferDetails?.let { offers ->
            // Prefer the first offer; if none, leave as nulls
            val firstOffer = offers.firstOrNull()
            val phases = firstOffer?.pricingPhases?.pricingPhaseList ?: emptyList()
            if (phases.isNotEmpty()) {
                // Base recurring phase: often the last phase (infinite recurrence)
                val basePhase = phases.last()
                derivedSubPeriod = basePhase.billingPeriod

                // Free trial phase: priceAmountMicros == 0
                val trialPhase = phases.firstOrNull { it.priceAmountMicros == 0L }
                derivedFreeTrialPeriod = trialPhase?.billingPeriod

                // Introductory paid phase: price > 0 and finite cycles
                val introPhase = phases.firstOrNull { it.priceAmountMicros > 0L && it.billingCycleCount > 0 }
                if (introPhase != null) {
                    derivedIntroValue = introPhase.priceAmountMicros / MICROS_PER_UNIT
                    derivedIntroCycles = introPhase.billingCycleCount.toDouble()
                    derivedIntroPeriod = introPhase.billingPeriod
                }
            }
        }
        
        val nitroProduct = NitroProduct(
            id = productDetails.productId,
            title = productDetails.title,
            description = productDetails.description,
            type = type,
            displayName = productDetails.name,
            displayPrice = displayPrice,
            currency = currency,
            price = priceAmountMicros / MICROS_PER_UNIT,
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
            // Android fields
            originalPriceAndroid = productDetails.oneTimePurchaseOfferDetails?.formattedPrice,
            originalPriceAmountMicrosAndroid = productDetails.oneTimePurchaseOfferDetails?.priceAmountMicros?.toDouble(),
            introductoryPriceValueAndroid = derivedIntroValue,
            introductoryPriceCyclesAndroid = derivedIntroCycles,
            introductoryPricePeriodAndroid = derivedIntroPeriod,
            subscriptionPeriodAndroid = derivedSubPeriod,
            freeTrialPeriodAndroid = derivedFreeTrialPeriod,
            subscriptionOfferDetailsAndroid = subscriptionOfferDetailsJson
        )
        
        Log.d(TAG, "Created NitroProduct for ${productDetails.productId}: has subscriptionOfferDetailsAndroid=${nitroProduct.subscriptionOfferDetailsAndroid != null}")
        
        return nitroProduct
    }
    
    private fun getPurchaseState(purchaseState: Int): String {
        return when (purchaseState) {
            Purchase.PurchaseState.PURCHASED -> "purchased"
            Purchase.PurchaseState.PENDING -> "pending"
            Purchase.PurchaseState.UNSPECIFIED_STATE -> "unknown"
            else -> "unknown"
        }
        // Note: Android doesn't have direct equivalents for:
        // - "restored" (iOS only - handled through restore purchases flow)
        // - "deferred" (iOS only - parental controls)
        // - "failed" (handled through error callbacks, not purchase state)
    }
    
    private fun convertToNitroPurchase(purchase: Purchase): NitroPurchase {
        return NitroPurchase(
            id = purchase.orderId ?: "",
            productId = purchase.products.firstOrNull() ?: "",
            transactionDate = purchase.purchaseTime.toDouble(),
            purchaseToken = purchase.purchaseToken,
            platform = "android",
            // Common fields
            quantity = purchase.quantity.toDouble(),
            purchaseState = getPurchaseState(purchase.purchaseState),
            isAutoRenewing = purchase.isAutoRenewing,
            // iOS fields
            quantityIOS = null,
            originalTransactionDateIOS = null,
            originalTransactionIdentifierIOS = null,
            appAccountToken = null,
            // Android fields
            purchaseTokenAndroid = purchase.purchaseToken,
            dataAndroid = purchase.originalJson,
            signatureAndroid = purchase.signature,
            autoRenewingAndroid = purchase.isAutoRenewing,
            purchaseStateAndroid = purchase.purchaseState.toDouble(),
            isAcknowledgedAndroid = purchase.isAcknowledged,
            packageNameAndroid = purchase.packageName,
            obfuscatedAccountIdAndroid = purchase.accountIdentifiers?.obfuscatedAccountId,
            obfuscatedProfileIdAndroid = purchase.accountIdentifiers?.obfuscatedProfileId
        )
    }
    
    // Helper function for billing error messages
    private fun getBillingErrorMessage(responseCode: Int): String {
        val errorData = BillingUtils.getBillingErrorData(responseCode)
        return errorData.message
    }
    
    // iOS-specific method - not supported on Android
    override fun getStorefrontIOS(): Promise<String> {
        return Promise.async {
            val errorJson = BillingUtils.createErrorJson(
                IapErrorCode.E_UNKNOWN,
                "getStorefrontIOS is only available on iOS"
            )
            throw Exception(errorJson)
        }
    }

    // iOS-specific method - not supported on Android
    override fun getAppTransactionIOS(): Promise<String?> {
        return Promise.async {
            val errorJson = BillingUtils.createErrorJson(
                IapErrorCode.E_UNKNOWN,
                "getAppTransactionIOS is only available on iOS"
            )
            throw Exception(errorJson)
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
                    ?: throw Exception(BillingUtils.createErrorJson(
                        IapErrorCode.E_DEVELOPER_ERROR,
                        "Android receipt validation requires androidOptions parameter"
                    ))

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
                val errorJson = BillingUtils.createErrorJson(
                    IapErrorCode.E_RECEIPT_FAILED,
                    "Receipt validation failed: ${e.message}"
                )
                throw Exception(errorJson)
            }
        }
    }
    
    // iOS-specific methods - Not applicable on Android, return appropriate defaults
    override fun subscriptionStatusIOS(sku: String): Promise<Array<NitroSubscriptionStatus>?> {
        return Promise.async {
            throw Exception(BillingUtils.createErrorJson(
                IapErrorCode.E_FEATURE_NOT_SUPPORTED,
                "subscriptionStatusIOS is only available on iOS platform"
            ))
        }
    }
    
    override fun currentEntitlementIOS(sku: String): Promise<NitroPurchase?> {
        return Promise.async {
            throw Exception(BillingUtils.createErrorJson(
                IapErrorCode.E_FEATURE_NOT_SUPPORTED,
                "currentEntitlementIOS is only available on iOS platform"
            ))
        }
    }
    
    override fun latestTransactionIOS(sku: String): Promise<NitroPurchase?> {
        return Promise.async {
            throw Exception(BillingUtils.createErrorJson(
                IapErrorCode.E_FEATURE_NOT_SUPPORTED,
                "latestTransactionIOS is only available on iOS platform"
            ))
        }
    }
    
    override fun getPendingTransactionsIOS(): Promise<Array<NitroPurchase>> {
        return Promise.async {
            throw Exception(BillingUtils.createErrorJson(
                IapErrorCode.E_FEATURE_NOT_SUPPORTED,
                "getPendingTransactionsIOS is only available on iOS platform"
            ))
        }
    }
    
    override fun syncIOS(): Promise<Boolean> {
        return Promise.async {
            throw Exception(BillingUtils.createErrorJson(
                IapErrorCode.E_FEATURE_NOT_SUPPORTED,
                "syncIOS is only available on iOS platform"
            ))
        }
    }
    
    
    
    override fun isEligibleForIntroOfferIOS(groupID: String): Promise<Boolean> {
        return Promise.async {
            throw Exception(BillingUtils.createErrorJson(
                IapErrorCode.E_FEATURE_NOT_SUPPORTED,
                "isEligibleForIntroOfferIOS is only available on iOS platform"
            ))
        }
    }
    
    override fun getReceiptDataIOS(): Promise<String> {
        return Promise.async {
            throw Exception(BillingUtils.createErrorJson(
                IapErrorCode.E_FEATURE_NOT_SUPPORTED,
                "getReceiptDataIOS is only available on iOS platform"
            ))
        }
    }
    
    override fun isTransactionVerifiedIOS(sku: String): Promise<Boolean> {
        return Promise.async {
            throw Exception(BillingUtils.createErrorJson(
                IapErrorCode.E_FEATURE_NOT_SUPPORTED,
                "isTransactionVerifiedIOS is only available on iOS platform"
            ))
        }
    }
    
    override fun getTransactionJwsIOS(sku: String): Promise<String?> {
        return Promise.async {
            throw Exception(BillingUtils.createErrorJson(
                IapErrorCode.E_FEATURE_NOT_SUPPORTED,
                "getTransactionJwsIOS is only available on iOS platform"
            ))
        }
    }
}
