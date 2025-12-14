import Geolocation, {
  GeolocationResponse,
  GeolocationError,
} from '@react-native-community/geolocation';
import {Platform, AppState, AppStateStatus, PermissionsAndroid} from 'react-native';
import {providersApi} from '@api';
import {useStatusStore} from '@store/statusStore';

// Configuration
const LOCATION_CONFIG = {
  // High accuracy for during active jobs
  HIGH_ACCURACY: {
    enableHighAccuracy: true,
    timeout: 20000,
    maximumAge: 5000,
    distanceFilter: 10, // Update every 10 meters
    interval: 5000, // 5 seconds (Android)
    fastestInterval: 2500, // 2.5 seconds (Android)
  },
  // Lower accuracy for general online status
  LOW_ACCURACY: {
    enableHighAccuracy: false,
    timeout: 30000,
    maximumAge: 30000,
    distanceFilter: 50, // Update every 50 meters
    interval: 30000, // 30 seconds (Android)
    fastestInterval: 15000, // 15 seconds (Android)
  },
  // Throttle server updates
  MIN_UPDATE_INTERVAL: 10000, // 10 seconds minimum between server updates
  MIN_DISTANCE_CHANGE: 20, // 20 meters minimum before sending to server
};

interface LocationState {
  watchId: number | null;
  lastServerUpdate: number;
  lastLocation: {latitude: number; longitude: number} | null;
  isActiveJob: boolean;
  appState: AppStateStatus;
}

const state: LocationState = {
  watchId: null,
  lastServerUpdate: 0,
  lastLocation: null,
  isActiveJob: false,
  appState: AppState.currentState,
};

// Calculate distance between two points in meters
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Check if we should send update to server
function shouldUpdateServer(
  newLat: number,
  newLon: number,
): boolean {
  const now = Date.now();
  const timeSinceLastUpdate = now - state.lastServerUpdate;

  // Always update if it's been longer than minimum interval during active job
  if (state.isActiveJob && timeSinceLastUpdate > LOCATION_CONFIG.MIN_UPDATE_INTERVAL) {
    return true;
  }

  // Check distance change
  if (state.lastLocation) {
    const distance = calculateDistance(
      state.lastLocation.latitude,
      state.lastLocation.longitude,
      newLat,
      newLon,
    );

    // Update if moved significantly
    if (distance >= LOCATION_CONFIG.MIN_DISTANCE_CHANGE) {
      return true;
    }
  } else {
    // First location update
    return true;
  }

  // Throttle updates when not in active job
  return !state.isActiveJob && timeSinceLastUpdate > LOCATION_CONFIG.MIN_UPDATE_INTERVAL * 3;
}

// Handle location update
async function handleLocationUpdate(position: GeolocationResponse): Promise<void> {
  const {latitude, longitude} = position.coords;

  console.log('[BackgroundLocation] Position update:', {
    latitude,
    longitude,
    accuracy: position.coords.accuracy,
    isActiveJob: state.isActiveJob,
  });

  // Update store
  useStatusStore.getState().setCurrentLocation({latitude, longitude});

  // Check if we should send to server
  if (shouldUpdateServer(latitude, longitude)) {
    try {
      await providersApi.updateLocation(latitude, longitude);
      state.lastServerUpdate = Date.now();
      state.lastLocation = {latitude, longitude};
      console.log('[BackgroundLocation] Sent to server');
    } catch (error) {
      console.error('[BackgroundLocation] Failed to send to server:', error);
    }
  }
}

// Handle location error
function handleLocationError(error: GeolocationError): void {
  console.error('[BackgroundLocation] Error:', error.code, error.message);

  // Common error codes:
  // 1 - PERMISSION_DENIED
  // 2 - POSITION_UNAVAILABLE
  // 3 - TIMEOUT

  if (error.code === 1) {
    useStatusStore.getState().setLocationError('Location permission denied');
  } else if (error.code === 2) {
    useStatusStore.getState().setLocationError('Location unavailable');
  } else if (error.code === 3) {
    // Timeout - try again
    console.log('[BackgroundLocation] Timeout, will retry on next update');
  }
}

// Handle app state changes
function handleAppStateChange(nextAppState: AppStateStatus): void {
  console.log('[BackgroundLocation] App state changed:', state.appState, '->', nextAppState);

  if (
    state.appState.match(/inactive|background/) &&
    nextAppState === 'active'
  ) {
    // App has come to foreground
    console.log('[BackgroundLocation] App came to foreground');

    // Get immediate position update
    if (state.watchId !== null) {
      getCurrentPosition();
    }
  }

  state.appState = nextAppState;
}

