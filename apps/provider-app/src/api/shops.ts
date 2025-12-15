import {apiClient} from './client';

// ============================================================================
// Types
// ============================================================================

export interface Shop {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REJECTED';
  balance: number;
  totalEarnings: number;
  createdAt: string;
  owner?: {
    firstName: string;
    lastName: string;
  };
  _count?: {
    therapists: number;
    bookings: number;
  };
}

export interface ShopInvitation {
  id: string;
  shopId: string;
  targetProviderId?: string;
  targetEmail?: string;
  inviteCode: string;
  message?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
  expiresAt: string;
  createdAt: string;
  shop?: Shop;
  targetProvider?: {
    id: string;
    displayName: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
}

export interface ShopTherapist {
  id: string;
  displayName: string;
  status: string;
  onlineStatus: string;
  rating: number;
  completedBookings: number;
  shopJoinedAt: string;
  user: {
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    phone: string;
    email: string;
  };
}

export interface ShopEarning {
  id: string;
  bookingNumber: string;
  completedAt: string;
  shopEarning: number;
  provider: {
    displayName: string;
    user: {
      firstName: string;
      lastName: string;
    };
  };
  service: {
    name: string;
  };
  customer: {
    firstName: string;
    lastName: string;
  };
}

export interface ShopEarningsSummary {
  balance: number;
  totalEarnings: number;
  todayEarnings: number;
  monthEarnings: number;
  pendingPayout: number;
}

export interface ShopPayout {
  id: string;
  amount: number;
  fee: number;
  netAmount: number;
  method: string;
  accountInfo: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  processedAt?: string;
  referenceNumber?: string;
  createdAt: string;
}

// ============================================================================
// Provider-side Shop API (for therapists)
// ============================================================================

export const providerShopApi = {
  // Get my shop info (if I'm in a shop)
  getMyShop: () => apiClient.get<{data: Shop | null}>('/providers/me/shop'),

  // Get pending shop invitations
  getInvitations: () =>
    apiClient.get<{data: ShopInvitation[]}>('/providers/me/shop-invitations'),

  // Accept invitation
  acceptInvitation: (invitationId: string) =>
    apiClient.post(`/providers/me/shop-invitations/${invitationId}/accept`),

  // Reject invitation
  rejectInvitation: (invitationId: string) =>
    apiClient.post(`/providers/me/shop-invitations/${invitationId}/reject`),

  // Leave shop
  leaveShop: () => apiClient.post('/providers/me/leave-shop'),
};

// ============================================================================
// Shop Owner API
// ============================================================================

export const shopOwnerApi = {
  // Register new shop
  registerShop: (data: {
    name: string;
    description?: string;
    phone?: string;
    email?: string;
  }) => apiClient.post<{data: Shop}>('/shops/register', data),

  // Get my shop
  getMyShop: () => apiClient.get<{data: Shop}>('/shops/me'),

  // Update shop profile
  updateShop: (data: Partial<Shop>) =>
    apiClient.patch<{data: Shop}>('/shops/me', data),

  // Update bank account
  updateBankAccount: (data: {
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountName?: string;
    gcashNumber?: string;
    paymayaNumber?: string;
  }) => apiClient.patch<{data: Shop}>('/shops/me/bank-account', data),

  // Get therapists
  getTherapists: (params?: {page?: number; limit?: number}) =>
    apiClient.get<{
      data: ShopTherapist[];
      pagination: {page: number; limit: number; total: number; totalPages: number};
    }>('/shops/me/therapists', {params}),

  // Remove therapist
  removeTherapist: (providerId: string) =>
    apiClient.delete(`/shops/me/therapists/${providerId}`),

  // Send invitation
  sendInvitation: (data: {
    targetEmail?: string;
    targetProviderId?: string;
    message?: string;
  }) => apiClient.post<{data: ShopInvitation}>('/shops/me/invitations', data),

  // Get invitations
  getInvitations: (params?: {page?: number; limit?: number}) =>
    apiClient.get<{
      data: ShopInvitation[];
      pagination: {page: number; limit: number; total: number; totalPages: number};
    }>('/shops/me/invitations', {params}),

  // Cancel invitation
  cancelInvitation: (invitationId: string) =>
    apiClient.delete(`/shops/me/invitations/${invitationId}`),

  // Get earnings
  getEarnings: (params?: {page?: number; limit?: number}) =>
    apiClient.get<{
      data: ShopEarning[];
      pagination: {page: number; limit: number; total: number; totalPages: number};
    }>('/shops/me/earnings', {params}),

  // Get earnings summary
  getEarningsSummary: () =>
    apiClient.get<{data: ShopEarningsSummary}>('/shops/me/earnings/summary'),

  // Get payouts
  getPayouts: (params?: {page?: number; limit?: number}) =>
    apiClient.get<{
      data: ShopPayout[];
      pagination: {page: number; limit: number; total: number; totalPages: number};
    }>('/shops/me/payouts', {params}),

  // Request payout
  requestPayout: (data: {amount: number; method: string}) =>
    apiClient.post<{data: ShopPayout}>('/shops/me/payouts', data),
};
