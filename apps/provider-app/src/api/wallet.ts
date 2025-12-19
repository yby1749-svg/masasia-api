import {apiClient} from './client';

export interface WalletBalance {
  balance: number;
  totalEarnings: number;
  pendingTopUps: number;
  platformFeePercentage: number;
}

export interface WalletTransaction {
  id: string;
  ownerType: 'PROVIDER' | 'SHOP';
  providerId?: string;
  shopId?: string;
  type: 'TOP_UP' | 'PLATFORM_FEE' | 'PAYOUT' | 'EARNING' | 'REFUND' | 'ADJUSTMENT';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  bookingId?: string;
  payoutId?: string;
  paymentMethod?: string;
  paymentRef?: string;
  status: string;
  description?: string;
  createdAt: string;
}

export interface TopUpData {
  amount: number;
  paymentMethod: 'GCASH' | 'PAYMAYA' | 'CARD';
  paymentRef?: string;
}

export interface FeeCheckResult {
  hasEnough: boolean;
  required: number;
  current: number;
  walletType: 'provider' | 'shop';
  message: string;
}

export const walletApi = {
  // Provider wallet endpoints
  getProviderBalance: () =>
    apiClient.get<{data: WalletBalance}>('/wallet/provider/balance'),

  getProviderTransactions: (page = 1, limit = 20) =>
    apiClient.get<{
      data: WalletTransaction[];
      pagination: {page: number; limit: number; total: number; totalPages: number};
    }>('/wallet/provider/transactions', {params: {page, limit}}),

  topUpProvider: (data: TopUpData) =>
    apiClient.post<{data: {transaction: WalletTransaction; newBalance: number}}>(
      '/wallet/provider/topup',
      data,
    ),

  checkCanAcceptCash: (serviceAmount: number) =>
    apiClient.get<{data: FeeCheckResult}>('/wallet/provider/check-cash', {
      params: {serviceAmount},
    }),

  // Shop wallet endpoints
  getShopBalance: () =>
    apiClient.get<{data: WalletBalance}>('/wallet/shop/balance'),

  getShopTransactions: (page = 1, limit = 20) =>
    apiClient.get<{
      data: WalletTransaction[];
      pagination: {page: number; limit: number; total: number; totalPages: number};
    }>('/wallet/shop/transactions', {params: {page, limit}}),

  topUpShop: (data: TopUpData) =>
    apiClient.post<{data: {transaction: WalletTransaction; newBalance: number}}>(
      '/wallet/shop/topup',
      data,
    ),

  // Utility
  calculateFee: (amount: number) =>
    apiClient.get<{
      data: {serviceAmount: number; platformFee: number; platformFeePercentage: number};
    }>('/wallet/calculate-fee', {params: {amount}}),
};
