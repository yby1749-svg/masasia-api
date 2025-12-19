// User & Provider Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'CUSTOMER' | 'PROVIDER' | 'ADMIN' | 'SHOP_OWNER';
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Provider {
  id: string;
  userId: string;
  displayName: string;
  bio?: string;
  rating: number;
  totalReviews: number;
  isOnline: boolean;
  isVerified: boolean;
  latitude?: number;
  longitude?: number;
  services?: ProviderService[];
  user?: User;
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  basePrice60: number;
  basePrice90?: number;
  basePrice120?: number;
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

// Booking Types
export interface Address {
  id: string;
  label: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  notes?: string;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
}

export interface Booking {
  id: string;
  customerId: string;
  providerId: string;
  serviceId: string;
  addressId: string;
  scheduledAt: string;
  duration: 90 | 120;
  status: BookingStatus;
  price: number;
  notes?: string;
  customer?: Customer;
  provider?: Provider;
  service?: Service;
  address?: Address;
  payment?: Payment;
  createdAt: string;
  updatedAt: string;
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

// Payment Types
export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  status: PaymentStatus;
  method: PaymentMethod;
  paymongoPaymentIntentId?: string;
  paidAt?: string;
  createdAt: string;
}

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type PaymentMethod = 'card' | 'gcash' | 'paymaya';

// Earnings Types
export interface Earning {
  id: string;
  providerId?: string;
  bookingId?: string;
  amount: number;
  platformFee?: number;
  shopFee?: number;
  netAmount: number;
  status?: 'pending' | 'available' | 'paid_out';
  booking?: {
    service?: {
      name: string;
    };
  };
  createdAt: string;
}

export interface EarningsSummary {
  today: number;
  thisWeek: number;
  thisMonth: number;
  pendingBalance: number;
  availableBalance: number;
  totalEarned: number;
  // Provider type and earnings breakdown
  providerType: 'shop' | 'independent';
  earningsPercentage: number; // 55% for shop, 92% for independent
  platformPercentage: number; // 8%
  shopPercentage: number; // 37% for shop, 0% for independent
  shopName?: string | null;
}

// Payout Types
export interface Payout {
  id: string;
  providerId: string;
  amount: number;
  status: PayoutStatus;
  method: 'bank_transfer' | 'gcash' | 'paymaya';
  accountDetails?: {
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    mobileNumber?: string;
  };
  processedAt?: string;
  createdAt: string;
}

export type PayoutStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

// Availability Types
export interface TimeSlot {
  start: string; // "09:00"
  end: string; // "17:00"
}

export interface DaySchedule {
  isAvailable: boolean;
  slots: TimeSlot[];
}

export interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'booking' | 'payment' | 'payout' | 'system';
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

// Review Types
export interface Review {
  id: string;
  bookingId: string;
  authorId: string;
  targetId: string;
  rating: number;
  comment?: string;
  reply?: string;
  repliedAt?: string;
  author: {
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  booking?: {
    service: {
      name: string;
    };
  };
  createdAt: string;
}

// Navigation Types
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type DashboardStackParamList = {
  JobDashboard: undefined;
  JobDetail: {bookingId: string};
  Navigation: {bookingId: string; destination: {lat: number; lng: number}};
};

export type ScheduleStackParamList = {
  Calendar: undefined;
  Availability: undefined;
  BlockedDates: undefined;
};

export type EarningsStackParamList = {
  Earnings: undefined;
  Wallet: undefined;
  PayoutRequest: undefined;
  PayoutDetail: {payoutId: string};
};

export type ProfileStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
  Services: undefined;
  Settings: undefined;
  Notifications: undefined;
  Reviews: undefined;
  MyShop: undefined;
  ShopInvitations: undefined;
};

export type MainTabParamList = {
  DashboardTab: undefined;
  ScheduleTab: undefined;
  EarningsTab: undefined;
  ProfileTab: undefined;
};

// Shop Owner Navigation Types
export type ShopOwnerTabParamList = {
  ShopDashboardTab: undefined;
  ShopTherapistsTab: undefined;
  ShopEarningsTab: undefined;
  ShopProfileTab: undefined;
};

export type ShopDashboardStackParamList = {
  ShopDashboard: undefined;
  TherapistMap: undefined;
};

export type ShopTherapistsStackParamList = {
  ShopTherapists: undefined;
  SendInvitation: undefined;
};

export type ShopEarningsStackParamList = {
  ShopEarnings: undefined;
  ShopWallet: undefined;
  ShopPayoutRequest: undefined;
  ShopPayoutDetail: {payoutId: string};
};

export type ShopProfileStackParamList = {
  ShopProfile: undefined;
  ShopSettings: undefined;
  ShopBankAccount: undefined;
};
