import {Platform, PermissionsAndroid} from 'react-native';
import {usersApi} from '@api';
import {useNotificationStore} from '@store/notificationStore';
import {useJobStore} from '@store/jobStore';
import type {Notification} from '@types';

// Lazy-loaded Firebase modules to prevent crashes when not configured
let messagingModule: typeof import('@react-native-firebase/messaging').default | null = null;
let firebaseAppModule: typeof import('@react-native-firebase/app').default | null = null;

// Safely get Firebase app module
function getFirebaseApp() {
  if (firebaseAppModule === null) {
    try {
      firebaseAppModule = require('@react-native-firebase/app').default;
    } catch {
      firebaseAppModule = null;
    }
  }
  return firebaseAppModule;
}

// Check if Firebase is configured
function isFirebaseConfigured(): boolean {
  try {
    const firebase = getFirebaseApp();
    return firebase && firebase.apps && firebase.apps.length > 0;
  } catch {
    return false;
  }
}

// Safely get Firebase messaging module
function getMessaging() {
  if (!isFirebaseConfigured()) {
    return null;
  }
  if (messagingModule === null) {
    try {
      messagingModule = require('@react-native-firebase/messaging').default;
    } catch {
      messagingModule = null;
    }
  }
  return messagingModule;
}

// Request permission for push notifications
export async function requestNotificationPermission(): Promise<boolean> {
  const messaging = getMessaging();
  if (!messaging) {
    console.log('[Push] Firebase not configured, skipping permission request');
    return false;
  }

  try {
    if (Platform.OS === 'ios') {
      const authStatus = await messaging().requestPermission();
      const {AuthorizationStatus} = require('@react-native-firebase/messaging');
      const enabled =
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL;
      console.log('[Push] iOS permission status:', authStatus, 'enabled:', enabled);
      return enabled;
    } else {
      // Android 13+ requires runtime permission
      const androidVersion = typeof Platform.Version === 'number'
        ? Platform.Version
        : parseInt(Platform.Version, 10);
      if (androidVersion >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        console.log('[Push] Android permission status:', granted);
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true;
    }
  } catch (error) {
    console.error('[Push] Permission request error:', error);
    return false;
  }
}

// Get FCM token and register with backend
export async function registerForPushNotifications(): Promise<string | null> {
  const messaging = getMessaging();
  if (!messaging) {
    console.log('[Push] Firebase not configured, skipping registration');
    return null;
  }

  try {
    // Request permission first
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.log('[Push] Permission denied');
      return null;
    }

    // Get FCM token
    const token = await messaging().getToken();
    console.log('[Push] FCM Token:', token);

    if (token) {
      // Save to store
      useNotificationStore.getState().setFcmToken(token);

      // Register with backend
      try {
        await usersApi.updateFcmToken(token);
        console.log('[Push] Token registered with backend');
      } catch (error) {
        console.error('[Push] Failed to register token with backend:', error);
      }
    }

    return token;
  } catch (error) {
    console.error('[Push] Failed to get FCM token:', error);
    return null;
  }
}

// Handle token refresh
export function setupTokenRefreshListener(): () => void {
  const messaging = getMessaging();
  if (!messaging) {
    return () => {};
  }

  const unsubscribe = messaging().onTokenRefresh(async (token: string) => {
    console.log('[Push] Token refreshed:', token);
    useNotificationStore.getState().setFcmToken(token);

    try {
      await usersApi.updateFcmToken(token);
      console.log('[Push] Refreshed token registered with backend');
    } catch (error) {
      console.error('[Push] Failed to register refreshed token:', error);
    }
  });

  return unsubscribe;
}

// Handle foreground messages
export function setupForegroundMessageListener(): () => void {
  const messaging = getMessaging();
  if (!messaging) {
    return () => {};
  }

  const unsubscribe = messaging().onMessage(
    async (remoteMessage: any) => {
      console.log('[Push] Foreground message:', remoteMessage);

      const {notification, data} = remoteMessage;

      if (notification) {
        // Create notification object
        const notificationObj: Notification = {
          id: remoteMessage.messageId || Date.now().toString(),
          userId: '',
          title: notification.title || 'New Notification',
          body: notification.body || '',
          type: (data?.type as Notification['type']) || 'system',
          data: data as Record<string, unknown>,
          isRead: false,
          createdAt: new Date().toISOString(),
        };

        // Add to notification store
        useNotificationStore.getState().addNotification(notificationObj);

        // Handle specific notification types
        handleNotificationAction(data);
      }
    },
  );

  return unsubscribe;
}

// Handle notification opened (app in background/quit)
export function setupNotificationOpenedListener(): () => void {
  const messaging = getMessaging();
  if (!messaging) {
    return () => {};
  }

  const unsubscribe = messaging().onNotificationOpenedApp(
    (remoteMessage: any) => {
      console.log('[Push] Notification opened app:', remoteMessage);
      handleNotificationAction(remoteMessage.data);
    },
  );

  return unsubscribe;
}

// Check if app was opened from notification (app was quit)
export async function getInitialNotification(): Promise<void> {
  const messaging = getMessaging();
  if (!messaging) {
    return;
  }

  const remoteMessage = await messaging().getInitialNotification();

  if (remoteMessage) {
    console.log('[Push] App opened from quit state via notification:', remoteMessage);
    handleNotificationAction(remoteMessage.data);
  }
}

// Handle notification actions based on type
function handleNotificationAction(
  data?: {[key: string]: string | object} | undefined,
): void {
  if (!data) return;

  const type = typeof data.type === 'string' ? data.type : undefined;
  const bookingId = typeof data.bookingId === 'string' ? data.bookingId : undefined;

  switch (type) {
    case 'booking':
    case 'new_booking':
      // Refresh pending jobs when new booking received
      console.log('[Push] New booking notification, refreshing jobs');
      useJobStore.getState().fetchPendingJobs();
      break;

    case 'booking_cancelled':
      // Refresh jobs when booking cancelled
      console.log('[Push] Booking cancelled, refreshing jobs');
      useJobStore.getState().fetchPendingJobs();
      useJobStore.getState().fetchTodayJobs();
      break;

    case 'booking_update':
      // Refresh specific booking
      if (bookingId) {
        console.log('[Push] Booking updated:', bookingId);
        useJobStore.getState().fetchTodayJobs();
      }
      break;

    case 'payout':
      // Payout status update
      console.log('[Push] Payout notification');
      break;

    default:
      console.log('[Push] Unknown notification type:', type);
  }
}

// Setup background message handler (must be called outside of component)
export function setupBackgroundMessageHandler(): void {
  if (!isFirebaseConfigured()) {
    console.log('[Push] Firebase not configured, skipping background handler setup');
    return;
  }

  const messaging = getMessaging();
  if (!messaging) {
    return;
  }

  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('[Push] Background message:', remoteMessage);

    // Handle background message silently
    // The notification will be shown by the system
    // We can update local state here if needed
  });
}

// Initialize all push notification listeners
export function initializePushNotifications(): () => void {
  console.log('[Push] Initializing push notifications');

  if (!isFirebaseConfigured()) {
    console.log('[Push] Firebase not configured, skipping initialization');
    return () => {};
  }

  // Setup all listeners
  const unsubscribeTokenRefresh = setupTokenRefreshListener();
  const unsubscribeForeground = setupForegroundMessageListener();
  const unsubscribeOpened = setupNotificationOpenedListener();

  // Check for initial notification
  getInitialNotification();

  // Return cleanup function
  return () => {
    unsubscribeTokenRefresh();
    unsubscribeForeground();
    unsubscribeOpened();
  };
}
