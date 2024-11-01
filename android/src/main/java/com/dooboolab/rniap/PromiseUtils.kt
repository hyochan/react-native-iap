package com.dooboolab.rniap

import com.facebook.react.bridge.Promise
import java.lang.Exception
import java.util.HashMap

object PromiseUtils {
    private val promises = HashMap<String, MutableList<Promise>>()

    fun addPromiseForKey(
        key: String,
        promise: Promise,
    ) {
        promises.getOrPut(key) { mutableListOf() }.add(promise)
    }

    fun resolvePromisesForKey(
        key: String,
        value: Any?,
    ) {
        promises[key]?.forEach { promise ->
            promise.safeResolve(value)
        }
        promises.remove(key)
    }

    fun rejectAllPendingPromises() {
        promises.flatMap { it.value }.forEach { promise ->
            promise.safeReject(E_CONNECTION_CLOSED, "Connection has been closed", null)
        }
        promises.clear()
    }

    fun rejectPromisesForKey(
        key: String,
        code: String,
        message: String?,
        err: Exception?,
    ) {
        promises[key]?.forEach { promise ->
            promise.safeReject(code, message, err)
        }
        promises.remove(key)
    }

    private const val TAG = "PromiseUtils"
    const val E_UNKNOWN = "E_UNKNOWN"
    const val E_NOT_PREPARED = "E_NOT_PREPARED"
    const val E_ALREADY_PREPARED = "E_ALREADY_PREPARED"
    const val E_PENDING = "E_PENDING"
    const val E_NOT_ENDED = "E_NOT_ENDED"
    const val E_USER_CANCELLED = "E_USER_CANCELLED"
    const val E_ITEM_UNAVAILABLE = "E_ITEM_UNAVAILABLE"
    const val E_NETWORK_ERROR = "E_NETWORK_ERROR"
    const val E_SERVICE_ERROR = "E_SERVICE_ERROR"
    const val E_ALREADY_OWNED = "E_ALREADY_OWNED"
    const val E_REMOTE_ERROR = "E_REMOTE_ERROR"
    const val E_USER_ERROR = "E_USER_ERROR"
    const val E_DEVELOPER_ERROR = "E_DEVELOPER_ERROR"
    const val E_BILLING_RESPONSE_JSON_PARSE_ERROR = "E_BILLING_RESPONSE_JSON_PARSE_ERROR"
    const val E_CONNECTION_CLOSED = "E_CONNECTION_CLOSED"
}
