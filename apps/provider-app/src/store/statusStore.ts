import {create} from 'zustand';
import {providersApi} from '@api';
import {
  backgroundLocationService,
  getCurrentPosition,
} from '@services/backgroundLocation';

interface StatusState {
  isOnline: boolean;
  currentLocation: {latitude: number; longitude: number} | null;
  isUpdating: boolean;
  error: string | null;

  goOnline: () => Promise<void>;
  goOffline: () => Promise<void>;
  startLocationTracking: (isActiveJob?: boolean) => void;
  stopLocationTracking: () => void;
  setActiveJobMode: (isActive: boolean) => void;
  updateLocation: () => Promise<void>;
  setCurrentLocation: (location: {latitude: number; longitude: number}) => void;
  setLocationError: (error: string) => void;
  clearError: () => void;
}

export const useStatusStore = create<StatusState>((set, get) => ({
  isOnline: false,
  currentLocation: null,
  isUpdating: false,
  error: null,

  goOnline: async () => {
    set({isUpdating: true, error: null});
    try {
      await providersApi.updateStatus(true);
      set({isOnline: true, isUpdating: false});

      // Start background location tracking
      get().startLocationTracking(false);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to go online';
      set({error: message, isUpdating: false});
      throw error;
    }
  },

  goOffline: async () => {
    set({isUpdating: true, error: null});
    try {
      await providersApi.updateStatus(false);
      set({isOnline: false, isUpdating: false});

      // Stop background location tracking
      get().stopLocationTracking();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to go offline';
      set({error: message, isUpdating: false});
      throw error;
    }
  },

  startLocationTracking: (isActiveJob: boolean = false) => {
    // Check if already tracking
    if (backgroundLocationService.isTracking()) {
      // Just update the mode if needed
      if (isActiveJob) {
        backgroundLocationService.setActiveJobMode(true);
      }
      return;
    }

    backgroundLocationService.startTracking(isActiveJob);
  },

  stopLocationTracking: () => {
    backgroundLocationService.stopTracking();
  },

  setActiveJobMode: (isActive: boolean) => {
    backgroundLocationService.setActiveJobMode(isActive);
  },

  updateLocation: async () => {
    try {
      const location = await getCurrentPosition();
      set({currentLocation: location});

      await providersApi.updateLocation(location.latitude, location.longitude);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to update location';
      set({error: message});
      throw error;
    }
  },

  setCurrentLocation: (location: {latitude: number; longitude: number}) => {
    set({currentLocation: location});
  },

  setLocationError: (error: string) => {
    set({error});
  },

  clearError: () => set({error: null}),
}));
