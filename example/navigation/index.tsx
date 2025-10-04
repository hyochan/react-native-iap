import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import Home from '../screens/Home';
import AllProducts from '../screens/AllProducts';
import PurchaseFlow from '../screens/PurchaseFlow';
import SubscriptionFlow from '../screens/SubscriptionFlow';
import AvailablePurchases from '../screens/AvailablePurchases';
import OfferCode from '../screens/OfferCode';
import AlternativeBilling from '../screens/AlternativeBilling';

export type RootStackParamList = {
  Home: undefined;
  AllProducts: undefined;
  PurchaseFlow: undefined;
  SubscriptionFlow: undefined;
  AvailablePurchases: undefined;
  OfferCode: undefined;
  AlternativeBilling: undefined;
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
          name="AllProducts"
          component={AllProducts}
          options={{title: 'All Products'}}
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
        <Stack.Screen
          name="AlternativeBilling"
          component={AlternativeBilling}
          options={{title: 'Alternative Billing'}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
