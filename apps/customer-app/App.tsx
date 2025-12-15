import React, {useEffect} from 'react';
import {StatusBar} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

import {RootNavigator} from '@navigation/RootNavigator';
import {toastConfig} from '@config/toast';
import {useAuthStore} from '@store/authStore';
import {
  registerForPushNotifications,
  initializePushNotifications,
  setupBackgroundMessageHandler,
} from './src/services';

// Set up background message handler (must be outside component)
setupBackgroundMessageHandler();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

function AppContent(): React.JSX.Element {
  const {isAuthenticated} = useAuthStore();

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (isAuthenticated) {
      // Register for push notifications when authenticated
      registerForPushNotifications();

      // Initialize notification listeners
      cleanup = initializePushNotifications();
    }

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [isAuthenticated]);

  return <RootNavigator />;
}

export default function App() {
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
