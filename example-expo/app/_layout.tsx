import {Stack} from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{title: 'Expo IAP Examples'}} />
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
  );
}