// Request Android location permissions
async function requestAndroidLocationPermission(): Promise<boolean> {
  try {
    // First request foreground location permission
    const fineLocationGranted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message: 'Call MSG needs access to your location to show your position to customers.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      },
    );

    if (fineLocationGranted !== PermissionsAndroid.RESULTS.GRANTED) {
      console.log('[BackgroundLocation] Fine location permission denied');
      return false;
    }

    // For Android 10+ (API level 29+), request background location separately
    const androidVersion = typeof Platform.Version === 'number'
      ? Platform.Version
      : parseInt(Platform.Version, 10);

    if (androidVersion >= 29) {
      const backgroundGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
        {
          title: 'Background Location Permission',
          message:
            'Call MSG needs background location access to track your position during active service appointments, even when the app is in the background.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );

      if (backgroundGranted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.log('[BackgroundLocation] Background location permission denied');
        // Still allow foreground tracking
        return true;
      }
    }

    return true;
  } catch (error) {
    console.error('[BackgroundLocation] Permission request error:', error);
    return false;
  }
}

// Get current position once
export async function getCurrentPosition(): Promise<{latitude: number; longitude: number}> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      position => {
        const {latitude, longitude} = position.coords;
        useStatusStore.getState().setCurrentLocation({latitude, longitude});
        resolve({latitude, longitude});
      },
      error => {
        handleLocationError(error);
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      },
    );
  });
}

// Start background location tracking
export async function startBackgroundLocationTracking(isActiveJob: boolean = false): Promise<void> {
  console.log('[BackgroundLocation] Starting tracking, isActiveJob:', isActiveJob);

  // Stop any existing tracking
  stopBackgroundLocationTracking();

  state.isActiveJob = isActiveJob;

  // Request permissions based on platform
  if (Platform.OS === 'ios') {
    // Configure for 'always' authorization on iOS
    Geolocation.setRNConfiguration({
      skipPermissionRequests: false,
      authorizationLevel: 'always',
      enableBackgroundLocationUpdates: true,
      locationProvider: 'auto',
    });
    // Request authorization
    Geolocation.requestAuthorization(
      () => console.log('[BackgroundLocation] iOS authorization granted'),
      error => console.error('[BackgroundLocation] iOS authorization error:', error),
    );
  } else if (Platform.OS === 'android') {
    // Request Android permissions
    const hasPermission = await requestAndroidLocationPermission();
    if (!hasPermission) {
      console.log('[BackgroundLocation] Permission denied, not starting tracking');
      useStatusStore.getState().setLocationError('Location permission denied');
      return;
    }
  }

  // Configure based on whether we have an active job
  const config = isActiveJob
    ? LOCATION_CONFIG.HIGH_ACCURACY
    : LOCATION_CONFIG.LOW_ACCURACY;

  // Start watching position
  const watchId = Geolocation.watchPosition(
    handleLocationUpdate,
    handleLocationError,
    config,
  );

  state.watchId = watchId;

  // Listen for app state changes
  AppState.addEventListener('change', handleAppStateChange);

  console.log('[BackgroundLocation] Watch started with id:', watchId);
}

// Stop background location tracking
export function stopBackgroundLocationTracking(): void {
  console.log('[BackgroundLocation] Stopping tracking');

  if (state.watchId !== null) {
    Geolocation.clearWatch(state.watchId);
    state.watchId = null;
  }

  state.isActiveJob = false;
  state.lastLocation = null;
  state.lastServerUpdate = 0;
}

// Update tracking mode (e.g., when starting/ending a job)
export function setActiveJobMode(isActive: boolean): void {
  console.log('[BackgroundLocation] Setting active job mode:', isActive);

  if (state.watchId !== null && state.isActiveJob !== isActive) {
    // Restart tracking with new config
    startBackgroundLocationTracking(isActive);
  } else {
    state.isActiveJob = isActive;
  }
}

// Check if currently tracking
export function isTracking(): boolean {
  return state.watchId !== null;
}

// Export for use in services/index.ts
export const backgroundLocationService = {
  getCurrentPosition,
  startTracking: startBackgroundLocationTracking,
  stopTracking: stopBackgroundLocationTracking,
  setActiveJobMode,
  isTracking,
};
