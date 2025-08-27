package com.margelo.nitro.iap

import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class IapPackage : TurboReactPackage() {
    companion object {
        init {
            try {
                System.loadLibrary("iap")
            } catch (e: UnsatisfiedLinkError) {
                // Library might be loaded elsewhere
                android.util.Log.e("IapPackage", "Failed to load iap library", e)
            }
        }
    }
    
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
        return when (name) {
            IapModule.NAME -> IapModule(reactContext)
            else -> null
        }
    }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
        return ReactModuleInfoProvider {
            mapOf(
                IapModule.NAME to ReactModuleInfo(
                    IapModule.NAME,
                    IapModule::class.java.name,
                    false,  // canOverrideExistingModule
                    false,  // needsEagerInit
                    false,  // isCxxModule
                    false   // isTurboModule
                )
            )
        }
    }
}
