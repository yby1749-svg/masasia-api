import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  WalletTransactionType,
  WalletOwnerType,
  PaymentMethod,
  PaymentStatus,
} from '@prisma/client';

// Platform fee percentage
const PLATFORM_FEE_PERCENTAGE = 0.08; // 8%

interface TopUpData {
  amount: number;
  paymentMethod: PaymentMethod;
  paymentRef?: string;
}

interface WalletBalance {
  balance: number;
  totalEarnings: number;
  pendingTopUps: number;
}

// ============================================================================
// Provider Wallet Functions
// ============================================================================

/**
 * Get provider wallet balance
 */
export async function getProviderWalletBalance(providerId: string): Promise<WalletBalance> {
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { balance: true, totalEarnings: true },
  });

  if (!provider) {
    throw new AppError('Provider not found', 404);
  }

  // Check for pending top-ups
  const pendingTopUps = await prisma.walletTransaction.aggregate({
    where: {
      ownerType: 'PROVIDER',
      providerId,
      type: 'TOP_UP',
      status: 'PENDING',
    },
    _sum: { amount: true },
  });

  return {
    balance: provider.balance,
    totalEarnings: provider.totalEarnings,
    pendingTopUps: pendingTopUps._sum.amount || 0,
  };
}

/**
 * Get provider wallet transactions
 */
export async function getProviderWalletTransactions(
  providerId: string,
  page: number = 1,
  limit: number = 20
) {
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    prisma.walletTransaction.findMany({
      where: {
        ownerType: 'PROVIDER',
        providerId,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.walletTransaction.count({
      where: {
        ownerType: 'PROVIDER',
        providerId,
      },
    }),
  ]);

  return {
    transactions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Top up provider wallet
 */
export async function topUpProviderWallet(
  providerId: string,
  data: TopUpData
): Promise<{ transaction: any; newBalance: number }> {
  const { amount, paymentMethod, paymentRef } = data;

  if (amount <= 0) {
    throw new AppError('Amount must be positive', 400);
  }

  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { balance: true },
  });

  if (!provider) {
    throw new AppError('Provider not found', 404);
  }

  const balanceBefore = provider.balance;
  const balanceAfter = balanceBefore + amount;

  // Create transaction and update balance atomically
  const [transaction] = await prisma.$transaction([
    prisma.walletTransaction.create({
      data: {
        ownerType: 'PROVIDER',
        providerId,
        type: 'TOP_UP',
        amount,
        balanceBefore,
        balanceAfter,
        paymentMethod,
        paymentRef,
        status: 'COMPLETED',
        description: `Wallet top-up via ${paymentMethod}`,
      },
    }),
    prisma.provider.update({
      where: { id: providerId },
      data: { balance: balanceAfter },
    }),
  ]);

  return { transaction, newBalance: balanceAfter };
}

/**
 * Deduct platform fee from provider wallet (for cash bookings)
 */
export async function deductProviderPlatformFee(
  providerId: string,
  bookingId: string,
  serviceAmount: number
): Promise<{ success: boolean; feeAmount: number; newBalance: number }> {
  const feeAmount = Math.round(serviceAmount * PLATFORM_FEE_PERCENTAGE * 100) / 100;

  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { balance: true },
  });

  if (!provider) {
    throw new AppError('Provider not found', 404);
  }

  if (provider.balance < feeAmount) {
    throw new AppError(
      `Insufficient wallet balance. Need ₱${feeAmount.toFixed(2)} but have ₱${provider.balance.toFixed(2)}. Please top up your wallet first.`,
      400
    );
  }

  const balanceBefore = provider.balance;
  const balanceAfter = balanceBefore - feeAmount;

  // Create transaction and update balance atomically
  await prisma.$transaction([
    prisma.walletTransaction.create({
      data: {
        ownerType: 'PROVIDER',
        providerId,
        type: 'PLATFORM_FEE',
        amount: -feeAmount,
        balanceBefore,
        balanceAfter,
        bookingId,
        status: 'COMPLETED',
        description: `Platform fee (8%) for cash booking`,
      },
    }),
    prisma.provider.update({
      where: { id: providerId },
      data: { balance: balanceAfter },
    }),
  ]);

  return { success: true, feeAmount, newBalance: balanceAfter };
}

/**
 * Check if provider has enough balance for platform fee
 */
export async function checkProviderBalanceForFee(
  providerId: string,
  serviceAmount: number
): Promise<{ hasEnough: boolean; required: number; current: number }> {
  const feeAmount = Math.round(serviceAmount * PLATFORM_FEE_PERCENTAGE * 100) / 100;

  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { balance: true },
  });

  if (!provider) {
    throw new AppError('Provider not found', 404);
  }

  return {
    hasEnough: provider.balance >= feeAmount,
    required: feeAmount,
    current: provider.balance,
  };
}

