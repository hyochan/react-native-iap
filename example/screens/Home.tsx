import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation';

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Home'
>;

type Props = {
  navigation: HomeScreenNavigationProp;
};

const Home: React.FC<Props> = ({navigation}) => {
  const menuItems = [
    {
      title: 'Purchase Flow',
      subtitle: 'Test in-app purchases',
      route: 'PurchaseFlow' as keyof RootStackParamList,
      enabled: true,
    },
    {
      title: 'Subscription Flow',
      subtitle: 'Test subscription purchases with useIAP hook',
      route: 'SubscriptionFlow' as keyof RootStackParamList,
      enabled: true,
    },
    {
      title: 'Available Purchases',
      subtitle: 'View and manage your purchases',
      route: 'AvailablePurchases' as keyof RootStackParamList,
      enabled: true,
    },
    {
      title: 'Offer Code',
      subtitle: 'Redeem promotional offers',
      route: 'OfferCode' as keyof RootStackParamList,
      enabled: true,
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>React Native IAP</Text>
        <Text style={styles.headerSubtitle}>Powered by Nitro Modules ⚡️</Text>
      </View>

      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.menuItem, !item.enabled && styles.menuItemDisabled]}
            onPress={() => {
              if (item.enabled) {
                navigation.navigate(item.route as keyof RootStackParamList);
              }
            }}
            disabled={!item.enabled}
          >
            <View style={styles.menuItemContent}>
              <Text
                style={[
                  styles.menuItemTitle,
                  !item.enabled && styles.menuItemTitleDisabled,
                ]}
              >
                {item.title}
              </Text>
              <Text
                style={[
                  styles.menuItemSubtitle,
                  !item.enabled && styles.menuItemSubtitleDisabled,
                ]}
              >
                {item.subtitle}
              </Text>
            </View>
            {!item.enabled && (
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Coming Soon</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Example app for react-native-iap with Nitro Modules
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  menuContainer: {
    padding: 16,
  },
  menuItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItemDisabled: {
    opacity: 0.6,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  menuItemTitleDisabled: {
    color: '#999',
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  menuItemSubtitleDisabled: {
    color: '#bbb',
  },
  comingSoonBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  comingSoonText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});

export default Home;
