package com.margelo.nitro.iap

import android.app.Activity
import android.content.Context
import android.content.Intent
import com.android.billingclient.api.*
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContext
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.margelo.nitro.core.Promise
import kotlinx.coroutines.*
import kotlinx.coroutines.suspendCancellableCoroutine
import java.util.concurrent.ConcurrentHashMap
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

// Constants
const val DEVICE_PLATFORM = "android"

@DoNotStrip
class Iap : HybridIapSpec(), PurchasesUpdatedListener, BillingClientStateListener {
    // MARK: - Properties
    
    override val PI: Double = 3.14159265359
    
    private var billingClient: BillingClient? = null
    private var context: ReactApplicationContext? = null
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    
    private val skus = ConcurrentHashMap<String, ProductDetails>()
    private val pendingPromises = ConcurrentHashMap<String, Promise<Array<NitroPurchase>>>()
    
    private var purchaseUpdateCallback: ((NitroPurchase) -> Unit)? = null
    private var purchaseErrorCallback: ((NitroPurchaseError) -> Unit)? = null
    private var hasListeners = false
    
    private fun getReactContext(): ReactApplicationContext? {
        // First try cached context
        if (context != null) return context
        
        // Try to get from IapModule companion object
        context = IapModule.applicationContext
        if (context != null) return context
        
        // Try to get React context dynamically through reflection
        try {
            // First try: Check if reactContext field exists
            val reactContextField = this::class.java.getDeclaredField("reactContext")
            reactContextField.isAccessible = true
            context = reactContextField.get(this) as? ReactApplicationContext
            if (context != null) return context
            
            // Second try: Check parent class fields
            var currentClass: Class<*>? = this::class.java.superclass
            while (currentClass != null) {
                try {
                    val field = currentClass.getDeclaredField("reactContext")
                    field.isAccessible = true
                    context = field.get(this) as? ReactApplicationContext
                    if (context != null) return context
                } catch (e: NoSuchFieldException) {
                    // Try next parent class
                }
                currentClass = currentClass.superclass
            }
        } catch (e: Exception) {
            // Context might not be available yet
        }
        return context
    }
    
    // MARK: - Connection Management
    
