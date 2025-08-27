package com.margelo.nitro.iap

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = IapModule.NAME)
class IapModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    companion object {
        const val NAME = "IapModule"
        
        @JvmStatic
        var applicationContext: ReactApplicationContext? = null
    }
    
    init {
        // Store the React context for use by Nitro modules
        applicationContext = reactContext
    }
    
    override fun getName(): String {
        return NAME
    }
    
    @ReactMethod
    fun initializeModule() {
        // This method ensures the module is initialized
        // The context is already stored in the companion object
    }
}