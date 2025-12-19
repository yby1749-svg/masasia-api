import {create} from 'zustand';
import type {Notification} from '@types';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  fcmToken: string | null;

  setFcmToken: (token: string) => void;
  addNotification: (notification: Notification) => void;
  setNotifications: (notifications: Notification[]) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>((set, _get) => ({
  notifications: [],
  unreadCount: 0,
  fcmToken: null,

  setFcmToken: token => set({fcmToken: token}),

  addNotification: notification =>
    set(state => ({
      notifications: [notification, ...state.notifications],
      unreadCount: notification.isRead
        ? state.unreadCount
        : state.unreadCount + 1,
    })),

  setNotifications: notifications =>
    set({
      notifications,
      unreadCount: notifications.filter(n => !n.isRead).length,
    }),

  markAsRead: id =>
    set(state => ({
      notifications: state.notifications.map(n =>
        n.id === id ? {...n, isRead: true} : n,
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),

  markAllAsRead: () =>
    set(state => ({
      notifications: state.notifications.map(n => ({...n, isRead: true})),
      unreadCount: 0,
    })),

  clearNotifications: () =>
    set({
      notifications: [],
      unreadCount: 0,
    }),
}));
