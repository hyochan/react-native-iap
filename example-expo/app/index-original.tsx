import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Link } from 'expo-router'
import { getStorefrontIOS } from 'react-native-iap'

/**
 * Example App Landing Page
 *
 * Navigation to focused purchase flow implementations.
 * This demonstrates TypeScript-first, platform-agnostic approaches to in-app purchases.
 */
export default function Home() {
  const [storefront, setStorefront] = useState<string | null>(null)

  useEffect(() => {
    // getStorefrontIOS already handles platform checks internally
    getStorefrontIOS()
      .then((storefront: any) => {
        setStorefront(storefront)
      })
      .catch((error: any) => {
        // Silently fail on non-iOS platforms
        console.log('Storefront not available:', error.message)
      })
  }, [])

  return (
    <View style={styles.container}>
      <Text style={styles.title}>react-native-iap Examples</Text>
      <Text style={styles.subtitle}>
        Best Practice Implementations{' '}
        {storefront ? `(Store: ${storefront})` : ''}
      </Text>

      <Text style={styles.description}>
        These examples demonstrate TypeScript-first approaches to in-app
        purchases with:
        {'\n'}• Automatic type inference (no manual casting)
        {'\n'}• Platform-agnostic property access
        {'\n'}• Clean error handling with proper types
        {'\n'}• Focused implementations for each use case
        {'\n'}• CPK React Native compliant code style
      </Text>

      <View style={styles.buttonContainer}>
        <Link href="/purchase-flow" asChild>
          <TouchableOpacity style={[styles.button, styles.primaryButton]}>
            <Text style={styles.buttonText}>🛒 In-App Purchase Flow</Text>
            <Text style={styles.buttonSubtext}>One-time products</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/subscription-flow" asChild>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]}>
            <Text style={styles.buttonText}>🔄 Subscription Flow</Text>
            <Text style={styles.buttonSubtext}>Recurring subscriptions</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/available-purchases" asChild>
          <TouchableOpacity style={[styles.button, styles.quaternaryButton]}>
            <Text style={styles.buttonText}>📦 Available Purchases</Text>
            <Text style={styles.buttonSubtext}>View past purchases</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/offer-code" asChild>
          <TouchableOpacity style={[styles.button, styles.tertiaryButton]}>
            <Text style={styles.buttonText}>🎁 Offer Code Redemption</Text>
            <Text style={styles.buttonSubtext}>Redeem promo codes</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#28a745',
  },
  tertiaryButton: {
    backgroundColor: '#6c757d',
  },
  quaternaryButton: {
    backgroundColor: '#9c27b0',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  buttonSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
})
