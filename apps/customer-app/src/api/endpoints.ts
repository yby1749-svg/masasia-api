import {apiClient} from './client';
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  User,
  Provider,
  ProviderDetail,
  Service,
  Booking,
  BookingRequest,
  Review,
  Address,
  PaginatedResponse,
  PaymentIntent,
} from '@types';

// Auth
export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<{data: AuthResponse}>('/auth/login', data),

  register: (data: RegisterRequest) =>
    apiClient.post<{data: AuthResponse}>('/auth/register', data),

  refresh: (refreshToken: string) =>
    apiClient.post<{data: AuthResponse}>('/auth/refresh', {refreshToken}),

  verifyPhone: (code: string) => apiClient.post('/auth/verify-phone', {code}),

  resendVerification: () => apiClient.post('/auth/resend-verification'),

  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', {email}),

  resetPassword: (token: string, password: string) =>
    apiClient.post('/auth/reset-password', {token, password}),

  logout: () => apiClient.post('/auth/logout'),
};

// User
export const userApi = {
  getMe: () => apiClient.get<{data: User}>('/users/me'),

  updateMe: (data: Partial<User>) =>
    apiClient.patch<{data: User}>('/users/me', data),

  uploadAvatar: (formData: FormData) =>
    apiClient.post<{data: {avatarUrl: string}}>('/users/me/avatar', formData, {
      headers: {'Content-Type': 'multipart/form-data'},
    }),

  updateFcmToken: (fcmToken: string) =>
    apiClient.patch('/users/me/fcm-token', {fcmToken}),

  getAddresses: () => apiClient.get<{data: Address[]}>('/users/me/addresses'),

  addAddress: (data: Omit<Address, 'id' | 'userId' | 'createdAt'>) =>
    apiClient.post<{data: Address}>('/users/me/addresses', data),

  updateAddress: (id: string, data: Partial<Address>) =>
    apiClient.patch<{data: Address}>(`/users/me/addresses/${id}`, data),

  deleteAddress: (id: string) => apiClient.delete(`/users/me/addresses/${id}`),
};

// Services
export const servicesApi = {
  getServices: () => apiClient.get<{data: Service[]}>('/services'),
};

// Providers
export const providersApi = {
  getProviders: (params?: {
    serviceId?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
    minRating?: number;
    page?: number;
    limit?: number;
  }) => apiClient.get<PaginatedResponse<Provider>>('/providers', {params}),

  getProvider: (id: string) =>
    apiClient.get<{data: ProviderDetail}>(`/providers/${id}`),

  getProviderReviews: (id: string, params?: {page?: number; limit?: number}) =>
    apiClient.get<PaginatedResponse<Review>>(`/providers/${id}/reviews`, {
      params,
    }),

  getProviderAvailability: (id: string, date: string) =>
    apiClient.get<{
      data: {date: string; slots: {time: string; available: boolean}[]};
    }>(`/providers/${id}/availability`, {params: {date}}),
};

// Bookings
export const bookingsApi = {
  getBookings: (params?: {status?: string; page?: number; limit?: number}) =>
    apiClient.get<PaginatedResponse<Booking>>('/bookings', {params}),

  getBooking: (id: string) => apiClient.get<{data: Booking}>(`/bookings/${id}`),

  createBooking: (data: BookingRequest) =>
    apiClient.post<{data: Booking}>('/bookings', data),

  cancelBooking: (id: string, reason?: string) =>
    apiClient.post(`/bookings/${id}/cancel`, {reason}),

  hideBooking: (id: string) =>
    apiClient.delete(`/bookings/${id}/hide`),
};

// Payments
export const paymentsApi = {
  createIntent: (bookingId: string, amount: number, method?: string) =>
    apiClient.post<{data: PaymentIntent}>('/payments/intent', {
      bookingId,
      amount,
      description: `MASASIA Booking Payment${method ? ` (${method})` : ''}`,
    }),

  attachPayment: (intentId: string, paymentMethodId: string) =>
    apiClient.post<{data: PaymentIntent}>(
      `/payments/intent/${intentId}/attach`,
      {paymentMethodId},
    ),

  getPaymentStatus: (intentId: string) =>
    apiClient.get<{data: PaymentIntent}>(`/payments/intent/${intentId}/status`),
};

// Reviews
export const reviewsApi = {
  createReview: (data: {
    bookingId: string;
    targetId: string;
    rating: number;
    comment?: string;
  }) => apiClient.post<{data: Review}>('/reviews', data),
};

// Notifications
export const notificationsApi = {
  getNotifications: (params?: {unreadOnly?: boolean; limit?: number}) =>
    apiClient.get<{
      data: Array<{
        id: string;
        userId: string;
        type: string;
        title: string;
        body: string;
        data?: Record<string, unknown>;
        isRead: boolean;
        createdAt: string;
      }>;
    }>('/notifications', {params}),

  markAsRead: (notificationId: string) =>
    apiClient.patch(`/notifications/${notificationId}/read`),

  markAllAsRead: () => apiClient.patch('/notifications/read-all'),
};
