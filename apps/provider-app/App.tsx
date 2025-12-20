import React from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

import {RootNavigator} from './src/navigation';
import {toastConfig} from './src/config/toast';
import {useAuthStore} from './src/store';

// Firebase push notifications - uncomment after configuring Firebase
// import {
//   registerForPushNotifications,
//   initializePushNotifications,
//   setupBackgroundMessageHandler,
// } from './src/services';
// setupBackgroundMessageHandler();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function AppContent(): React.JSX.Element {
  const {isAuthenticated: _isAuthenticated} = useAuthStore();

  // Firebase push notifications - uncomment after configuring Firebase
  // useEffect(() => {
  //   let cleanup: (() => void) | undefined;
  //   if (isAuthenticated) {
  //     registerForPushNotifications();
  //     cleanup = initializePushNotifications();
  //   }
  //   return () => {
  //     if (cleanup) cleanup();
  //   };
  // }, [isAuthenticated]);

  return <RootNavigator />;
}

function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
          <AppContent />
          <Toast config={toastConfig} />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
