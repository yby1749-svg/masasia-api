import {create} from 'zustand';
import {notificationsApi} from '@api';
import type {Notification} from '@types';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  fcmToken: string | null;
  isLoading: boolean;

  setFcmToken: (token: string) => void;
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  fetchUnreadCount: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, _get) => ({
  notifications: [],
  unreadCount: 0,
  fcmToken: null,
  isLoading: false,

  setFcmToken: (token: string) => set({fcmToken: token}),

  fetchUnreadCount: async () => {
    try {
      const response = await notificationsApi.getUnreadCount();
      set({unreadCount: response.data.data.count});
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  },

  setNotifications: (notifications: Notification[]) =>
    set({
      notifications,
      unreadCount: notifications.filter(n => !n.isRead).length,
    }),

  addNotification: (notification: Notification) =>
    set(state => ({
      notifications: [notification, ...state.notifications],
      unreadCount: notification.isRead
        ? state.unreadCount
        : state.unreadCount + 1,
    })),

  markAsRead: (notificationId: string) =>
    set(state => ({
      notifications: state.notifications.map(n =>
        n.id === notificationId ? {...n, isRead: true} : n,
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),

  markAllAsRead: () =>
    set(state => ({
      notifications: state.notifications.map(n => ({...n, isRead: true})),
      unreadCount: 0,
    })),

  clearNotifications: () => set({notifications: [], unreadCount: 0}),
}));
