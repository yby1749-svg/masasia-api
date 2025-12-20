import {create} from 'zustand';
import {bookingsApi} from '@api';
import type {Booking, BookingStatus} from '@types';

interface JobState {
  pendingJobs: Booking[];
  declinedJobIds: string[];
  activeJob: Booking | null;
  todayJobs: Booking[];
  isLoading: boolean;
  error: string | null;

  fetchPendingJobs: () => Promise<void>;
  fetchTodayJobs: () => Promise<void>;
  acceptJob: (bookingId: string) => Promise<Booking>;
  rejectJob: (bookingId: string, reason?: string) => Promise<void>;
  updateJobStatus: (bookingId: string, status: BookingStatus) => Promise<void>;
  setActiveJob: (job: Booking | null) => void;
  clearError: () => void;
}

export const useJobStore = create<JobState>((set, get) => ({
  pendingJobs: [],
  declinedJobIds: [],
  activeJob: null,
  todayJobs: [],
  isLoading: false,
  error: null,

  fetchPendingJobs: async () => {
    set({isLoading: true, error: null});
    try {
      const response = await bookingsApi.getPendingBookings();
      set({pendingJobs: response.data.data, isLoading: false});
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch jobs';
      set({error: message, isLoading: false});
    }
  },

  fetchTodayJobs: async () => {
    set({isLoading: true, error: null});
    try {
      const response = await bookingsApi.getTodayBookings();
      const jobs = response.data.data;
      set({todayJobs: jobs, isLoading: false});

      // Set active job if there's one in progress
      const activeJob = jobs.find(
        (job: Booking) =>
          job.status === 'PROVIDER_EN_ROUTE' ||
          job.status === 'PROVIDER_ARRIVED' ||
          job.status === 'IN_PROGRESS',
      );
      if (activeJob) {
        set({activeJob});
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch jobs';
      set({error: message, isLoading: false});
    }
  },

  acceptJob: async (bookingId: string) => {
    set({isLoading: true, error: null});
    try {
      const response = await bookingsApi.acceptBooking(bookingId);
      const acceptedJob = response.data.data;

      // Remove from pending, add to today if applicable
      set(state => ({
        pendingJobs: state.pendingJobs.filter(job => job.id !== bookingId),
        todayJobs: [...state.todayJobs, acceptedJob],
        isLoading: false,
      }));

      return acceptedJob;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to accept job';
      set({error: message, isLoading: false});
      throw error;
    }
  },

  rejectJob: async (bookingId: string, reason?: string) => {
    set({isLoading: true, error: null});
    try {
      await bookingsApi.rejectBooking(bookingId, reason);

      // Add to declined list (don't remove from pending yet - show as declined)
      set(state => ({
        declinedJobIds: [...state.declinedJobIds, bookingId],
        isLoading: false,
      }));

      // Remove from pending after 2 seconds
      setTimeout(() => {
        set(state => ({
          pendingJobs: state.pendingJobs.filter(job => job.id !== bookingId),
          declinedJobIds: state.declinedJobIds.filter(id => id !== bookingId),
        }));
      }, 2000);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to reject job';
      set({error: message, isLoading: false});
      throw error;
    }
  },

  updateJobStatus: async (bookingId: string, status: BookingStatus) => {
    set({isLoading: true, error: null});
    try {
      const validStatuses = [
        'PROVIDER_EN_ROUTE',
        'PROVIDER_ARRIVED',
        'IN_PROGRESS',
        'COMPLETED',
      ] as const;

      if (!validStatuses.includes(status as (typeof validStatuses)[number])) {
        throw new Error('Invalid status');
      }

      const response = await bookingsApi.updateStatus(
        bookingId,
        status as (typeof validStatuses)[number],
      );
      const updatedJob = response.data.data;

      // Update active job and today jobs
      set(state => ({
        activeJob: status === 'COMPLETED' ? null : updatedJob,
        todayJobs: state.todayJobs.map(job =>
          job.id === bookingId ? updatedJob : job,
        ),
        isLoading: false,
      }));

      // Refresh today's jobs if completed
      if (status === 'COMPLETED') {
        get().fetchTodayJobs();
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to update status';
      set({error: message, isLoading: false});
      throw error;
    }
  },

  setActiveJob: (job: Booking | null) => set({activeJob: job}),

  clearError: () => set({error: null}),
}));
