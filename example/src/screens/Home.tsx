import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { getStorefrontIOS } from '../../../src';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

/**
 * Example App Landing Page
 *
 * Navigation to focused purchase flow implementations.
 * This demonstrates TypeScript-first, platform-agnostic approaches to in-app purchases.
 */
export default function Home() {
  const navigation = useNavigation<NavigationProp>();
  const [storefront, setStorefront] = useState<string | null>(null);

  useEffect(() => {
    // Only call getStorefrontIOS on iOS
    if (Platform.OS === 'ios') {
      getStorefrontIOS()
        .then(result => {
          setStorefront(result);
        })
        .catch(error => {
          // Silently fail on non-iOS platforms
          console.log('Storefront not available:', error.message);
        });
    }
  }, []);

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>expo-iap Examples</Text>
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
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => navigation.navigate('PurchaseFlow')}
        >
          <Text style={styles.buttonText}>🛒 In-App Purchase Flow</Text>
          <Text style={styles.buttonSubtext}>One-time products</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => navigation.navigate('SubscriptionFlow')}
        >
          <Text style={styles.buttonText}>🔄 Subscription Flow</Text>
          <Text style={styles.buttonSubtext}>Recurring subscriptions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.quaternaryButton]}
          onPress={() => navigation.navigate('AvailablePurchases')}
        >
          <Text style={styles.buttonText}>📦 Available Purchases</Text>
          <Text style={styles.buttonSubtext}>View past purchases</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.tertiaryButton]}
          onPress={() => navigation.navigate('OfferCode')}
        >
          <Text style={styles.buttonText}>🎁 Offer Code Redemption</Text>
          <Text style={styles.buttonSubtext}>Redeem promo codes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.debugButton]}
          onPress={() => navigation.navigate('Debug')}
        >
          <Text style={styles.buttonText}>🐛 Debug</Text>
          <Text style={styles.buttonSubtext}>Debug useIAP hook</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingVertical: 40,
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
  debugButton: {
    backgroundColor: '#ff6b6b',
  },
});
