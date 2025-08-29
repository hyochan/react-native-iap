/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect, useState } from 'react'
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { initConnection, endConnection } from 'react-native-iap'

function App() {
  const isDarkMode = useColorScheme() === 'dark'
  const [greeting, setGreeting] = useState<string>('')
  const [connected, setConnected] = useState<boolean>(false)

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      endConnection().catch(console.error)
    }
  }, [])

  const handleInitConnection = async () => {
    try {
      const result = await initConnection()
      console.log('Connection initialized:', result)
      setConnected(result)
      setGreeting(result ? 'Connected!' : 'Failed to connect')
    } catch (error) {
      console.error('Error initializing connection:', error)
      setGreeting('Connection failed')
    }
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={styles.container}>
        <Text style={styles.title}>React Native IAP</Text>
        <Text style={styles.subtitle}>Nitro Module Example</Text>

        {greeting ? <Text style={styles.greeting}>{greeting}</Text> : null}

        {connected ? (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>✅ Connected</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.button, connected && styles.buttonConnected]}
          onPress={handleInitConnection}>
          <Text style={styles.buttonText}>
            {connected ? 'Connected' : 'Init Connection'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'gray',
    marginBottom: 30,
  },
  greeting: {
    fontSize: 18,
    marginBottom: 20,
    color: '#007AFF',
  },
  statusContainer: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  statusText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonConnected: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
})

export default App
