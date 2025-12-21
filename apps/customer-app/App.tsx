import React, {useEffect} from 'react';
import {StatusBar} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

import {RootNavigator} from '@navigation/RootNavigator';
import {toastConfig} from '@config/toast';
import {useAuthStore} from '@store/authStore';
import {useNotificationStore} from '@store/notificationStore';
import {notificationsApi} from '@api';

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
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

function AppContent(): React.JSX.Element {
  const {isAuthenticated} = useAuthStore();
  const {setNotifications} = useNotificationStore();

  // Fetch notifications when authenticated
  useEffect(() => {
    const fetchNotifications = async () => {
      if (isAuthenticated) {
        try {
          const response = await notificationsApi.getNotifications({limit: 50});
          if (response.data.data) {
            setNotifications(response.data.data);
          }
        } catch (error) {
          console.log('[App] Failed to fetch notifications:', error);
        }
      }
    };
    fetchNotifications();
  }, [isAuthenticated, setNotifications]);

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
