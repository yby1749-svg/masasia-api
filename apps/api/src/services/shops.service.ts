// ============================================================================
// Shops Service - Shop Owner Management
// ============================================================================

import { PayoutMethod, PayoutStatus, ShopStatus } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import crypto from 'crypto';

interface RegisterShopData {
  name: string;
  description?: string;
  phone?: string;
  email?: string;
}

interface UpdateShopData {
  name?: string;
  description?: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
}

interface BankAccountData {
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  gcashNumber?: string;
  paymayaNumber?: string;
}

interface InvitationData {
  targetEmail?: string;
  targetProviderId?: string;
  message?: string;
}

interface PaginationQuery {
  limit?: string;
  page?: string;
}

class ShopsService {
  // ============================================================================
  // Shop Owner Registration
  // ============================================================================

  async registerShop(userId: string, data: RegisterShopData) {
    // Check if user already owns a shop
    const existing = await prisma.shop.findUnique({ where: { ownerId: userId } });
    if (existing) throw new AppError('You already own a shop', 400);

    // Check if user is already a provider (shop owners should not be providers)
    const provider = await prisma.provider.findUnique({ where: { userId } });
    if (provider) throw new AppError('Providers cannot register as shop owners', 400);

    // Update user role to SHOP_OWNER
    await prisma.user.update({ where: { id: userId }, data: { role: 'SHOP_OWNER' } });

    // Create the shop
    return prisma.shop.create({
      data: {
        ownerId: userId,
        name: data.name,
        description: data.description,
        phone: data.phone,
        email: data.email,
        status: 'PENDING',
      },
    });
  }

  // ============================================================================
  // Shop Profile Management
  // ============================================================================

  async getMyShop(userId: string) {
    const shop = await prisma.shop.findUnique({
      where: { ownerId: userId },
      include: {
        owner: { select: { firstName: true, lastName: true, email: true, phone: true } },
        _count: { select: { therapists: true, bookings: true } },
      },
    });
    if (!shop) throw new AppError('Shop not found', 404);
    return shop;
  }

  async updateMyShop(userId: string, data: UpdateShopData) {
    const shop = await prisma.shop.findUnique({ where: { ownerId: userId } });
    if (!shop) throw new AppError('Shop not found', 404);

    return prisma.shop.update({
      where: { id: shop.id },
      data,
    });
  }

  async updateBankAccount(userId: string, data: BankAccountData) {
    const shop = await prisma.shop.findUnique({ where: { ownerId: userId } });
    if (!shop) throw new AppError('Shop not found', 404);

    return prisma.shop.update({
      where: { id: shop.id },
      data,
    });
  }

  // ============================================================================
  // Therapist Management
  // ============================================================================

