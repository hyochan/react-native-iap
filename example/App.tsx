/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect, useState } from 'react';
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NitroModules } from 'react-native-nitro-modules';
import RnIap from 'react-native-iap';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [greeting, setGreeting] = useState<string>('');
  const [iap, setIap] = useState<typeof RnIap | null>(null);

  useEffect(() => {
    // Initialize IAP module
    try {
      const iapModule = NitroModules.createHybridObject<RnIap>('RnIap');
      setIap(iapModule);
      console.log('IAP module initialized');
    } catch (error) {
      console.error('Failed to initialize IAP module:', error);
    }
  }, []);

  const handleHello = () => {
    if (iap) {
      try {
        const result = iap.hello('React Native IAP');
        setGreeting(result);
        console.log('Hello result:', result);
      } catch (error) {
        console.error('Error calling hello:', error);
      }
    }
  };

  const handleInitConnection = async () => {
    if (iap) {
      try {
        const result = await iap.initConnection();
        console.log('Connection initialized:', result);
      } catch (error) {
        console.error('Error initializing connection:', error);
      }
    }
  };

  const handleGetPlatform = () => {
    if (iap) {
      try {
        const platform = iap.getPlatform();
        console.log('Platform:', platform);
        setGreeting(`Platform: ${platform}`);
      } catch (error) {
        console.error('Error getting platform:', error);
      }
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={styles.container}>
        <Text style={styles.title}>React Native IAP</Text>
        <Text style={styles.subtitle}>Nitro Module Example</Text>

        {greeting ? <Text style={styles.greeting}>{greeting}</Text> : null}

        <TouchableOpacity style={styles.button} onPress={handleHello}>
          <Text style={styles.buttonText}>Test Hello</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleGetPlatform}>
          <Text style={styles.buttonText}>Get Platform</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleInitConnection}>
          <Text style={styles.buttonText}>Init Connection</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaProvider>
  );
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
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default App;
