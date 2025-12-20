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
      include: {
        user: { select: { firstName: true, lastName: true, avatarUrl: true, gender: true } },
        shop: { select: { id: true, name: true, status: true } },
        services: { include: { service: true } },
      },
      // Sort by promotionBid (higher = top), then by rating (higher = top)
      orderBy: [
        { promotionBid: 'desc' },
        { rating: 'desc' },
      ],
      take: parseInt(query.limit || '20'),
      skip: ((parseInt(query.page || '1')) - 1) * (parseInt(query.limit || '20')),
    });

    // Transform to include providerType
    const data = providers.map(p => {
      const shop = p.shop as { id: string; name: string; status: string } | null;
      return {
        ...p,
        providerType: p.shopId && shop?.status === 'APPROVED' ? 'shop' : 'independent',
        shopName: shop?.status === 'APPROVED' ? shop.name : null,
      };
    });

    return { data, pagination: { page: 1, limit: 20, total: providers.length } };
  }

  async getProviderDetail(providerId: string) {
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      include: {
        user: { select: { firstName: true, lastName: true, avatarUrl: true, gender: true } },
        services: { include: { service: true } },
        shop: { select: { id: true, name: true, status: true } },
      },
    });
    if (!provider) throw new AppError('Provider not found', 404);

    // Add providerType info
    return {
      ...provider,
      providerType: provider.shopId && provider.shop?.status === 'APPROVED' ? 'shop' : 'independent',
      shopName: provider.shop?.status === 'APPROVED' ? provider.shop.name : null,
    };
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
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();
    const dateOnly = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

    // Check if provider exists
    const provider = await prisma.provider.findUnique({ where: { id: providerId } });
    if (!provider) throw new AppError('Provider not found', 404);

    // Check if date is blocked
    const blocked = await prisma.providerBlockedDate.findFirst({
      where: { providerId, date: dateOnly },
    });
    if (blocked) {
      return { date, slots: [], message: 'Provider is unavailable on this date' };
    }

    // Get provider's availability for this day of week
    const availability = await prisma.providerAvailability.findFirst({
      where: { providerId, dayOfWeek, isAvailable: true },
    });

    // Default working hours if no availability configured
    const startTime = availability?.startTime || '09:00';
    const endTime = availability?.endTime || '21:00';

    // If provider has availability config but not available on this day
    const hasAvailabilityConfig = await prisma.providerAvailability.count({
      where: { providerId },
    });
    if (hasAvailabilityConfig > 0 && !availability) {
      return { date, slots: [], message: 'Provider does not work on this day' };
    }

    // Get existing bookings for this provider on this date
    const startOfDate = new Date(dateOnly);
    const endOfDate = new Date(dateOnly);
    endOfDate.setDate(endOfDate.getDate() + 1);

    const existingBookings = await prisma.booking.findMany({
      where: {
        providerId,
        status: { in: ['PENDING', 'ACCEPTED', 'PROVIDER_EN_ROUTE', 'PROVIDER_ARRIVED', 'IN_PROGRESS'] },
        scheduledAt: {
          gte: startOfDate,
          lt: endOfDate,
        },
      },
      select: { scheduledAt: true, duration: true },
    });

    // Generate time slots (every 30 minutes)
    const slots: Array<{ time: string; available: boolean }> = [];
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    // Check if date is today - if so, only show future time slots
    const now = new Date();
    const isToday = dateOnly.toDateString() === now.toDateString();
    const currentMinutes = isToday ? now.getHours() * 60 + now.getMinutes() + 60 : 0; // Add 1 hour buffer

    for (let mins = startMinutes; mins < endMinutes; mins += 30) {
      // Skip past times for today
      if (mins < currentMinutes) continue;

      const hour = Math.floor(mins / 60);
      const minute = mins % 60;
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

      // Check if this time slot conflicts with any existing booking
      const slotStart = new Date(dateOnly);
      slotStart.setHours(hour, minute, 0, 0);

      // Check for conflicts with existing bookings
      // A slot is unavailable if a booking overlaps with it
      const isBooked = existingBookings.some(booking => {
        const bookingStart = new Date(booking.scheduledAt);
        const bookingEnd = new Date(bookingStart.getTime() + booking.duration * 60 * 1000);
        // Slot conflicts if: slot starts before booking ends AND slot ends after booking starts
        // For simplicity: mark slot unavailable if it falls within or overlaps booking window
        const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000); // 30 min slot
        return slotStart < bookingEnd && slotEnd > bookingStart;
      });

      slots.push({ time: timeStr, available: !isBooked });
    }

    return { date, slots };
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
    const provider = await prisma.provider.findUnique({
      where: { userId },
      include: { shop: true },
    });
    if (!provider) throw new AppError('Provider not found', 404);

    const bookings = await prisma.booking.findMany({
      where: { providerId: provider.id, status: 'COMPLETED' },
      select: {
        id: true,
        completedAt: true,
        serviceAmount: true,
        platformFee: true,
        providerEarning: true,
        shopEarning: true,
        service: { select: { name: true } }
      },
      orderBy: { completedAt: 'desc' },
      take: 50,
    });

    // Transform to include earnings breakdown
    return bookings.map(b => ({
      id: b.id,
      createdAt: b.completedAt,
      amount: b.serviceAmount,
      platformFee: b.platformFee,
      shopFee: b.shopEarning || 0,
      netAmount: b.providerEarning,
      booking: { service: b.service },
    }));
  }

  async getEarningsSummary(userId: string) {
    const provider = await prisma.provider.findUnique({
      where: { userId },
      include: { shop: true },
    });
    if (!provider) throw new AppError('Provider not found', 404);

    // Determine provider type and earnings percentage
    const isShopAffiliated = provider.shopId && provider.shop?.status === 'APPROVED';
    const providerType = isShopAffiliated ? 'shop' : 'independent';
    const earningsPercentage = isShopAffiliated ? 55 : 92;

    // Calculate period-based earnings
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const completedBookings = await prisma.booking.findMany({
      where: {
        providerId: provider.id,
        status: 'COMPLETED',
        completedAt: { gte: startOfMonth },
      },
      select: { completedAt: true, providerEarning: true },
    });

    let today = 0, thisWeek = 0, thisMonth = 0;
    for (const b of completedBookings) {
      if (b.completedAt) {
        thisMonth += b.providerEarning;
        if (b.completedAt >= startOfWeek) thisWeek += b.providerEarning;
        if (b.completedAt >= startOfToday) today += b.providerEarning;
      }
    }

    return {
      availableBalance: provider.balance,
      pendingBalance: 0, // TODO: Calculate from pending payouts
      totalEarned: provider.totalEarnings,
      today,
      thisWeek,
      thisMonth,
      // New fields for earnings breakdown
      providerType,
      earningsPercentage,
      platformPercentage: 8,
      shopPercentage: isShopAffiliated ? 37 : 0,
      shopName: provider.shop?.name || null,
    };
  }

  async getPayouts(userId: string) {
    const provider = await prisma.provider.findUnique({ where: { userId } });
    if (!provider) throw new AppError('Provider not found', 404);
    return prisma.payout.findMany({ where: { providerId: provider.id }, orderBy: { createdAt: 'desc' } });
  }

  async requestPayout(userId: string, data: { amount: number; method: string }) {
    const provider = await prisma.provider.findUnique({ where: { userId } });
    if (!provider) throw new AppError('Provider not found', 404);
    if (data.amount < 500) throw new AppError('Minimum payout is ₱500', 400);
    if (provider.balance < data.amount) throw new AppError('Insufficient balance', 400);
    
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
