package com.margelo.nitro.iap

import android.util.Log
import org.json.JSONArray
import org.json.JSONObject

internal object RnIapLog {
    private const val TAG = "RnIap"

    fun payload(name: String, payload: Any?) {
        debug("$name payload: ${stringify(payload)}")
    }

    fun result(name: String, value: Any?) {
        debug("$name result: ${stringify(value)}")
    }

    fun failure(name: String, error: Throwable) {
        Log.e(TAG, "$name failed: ${error.localizedMessage}", error)
    }

    fun debug(message: String) {
        Log.d(TAG, message)
    }

    fun warn(message: String) {
        Log.w(TAG, message)
    }

    private fun stringify(value: Any?): String {
        val sanitized = sanitize(value) ?: return "null"
        return when (sanitized) {
            is String -> sanitized
            is Number, is Boolean -> sanitized.toString()
            is Map<*, *> -> JSONObject(sanitized).toString()
            is List<*> -> JSONArray(sanitized).toString()
            is Array<*> -> JSONArray(sanitized).toString()
            else -> sanitized.toString()
        }
    }

    private fun sanitize(value: Any?): Any? {
        if (value == null) return null
        return when (value) {
            is Map<*, *> -> sanitizeMap(value)
            is List<*> -> value.mapNotNull { sanitize(it) }
            is Array<*> -> value.mapNotNull { sanitize(it) }
            else -> value
        }
    }

    private fun sanitizeMap(source: Map<*, *>): Map<String, Any?> {
        val sanitized = linkedMapOf<String, Any?>()
        for ((rawKey, rawValue) in source) {
            val key = rawKey as? String ?: continue
            if (key.lowercase().contains("token")) {
                sanitized[key] = "hidden"
                continue
            }
            sanitized[key] = sanitize(rawValue)
        }
        return sanitized
    }
}
