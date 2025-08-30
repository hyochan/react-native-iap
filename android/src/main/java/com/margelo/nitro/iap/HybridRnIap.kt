package com.margelo.nitro.iap

import android.app.Activity
import android.content.Context
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
    
    // Get ReactApplicationContext lazily from NitroModules
    private val context: ReactApplicationContext by lazy {
        NitroModules.applicationContext as ReactApplicationContext
    }
    
    private var billingClient: BillingClient? = null
    
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
                val errorMsg = when (resultCode) {
                    ConnectionResult.SERVICE_MISSING -> "Google Play Services is missing on this device"
                    ConnectionResult.SERVICE_VERSION_UPDATE_REQUIRED -> "Google Play Services needs to be updated"
                    ConnectionResult.SERVICE_DISABLED -> "Google Play Services is disabled"
                    ConnectionResult.SERVICE_INVALID -> "Google Play Services is invalid"
                    else -> "Google Play Services is not available (error code: $resultCode)"
                }
                throw Exception(errorMsg)
            }
            
            withContext(Dispatchers.Main) {
                suspendCancellableCoroutine<Boolean> { continuation ->
                    // For Google Play Billing v8.0.0+, use PendingPurchasesParams
                    val pendingPurchasesParams = PendingPurchasesParams.newBuilder()
                        .enableOneTimeProducts()
                        .build()
                    
                    billingClient = BillingClient.newBuilder(context)
                        .setListener(this@HybridRnIap)
                        .enablePendingPurchases(pendingPurchasesParams)
                        .build()
                    
                    billingClient?.startConnection(object : BillingClientStateListener {
                        override fun onBillingSetupFinished(billingResult: BillingResult) {
                            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                                continuation.resume(true)
                            } else {
                                continuation.resumeWithException(
                                    Exception(getBillingErrorMessage(billingResult.responseCode))
                                )
                            }
                        }
                        
                        override fun onBillingServiceDisconnected() {
                            // Will try to reconnect on next operation
                        }
                    })
                }
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
    
    override val memorySize: Long
        get() = 0L
    
    // BillingClientStateListener implementation
    override fun onBillingSetupFinished(billingResult: BillingResult) {
        // Handled inline in initConnection
    }
    
    override fun onBillingServiceDisconnected() {
        // Try to restart the connection on the next request
        // For now, just log the disconnection
    }
    
    // PurchasesUpdatedListener implementation (required but not used yet)
    override fun onPurchasesUpdated(billingResult: BillingResult, purchases: List<Purchase>?) {
        // Will be implemented when purchase functionality is added
    }
    
    // Helper function for billing error messages
    private fun getBillingErrorMessage(responseCode: Int): String {
        return when (responseCode) {
            BillingClient.BillingResponseCode.OK -> "Success"
            BillingClient.BillingResponseCode.USER_CANCELED -> "User cancelled the purchase"
            BillingClient.BillingResponseCode.SERVICE_UNAVAILABLE -> "Billing service is currently unavailable"
            BillingClient.BillingResponseCode.BILLING_UNAVAILABLE -> "Billing is not available on this device"
            BillingClient.BillingResponseCode.ITEM_UNAVAILABLE -> "The requested product is not available"
            BillingClient.BillingResponseCode.DEVELOPER_ERROR -> "Developer error in the request"
            BillingClient.BillingResponseCode.ERROR -> "Fatal error during the API action"
            BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED -> "Product has already been purchased"
            BillingClient.BillingResponseCode.ITEM_NOT_OWNED -> "Product has not been purchased"
            BillingClient.BillingResponseCode.SERVICE_DISCONNECTED -> "Play Store service is disconnected"
            BillingClient.BillingResponseCode.FEATURE_NOT_SUPPORTED -> "Feature is not supported on this device"
            BillingClient.BillingResponseCode.NETWORK_ERROR -> "Network connection error"
            else -> "Unknown billing error (code: $responseCode)"
        }
    }
}