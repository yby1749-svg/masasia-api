// ============================================================================
// Providers Service - Placeholder
// ============================================================================

import { Prisma, PayoutMethod } from '@prisma/client';
import { prisma } from '../config/database.js';
import { locationCache } from '../config/redis.js';
import { AppError } from '../middleware/errorHandler.js';

interface ProviderQuery {
  limit?: string;
  page?: string;
}

interface RegisterData {
  displayName: string;
  bio?: string;
  serviceAreas?: string[];
}

interface ServiceData {
  serviceId: string;
  price60: number;
  price90?: number;
  price120?: number;
  isActive?: boolean;
}

interface AvailabilityData {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface BankAccountData {
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  gcashNumber?: string;
  paymayaNumber?: string;
}

class ProviderService {
  async listProviders(query: ProviderQuery) {
    const providers = await prisma.provider.findMany({
      where: { status: 'APPROVED' },
      include: { user: { select: { firstName: true, lastName: true, avatarUrl: true, gender: true } } },
      take: parseInt(query.limit || '20'),
      skip: ((parseInt(query.page || '1')) - 1) * (parseInt(query.limit || '20')),
    });
    return { data: providers, pagination: { page: 1, limit: 20, total: providers.length } };
  }

  async getProviderDetail(providerId: string) {
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      include: {
        user: { select: { firstName: true, lastName: true, avatarUrl: true, gender: true } },
        services: { include: { service: true } },
      },
    });
    if (!provider) throw new AppError('Provider not found', 404);
    return provider;
  }

  async getProviderReviews(providerId: string, query: ProviderQuery) {
    const reviews = await prisma.review.findMany({
      where: { targetId: providerId },
      include: { author: { select: { firstName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
      take: parseInt(query.limit || '10'),
    });
    return { data: reviews, pagination: { page: 1, limit: 10, total: reviews.length } };
  }

  async getProviderAvailability(providerId: string, date: string) {
    // TODO: Implement availability logic
    return { date, slots: [{ time: '09:00', available: true }, { time: '10:00', available: true }] };
  }

  async registerAsProvider(userId: string, data: RegisterData) {
    const existing = await prisma.provider.findUnique({ where: { userId } });
    if (existing) throw new AppError('Already registered as provider', 400);
    
    await prisma.user.update({ where: { id: userId }, data: { role: 'PROVIDER' } });
    return prisma.provider.create({
      data: { userId, displayName: data.displayName, bio: data.bio, serviceAreas: data.serviceAreas || [] },
    });
  }

  async getMyProfile(userId: string) {
    const provider = await prisma.provider.findUnique({ where: { userId }, include: { user: true } });
    if (!provider) throw new AppError('Provider not found', 404);
    return provider;
  }

  async updateMyProfile(userId: string, data: Prisma.ProviderUpdateInput) {
    return prisma.provider.update({ where: { userId }, data });
  }

  async getMyDocuments(userId: string) {
    const provider = await prisma.provider.findUnique({ where: { userId } });
    if (!provider) throw new AppError('Provider not found', 404);
    return prisma.providerDocument.findMany({ where: { providerId: provider.id } });
  }

  async getMyServices(userId: string) {
    const provider = await prisma.provider.findUnique({ where: { userId } });
    if (!provider) throw new AppError('Provider not found', 404);
    return prisma.providerService.findMany({ where: { providerId: provider.id }, include: { service: true } });
  }

  async setService(userId: string, data: ServiceData) {
    const provider = await prisma.provider.findUnique({ where: { userId } });
    if (!provider) throw new AppError('Provider not found', 404);
    return prisma.providerService.upsert({
      where: { providerId_serviceId: { providerId: provider.id, serviceId: data.serviceId } },
      update: { price60: data.price60, price90: data.price90, price120: data.price120, isActive: data.isActive },
      create: { providerId: provider.id, serviceId: data.serviceId, price60: data.price60, price90: data.price90, price120: data.price120 },
    });
  }

  async removeService(userId: string, serviceId: string) {
    const provider = await prisma.provider.findUnique({ where: { userId } });
    if (!provider) throw new AppError('Provider not found', 404);
    await prisma.providerService.delete({ where: { providerId_serviceId: { providerId: provider.id, serviceId } } });
  }

  async getMyAvailability(userId: string) {
    const provider = await prisma.provider.findUnique({ where: { userId } });
    if (!provider) throw new AppError('Provider not found', 404);
    return prisma.providerAvailability.findMany({ where: { providerId: provider.id } });
  }

  async setMyAvailability(userId: string, data: AvailabilityData[]) {
    const provider = await prisma.provider.findUnique({ where: { userId } });
    if (!provider) throw new AppError('Provider not found', 404);
    await prisma.providerAvailability.deleteMany({ where: { providerId: provider.id } });
    return prisma.providerAvailability.createMany({
      data: data.map(a => ({ providerId: provider.id, ...a })),
    });
  }

  async updateOnlineStatus(userId: string, status: 'ONLINE' | 'OFFLINE' | 'BUSY') {
    await prisma.provider.update({ where: { userId }, data: { onlineStatus: status } });
  }

  async updateLocation(userId: string, data: { latitude: number; longitude: number }) {
    const provider = await prisma.provider.findUnique({ where: { userId } });
    if (!provider) throw new AppError('Provider not found', 404);
    await locationCache.setProviderLocation(provider.id, data.latitude, data.longitude);
    await prisma.provider.update({
      where: { userId },
      data: { lastLatitude: data.latitude, lastLongitude: data.longitude, lastLocationAt: new Date() },
    });
  }

  async updateBankAccount(userId: string, data: BankAccountData) {
    await prisma.provider.update({ where: { userId }, data });
  }

  async getEarnings(userId: string, _query: ProviderQuery) {
    const provider = await prisma.provider.findUnique({ where: { userId } });
    if (!provider) throw new AppError('Provider not found', 404);
    return prisma.booking.findMany({
      where: { providerId: provider.id, status: 'COMPLETED' },
      select: { id: true, completedAt: true, providerEarning: true, service: { select: { name: true } } },
      orderBy: { completedAt: 'desc' },
    });
  }

  async getEarningsSummary(userId: string) {
    const provider = await prisma.provider.findUnique({ where: { userId } });
    if (!provider) throw new AppError('Provider not found', 404);
    return { balance: provider.balance, totalEarnings: provider.totalEarnings };
  }

  async getPayouts(userId: string) {
    const provider = await prisma.provider.findUnique({ where: { userId } });
    if (!provider) throw new AppError('Provider not found', 404);
    return prisma.payout.findMany({ where: { providerId: provider.id }, orderBy: { createdAt: 'desc' } });
  }

  async requestPayout(userId: string, data: { amount: number; method: string }) {
    const provider = await prisma.provider.findUnique({ where: { userId } });
    if (!provider) throw new AppError('Provider not found', 404);
    if (provider.balance < data.amount) throw new AppError('Insufficient balance', 400);
    if (data.amount < 500) throw new AppError('Minimum payout is ₱500', 400);
    
    const payout = await prisma.payout.create({
      data: {
        providerId: provider.id,
        amount: data.amount,
        fee: 0,
        netAmount: data.amount,
        method: data.method as PayoutMethod,
        accountInfo: provider.gcashNumber || provider.bankAccountNumber || '',
      },
    });
    
    await prisma.provider.update({ where: { id: provider.id }, data: { balance: { decrement: data.amount } } });
    return payout;
  }
}

export const providerService = new ProviderService();
