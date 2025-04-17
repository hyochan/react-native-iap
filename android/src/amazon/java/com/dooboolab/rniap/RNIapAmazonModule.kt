package com.dooboolab.rniap

import android.content.Intent
import android.net.Uri
import android.util.Log
import androidx.core.content.ContextCompat.startActivity
import com.amazon.device.drm.LicensingService
import com.amazon.device.drm.model.LicenseResponse
import com.amazon.device.iap.model.FulfillmentResult
import com.amazon.device.iap.model.ProrationMode
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.modules.core.DeviceEventManagerModule

@ReactModule(name = RNIapAmazonModule.TAG)
class RNIapAmazonModule(
    private val reactContext: ReactApplicationContext,
    private val purchasingService: PurchasingServiceProxy = PurchasingServiceProxyAmazonImpl(),
    private var eventSender: EventSender? = null,
) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = TAG

    @ReactMethod
    fun initConnection(promise: Promise) {
        if (RNIapActivityListener.amazonListener == null) {
            promise.safeReject(
                PromiseUtils.E_DEVELOPER_ERROR,
                Exception("RNIapActivityListener is not registered in your MainActivity.onCreate"),
            )
            return
        }
        if (eventSender == null) {
            eventSender =
                object : EventSender {
                    private val rctDeviceEventEmitter =
                        reactContext
                            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)

                    override fun sendEvent(
                        eventName: String,
                        params: WritableMap?,
                    ) {
                        rctDeviceEventEmitter
                            .emit(eventName, params)
                    }
                }
        }
        RNIapActivityListener.initListeners(eventSender, purchasingService)
        promise.resolve(true)
    }

    @ReactMethod
    fun verifyLicense(promise: Promise) {
        if (!BuildConfig.IS_AMAZON_DRM_ENABLED) {
            Log.d(TAG, "Amazon's DRM is disabled")
            promise.resolve("NOT_LICENSED")
            return
        }

        Log.d(TAG, "Amazon's DRM is enabled")
        try {
            LicensingService.verifyLicense(reactApplicationContext) { licenseResponse ->
                val status = licenseResponse.requestStatus.also {
                    Log.d(TAG, "LicenseResponse status: $it")
                }
                when (status) {
                    LicenseResponse.RequestStatus.LICENSED -> "LICENSED"
                    LicenseResponse.RequestStatus.NOT_LICENSED -> "NOT_LICENSED"
                    LicenseResponse.RequestStatus.EXPIRED -> "EXPIRED"
                    LicenseResponse.RequestStatus.ERROR_VERIFICATION -> "ERROR_VERIFICATION"
                    LicenseResponse.RequestStatus.ERROR_INVALID_LICENSING_KEYS -> "ERROR_INVALID_LICENSING_KEYS"
                    LicenseResponse.RequestStatus.UNKNOWN_ERROR -> "UNKNOWN_ERROR"
                    else -> null
                }?.let { promise.resolve(it) }
            }
        } catch (exception: Exception) {
            promise.reject("Error while attempting to check for License", exception)
        }
    }

    @ReactMethod
    fun endConnection(promise: Promise) {
        PromiseUtils.rejectAllPendingPromises()
        RNIapActivityListener.hasListener = false
        promise.resolve(true)
    }

    @ReactMethod
    fun getUser(promise: Promise) {
        val requestId = purchasingService.getUserData()
        PromiseUtils.addPromiseForKey(PROMISE_GET_USER_DATA, promise)
    }

    @ReactMethod
    fun flushFailedPurchasesCachedAsPending(promise: Promise) {
        // No-op
        promise.resolve(true)
    }

    @ReactMethod
    fun getItemsByType(
        type: String?,
        skuArr: ReadableArray,
        promise: Promise,
    ) {
        val productSkus: MutableSet<String> = HashSet()
        var ii = 0
        val skuSize = skuArr.size()
        while (ii < skuSize) {
            skuArr.getString(ii)?.let { sku ->
                productSkus.add(sku)
            }
            ii++
        }
        PromiseUtils.addPromiseForKey(PROMISE_GET_PRODUCT_DATA, promise)
        val requestId = purchasingService.getProductData(productSkus)
    }

    @ReactMethod
    fun getAvailableItems(promise: Promise) {
        PromiseUtils.addPromiseForKey(PROMISE_QUERY_AVAILABLE_ITEMS, promise)
        purchasingService.getPurchaseUpdates(true)
    }

    @ReactMethod
    fun buyItemByType(
        sku: String?,
        proration: String?,
        promise: Promise,
    ) {
        PromiseUtils.addPromiseForKey(PROMISE_BUY_ITEM, promise)
        val requestId = if (!proration.isNullOrEmpty()) {
            purchasingService.modifySubscription(
                sku,
                if (proration == "DEFERRED") ProrationMode.DEFERRED else ProrationMode.IMMEDIATE,
            )
        } else {
            purchasingService.purchase(sku)
        }
    }

    @ReactMethod
    fun acknowledgePurchase(
        token: String?,
        developerPayLoad: String?,
        promise: Promise,
    ) {
        purchasingService.notifyFulfillment(token, FulfillmentResult.FULFILLED)
        promise.resolve(true)
    }

    @ReactMethod
    fun consumeProduct(
        token: String?,
        developerPayLoad: String?,
        promise: Promise,
    ) {
        purchasingService.notifyFulfillment(token, FulfillmentResult.FULFILLED)
        promise.resolve(true)
    }

    private fun sendUnconsumedPurchases(promise: Promise) {
        PromiseUtils.addPromiseForKey(PROMISE_QUERY_PURCHASES, promise)
        purchasingService.getPurchaseUpdates(false)
    }

    /**
     * Redirects user to a screen where they can manage their subscriptions.
     * on Amazon devices it will use the system dialog whereas on Android devices that install the Amazon app store, it'll use the browser.
     * This based on provided parameter `isAmazonDevice`
     * From https://amazon.developer.forums.answerhub.com/questions/175720/how-to-open-store-subscription-screen-directly-use.html?childToView=179402#answer-179402
     */
    @ReactMethod
    fun deepLinkToSubscriptions(
        isAmazonDevice: Boolean,
        promise: Promise,
    ) {
        if (isAmazonDevice) {
            val intent =
                Intent("android.intent.action.VIEW", Uri.parse("amzn://apps/library/subscriptions"))
            startActivity(reactContext, intent, null)
        } else {
            val uri =
                Uri.parse("https://www.amazon.com/gp/mas/your-account/myapps/yoursubscriptions/ref=mas_ya_subs")
            val launchIntent = Intent(Intent.ACTION_VIEW, uri)
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            startActivity(reactContext, launchIntent, null)
        }
        promise.resolve(true)
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

    companion object {
        const val PROMISE_BUY_ITEM = "PROMISE_BUY_ITEM"
        const val PROMISE_GET_PRODUCT_DATA = "PROMISE_GET_PRODUCT_DATA"
        const val PROMISE_QUERY_PURCHASES = "PROMISE_QUERY_PURCHASES"
        const val PROMISE_QUERY_AVAILABLE_ITEMS = "PROMISE_QUERY_AVAILABLE_ITEMS"
        const val PROMISE_GET_USER_DATA = "PROMISE_GET_USER_DATA"

        const val TAG = "RNIapAmazonModule"
    }

    init {
        val lifecycleEventListener: LifecycleEventListener =
            object : LifecycleEventListener {
                /**
                 * From https://developer.amazon.com/docs/in-app-purchasing/iap-implement-iap.html#getpurchaseupdates-responses
                 * We should fetch updates on resume
                 */
                override fun onHostResume() {
                    if (RNIapActivityListener.hasListener) {
                        purchasingService.getUserData()
                        purchasingService.getPurchaseUpdates(false)
                    }
                }

                override fun onHostPause() {}

                override fun onHostDestroy() {
                }
            }
        reactContext.addLifecycleEventListener(lifecycleEventListener)
    }
}
