import React from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import AppNavigator from './navigation';
import {DataModalProvider} from './src/contexts/DataModalContext';

// Enable debug logging for library development only
(global as any).RN_IAP_DEV_MODE = true;

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <DataModalProvider>
        <AppNavigator />
      </DataModalProvider>
    </SafeAreaProvider>
  );
}

export default App;
