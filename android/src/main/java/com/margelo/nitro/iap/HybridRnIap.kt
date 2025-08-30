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
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

class HybridRnIap : HybridRnIapSpec(), PurchasesUpdatedListener, BillingClientStateListener {
    companion object {
        const val TAG = "RnIap"
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
    override fun requestProducts(skus: Array<String>, type: String): Promise<Array<NitroProduct>> {
        return Promise.async {
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
                    if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                        val productDetailsList = productDetailsResult.productDetailsList
                        // Cache the product details
                        if (!productDetailsList.isNullOrEmpty()) {
                            for (details in productDetailsList) {
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
            
            result.map { productDetails ->
                convertToNitroProduct(productDetails, type)
            }.toTypedArray()
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
                
                val activity = context.currentActivity ?: run {
                    sendPurchaseError(createPurchaseErrorResult(
                        IapErrorCode.E_ACTIVITY_UNAVAILABLE,
                        "Current activity is null"
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
                        
                        // Add offer token for subscriptions
                        val subscriptionOffers = androidRequest.subscriptionOffers
                        if (!subscriptionOffers.isNullOrEmpty()) {
                            val offer = subscriptionOffers.find { it.sku == sku }
                            offer?.offerToken?.let { productDetailsParams.setOfferToken(it) }
                        }
                        
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
    
    /**
     * Initialize billing client with proper error handling
     * Following expo-iap pattern for cleaner code organization
     */
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
        
        return NitroProduct(
            id = productDetails.productId,
            title = productDetails.title,
            description = productDetails.description,
            type = type,
            displayName = productDetails.name,
            displayPrice = displayPrice,
            currency = currency,
            price = priceAmountMicros / 1000000.0,
            platform = "android",
            // iOS fields (null on Android)
            isFamilyShareable = null,
            jsonRepresentation = null,
            subscriptionPeriodUnitIOS = null,
            subscriptionPeriodNumberIOS = null,
            introductoryPriceIOS = null,
            introductoryPriceAsAmountIOS = null,
            introductoryPricePaymentModeIOS = null,
            introductoryPriceNumberOfPeriodsIOS = null,
            introductoryPriceSubscriptionPeriodIOS = null,
            // Android fields
            originalPrice = productDetails.oneTimePurchaseOfferDetails?.formattedPrice,
            originalPriceAmountMicros = productDetails.oneTimePurchaseOfferDetails?.priceAmountMicros?.toDouble(),
            introductoryPriceValue = null, // TODO: Extract from subscription offers
            introductoryPriceCycles = null,
            introductoryPricePeriod = null,
            subscriptionPeriod = null, // TODO: Extract from subscription offers
            freeTrialPeriod = null
        )
    }
    
    private fun convertToNitroPurchase(purchase: Purchase): NitroPurchase {
        return NitroPurchase(
            id = purchase.orderId ?: "",
            productId = purchase.products.firstOrNull() ?: "",
            transactionDate = purchase.purchaseTime.toDouble(),
            purchaseToken = purchase.purchaseToken,
            platform = "android",
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
    
}