import {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  presentCodeRedemptionSheetIOS,
  useIAP,
} from 'react-native-iap';

/**
 * Offer Code Redemption Example
 * 
 * This example demonstrates how to implement offer code redemption
 * functionality for both iOS and Android platforms.
 */

// Platform-specific content helpers
const getPlatformContent = () => {
  const isIOS = Platform.OS === 'ios';
  return {
    buttonText: isIOS ? '🎁 Redeem Offer Code' : '🎁 Open Play Store',
    buttonSubtext: isIOS ? 'Enter code in-app' : 'Redeem in Play Store',
    howItWorks: isIOS
      ? '• Tap the button below to open the redemption sheet\n• Enter your offer code\n• The system will validate and apply the code\n• Your purchase will appear in purchase history'
      : '• Tap the button to open Google Play Store\n• Enter your promo code in the Play Store\n• Complete the redemption process\n• Return to this app to see your purchase',
    platformNote: isIOS
      ? 'iOS supports in-app code redemption via StoreKit'
      : 'Android requires redemption through Google Play Store',
    testingInfo: isIOS
      ? '• Use TestFlight or App Store Connect to generate test codes\n• Test on real devices (not simulators)\n• Sandbox environment supports offer codes'
      : '• Generate promo codes in Google Play Console\n• Test with your Google account\n• Ensure app is properly configured for IAP',
  };
};

export default function OfferCodeScreen() {
  const {connected} = useIAP();
  const [isRedeeming, setIsRedeeming] = useState(false);
  const platformContent = getPlatformContent();
  const isIOS = Platform.OS === 'ios';

  const handleRedeemCode = async () => {
    if (!connected) {
      Alert.alert('Not Connected', 'Please wait for store connection');
      return;
    }

    setIsRedeeming(true);

    try {
      if (isIOS) {
        // Present native iOS redemption sheet
        await presentCodeRedemptionSheetIOS();
        Alert.alert(
          'Redemption Sheet Presented',
          'After successful redemption, the purchase will appear in your purchase history.',
        );
      } else {
        // For Android, we need to guide users to the Play Store
        Alert.alert(
          'Android Offer Codes',
          'On Android, offer codes must be redeemed through the Google Play Store.\n\n' +
          'Steps:\n' +
          '1. Open Google Play Store\n' +
          '2. Tap profile icon → Payments & subscriptions\n' +
          '3. Select "Redeem code"\n' +
          '4. Enter your promo code\n' +
          '5. Return to this app',
          [
            {text: 'OK', style: 'default'},
          ]
        );
      }
    } catch (error) {
      console.error('Error redeeming code:', error);
      Alert.alert(
        'Error',
        `Failed to redeem code: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Offer Code Redemption</Text>
        
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>How it works:</Text>
          <Text style={styles.infoText}>{platformContent.howItWorks}</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.redeemButton,
            (!connected || isRedeeming) && styles.disabledButton,
            !isIOS && styles.androidButton,
          ]}
          onPress={handleRedeemCode}
          disabled={!connected || isRedeeming}
        >
          {isRedeeming ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Text style={styles.buttonText}>{platformContent.buttonText}</Text>
              <Text style={styles.buttonSubtext}>{platformContent.buttonSubtext}</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.platformNote}>
          <Text style={styles.noteTitle}>Platform: {isIOS ? 'iOS' : 'Android'}</Text>
          <Text style={styles.noteText}>{platformContent.platformNote}</Text>
        </View>

        <View style={styles.testingSection}>
          <Text style={styles.sectionTitle}>Testing Offer Codes</Text>
          <Text style={styles.testingText}>{platformContent.testingInfo}</Text>
        </View>

        <View style={styles.statusSection}>
          <Text style={styles.statusTitle}>Connection Status</Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusIndicator,
                connected ? styles.connected : styles.disconnected,
              ]}
            />
            <Text style={styles.statusText}>
              {connected ? 'Connected to Store' : 'Connecting...'}
            </Text>
          </View>
        </View>

        {!isIOS && (
          <View style={styles.androidNote}>
            <Text style={styles.androidNoteTitle}>⚠️ Android Note</Text>
            <Text style={styles.androidNoteText}>
              React Native IAP does not have a direct API for opening the Play Store redemption screen. 
              Users need to manually navigate to the Play Store to redeem their codes.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  infoCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  infoText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#555',
  },
  redeemButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  androidButton: {
    backgroundColor: '#4CAF50',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  buttonSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  platformNote: {
    backgroundColor: '#e9ecef',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#495057',
    textTransform: 'uppercase',
  },
  noteText: {
    fontSize: 14,
    color: '#6c757d',
  },
  testingSection: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  testingText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#555',
  },
  statusSection: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  connected: {
    backgroundColor: '#28a745',
  },
  disconnected: {
    backgroundColor: '#dc3545',
  },
  statusText: {
    fontSize: 14,
    color: '#555',
  },
  androidNote: {
    backgroundColor: '#fff3cd',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  androidNoteTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#856404',
  },
  androidNoteText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#856404',
  },
});