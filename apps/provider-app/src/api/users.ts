import {apiClient} from './client';

export const usersApi = {
  // Update FCM token for push notifications
  updateFcmToken: (fcmToken: string) =>
    apiClient.patch<{data: {success: boolean}}>('/users/me/fcm-token', {
      fcmToken,
    }),

  // Get user profile
  getProfile: () =>
    apiClient.get<{
      data: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        phone: string;
        avatarUrl?: string;
        role: 'CUSTOMER' | 'PROVIDER' | 'ADMIN' | 'SHOP_OWNER';
      };
    }>('/users/me'),

  // Update user profile
  updateProfile: (data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  }) => apiClient.patch<{data: unknown}>('/users/me', data),
};
