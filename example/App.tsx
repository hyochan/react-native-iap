import React from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import AppNavigator from './navigation';

// Enable debug logging for library development only
(global as any).RN_IAP_DEV_MODE = true;

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}

export default App;
