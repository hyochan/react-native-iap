import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import Home from '../screens/Home';
import PurchaseFlow from '../screens/PurchaseFlow';
import SubscriptionFlow from '../screens/SubscriptionFlow';
import AvailablePurchases from '../screens/AvailablePurchases';
import OfferCode from '../screens/OfferCode';

export type RootStackParamList = {
  Home: undefined;
  PurchaseFlow: undefined;
  SubscriptionFlow: undefined;
  AvailablePurchases: undefined;
  OfferCode: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen
          name="Home"
          component={Home}
          options={{title: 'react-native-iap'}}
        />
        <Stack.Screen
          name="PurchaseFlow"
          component={PurchaseFlow}
          options={{title: 'In-App Purchase Flow'}}
        />
        <Stack.Screen
          name="SubscriptionFlow"
          component={SubscriptionFlow}
          options={{title: 'Subscription Flow'}}
        />
        <Stack.Screen
          name="AvailablePurchases"
          component={AvailablePurchases}
          options={{title: 'Available Purchases'}}
        />
        <Stack.Screen
          name="OfferCode"
          component={OfferCode}
          options={{title: 'Offer Code Redemption'}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
