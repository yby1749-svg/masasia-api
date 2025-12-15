import {create} from 'zustand';
import {providersApi} from '@api';
import type {WeeklySchedule, DaySchedule} from '@types';

const defaultDaySchedule: DaySchedule = {
  isAvailable: false,
  slots: [],
};

const defaultSchedule: WeeklySchedule = {
  monday: defaultDaySchedule,
  tuesday: defaultDaySchedule,
  wednesday: defaultDaySchedule,
  thursday: defaultDaySchedule,
  friday: defaultDaySchedule,
  saturday: defaultDaySchedule,
  sunday: defaultDaySchedule,
};

interface AvailabilityState {
  weeklySchedule: WeeklySchedule;
  blockedDates: string[];
  isLoading: boolean;
  error: string | null;

  fetchAvailability: () => Promise<void>;
  updateAvailability: (schedule: WeeklySchedule) => Promise<void>;
  toggleDayAvailability: (day: keyof WeeklySchedule) => void;
  updateDaySlots: (
    day: keyof WeeklySchedule,
    slots: {start: string; end: string}[],
  ) => void;
  clearError: () => void;
}

export const useAvailabilityStore = create<AvailabilityState>((set, get) => ({
  weeklySchedule: defaultSchedule,
  blockedDates: [],
  isLoading: false,
  error: null,

  fetchAvailability: async () => {
    set({isLoading: true, error: null});
    try {
      const response = await providersApi.getAvailability();
      const apiData = response.data.data || {};
      // Merge API response with defaults to ensure all days exist
      const mergedSchedule: WeeklySchedule = {
        monday: apiData.monday || {...defaultDaySchedule, slots: []},
        tuesday: apiData.tuesday || {...defaultDaySchedule, slots: []},
        wednesday: apiData.wednesday || {...defaultDaySchedule, slots: []},
        thursday: apiData.thursday || {...defaultDaySchedule, slots: []},
        friday: apiData.friday || {...defaultDaySchedule, slots: []},
        saturday: apiData.saturday || {...defaultDaySchedule, slots: []},
        sunday: apiData.sunday || {...defaultDaySchedule, slots: []},
      };
      set({weeklySchedule: mergedSchedule, isLoading: false});
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch availability';
      set({error: message, isLoading: false});
    }
  },

  updateAvailability: async (schedule: WeeklySchedule) => {
    set({isLoading: true, error: null});
    try {
      const response = await providersApi.updateAvailability(schedule);
      const apiData = response.data.data || {};
      // Merge API response with defaults to ensure all days exist
      const mergedSchedule: WeeklySchedule = {
        monday: apiData.monday || {...defaultDaySchedule, slots: []},
        tuesday: apiData.tuesday || {...defaultDaySchedule, slots: []},
        wednesday: apiData.wednesday || {...defaultDaySchedule, slots: []},
        thursday: apiData.thursday || {...defaultDaySchedule, slots: []},
        friday: apiData.friday || {...defaultDaySchedule, slots: []},
        saturday: apiData.saturday || {...defaultDaySchedule, slots: []},
        sunday: apiData.sunday || {...defaultDaySchedule, slots: []},
      };
      set({weeklySchedule: mergedSchedule, isLoading: false});
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to update availability';
      set({error: message, isLoading: false});
      throw error;
    }
  },

  toggleDayAvailability: (day: keyof WeeklySchedule) => {
    const {weeklySchedule} = get();
    const currentDay = weeklySchedule[day] || defaultDaySchedule;

    set({
      weeklySchedule: {
        ...weeklySchedule,
        [day]: {
          ...currentDay,
          isAvailable: !currentDay.isAvailable,
          slots: !currentDay.isAvailable
            ? [{start: '09:00', end: '17:00'}]
            : [],
        },
      },
    });
  },

  updateDaySlots: (
    day: keyof WeeklySchedule,
    slots: {start: string; end: string}[],
  ) => {
    const {weeklySchedule} = get();

    set({
      weeklySchedule: {
        ...weeklySchedule,
        [day]: {
          ...weeklySchedule[day],
          slots,
        },
      },
    });
  },

  clearError: () => set({error: null}),
}));