    override fun initConnection(): Promise<Boolean> {
        return Promise.async {
            if (billingClient?.isReady == true) {
                return@async true
            }
            
            val ctx = getReactContext() 
            if (ctx == null) {
                throw Exception("React context not available. Please ensure the app is properly initialized.")
            }
            
            // Check if Google Play Services is available
            val googleApiAvailability = GoogleApiAvailability.getInstance()
            val resultCode = googleApiAvailability.isGooglePlayServicesAvailable(ctx)
            if (resultCode != ConnectionResult.SUCCESS) {
                val errorMsg = when (resultCode) {
                    ConnectionResult.SERVICE_MISSING -> "Google Play Services is missing on this device"
                    ConnectionResult.SERVICE_VERSION_UPDATE_REQUIRED -> "Google Play Services needs to be updated"
                    ConnectionResult.SERVICE_DISABLED -> "Google Play Services is disabled"
                    ConnectionResult.SERVICE_INVALID -> "Google Play Services is invalid"
                    else -> "Google Play Services is not available (error code: $resultCode)"
                }
                throw Exception(errorMsg)
            }
            
            // For Google Play Billing v8.0.0, we need to enable pending purchases properly
            val pendingPurchasesParams = PendingPurchasesParams.newBuilder()
                .enableOneTimeProducts()
                .build()
            
            billingClient = BillingClient.newBuilder(ctx)
                .setListener(this@Iap)
                .enablePendingPurchases(pendingPurchasesParams)
                .build()
            
            suspendCancellableCoroutine { continuation ->
                billingClient?.startConnection(object : BillingClientStateListener {
                    override fun onBillingSetupFinished(billingResult: BillingResult) {
                        if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                            continuation.resume(true)
                        } else {
                            continuation.resumeWithException(Exception(getBillingErrorMessage(billingResult.responseCode)))
                        }
                    }
                    
                    override fun onBillingServiceDisconnected() {
                        // Will try to reconnect on next operation
                    }
                })
            }
        }
    }
    
    override fun endConnection(): Promise<Boolean> {
        return Promise.async {
            billingClient?.endConnection()
            billingClient = null
            skus.clear()
            pendingPromises.clear()
            true
        }
    }
    
    // MARK: - Event Listeners
    
    override fun listenToPurchaseUpdates(onUpdate: (purchase: NitroPurchase) -> Unit) {
        purchaseUpdateCallback = onUpdate
        hasListeners = true
    }
    
    override fun listenToPurchaseErrors(onError: (error: NitroPurchaseError) -> Unit) {
        purchaseErrorCallback = onError
        hasListeners = true
    }
    
    override fun removePurchaseUpdateListener() {
        purchaseUpdateCallback = null
        checkAndClearListeners()
    }
    
    override fun removePurchaseErrorListener() {
        purchaseErrorCallback = null
        checkAndClearListeners()
    }
    
    private fun checkAndClearListeners() {
        if (purchaseUpdateCallback == null && purchaseErrorCallback == null) {
            hasListeners = false
        }
    }
    
    // MARK: - Product Fetching
    
    override fun getItems(skus: Array<String>): Promise<Array<NitroProduct>> {
        return getItemsByType(NitroProductType.INAPP, skus)
    }
    
    override fun getItemsByType(type: NitroProductType, skus: Array<String>): Promise<Array<NitroProduct>> {
        return Promise.async {
            ensureConnectionAsync {
                val productType = if (type == NitroProductType.SUBS) {
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
                
                suspendCancellableCoroutine<Array<NitroProduct>> { continuation ->
                    billingClient?.queryProductDetailsAsync(params) { billingResult: BillingResult, productDetailsResult ->
                        if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                            val serializedProducts = productDetailsResult.productDetailsList?.map { productDetails: ProductDetails ->
                                this@Iap.skus[productDetails.productId] = productDetails
                                val typeName = when(type) {
                                    NitroProductType.SUBS -> "subs"
                                    NitroProductType.INAPP -> "inapp"
                                }
                                serializeProduct(productDetails, typeName)
                            }?.toTypedArray() ?: emptyArray()
                            continuation.resume(serializedProducts)
                        } else {
                            continuation.resumeWithException(Exception(getBillingErrorMessage(billingResult.responseCode)))
                        }
                    }
                }
            }
        }
    }
    
    // MARK: - Purchase History
    
    override fun getAvailableItems(
        alsoPublishToEventListener: Boolean,
        onlyIncludeActiveItems: Boolean
    ): Promise<Array<NitroPurchase>> {
        return Promise.async {
            val allPurchases = mutableListOf<NitroPurchase>()
            
            // Get in-app purchases
            val inappPurchases = getAvailableItemsByTypeInternal("inapp")
            allPurchases.addAll(inappPurchases)
            
            // Get subscription purchases
            val subsPurchases = getAvailableItemsByTypeInternal("subs")
            allPurchases.addAll(subsPurchases)
            
            if (alsoPublishToEventListener && hasListeners) {
                allPurchases.forEach { purchase ->
                    purchaseUpdateCallback?.invoke(purchase)
                }
            }
            
            allPurchases.toTypedArray()
        }
    }
    
    override fun getPurchaseHistoryByType(type: NitroProductType): Promise<Array<NitroPurchase>> {
        return Promise.async {
            // Note: queryPurchaseHistoryAsync was removed in Google Play Billing Library v8.0.0
            // This method now returns empty array as purchase history is no longer available client-side
            // Apps should use server-side purchase verification APIs for historical data
            emptyArray<NitroPurchase>()
        }
    }
    
    override fun getAvailableItemsByType(type: NitroProductType): Promise<Array<NitroPurchase>> {
        return Promise.async {
            val typeName = when(type) {
                NitroProductType.SUBS -> "subs"
                NitroProductType.INAPP -> "inapp"
            }
            val purchases = getAvailableItemsByTypeInternal(typeName)
            purchases.toTypedArray()
        }
    }
    
    private suspend fun getAvailableItemsByTypeInternal(type: String): List<NitroPurchase> {
        return ensureConnectionAsync {
            val productType = if (type == "subs") {
                BillingClient.ProductType.SUBS
            } else {
                BillingClient.ProductType.INAPP
            }
            
            val params = QueryPurchasesParams.newBuilder()
                .setProductType(productType)
                .build()
            
            suspendCancellableCoroutine<List<NitroPurchase>> { continuation ->
                billingClient?.queryPurchasesAsync(params) { billingResult, purchasesList ->
                    if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                        val serializedPurchases = purchasesList.map { purchase ->
                            serializePurchase(purchase)
                        }
                        continuation.resume(serializedPurchases)
                    } else {
                        continuation.resumeWithException(Exception(getBillingErrorMessage(billingResult.responseCode)))
                    }
                }
            }
        }
    }

    private suspend fun getRawAvailableItemsByTypeInternal(type: String): List<com.android.billingclient.api.Purchase> {
        return ensureConnectionAsync {
            val productType = if (type == "subs") {
                BillingClient.ProductType.SUBS
            } else {
                BillingClient.ProductType.INAPP
            }

            val params = QueryPurchasesParams.newBuilder()
                .setProductType(productType)
                .build()

            suspendCancellableCoroutine<List<com.android.billingclient.api.Purchase>> { continuation ->
                billingClient?.queryPurchasesAsync(params) { billingResult, purchasesList ->
                    if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                        continuation.resume(purchasesList ?: emptyList())
                    } else {
                        continuation.resumeWithException(Exception(getBillingErrorMessage(billingResult.responseCode)))
                    }
                }
            }
        }
    }
    
    // MARK: - Purchase Methods
    
    override fun buyProduct(
        sku: String,
        andDangerouslyFinishTransactionAutomaticallyIOS: Boolean,
        appAccountToken: String?,
        quantity: Double,
        withOffer: OfferParams?
    ): Promise<NitroPurchase> {
        return Promise.async {
            val params = RequestPurchaseAndroidProps(
                skus = arrayOf(sku),
                obfuscatedAccountIdAndroid = appAccountToken,
                obfuscatedProfileIdAndroid = null,
                isOfferPersonalized = false
            )
            
            val result = buyItemByTypeInternal(params)
            result.first()
        }
    }
    
    override fun buyItemByType(params: RequestPurchaseAndroidProps): Promise<Array<NitroPurchase>> {
        return Promise.async {
            val result = buyItemByTypeInternal(params)
            result.toTypedArray()
        }
    }
    
    private suspend fun buyItemByTypeInternal(params: RequestPurchaseAndroidProps): List<NitroPurchase> {
        return ensureConnectionAsync {
            val skuArr = params.skus
            val obfuscatedAccountId = params.obfuscatedAccountIdAndroid
            val obfuscatedProfileId = params.obfuscatedProfileIdAndroid
            val isOfferPersonalized = params.isOfferPersonalized ?: false
            
            // Check if this is a subscription request by checking for subscriptionOffers field
            // We need to access the raw data to check for subscription offers
            val subscriptionOffersField = try {
                params.javaClass.getDeclaredField("subscriptionOffers")
            } catch (e: NoSuchFieldException) {
                null
            }
            
            val subscriptionOffers = subscriptionOffersField?.let { field ->
                field.isAccessible = true
                @Suppress("UNCHECKED_CAST")
                field.get(params) as? Array<*>
            }
            
            // Check if this is a subscription by looking at the product in skus map
            // If subscriptionOffers field exists (even if empty), it's likely a subscription request
            val isSubscription = if (subscriptionOffersField != null) {
                // If subscriptionOffers field exists, it's a subscription request
                true
            } else {
                // Otherwise, check if the product is a subscription based on product details
                skuArr.isNotEmpty() && skus[skuArr.first()]?.subscriptionOfferDetails != null
            }
            
            val type = if (isSubscription) BillingClient.ProductType.SUBS else BillingClient.ProductType.INAPP
            
            if (skuArr.isEmpty()) {
                throw Exception("SKU array is empty")
            }
            
            // Validate subscription offers for subscriptions
            if (isSubscription && subscriptionOffers != null) {
                if (subscriptionOffers.size != skuArr.size) {
                    throw Exception("The number of skus (${skuArr.size}) must match the number of subscription offers (${subscriptionOffers.size}) for Subscriptions")
                }
            }
            
            val activity = getCurrentActivity()
            if (activity == null) {
                throw Exception("Activity not available")
            }
            
            val productDetailsParamsList = mutableListOf<BillingFlowParams.ProductDetailsParams>()
            
            skuArr.forEachIndexed { index, sku ->
                val productDetails = skus[sku]
                if (productDetails == null) {
                    throw Exception("Product details not found for SKU: $sku")
                }
                
                val productDetailsParamsBuilder = BillingFlowParams.ProductDetailsParams.newBuilder()
                    .setProductDetails(productDetails)
                
                // For subscriptions, set the offer token
                if (isSubscription) {
                    // Try to get offerToken from subscriptionOffers if provided
                    var offerToken: String? = null
                    
                    if (subscriptionOffers != null && index < subscriptionOffers.size) {
                        val offerInfo = subscriptionOffers[index]
                        if (offerInfo != null) {
                            // Try to get offerToken from the object
                            val offerTokenField = try {
                                offerInfo.javaClass.getDeclaredField("offerToken")
                            } catch (e: NoSuchFieldException) {
                                null
                            }
                            
                            offerToken = offerTokenField?.let { field ->
                                field.isAccessible = true
                                field.get(offerInfo) as? String
                            }
                        }
                    }
                    
                    // If no offer token was provided, use the first available offer token from product details
                    if (offerToken.isNullOrEmpty() && productDetails.subscriptionOfferDetails != null) {
                        offerToken = productDetails.subscriptionOfferDetails?.firstOrNull()?.offerToken
                        android.util.Log.d("Iap", "Using default offer token for ${productDetails.productId}: $offerToken")
                    }
                    
                    if (!offerToken.isNullOrEmpty()) {
                        productDetailsParamsBuilder.setOfferToken(offerToken)
                    } else {
                        throw Exception("No offer token available for subscription ${productDetails.productId}")
                    }
                }
                
                productDetailsParamsList.add(productDetailsParamsBuilder.build())
            }
            
            val billingFlowParamsBuilder = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(productDetailsParamsList)
                .setIsOfferPersonalized(isOfferPersonalized)
            
            // Set obfuscated account/profile IDs if provided
            if (obfuscatedAccountId?.isNotEmpty() == true) {
                billingFlowParamsBuilder.setObfuscatedAccountId(obfuscatedAccountId)
            }
            if (obfuscatedProfileId?.isNotEmpty() == true) {
                billingFlowParamsBuilder.setObfuscatedProfileId(obfuscatedProfileId)
            }
            
            suspendCancellableCoroutine<List<NitroPurchase>> { continuation ->
                // Check if another purchase is already in progress
                synchronized(this) {
                    if (currentContinuation != null) {
                        continuation.resumeWithException(Exception("Another purchase flow is already in progress"))
                        return@suspendCancellableCoroutine
                    }
                    
                    // Store continuation for later resolution in onPurchasesUpdated
                    // Sort SKUs to ensure consistent key generation
                    val promiseKey = skuArr.toList().sorted().joinToString(",")
                    currentRequestKey = promiseKey
                    currentContinuation = continuation
                }
                
                val flowParams = billingFlowParamsBuilder.build()
                val billingResult = billingClient?.launchBillingFlow(activity, flowParams)
                
                if (billingResult == null || billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
                    synchronized(this) {
                        currentRequestKey = null
                        currentContinuation = null
                    }
                    val responseCode = billingResult?.responseCode ?: -1
                    val debugMessage = billingResult?.debugMessage ?: "Unknown error"
                    val errorMessage = "${getBillingErrorMessage(responseCode)} - Debug: $debugMessage"
                    
                    // Log the error details
                    android.util.Log.e("Iap", "launchBillingFlow failed - Response code: $responseCode, Message: $errorMessage")
                    android.util.Log.e("Iap", "SKUs: ${skuArr.joinToString()}, Type: $type")
                    if (isSubscription) {
                        android.util.Log.e("Iap", "Subscription offers: $subscriptionOffers")
                    }
                    
                    continuation.resumeWithException(Exception(errorMessage))
                }
            }
        }
    }
    
    // Use a single in-flight continuation to avoid concurrent purchase issues
    @Volatile
    private var currentContinuation: kotlin.coroutines.Continuation<List<NitroPurchase>>? = null
    @Volatile
    private var currentRequestKey: String? = null
    
    // MARK: - Transaction Completion
    
    override fun finishTransaction(transactionId: String): Promise<Unit> {
        return Promise.async {
            // Android doesn't have a direct equivalent to iOS's finishTransaction
            // Purchases are either consumed (for consumables) or acknowledged (for non-consumables)
            Unit
        }
    }
    
    override fun consumeProduct(purchaseToken: String): Promise<ProductPurchaseAndroid> {
        return Promise.async {
            ensureConnectionAsync {
                val params = ConsumeParams.newBuilder()
                    .setPurchaseToken(purchaseToken)
                    .build()
                
                suspendCancellableCoroutine<ProductPurchaseAndroid> { continuation ->
                    billingClient?.consumeAsync(params) { billingResult, _ ->
                        if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                            continuation.resume(ProductPurchaseAndroid(
                                purchaseTokenAndroid = purchaseToken,
                                purchaseStateAndroid = com.android.billingclient.api.Purchase.PurchaseState.PURCHASED.toDouble(),
                                signatureAndroid = null,
                                dataAndroid = null,
                                originalJsonAndroid = null,
                                isAcknowledgedAndroid = true,
                                autoRenewingAndroid = false
                            ))
                        } else {
                            continuation.resumeWithException(Exception(getBillingErrorMessage(billingResult.responseCode)))
                        }
                    }
                }
            }
        }
    }
    
    override fun acknowledgePurchase(purchaseToken: String): Promise<ProductPurchaseAndroid> {
        return Promise.async {
            ensureConnectionAsync {
                val params = AcknowledgePurchaseParams.newBuilder()
                    .setPurchaseToken(purchaseToken)
                    .build()
                
                suspendCancellableCoroutine<ProductPurchaseAndroid> { continuation ->
                    billingClient?.acknowledgePurchase(params) { billingResult ->
                        if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                            continuation.resume(ProductPurchaseAndroid(
                                purchaseTokenAndroid = purchaseToken,
                                purchaseStateAndroid = com.android.billingclient.api.Purchase.PurchaseState.PURCHASED.toDouble(),
                                signatureAndroid = null,
                                dataAndroid = null,
                                originalJsonAndroid = null,
                                isAcknowledgedAndroid = true,
                                autoRenewingAndroid = false
                            ))
                        } else {
                            continuation.resumeWithException(Exception(getBillingErrorMessage(billingResult.responseCode)))
                        }
                    }
                }
            }
        }
    }
    
    // MARK: - iOS Compatibility Methods (No-op on Android)
    
    override fun isEligibleForIntroOffer(groupID: String): Promise<Boolean> {
        return Promise.async {
            // Android doesn't have this concept, always return true
            true
        }
    }
    
    override fun subscriptionStatus(sku: String): Promise<Array<ProductStatusIOS>?> {
        return Promise.async {
            try {
                val purchases = getAvailableItemsByTypeInternal("subs")
                val matchingPurchases = purchases.filter { purchase ->
                    purchase.productId == sku
                }
                if (matchingPurchases.isEmpty()) null else {
                    matchingPurchases.map { purchase ->
                        ProductStatusIOS(
                            state = "purchased",
                            productId = purchase.productId,
                            transactionId = purchase.transactionId ?: "",
                            purchaseDate = 0.0, // Would need to get actual purchase date
                            expirationDate = null
                        )
                    }.toTypedArray()
                }
            } catch (e: Exception) {
                null
            }
        }
    }
    
    override fun currentEntitlement(sku: String): Promise<ProductStatusIOS?> {
        return Promise.async {
            try {
                val purchases = getAvailableItemsByTypeInternal("subs")
                val matchingPurchase = purchases.firstOrNull { purchase ->
                    purchase.productId == sku
                }
                matchingPurchase?.let { purchase ->
                    ProductStatusIOS(
                        state = "purchased",
                        productId = purchase.productId,
                        transactionId = purchase.transactionId ?: "",
                        purchaseDate = 0.0, // Would need to get actual purchase date
                        expirationDate = null
                    )
                }
            } catch (e: Exception) {
                null
            }
        }
    }
    
    override fun latestTransaction(sku: String): Promise<ProductStatusIOS?> {
        return Promise.async {
            try {
                // Purchase history was removed in Google Play Billing Library v8.0.0
                // Return null as historical transaction data is no longer available client-side
                null
            } catch (e: Exception) {
                null
            }
        }
    }
    
    override fun clearTransaction(): Promise<Unit> {
        return Promise.async {
            Unit
        }
    }
    
    override fun getPendingTransactions(): Promise<Array<NitroPurchase>> {
        return Promise.async {
            try {
                val inappPurchases = getRawAvailableItemsByTypeInternal("inapp")
                val subsPurchases = getRawAvailableItemsByTypeInternal("subs")
                val allPurchases = inappPurchases + subsPurchases
                
                // Filter for pending purchases (not acknowledged)
                val pendingList = allPurchases
                    .filter { !it.isAcknowledged }
                    .map { serializePurchase(it) }
                
                pendingList.toTypedArray()
            } catch (e: Exception) {
                emptyArray()
            }
        }
    }
    
    override fun presentCodeRedemptionSheet(): Promise<Boolean> {
        return Promise.async {
            // Android doesn't have this UI, return false
            false
        }
    }
    
    override fun showManageSubscriptions(): Promise<Boolean> {
        return Promise.async {
            try {
                val activity = getCurrentActivity()
                if (activity != null) {
                    val uri = android.net.Uri.parse(
                        "https://play.google.com/store/account/subscriptions?package=${activity.packageName}"
                    )
                    val intent = Intent(Intent.ACTION_VIEW, uri).apply {
                        // If Play Store is available, prefer it
                        setPackage("com.android.vending")
                    }
                    activity.startActivity(intent)
                    true
                } else {
                    false
                }
            } catch (e: Exception) {
                false
            }
        }
    }
    
    override fun beginRefundRequest(sku: String): Promise<String?> {
        return Promise.async {
            // Android doesn't have in-app refund API
            "NOT_SUPPORTED"
        }
    }
    
    override fun getReceiptData(): Promise<String?> {
        return Promise.async {
            try {
                val inappPurchases = getRawAvailableItemsByTypeInternal("inapp")
                val subsPurchases = getRawAvailableItemsByTypeInternal("subs")
                val allPurchases = inappPurchases + subsPurchases

                // Find the most recent purchase
                val mostRecentPurchase = allPurchases.maxByOrNull { it.purchaseTime }

                mostRecentPurchase?.originalJson
            } catch (e: Exception) {
                null
            }
        }
    }
    
    override fun isTransactionVerified(sku: String): Promise<Boolean> {
        return Promise.async {
            try {
                // NOTE: This is a client-side check. For full verification,
                // the purchase token and signature should be sent to a secure backend server.
                val inappPurchases = getRawAvailableItemsByTypeInternal("inapp")
                val subsPurchases = getRawAvailableItemsByTypeInternal("subs")
                val allPurchases = inappPurchases + subsPurchases

                val matchingPurchase = allPurchases.firstOrNull { p -> p.products.contains(sku) }

                matchingPurchase?.isAcknowledged ?: false
            } catch (e: Exception) {
                false
            }
        }
    }
    
    override fun getTransactionJws(sku: String): Promise<String?> {
        return Promise.async {
            // JWS is an iOS-specific concept. Returning null for Android.
            null
        }
    }
    
    override fun getAppTransaction(): Promise<AppTransactionIOS?> {
        return Promise.async {
            // App transaction is an iOS-specific concept. Returning null for Android.
            null
        }
    }
    
    override fun validateReceiptIOS(sku: String): Promise<ProductStatusIOS> {
        return Promise.async {
            try {
                val purchases = getAvailableItemsByTypeInternal("inapp") + 
                               getAvailableItemsByTypeInternal("subs")
                val matchingPurchase = purchases.firstOrNull { purchase ->
                    purchase.productId == sku
                }
                
                if (matchingPurchase != null) {
                    ProductStatusIOS(
                        state = "purchased",
                        productId = sku,
                        transactionId = matchingPurchase.transactionId ?: "",
                        purchaseDate = 0.0, // Would need actual purchase date
                        expirationDate = null
                    )
                } else {
                    ProductStatusIOS(
                        state = "notPurchased",
                        productId = sku,
                        transactionId = "",
                        purchaseDate = 0.0,
                        expirationDate = null
                    )
                }
            } catch (e: Exception) {
                ProductStatusIOS(
                    state = "error",
                    productId = sku,
                    transactionId = "",
                    purchaseDate = 0.0,
                    expirationDate = null
                )
            }
        }
    }
    
    override fun sync(): Promise<Boolean> {
        return Promise.async {
            // Android doesn't have explicit sync like iOS
            // Just ensure connection is active
            try {
                if (billingClient?.isReady == true) {
                    true
                } else {
                    try {
                        initConnection().await()
                        true
                    } catch (e: Exception) {
                        false
                    }
                }
            } catch (e: Exception) {
                false
            }
        }
    }
    
    override fun disable(): Boolean {
        billingClient?.endConnection()
        return true
    }
    
    // MARK: - Utility Methods
    
    override fun getPackageName(): Promise<String> {
        return Promise.async {
            val ctx = getReactContext() ?: throw Exception("Context not available")
            ctx.packageName
        }
    }
    
    override fun setValueAsync(value: String): Promise<String> {
        return Promise.async {
            value
        }
    }
    
    override fun getPlatform(): String {
        return "android"
    }
    
    // MARK: - PurchasesUpdatedListener
    
    override fun onPurchasesUpdated(billingResult: BillingResult, purchases: List<com.android.billingclient.api.Purchase>?) {
        scope.launch {
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK && purchases != null) {
                // Resolve the current continuation if it matches
                synchronized(this@Iap) {
                    currentContinuation?.let { continuation ->
                        val currentKey = currentRequestKey
                        if (currentKey != null) {
                            // Check if purchases match the current request
                            val matchingPurchases = purchases.filter { 
                                it.products.sorted().joinToString(",") == currentKey 
                            }
                            if (matchingPurchases.isNotEmpty()) {
                                continuation.resume(matchingPurchases.map { serializePurchase(it) })
                                currentContinuation = null
                                currentRequestKey = null
                            }
                        }
                    }
                }

                // Emit events if listeners are registered
                if (hasListeners) {
                    val serializedPurchases = purchases.map { serializePurchase(it) }
                    serializedPurchases.forEach { purchase ->
                        purchaseUpdateCallback?.invoke(purchase)
                    }
                }
            } else {
                val errorData = createErrorData(billingResult)

                // Emit error events if listeners are registered
                if (hasListeners) {
                    purchaseErrorCallback?.invoke(errorData)
                }

                // Reject only the current continuation with the error
                synchronized(this@Iap) {
                    currentContinuation?.resumeWithException(Exception(getBillingErrorMessage(billingResult.responseCode)))
                    currentContinuation = null
                    currentRequestKey = null
                }
            }
        }
    }
    
    // MARK: - BillingClientStateListener
    
    override fun onBillingSetupFinished(billingResult: BillingResult) {
        // Handled in initConnection
    }
    
    override fun onBillingServiceDisconnected() {
        // Will try to reconnect on next operation
    }
    
    // MARK: - Helper Methods
    
    private suspend fun <T> ensureConnectionAsync(block: suspend () -> T): T {
        if (billingClient?.isReady == true) {
            return block()
        } else {
            initConnection().await()
            return block()
        }
    }
    
    private fun getCurrentActivity(): Activity? {
        return getReactContext()?.currentActivity
    }
    
    private fun serializeProduct(productDetails: ProductDetails, type: String): NitroProduct {
        var displayPrice: String? = null
        var currency: String? = null
        var price: Double? = null
        
        // Add one-time purchase details for in-app products
        productDetails.oneTimePurchaseOfferDetails?.let { offerDetails ->
            displayPrice = offerDetails.formattedPrice
            currency = offerDetails.priceCurrencyCode
            price = offerDetails.priceAmountMicros.toDouble() / 1000000.0
        }
        
        // Add subscription offer details
        productDetails.subscriptionOfferDetails?.let { offerDetailsList ->
            // Set display price from first offer's first pricing phase
            offerDetailsList.firstOrNull()?.pricingPhases?.pricingPhaseList?.firstOrNull()?.let { phase ->
                displayPrice = phase.formattedPrice
                currency = phase.priceCurrencyCode
                price = phase.priceAmountMicros.toDouble() / 1000000.0
            }
        }
        
        // Create NitroProduct with constructor parameters
        val product = NitroProduct(
            productDetails.productId,  // id
            productDetails.title,       // title
            productDetails.description, // description
            price,                      // price
            currency,                   // currency
            displayPrice,               // displayPrice
            DEVICE_PLATFORM             // platform
        )
        
        // For subscriptions, add subscription offer details dynamically
        // Since NitroProduct allows [key: string]: any, we need to add these via reflection or as a Map
        if (type == "subs" && productDetails.subscriptionOfferDetails != null) {
            // Create subscription offer details as a list of maps
            val subscriptionOfferDetails = productDetails.subscriptionOfferDetails?.map { offer ->
                mapOf(
                    "basePlanId" to offer.basePlanId,
                    "offerId" to offer.offerId,
                    "offerToken" to offer.offerToken,
                    "offerTags" to offer.offerTags,
                    "pricingPhases" to mapOf(
                        "pricingPhaseList" to offer.pricingPhases.pricingPhaseList.map { phase ->
                            mapOf(
                                "formattedPrice" to phase.formattedPrice,
                                "priceCurrencyCode" to phase.priceCurrencyCode,
                                "billingPeriod" to phase.billingPeriod,
                                "billingCycleCount" to phase.billingCycleCount,
                                "priceAmountMicros" to phase.priceAmountMicros.toString(),
                                "recurrenceMode" to phase.recurrenceMode
                            )
                        }
                    )
                )
            }
            
            // Note: We can't directly add fields to NitroProduct since it's generated
            // The subscriptionOfferDetails need to be handled differently
            // For now, log the offer details
            android.util.Log.d("Iap", "Subscription offers for ${productDetails.productId}: $subscriptionOfferDetails")
        }
        
        return product
    }
    
    private fun serializePurchase(purchase: com.android.billingclient.api.Purchase): NitroPurchase {
        // Create NitroPurchase with constructor parameters
        // Note: productId is the actual product identifier, id is the transaction/order ID
        val productId = purchase.products.firstOrNull() ?: ""
        return NitroPurchase(
            purchase.orderId ?: productId,     // id (transaction ID)
            productId,                          // productId (actual product ID)
            purchase.orderId,                   // transactionId
            purchase.purchaseTime.toDouble(),   // transactionDate
            purchase.originalJson,              // transactionReceipt
            DEVICE_PLATFORM,                    // platform
            purchase.purchaseToken,             // purchaseToken (Android only)
            purchase.originalJson               // dataAndroid (Android only)
        )
    }
    
    
    private fun createErrorData(billingResult: BillingResult): NitroPurchaseError {
        return NitroPurchaseError(
            mapBillingErrorCode(billingResult.responseCode),      // code
            getBillingErrorMessage(billingResult.responseCode),   // message
            null                                                   // productId
        )
    }
    
    private fun getBillingErrorMessage(responseCode: Int): String {
        return when (responseCode) {
            BillingClient.BillingResponseCode.OK -> "Success"
            BillingClient.BillingResponseCode.USER_CANCELED -> "User cancelled the purchase"
            BillingClient.BillingResponseCode.SERVICE_UNAVAILABLE -> "Service unavailable"
            BillingClient.BillingResponseCode.BILLING_UNAVAILABLE -> "Billing unavailable"
            BillingClient.BillingResponseCode.ITEM_UNAVAILABLE -> "Item unavailable"
            BillingClient.BillingResponseCode.DEVELOPER_ERROR -> "Developer error"
            BillingClient.BillingResponseCode.ERROR -> "Fatal error during the API action"
            BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED -> "Item already owned"
            BillingClient.BillingResponseCode.ITEM_NOT_OWNED -> "Item not owned"
            BillingClient.BillingResponseCode.SERVICE_DISCONNECTED -> "Service disconnected"
            BillingClient.BillingResponseCode.FEATURE_NOT_SUPPORTED -> "Feature not supported"
            BillingClient.BillingResponseCode.NETWORK_ERROR -> "Network error"
            else -> "Unknown error"
        }
    }
    
    private fun mapBillingErrorCode(responseCode: Int): String {
        return when (responseCode) {
            BillingClient.BillingResponseCode.USER_CANCELED -> "E_USER_CANCELLED"
            BillingClient.BillingResponseCode.SERVICE_UNAVAILABLE -> "E_SERVICE_ERROR"
            BillingClient.BillingResponseCode.BILLING_UNAVAILABLE -> "E_IAP_NOT_AVAILABLE"
            BillingClient.BillingResponseCode.ITEM_UNAVAILABLE -> "E_ITEM_UNAVAILABLE"
            BillingClient.BillingResponseCode.DEVELOPER_ERROR -> "E_DEVELOPER_ERROR"
            BillingClient.BillingResponseCode.ERROR -> "E_UNKNOWN"
            BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED -> "E_ALREADY_OWNED"
            BillingClient.BillingResponseCode.ITEM_NOT_OWNED -> "E_USER_ERROR"
            BillingClient.BillingResponseCode.SERVICE_DISCONNECTED -> "E_CONNECTION_CLOSED"
            BillingClient.BillingResponseCode.FEATURE_NOT_SUPPORTED -> "E_SERVICE_ERROR"
            BillingClient.BillingResponseCode.NETWORK_ERROR -> "E_NETWORK_ERROR"
            else -> "E_UNKNOWN"
        }
    }
    
    override fun getStorefront(): Promise<String> {
        return Promise.async {
            // Android doesn't have a direct equivalent to iOS storefront
            // Return the country code from locale or "UNKNOWN"
            try {
                val locale = java.util.Locale.getDefault()
                locale.country.ifEmpty { "UNKNOWN" }
            } catch (e: Exception) {
                "UNKNOWN"
            }
        }
    }
    
    protected fun finalize() {
        scope.cancel()
        billingClient?.endConnection()
    }
}