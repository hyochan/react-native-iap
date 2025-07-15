package com.dooboolab.rniap

import android.util.Log
import com.facebook.react.bridge.Promise

/**
 * Extension functions used to simplify promise handling since we don't
 * want to crash in the case of it being resolved/rejected more than once
 */

const val TAG = "IapPromises"

fun Promise.safeResolve(value: Any?) {
    try {
        this.resolve(value)
    } catch (e: RuntimeException) {
        Log.d(TAG, "Already consumed ${e.message}")
    }
}

fun Promise.safeReject(message: String) = this.safeReject(message, null, null)

fun Promise.safeReject(
    code: String,
    message: String?,
) = this.safeReject(code, message, null)

fun Promise.safeReject(
    code: String,
    throwable: Throwable?,
) = this.safeReject(code, null, throwable)

fun Promise.safeReject(
    code: String,
    message: String?,
    throwable: Throwable?,
) {
    try {
        this.reject(code, message, throwable)
    } catch (e: RuntimeException) {
        Log.d(TAG, "Already consumed ${e.message}")
    }
}
