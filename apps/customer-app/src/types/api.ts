export interface User {
  id: string;
  email: string;
  phone?: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth?: string;
  role: 'CUSTOMER' | 'PROVIDER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyRelation?: string;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface Provider {
  id: string;
  userId: string;
  displayName: string;
  photoUrl?: string;
  bio?: string;
  rating: number;
  totalReviews: number;
  completedBookings: number;
  lastLatitude?: number;
  lastLongitude?: number;
  promotionBid?: number;
  user: {
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    gender?: string;
  };
  // Provider type info
  providerType?: 'shop' | 'independent';
  shopName?: string | null;
}

export interface ProviderDetail extends Provider {
  services: ProviderService[];
  serviceAreas: string[];
  lastLatitude?: number;
  lastLongitude?: number;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  category: string;
  basePrice60: number;
  basePrice90: number;
  basePrice120: number;
  iconUrl?: string;
  isActive: boolean;
}

export interface ProviderService {
  id: string;
  providerId: string;
  serviceId: string;
  price60: number;
  price90?: number;
  price120?: number;
  isActive: boolean;
  service: Service;
}

export interface Address {
  id: string;
  userId: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  notes?: string;
  isDefault: boolean;
  createdAt: string;
}

export interface Booking {
  id: string;
  bookingNumber: string;
  customerId: string;
  providerId?: string;
  serviceId: string;
  status: BookingStatus;
  scheduledAt: string;
  duration: 90 | 120;
  addressText: string;
  addressNotes?: string;
  latitude: number;
  longitude: number;
  serviceAmount: number;
  travelFee: number;
  discount: number;
  totalAmount: number;
  platformFee: number;
  providerEarning: number;
  customerNotes?: string;
  createdAt: string;
  acceptedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  provider?: Provider;
  service: Service;
  payment?: Payment;
  review?: Review;
}

export interface BookingRequest {
  providerId: string;
  serviceId: string;
  duration: 90 | 120;
  scheduledAt: string;
  addressText: string;
  addressNotes?: string;
  latitude: number;
  longitude: number;
  customerNotes?: string;
  paymentMethod: PaymentMethodType;
}

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROVIDER_ASSIGNED'
  | 'PROVIDER_EN_ROUTE'
  | 'PROVIDER_ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export type PaymentMethodType = 'CARD' | 'GCASH' | 'PAYMAYA' | 'CASH';

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  method: PaymentMethodType;
  status: PaymentStatus;
  paymongoIntentId?: string;
  paidAt?: string;
  checkoutUrl?: string;
}

export interface PaymentIntent {
  id: string;
  clientKey?: string;
  status: string;
  checkoutUrl?: string;
}

export interface Review {
  id: string;
  bookingId: string;
  authorId: string;
  targetId: string;
  rating: number;
  comment?: string;
  createdAt: string;
  author: {
    firstName: string;
    avatarUrl?: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}
