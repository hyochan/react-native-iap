package com.margelo.nitro.iap

import org.junit.Test
import org.junit.Assert.*

/**
 * Unit tests for OpenIapException to verify that error messages
 * are returned without Java/Kotlin stack traces.
 *
 * This addresses Issue #3075 where error.code was undefined because
 * stack traces were breaking JSON parsing on the JavaScript side.
 */
class OpenIapExceptionTest {

    @Test
    fun `test OpenIapException message returns clean JSON`() {
        val errorJson = """{"code":"init-connection","message":"Failed to initialize connection"}"""
        val exception = OpenIapException(errorJson)

        // Verify message is exactly the JSON string
        assertEquals(errorJson, exception.message)
    }

    @Test
    fun `test OpenIapException toString returns clean JSON without stack trace`() {
        val errorJson = """{"code":"user-cancelled","message":"User cancelled"}"""
        val exception = OpenIapException(errorJson)

        // toString() should return only the JSON, not "java.lang.Exception: ..."
        val result = exception.toString()
        assertEquals(errorJson, result)
        assertFalse(result.startsWith("java.lang.Exception:"))
        assertFalse(result.contains("\tat "))
    }

    @Test
    fun `test thrown OpenIapException message is clean`() {
        val errorJson = """{"code":"network-error","message":"Network error occurred","responseCode":-1}"""

        try {
            throw OpenIapException(errorJson)
        } catch (e: Exception) {
            // Verify the caught exception message is clean
            assertEquals(errorJson, e.message)
            assertEquals(errorJson, e.toString())
        }
    }

    @Test
    fun `test OpenIapException with complex JSON structure`() {
        val errorJson = """{"code":"purchase-error","message":"Purchase failed","responseCode":3,"debugMessage":"Item unavailable","productId":"com.test.product"}"""
        val exception = OpenIapException(errorJson)

        assertEquals(errorJson, exception.message)
        assertEquals(errorJson, exception.toString())
    }

    @Test
    fun `test multiple OpenIapException instances are independent`() {
        val error1 = """{"code":"error-1","message":"First error"}"""
        val error2 = """{"code":"error-2","message":"Second error"}"""

        val exception1 = OpenIapException(error1)
        val exception2 = OpenIapException(error2)

        assertEquals(error1, exception1.message)
        assertEquals(error2, exception2.message)
        assertNotEquals(exception1.message, exception2.message)
    }

    @Test
    fun `test OpenIapException with empty JSON`() {
        val errorJson = """{}"""
        val exception = OpenIapException(errorJson)

        assertEquals(errorJson, exception.message)
        assertEquals(errorJson, exception.toString())
    }

    @Test
    fun `test OpenIapException message does not contain stack trace keywords`() {
        val errorJson = """{"code":"test-error","message":"Test message"}"""
        val exception = OpenIapException(errorJson)

        val result = exception.toString()

        // Verify no stack trace keywords are present
        assertFalse("Should not contain 'at ' (stack trace)", result.contains("\tat "))
        assertFalse("Should not contain 'java.lang.Exception:'", result.contains("java.lang.Exception:"))
        assertFalse("Should not contain '.kt:' (Kotlin file reference)", result.contains(".kt:"))
        assertFalse("Should not contain '.java:' (Java file reference)", result.contains(".java:"))
    }
}