// ============================================================================
// Shop Wallet Functions
// ============================================================================

/**
 * Get shop wallet balance
 */
export async function getShopWalletBalance(shopId: string): Promise<WalletBalance> {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { balance: true, totalEarnings: true },
  });

  if (!shop) {
    throw new AppError('Shop not found', 404);
  }

  const pendingTopUps = await prisma.walletTransaction.aggregate({
    where: {
      ownerType: 'SHOP',
      shopId,
      type: 'TOP_UP',
      status: 'PENDING',
    },
    _sum: { amount: true },
  });

  return {
    balance: shop.balance,
    totalEarnings: shop.totalEarnings,
    pendingTopUps: pendingTopUps._sum.amount || 0,
  };
}

/**
 * Get shop wallet transactions
 */
export async function getShopWalletTransactions(
  shopId: string,
  page: number = 1,
  limit: number = 20
) {
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    prisma.walletTransaction.findMany({
      where: {
        ownerType: 'SHOP',
        shopId,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.walletTransaction.count({
      where: {
        ownerType: 'SHOP',
        shopId,
      },
    }),
  ]);

  return {
    transactions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Top up shop wallet
 */
export async function topUpShopWallet(
  shopId: string,
  data: TopUpData
): Promise<{ transaction: any; newBalance: number }> {
  const { amount, paymentMethod, paymentRef } = data;

  if (amount <= 0) {
    throw new AppError('Amount must be positive', 400);
  }

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { balance: true },
  });

  if (!shop) {
    throw new AppError('Shop not found', 404);
  }

  const balanceBefore = shop.balance;
  const balanceAfter = balanceBefore + amount;

  const [transaction] = await prisma.$transaction([
    prisma.walletTransaction.create({
      data: {
        ownerType: 'SHOP',
        shopId,
        type: 'TOP_UP',
        amount,
        balanceBefore,
        balanceAfter,
        paymentMethod,
        paymentRef,
        status: 'COMPLETED',
        description: `Wallet top-up via ${paymentMethod}`,
      },
    }),
    prisma.shop.update({
      where: { id: shopId },
      data: { balance: balanceAfter },
    }),
  ]);

  return { transaction, newBalance: balanceAfter };
}

/**
 * Deduct platform fee from shop wallet (for shop-affiliated therapist cash bookings)
 */
export async function deductShopPlatformFee(
  shopId: string,
  bookingId: string,
  serviceAmount: number
): Promise<{ success: boolean; feeAmount: number; newBalance: number }> {
  const feeAmount = Math.round(serviceAmount * PLATFORM_FEE_PERCENTAGE * 100) / 100;

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { balance: true },
  });

  if (!shop) {
    throw new AppError('Shop not found', 404);
  }

  if (shop.balance < feeAmount) {
    throw new AppError(
      `Insufficient shop wallet balance. Need ₱${feeAmount.toFixed(2)} but have ₱${shop.balance.toFixed(2)}. Please top up the shop wallet first.`,
      400
    );
  }

  const balanceBefore = shop.balance;
  const balanceAfter = balanceBefore - feeAmount;

  await prisma.$transaction([
    prisma.walletTransaction.create({
      data: {
        ownerType: 'SHOP',
        shopId,
        type: 'PLATFORM_FEE',
        amount: -feeAmount,
        balanceBefore,
        balanceAfter,
        bookingId,
        status: 'COMPLETED',
        description: `Platform fee (8%) for therapist cash booking`,
      },
    }),
    prisma.shop.update({
      where: { id: shopId },
      data: { balance: balanceAfter },
    }),
  ]);

  return { success: true, feeAmount, newBalance: balanceAfter };
}

/**
 * Check if shop has enough balance for platform fee
 */
export async function checkShopBalanceForFee(
  shopId: string,
  serviceAmount: number
): Promise<{ hasEnough: boolean; required: number; current: number }> {
  const feeAmount = Math.round(serviceAmount * PLATFORM_FEE_PERCENTAGE * 100) / 100;

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { balance: true },
  });

  if (!shop) {
    throw new AppError('Shop not found', 404);
  }

  return {
    hasEnough: shop.balance >= feeAmount,
    required: feeAmount,
    current: shop.balance,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate platform fee for a given amount
 */
export function calculatePlatformFee(serviceAmount: number): number {
  return Math.round(serviceAmount * PLATFORM_FEE_PERCENTAGE * 100) / 100;
}

/**
 * Get fee percentage
 */
export function getPlatformFeePercentage(): number {
  return PLATFORM_FEE_PERCENTAGE * 100; // Return as percentage (8)
}
