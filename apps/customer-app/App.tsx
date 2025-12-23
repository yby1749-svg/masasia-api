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
import {socketService} from '@services/socket';
import {configureGoogleSignIn} from './src/services/googleAuth';

// Configure Google Sign-In
configureGoogleSignIn();

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
  const {setNotifications, addNotification} = useNotificationStore();

  // Connect to socket and listen for notifications when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // Connect to socket
      socketService.connect();

      // Listen for real-time notifications
      socketService.onNotification((notification) => {
        // Create a notification object from socket data
        const notificationItem = {
          id: notification.data?.id || `socket-${Date.now()}`,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          data: notification.data,
          isRead: false,
          createdAt: new Date().toISOString(),
        };
        addNotification(notificationItem);
      });
    }

    return () => {
      if (isAuthenticated) {
        socketService.offNotification();
      }
    };
  }, [isAuthenticated, addNotification]);

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
