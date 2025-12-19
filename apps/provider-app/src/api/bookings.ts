import {apiClient} from './client';
import type {Booking} from '@types';

export interface BookingListParams {
  status?: string;
  page?: number;
  limit?: number;
}

export const bookingsApi = {
  // Get provider's bookings
  getBookings: (params?: BookingListParams) =>
    apiClient.get<{
      data: Booking[];
      meta: {total: number; page: number; limit: number};
    }>('/bookings', {params: {...params, role: 'provider'}}),

  // Get single booking
  getBooking: (bookingId: string) =>
    apiClient.get<{data: Booking}>(`/bookings/${bookingId}`),

  // Accept booking
  acceptBooking: (bookingId: string) =>
    apiClient.post<{data: Booking}>(`/bookings/${bookingId}/accept`),

  // Reject booking
  rejectBooking: (bookingId: string, reason?: string) =>
    apiClient.post<{data: Booking}>(`/bookings/${bookingId}/reject`, {reason}),

  // Update booking status
  updateStatus: (
    bookingId: string,
    status:
      | 'PROVIDER_EN_ROUTE'
      | 'PROVIDER_ARRIVED'
      | 'IN_PROGRESS'
      | 'COMPLETED',
  ) =>
    apiClient.patch<{data: Booking}>(`/bookings/${bookingId}/status`, {status}),

  // Get today's bookings
  getTodayBookings: () =>
    apiClient.get<{data: Booking[]}>('/bookings', {
      params: {
        role: 'provider',
        date: new Date().toISOString().split('T')[0],
      },
    }),

  // Get pending bookings (awaiting acceptance)
  getPendingBookings: () =>
    apiClient.get<{data: Booking[]}>('/bookings', {
      params: {
        role: 'provider',
        status: 'PENDING',
      },
    }),

  // Hide booking from history
  hideBooking: (bookingId: string) =>
    apiClient.delete(`/bookings/${bookingId}/hide`),
};
