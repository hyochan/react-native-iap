import {Stack} from 'expo-router';
import {DataModalProvider} from '../contexts/DataModalContext';

export default function RootLayout() {
  return (
    <DataModalProvider>
      <Stack>
        <Stack.Screen
          name="index"
          options={{title: 'React Native IAP Examples'}}
        />
        <Stack.Screen
          name="purchase-flow"
          options={{title: 'In-App Purchase Flow'}}
        />
        <Stack.Screen
          name="subscription-flow"
          options={{title: 'Subscription Flow'}}
        />
        <Stack.Screen
          name="available-purchases"
          options={{title: 'Available Purchases'}}
        />
        <Stack.Screen name="offer-code" options={{title: 'Offer Code'}} />
      </Stack>
    </DataModalProvider>
  );
}
