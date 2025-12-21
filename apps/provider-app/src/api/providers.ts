import {apiClient} from './client';
import type {Provider, ProviderService, WeeklySchedule} from '@types';

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  photoUrl?: string;
  bio?: string;
  phone?: string;
}

export interface AddServiceRequest {
  serviceId: string;
  price60: number;
  price90?: number;
  price120?: number;
}

export const providersApi = {
  // Profile
  getProfile: () => apiClient.get<{data: Provider}>('/providers/me/profile'),

  updateProfile: (data: UpdateProfileRequest) =>
    apiClient.patch<{data: Provider}>('/providers/me/profile', data),

  uploadAvatar: (formData: FormData) =>
    apiClient.post<{data: {avatarUrl: string}}>(
      '/providers/me/avatar',
      formData,
      {
        headers: {'Content-Type': 'multipart/form-data'},
      },
    ),

  // Status & Location
  updateStatus: (isOnline: boolean) =>
    apiClient.patch<{data: {isOnline: boolean}}>('/providers/me/status', {
      isOnline,
    }),

  updateLocation: (latitude: number, longitude: number) =>
    apiClient.patch('/providers/me/location', {latitude, longitude}),

  // Services
  getServices: () =>
    apiClient.get<{data: ProviderService[]}>('/providers/me/services'),

  addService: (data: AddServiceRequest) =>
    apiClient.post<{data: ProviderService}>('/providers/me/services', data),

  updateService: (serviceId: string, data: Partial<AddServiceRequest>) =>
    apiClient.patch<{data: ProviderService}>(
      `/providers/me/services/${serviceId}`,
      data,
    ),

  removeService: (serviceId: string) =>
    apiClient.delete(`/providers/me/services/${serviceId}`),

  // Availability
  getAvailability: () =>
    apiClient.get<{data: WeeklySchedule}>('/providers/me/availability'),

  updateAvailability: (schedule: WeeklySchedule) =>
    apiClient.put<{data: WeeklySchedule}>(
      '/providers/me/availability',
      schedule,
    ),

  // All services (master list)
  getAllServices: () =>
    apiClient.get<{
      data: Array<{
        id: string;
        name: string;
        description: string;
        basePrice: number;
        baseDuration: number;
      }>;
    }>('/services'),

  // FCM Token
  updateFcmToken: (fcmToken: string) =>
    apiClient.patch('/providers/me/fcm-token', {fcmToken}),
};