  async getTherapists(userId: string, query: PaginationQuery) {
    const shop = await prisma.shop.findUnique({ where: { ownerId: userId } });
    if (!shop) throw new AppError('Shop not found', 404);

    const limit = parseInt(query.limit || '20');
    const page = parseInt(query.page || '1');

    const [therapists, total] = await Promise.all([
      prisma.provider.findMany({
        where: { shopId: shop.id },
        include: {
          user: { select: { firstName: true, lastName: true, avatarUrl: true, phone: true, email: true } },
        },
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { shopJoinedAt: 'desc' },
      }),
      prisma.provider.count({ where: { shopId: shop.id } }),
    ]);

    return {
      data: therapists,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async removeTherapist(userId: string, providerId: string) {
    const shop = await prisma.shop.findUnique({ where: { ownerId: userId } });
    if (!shop) throw new AppError('Shop not found', 404);

    const provider = await prisma.provider.findUnique({ where: { id: providerId } });
    if (!provider || provider.shopId !== shop.id) {
      throw new AppError('Therapist not found in your shop', 404);
    }

    return prisma.provider.update({
      where: { id: providerId },
      data: { shopId: null, shopJoinedAt: null },
    });
  }

  // ============================================================================
  // Invitations
  // ============================================================================

  async sendInvitation(userId: string, data: InvitationData) {
    const shop = await prisma.shop.findUnique({ where: { ownerId: userId } });
    if (!shop) throw new AppError('Shop not found', 404);
    if (shop.status !== 'APPROVED') throw new AppError('Shop must be approved to send invitations', 403);

    if (!data.targetEmail && !data.targetProviderId) {
      throw new AppError('Either targetEmail or targetProviderId is required', 400);
    }

    // If targeting existing provider, check they're not already in a shop
    if (data.targetProviderId) {
      const provider = await prisma.provider.findUnique({ where: { id: data.targetProviderId } });
      if (!provider) throw new AppError('Provider not found', 404);
      if (provider.shopId) throw new AppError('Provider is already in a shop', 400);

      // Check for existing pending invitation
      const existingInvite = await prisma.shopInvitation.findFirst({
        where: { shopId: shop.id, targetProviderId: data.targetProviderId, status: 'PENDING' },
      });
      if (existingInvite) throw new AppError('Invitation already sent to this provider', 400);
    }

    const inviteCode = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    return prisma.shopInvitation.create({
      data: {
        shopId: shop.id,
        targetEmail: data.targetEmail,
        targetProviderId: data.targetProviderId,
        inviteCode,
        message: data.message,
        expiresAt,
      },
      include: {
        targetProvider: {
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
        },
      },
    });
  }

  async getInvitations(userId: string, query: PaginationQuery) {
    const shop = await prisma.shop.findUnique({ where: { ownerId: userId } });
    if (!shop) throw new AppError('Shop not found', 404);

    const limit = parseInt(query.limit || '20');
    const page = parseInt(query.page || '1');

    const [invitations, total] = await Promise.all([
      prisma.shopInvitation.findMany({
        where: { shopId: shop.id },
        include: {
          targetProvider: {
            include: { user: { select: { firstName: true, lastName: true, email: true } } },
          },
        },
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.shopInvitation.count({ where: { shopId: shop.id } }),
    ]);

    return {
      data: invitations,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async cancelInvitation(userId: string, invitationId: string) {
    const shop = await prisma.shop.findUnique({ where: { ownerId: userId } });
    if (!shop) throw new AppError('Shop not found', 404);

    const invitation = await prisma.shopInvitation.findUnique({ where: { id: invitationId } });
    if (!invitation || invitation.shopId !== shop.id) {
      throw new AppError('Invitation not found', 404);
    }
    if (invitation.status !== 'PENDING') {
      throw new AppError('Can only cancel pending invitations', 400);
    }

    return prisma.shopInvitation.update({
      where: { id: invitationId },
      data: { status: 'CANCELLED' },
    });
  }

  // ============================================================================
  // Earnings & Payouts
  // ============================================================================

  async getEarnings(userId: string, query: PaginationQuery) {
    const shop = await prisma.shop.findUnique({ where: { ownerId: userId } });
    if (!shop) throw new AppError('Shop not found', 404);

    const limit = parseInt(query.limit || '20');
    const page = parseInt(query.page || '1');

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where: { shopId: shop.id, status: 'COMPLETED' },
        include: {
          provider: { include: { user: { select: { firstName: true, lastName: true } } } },
          service: { select: { name: true } },
          customer: { select: { firstName: true, lastName: true } },
        },
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { completedAt: 'desc' },
      }),
      prisma.booking.count({ where: { shopId: shop.id, status: 'COMPLETED' } }),
    ]);

    return {
      data: bookings,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getEarningsSummary(userId: string) {
    const shop = await prisma.shop.findUnique({ where: { ownerId: userId } });
    if (!shop) throw new AppError('Shop not found', 404);

    // Get today's earnings
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEarnings = await prisma.booking.aggregate({
      where: { shopId: shop.id, status: 'COMPLETED', completedAt: { gte: today } },
      _sum: { shopEarning: true },
    });

    // Get this month's earnings
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEarnings = await prisma.booking.aggregate({
      where: { shopId: shop.id, status: 'COMPLETED', completedAt: { gte: monthStart } },
      _sum: { shopEarning: true },
    });

    // Get pending payout amount
    const pendingPayout = await prisma.shopPayout.aggregate({
      where: { shopId: shop.id, status: 'PENDING' },
      _sum: { amount: true },
    });

    return {
      balance: shop.balance,
      totalEarnings: shop.totalEarnings,
      todayEarnings: todayEarnings._sum.shopEarning || 0,
      monthEarnings: monthEarnings._sum.shopEarning || 0,
      pendingPayout: pendingPayout._sum.amount || 0,
    };
  }

  async getPayouts(userId: string, query: PaginationQuery) {
    const shop = await prisma.shop.findUnique({ where: { ownerId: userId } });
    if (!shop) throw new AppError('Shop not found', 404);

    const limit = parseInt(query.limit || '20');
    const page = parseInt(query.page || '1');

    const [payouts, total] = await Promise.all([
      prisma.shopPayout.findMany({
        where: { shopId: shop.id },
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.shopPayout.count({ where: { shopId: shop.id } }),
    ]);

    return {
      data: payouts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async requestPayout(userId: string, data: { amount: number; method: string }) {
    const shop = await prisma.shop.findUnique({ where: { ownerId: userId } });
    if (!shop) throw new AppError('Shop not found', 404);
    if (shop.status !== 'APPROVED') throw new AppError('Shop must be approved', 403);

    if (data.amount < 500) throw new AppError('Minimum payout is ₱500', 400);
    if (shop.balance < data.amount) throw new AppError('Insufficient balance', 400);

    // Determine account info based on method
    let accountInfo = '';
    if (data.method === 'GCASH') {
      if (!shop.gcashNumber) throw new AppError('GCash number not set', 400);
      accountInfo = shop.gcashNumber;
    } else if (data.method === 'PAYMAYA') {
      if (!shop.paymayaNumber) throw new AppError('PayMaya number not set', 400);
      accountInfo = shop.paymayaNumber;
    } else if (data.method === 'BANK_TRANSFER') {
      if (!shop.bankAccountNumber) throw new AppError('Bank account not set', 400);
      accountInfo = `${shop.bankName} - ${shop.bankAccountNumber}`;
    }

    const payout = await prisma.shopPayout.create({
      data: {
        shopId: shop.id,
        amount: data.amount,
        fee: 0,
        netAmount: data.amount,
        method: data.method as PayoutMethod,
        accountInfo,
      },
    });

    // Deduct from balance
    await prisma.shop.update({
      where: { id: shop.id },
      data: { balance: { decrement: data.amount } },
    });

    return payout;
  }

  // ============================================================================
  // Provider-side: Shop Invitation Handling
  // ============================================================================

  async getProviderShop(userId: string) {
    const provider = await prisma.provider.findUnique({
      where: { userId },
      include: {
        shop: {
          include: {
            owner: { select: { firstName: true, lastName: true } },
            _count: { select: { therapists: true } },
          },
        },
      },
    });
    if (!provider) throw new AppError('Provider not found', 404);
    return provider.shop;
  }

  async getProviderInvitations(userId: string) {
    const provider = await prisma.provider.findUnique({
      where: { userId },
      include: { user: { select: { email: true } } },
    });
    if (!provider) throw new AppError('Provider not found', 404);

    // Find invitations by provider ID or by email
    return prisma.shopInvitation.findMany({
      where: {
        OR: [
          { targetProviderId: provider.id },
          { targetEmail: provider.user.email },
        ],
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      include: {
        shop: {
          include: {
            owner: { select: { firstName: true, lastName: true } },
            _count: { select: { therapists: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async acceptInvitation(userId: string, invitationId: string) {
    const provider = await prisma.provider.findUnique({
      where: { userId },
      include: { user: { select: { email: true } } },
    });
    if (!provider) throw new AppError('Provider not found', 404);
    if (provider.shopId) throw new AppError('You are already in a shop', 400);

    const invitation = await prisma.shopInvitation.findUnique({
      where: { id: invitationId },
      include: { shop: true },
    });
    // Check if invitation belongs to this provider (by ID or email)
    const isValidInvitation = invitation && (
      invitation.targetProviderId === provider.id ||
      invitation.targetEmail === provider.user.email
    );
    if (!isValidInvitation) {
      throw new AppError('Invitation not found', 404);
    }
    if (invitation.status !== 'PENDING') {
      throw new AppError('Invitation is no longer valid', 400);
    }
    if (invitation.expiresAt < new Date()) {
      throw new AppError('Invitation has expired', 400);
    }
    if (invitation.shop.status !== 'APPROVED') {
      throw new AppError('Shop is not approved', 400);
    }

    // Update invitation status
    await prisma.shopInvitation.update({
      where: { id: invitationId },
      data: { status: 'ACCEPTED', respondedAt: new Date() },
    });

    // Join the shop
    return prisma.provider.update({
      where: { id: provider.id },
      data: { shopId: invitation.shopId, shopJoinedAt: new Date() },
      include: { shop: true },
    });
  }

  async rejectInvitation(userId: string, invitationId: string) {
    const provider = await prisma.provider.findUnique({ where: { userId } });
    if (!provider) throw new AppError('Provider not found', 404);

    const invitation = await prisma.shopInvitation.findUnique({ where: { id: invitationId } });
    if (!invitation || invitation.targetProviderId !== provider.id) {
      throw new AppError('Invitation not found', 404);
    }
    if (invitation.status !== 'PENDING') {
      throw new AppError('Invitation is no longer valid', 400);
    }

    return prisma.shopInvitation.update({
      where: { id: invitationId },
      data: { status: 'REJECTED', respondedAt: new Date() },
    });
  }

  async leaveShop(userId: string) {
    const provider = await prisma.provider.findUnique({ where: { userId } });
    if (!provider) throw new AppError('Provider not found', 404);
    if (!provider.shopId) throw new AppError('You are not in a shop', 400);

    return prisma.provider.update({
      where: { id: provider.id },
      data: { shopId: null, shopJoinedAt: null },
    });
  }

  // ============================================================================
  // Admin: Shop Management
  // ============================================================================

  async adminListShops(query: PaginationQuery & { status?: string }) {
    const limit = parseInt(query.limit || '20');
    const page = parseInt(query.page || '1');
    const where = query.status ? { status: query.status as ShopStatus } : {};

    const [shops, total] = await Promise.all([
      prisma.shop.findMany({
        where,
        include: {
          owner: { select: { firstName: true, lastName: true, email: true, phone: true } },
          _count: { select: { therapists: true, bookings: true } },
        },
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.shop.count({ where }),
    ]);

    return {
      data: shops,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async adminGetShop(shopId: string) {
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        therapists: {
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
        },
        _count: { select: { bookings: true, payouts: true } },
      },
    });
    if (!shop) throw new AppError('Shop not found', 404);
    return shop;
  }

  async adminApproveShop(shopId: string, adminId: string) {
    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw new AppError('Shop not found', 404);
    if (shop.status !== 'PENDING') throw new AppError('Shop is not pending approval', 400);

    return prisma.shop.update({
      where: { id: shopId },
      data: { status: 'APPROVED', approvedAt: new Date(), approvedBy: adminId },
    });
  }

  async adminRejectShop(shopId: string, adminId: string, reason: string) {
    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw new AppError('Shop not found', 404);
    if (shop.status !== 'PENDING') throw new AppError('Shop is not pending approval', 400);

    return prisma.shop.update({
      where: { id: shopId },
      data: { status: 'REJECTED', rejectedAt: new Date(), rejectedReason: reason },
    });
  }

  async adminSuspendShop(shopId: string, reason: string) {
    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw new AppError('Shop not found', 404);
    if (shop.status === 'SUSPENDED') throw new AppError('Shop is already suspended', 400);

    return prisma.shop.update({
      where: { id: shopId },
      data: { status: 'SUSPENDED', rejectedReason: reason },
    });
  }

  async adminListShopPayouts(query: PaginationQuery & { status?: string }) {
    const limit = parseInt(query.limit || '20');
    const page = parseInt(query.page || '1');
    const where = query.status ? { status: query.status as PayoutStatus } : {};

    const [payouts, total] = await Promise.all([
      prisma.shopPayout.findMany({
        where,
        include: {
          shop: {
            include: { owner: { select: { firstName: true, lastName: true } } },
          },
        },
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.shopPayout.count({ where }),
    ]);

    return {
      data: payouts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async adminProcessPayout(payoutId: string, adminId: string, referenceNumber: string) {
    const payout = await prisma.shopPayout.findUnique({ where: { id: payoutId } });
    if (!payout) throw new AppError('Payout not found', 404);
    if (payout.status !== 'PENDING') throw new AppError('Payout is not pending', 400);

    return prisma.shopPayout.update({
      where: { id: payoutId },
      data: {
        status: 'COMPLETED',
        processedAt: new Date(),
        processedBy: adminId,
        referenceNumber,
      },
    });
  }

  async adminRejectPayout(payoutId: string, reason: string) {
    const payout = await prisma.shopPayout.findUnique({
      where: { id: payoutId },
      include: { shop: true },
    });
    if (!payout) throw new AppError('Payout not found', 404);
    if (payout.status !== 'PENDING') throw new AppError('Payout is not pending', 400);

    // Refund the balance
    await prisma.shop.update({
      where: { id: payout.shopId },
      data: { balance: { increment: payout.amount } },
    });

    return prisma.shopPayout.update({
      where: { id: payoutId },
      data: { status: 'FAILED', failedAt: new Date(), failureReason: reason },
    });
  }
}

export const shopsService = new ShopsService();
