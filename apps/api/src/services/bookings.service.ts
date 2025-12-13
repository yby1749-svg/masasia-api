// ============================================================================
// Bookings Service - Placeholder
// ============================================================================

import { Prisma, BookingStatus } from '@prisma/client';
import { prisma } from '../config/database.js';
import { locationCache } from '../config/redis.js';
import { AppError } from '../middleware/errorHandler.js';
import { v4 as uuidv4 } from 'uuid';

interface BookingQuery {
  limit?: string;
}

interface CreateBookingData {
  providerId: string;
  serviceId: string;
  duration: number;
  scheduledAt: string;
  addressId?: string;
  addressText: string;
  addressNotes?: string;
  latitude: number;
  longitude: number;
  travelFee?: number;
  customerNotes?: string;
}

interface SOSData {
  message?: string;
}

class BookingService {
  async listBookings(userId: string, role: string, query: BookingQuery) {
    const where = role === 'provider' 
      ? { provider: { userId } }
      : { customerId: userId };
    
    const bookings = await prisma.booking.findMany({
      where,
      include: { service: true, provider: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
      take: parseInt(query.limit || '20'),
    });
    return { data: bookings, pagination: { page: 1, limit: 20, total: bookings.length } };
  }

  async createBooking(customerId: string, data: CreateBookingData) {
    const provider = await prisma.provider.findUnique({
      where: { id: data.providerId },
      include: { services: { where: { serviceId: data.serviceId } } },
    });
    if (!provider || provider.status !== 'APPROVED') throw new AppError('Provider not found', 404);
    
    const providerService = provider.services[0];
    if (!providerService) throw new AppError('Service not available', 400);
    
    const serviceAmount = data.duration === 60 ? providerService.price60 :
                          data.duration === 90 ? providerService.price90 || providerService.price60 * 1.5 :
                          providerService.price120 || providerService.price60 * 2;
    
    const travelFee = data.travelFee || 0;
    const totalAmount = serviceAmount + travelFee;
    const platformFee = serviceAmount * 0.20;
    const providerEarning = serviceAmount - platformFee + travelFee;
    
    const booking = await prisma.booking.create({
      data: {
        bookingNumber: `CM${Date.now().toString(36).toUpperCase()}`,
        customerId,
        providerId: provider.id,
        serviceId: data.serviceId,
        duration: data.duration,
        scheduledAt: new Date(data.scheduledAt),
        addressId: data.addressId,
        addressText: data.addressText,
        addressNotes: data.addressNotes,
        latitude: data.latitude,
        longitude: data.longitude,
        serviceAmount,
        travelFee,
        totalAmount,
        platformFee,
        providerEarning,
        customerNotes: data.customerNotes,
      },
      include: { service: true, provider: { include: { user: true } } },
    });
    
    // TODO: Create payment intent
    return { booking, payment: { clientKey: 'pk_test_xxx', paymentIntentId: uuidv4() } };
  }

  async getBookingDetail(userId: string, bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: true,
        provider: { include: { user: { select: { firstName: true, lastName: true, phone: true, avatarUrl: true } } } },
        customer: { select: { firstName: true, lastName: true, phone: true } },
        payment: true,
        review: true,
      },
    });
    if (!booking) throw new AppError('Booking not found', 404);
    return booking;
  }

  async cancelBooking(userId: string, bookingId: string, reason?: string) {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new AppError('Booking not found', 404);
    if (!['PENDING', 'ACCEPTED'].includes(booking.status)) throw new AppError('Cannot cancel this booking', 400);
    
    return prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy: userId, cancelReason: reason },
    });
  }

  async acceptBooking(userId: string, bookingId: string) {
    const provider = await prisma.provider.findUnique({ where: { userId } });
    if (!provider) throw new AppError('Provider not found', 404);
    
    const booking = await prisma.booking.findFirst({ where: { id: bookingId, providerId: provider.id } });
    if (!booking) throw new AppError('Booking not found', 404);
    if (booking.status !== 'PENDING') throw new AppError('Cannot accept this booking', 400);
    
    return prisma.booking.update({ where: { id: bookingId }, data: { status: 'ACCEPTED', acceptedAt: new Date() } });
  }

  async rejectBooking(userId: string, bookingId: string, reason?: string) {
    const provider = await prisma.provider.findUnique({ where: { userId } });
    if (!provider) throw new AppError('Provider not found', 404);
    
    const booking = await prisma.booking.findFirst({ where: { id: bookingId, providerId: provider.id } });
    if (!booking) throw new AppError('Booking not found', 404);
    if (booking.status !== 'PENDING') throw new AppError('Cannot reject this booking', 400);
    
    return prisma.booking.update({ where: { id: bookingId }, data: { status: 'REJECTED', rejectedAt: new Date(), rejectedReason: reason } });
  }

  async updateBookingStatus(userId: string, bookingId: string, status: string) {
    const provider = await prisma.provider.findUnique({ where: { userId } });
    if (!provider) throw new AppError('Provider not found', 404);
    
    const booking = await prisma.booking.findFirst({ where: { id: bookingId, providerId: provider.id } });
    if (!booking) throw new AppError('Booking not found', 404);
    
    const updateData: Prisma.BookingUpdateInput = { status: status as BookingStatus };
    if (status === 'PROVIDER_EN_ROUTE') updateData.enRouteAt = new Date();
    if (status === 'PROVIDER_ARRIVED') updateData.arrivedAt = new Date();
    if (status === 'IN_PROGRESS') updateData.startedAt = new Date();
    if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
      await prisma.provider.update({
        where: { id: provider.id },
        data: { balance: { increment: booking.providerEarning }, totalEarnings: { increment: booking.providerEarning }, completedBookings: { increment: 1 } },
      });
    }
    
    return prisma.booking.update({ where: { id: bookingId }, data: updateData });
  }

  async getProviderLocation(userId: string, bookingId: string) {
    const booking = await prisma.booking.findFirst({ where: { id: bookingId, customerId: userId } });
    if (!booking) throw new AppError('Booking not found', 404);
    
    const location = await locationCache.getBookingLocation(bookingId);
    if (!location) return { lat: null, lng: null, eta: null, lastUpdatedAt: null };
    
    return { latitude: location.lat, longitude: location.lng, eta: location.eta, lastUpdatedAt: new Date(location.updatedAt) };
  }

  async updateBookingLocation(userId: string, bookingId: string, data: { latitude: number; longitude: number; accuracy?: number }) {
    const provider = await prisma.provider.findUnique({ where: { userId } });
    if (!provider) throw new AppError('Provider not found', 404);
    
    const booking = await prisma.booking.findFirst({ where: { id: bookingId, providerId: provider.id } });
    if (!booking) throw new AppError('Booking not found', 404);
    
    // TODO: Calculate ETA using Google Maps
    const eta = 15; // placeholder
    
    await locationCache.setBookingLocation(bookingId, data.latitude, data.longitude, eta);
    await prisma.locationLog.create({
      data: { bookingId, providerId: provider.id, latitude: data.latitude, longitude: data.longitude, accuracy: data.accuracy },
    });
  }

  async triggerSOS(userId: string, bookingId: string, data: SOSData) {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new AppError('Booking not found', 404);
    
    // TODO: Implement SOS logic - notify admin, send SMS to emergency contact
    console.log(`🆘 SOS triggered for booking ${bookingId} by user ${userId}`);
    
    await prisma.report.create({
      data: {
        bookingId,
        reporterId: userId,
        reportedId: booking.customerId === userId ? booking.providerId : booking.customerId,
        type: 'OTHER',
        severity: 'CRITICAL',
        description: `SOS triggered: ${data.message || 'Emergency'}`,
      },
    });
  }
}

export const bookingService = new BookingService();
