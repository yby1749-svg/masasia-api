import {create} from 'zustand';
import Geolocation from '@react-native-community/geolocation';
import {Platform, PermissionsAndroid} from 'react-native';

interface GeoPosition {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude: number | null;
    altitudeAccuracy: number | null;
    heading: number | null;
    speed: number | null;
  };
  timestamp: number;
}

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  permissionStatus: 'unknown' | 'granted' | 'denied';
  isLoading: boolean;
  error: string | null;

  requestPermission: () => Promise<boolean>;
  getCurrentLocation: () => Promise<{
    latitude: number;
    longitude: number;
  } | null>;
  watchLocation: () => void;
  stopWatching: () => void;
}

let watchId: number | null = null;

export const useLocationStore = create<LocationState>((set, _get) => ({
  latitude: null,
  longitude: null,
  accuracy: null,
  permissionStatus: 'unknown',
  isLoading: false,
  error: null,

  requestPermission: async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'MASASIA needs your location to find nearby providers',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
        set({permissionStatus: isGranted ? 'granted' : 'denied'});
        return isGranted;
      } catch {
        set({permissionStatus: 'denied'});
        return false;
      }
    } else {
      // iOS permissions are handled by react-native-permissions
      set({permissionStatus: 'granted'});
      return true;
    }
  },

  getCurrentLocation: async () => {
    set({isLoading: true, error: null});

    return new Promise(resolve => {
      Geolocation.getCurrentPosition(
        (position: GeoPosition) => {
          const {latitude, longitude, accuracy} = position.coords;
          set({
            latitude,
            longitude,
            accuracy,
            isLoading: false,
            permissionStatus: 'granted',
          });
          resolve({latitude, longitude});
        },
        error => {
          set({
            error: error.message,
            isLoading: false,
          });
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        },
      );
    });
  },

  watchLocation: () => {
    if (watchId !== null) {
      return;
    }

    watchId = Geolocation.watchPosition(
      (position: GeoPosition) => {
        const {latitude, longitude, accuracy} = position.coords;
        set({latitude, longitude, accuracy, error: null});
      },
      error => {
        set({error: error.message});
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 50,
      },
    );
  },

  stopWatching: () => {
    if (watchId !== null) {
      Geolocation.clearWatch(watchId);
      watchId = null;
    }
  },
}));
