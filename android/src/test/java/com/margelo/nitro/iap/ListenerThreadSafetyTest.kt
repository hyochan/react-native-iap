package com.margelo.nitro.iap

import org.junit.Test
import org.junit.Assert.*
import java.util.concurrent.CyclicBarrier
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicReference
import kotlin.concurrent.thread

/**
 * Thread safety tests for the synchronized + snapshot listener pattern
 * used in HybridRnIap to prevent ConcurrentModificationException.
 *
 * Addresses Issue #3150 where purchase events were silently lost
 * due to concurrent listener access.
 */
class ListenerThreadSafetyTest {

    @Test
    fun `concurrent add and snapshot iterate does not throw`() {
        val listeners = mutableListOf<(String) -> Unit>()
        val callCount = AtomicInteger(0)
        val errorRef = AtomicReference<Throwable?>(null)
        val iterations = 500
        val barrier = CyclicBarrier(2)

        val adder = thread {
            barrier.await()
            repeat(iterations) {
                synchronized(listeners) { listeners.add { callCount.incrementAndGet() } }
            }
        }

        val sender = thread {
            barrier.await()
            repeat(iterations) {
                val snapshot = synchronized(listeners) { ArrayList(listeners) }
                snapshot.forEach {
                    try {
                        it("event")
                    } catch (e: Throwable) {
                        errorRef.compareAndSet(null, e)
                    }
                }
            }
        }

        adder.join(5000)
        sender.join(5000)
        assertFalse("Adder thread did not finish", adder.isAlive)
        assertFalse("Sender thread did not finish", sender.isAlive)
        assertNull("Should not throw ConcurrentModificationException", errorRef.get())
    }

    @Test
    fun `concurrent add, remove, and iterate is safe`() {
        val listeners = mutableListOf<(String) -> Unit>()
        val errorRef = AtomicReference<Throwable?>(null)
        val barrier = CyclicBarrier(3)

        val adder = thread {
            barrier.await()
            repeat(200) {
                synchronized(listeners) { listeners.add { _ -> } }
            }
        }

        val remover = thread {
            barrier.await()
            repeat(200) {
                synchronized(listeners) {
                    if (listeners.isNotEmpty()) listeners.removeAt(0)
                }
            }
        }

        val sender = thread {
            barrier.await()
            repeat(200) {
                val snapshot = synchronized(listeners) { ArrayList(listeners) }
                snapshot.forEach {
                    try {
                        it("event")
                    } catch (e: Throwable) {
                        errorRef.compareAndSet(null, e)
                    }
                }
            }
        }

        adder.join(5000)
        remover.join(5000)
        sender.join(5000)
        assertFalse("Adder thread did not finish", adder.isAlive)
        assertFalse("Remover thread did not finish", remover.isAlive)
        assertFalse("Sender thread did not finish", sender.isAlive)
        assertNull("Concurrent access should be safe with snapshot pattern", errorRef.get())
    }

    @Test
    fun `snapshot delivers to all registered listeners`() {
        val listeners = mutableListOf<(String) -> Unit>()
        val results = mutableListOf<String>()

        synchronized(listeners) {
            listeners.add { results.add("listener1:$it") }
            listeners.add { results.add("listener2:$it") }
        }

        val snapshot = synchronized(listeners) { ArrayList(listeners) }
        snapshot.forEach { it("event") }

        assertEquals(2, results.size)
        assertTrue(results.contains("listener1:event"))
        assertTrue(results.contains("listener2:event"))
    }

    @Test
    fun `synchronized clear removes all listeners`() {
        val listeners = mutableListOf<(String) -> Unit>()
        synchronized(listeners) {
            listeners.add { _ -> }
            listeners.add { _ -> }
        }

        synchronized(listeners) { listeners.clear() }

        val snapshot = synchronized(listeners) { ArrayList(listeners) }
        assertTrue("Listeners should be empty after clear", snapshot.isEmpty())
    }

    @Test
    fun `snapshot is isolated from subsequent modifications`() {
        val listeners = mutableListOf<(String) -> Unit>()
        val results = mutableListOf<String>()

        synchronized(listeners) {
            listeners.add { results.add("original:$it") }
        }

        // Take snapshot before adding more listeners
        val snapshot = synchronized(listeners) { ArrayList(listeners) }

        // Add another listener after snapshot
        synchronized(listeners) {
            listeners.add { results.add("added-after:$it") }
        }

        // Only the original listener should be in the snapshot
        snapshot.forEach { it("event") }
        assertEquals(1, results.size)
        assertEquals("original:event", results[0])
    }
}
