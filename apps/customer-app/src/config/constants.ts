import Config from 'react-native-config';

export const API_URL = Config.API_URL || 'http://192.168.254.156:3000/api/v1';
export const SOCKET_URL = Config.SOCKET_URL || 'http://192.168.254.156:3000';
export const GOOGLE_MAPS_API_KEY = Config.GOOGLE_MAPS_API_KEY || '';

export const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry
export const LOCATION_UPDATE_INTERVAL = 30 * 1000; // 30 seconds

export const BOOKING_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PROVIDER_ASSIGNED: 'PROVIDER_ASSIGNED',
  PROVIDER_EN_ROUTE: 'PROVIDER_EN_ROUTE',
  PROVIDER_ARRIVED: 'PROVIDER_ARRIVED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;

export const SERVICE_DURATIONS = [90, 120] as const;

export const MIN_PAYOUT_AMOUNT = 500;
