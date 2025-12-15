// ============================================================================
// Bookings Service
// ============================================================================

import { Prisma, BookingStatus } from '@prisma/client';
import { prisma } from '../config/database.js';
import { locationCache } from '../config/redis.js';
import { AppError } from '../middleware/errorHandler.js';
import { paymentService } from './payments.service.js';
import { notificationService } from './notifications.service.js';
import { sendNotificationToUser, notifyBookingUpdate, notifyBookingCancelled } from '../socket/index.js';

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

    // Create payment intent for the booking
    const paymentIntent = await paymentService.createPaymentIntent({
      bookingId: booking.id,
      amount: totalAmount,
      description: `${booking.service.name} - ${data.duration} minutes`,
    });

    return { booking, payment: paymentIntent };
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
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { provider: true, customer: true },
    });
    if (!booking) throw new AppError('Booking not found', 404);
    if (!['PENDING', 'ACCEPTED'].includes(booking.status)) throw new AppError('Cannot cancel this booking', 400);

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy: userId, cancelReason: reason },
    });

    // Notify the other party
    const isCustomer = booking.customerId === userId;
    const notifyUserId = isCustomer ? booking.provider.userId : booking.customerId;
    const cancelledBy = isCustomer ? 'customer' : 'provider';

    await notificationService.createNotification(
      notifyUserId,
      'BOOKING_CANCELLED',
      'Booking Cancelled',
      `Your booking has been cancelled by the ${cancelledBy}`,
      { bookingId, reason }
    );

    sendNotificationToUser(notifyUserId, {
      type: 'BOOKING_CANCELLED',
      title: 'Booking Cancelled',
      body: `Your booking has been cancelled by the ${cancelledBy}`,
      data: { bookingId, reason },
    });

    notifyBookingCancelled(bookingId, reason);

    return updatedBooking;
  }

  async acceptBooking(userId: string, bookingId: string) {
    const provider = await prisma.provider.findUnique({ where: { userId } });
    if (!provider) throw new AppError('Provider not found', 404);

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, providerId: provider.id },
      include: { service: true },
    });
    if (!booking) throw new AppError('Booking not found', 404);
    if (booking.status !== 'PENDING') throw new AppError('Cannot accept this booking', 400);

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
    });

    // Notify customer
    await notificationService.createNotification(
      booking.customerId,
      'BOOKING_ACCEPTED',
      'Booking Accepted',
      `Your booking for ${booking.service.name} has been accepted`,
      { bookingId }
    );

    sendNotificationToUser(booking.customerId, {
      type: 'BOOKING_ACCEPTED',
      title: 'Booking Accepted',
      body: `Your booking for ${booking.service.name} has been accepted`,
      data: { bookingId },
    });

    notifyBookingUpdate(bookingId, { status: 'ACCEPTED' });

    return updatedBooking;
  }

  async rejectBooking(userId: string, bookingId: string, reason?: string) {
    const provider = await prisma.provider.findUnique({ where: { userId } });
    if (!provider) throw new AppError('Provider not found', 404);

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, providerId: provider.id },
      include: { service: true },
    });
    if (!booking) throw new AppError('Booking not found', 404);
    if (booking.status !== 'PENDING') throw new AppError('Cannot reject this booking', 400);

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'REJECTED', rejectedAt: new Date(), rejectedReason: reason },
    });

    // Notify customer
    await notificationService.createNotification(
      booking.customerId,
      'BOOKING_REJECTED',
      'Booking Declined',
      `Your booking for ${booking.service.name} was declined`,
      { bookingId, reason }
    );

    sendNotificationToUser(booking.customerId, {
      type: 'BOOKING_REJECTED',
      title: 'Booking Declined',
      body: `Your booking for ${booking.service.name} was declined`,
      data: { bookingId, reason },
    });

    notifyBookingUpdate(bookingId, { status: 'REJECTED', reason });

    return updatedBooking;
  }

  async updateBookingStatus(userId: string, bookingId: string, status: string) {
    const provider = await prisma.provider.findUnique({ where: { userId } });
    if (!provider) throw new AppError('Provider not found', 404);

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, providerId: provider.id },
      include: { service: true },
    });
    if (!booking) throw new AppError('Booking not found', 404);

    const updateData: Prisma.BookingUpdateInput = { status: status as BookingStatus };
    let notificationType = '';
    let notificationTitle = '';
    let notificationBody = '';

    if (status === 'PROVIDER_EN_ROUTE') {
      updateData.enRouteAt = new Date();
      notificationType = 'PROVIDER_EN_ROUTE';
      notificationTitle = 'Provider On The Way';
      notificationBody = 'Your provider is on the way to your location';
    }
    if (status === 'PROVIDER_ARRIVED') {
      updateData.arrivedAt = new Date();
      notificationType = 'PROVIDER_ARRIVED';
      notificationTitle = 'Provider Arrived';
      notificationBody = 'Your provider has arrived at your location';
    }
    if (status === 'IN_PROGRESS') {
      updateData.startedAt = new Date();
      notificationType = 'SERVICE_STARTED';
      notificationTitle = 'Service Started';
      notificationBody = `Your ${booking.service.name} session has started`;
    }
    if (status === 'COMPLETED') {
      updateData.completedAt = new Date();

      // Get provider with shop info
      const providerWithShop = await prisma.provider.findUnique({
        where: { id: provider.id },
        include: { shop: true },
      });

      if (providerWithShop?.shopId && providerWithShop.shop?.status === 'APPROVED') {
        // Shop-affiliated therapist: earnings go to shop
        await prisma.shop.update({
          where: { id: providerWithShop.shopId },
          data: {
            balance: { increment: booking.providerEarning },
            totalEarnings: { increment: booking.providerEarning },
          },
        });

        // Record shop earning in booking
        updateData.shop = { connect: { id: providerWithShop.shopId } };
        updateData.shopEarning = booking.providerEarning;

        // Update provider's completed count only (no balance)
        await prisma.provider.update({
          where: { id: provider.id },
          data: { completedBookings: { increment: 1 } },
        });
      } else {
        // Individual provider: earnings go to provider (existing logic)
        await prisma.provider.update({
          where: { id: provider.id },
          data: {
            balance: { increment: booking.providerEarning },
            totalEarnings: { increment: booking.providerEarning },
            completedBookings: { increment: 1 },
          },
        });
      }

      notificationType = 'SERVICE_COMPLETED';
      notificationTitle = 'Service Completed';
      notificationBody = `Your ${booking.service.name} session has been completed. Please leave a review!`;
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: updateData,
    });

    // Send notification to customer
    if (notificationType) {
      await notificationService.createNotification(
        booking.customerId,
        notificationType,
        notificationTitle,
        notificationBody,
        { bookingId }
      );

      sendNotificationToUser(booking.customerId, {
        type: notificationType,
        title: notificationTitle,
        body: notificationBody,
        data: { bookingId },
      });
    }

    notifyBookingUpdate(bookingId, { status });

    return updatedBooking;
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

    // Calculate ETA using Google Maps API
    const { calculateETA, estimateETA } = await import('../utils/maps.js');
    const origin = { lat: data.latitude, lng: data.longitude };
    const destination = { lat: booking.latitude, lng: booking.longitude };

    let eta = 15; // default
    const etaResult = await calculateETA(origin, destination);
    if (etaResult) {
      eta = etaResult.durationInTrafficMinutes || etaResult.durationMinutes;
    } else {
      eta = estimateETA(origin, destination);
    }

    await locationCache.setBookingLocation(bookingId, data.latitude, data.longitude, eta);
    await prisma.locationLog.create({
      data: { bookingId, providerId: provider.id, latitude: data.latitude, longitude: data.longitude, accuracy: data.accuracy },
    });

    // Update provider's last known location
    await prisma.provider.update({
      where: { id: provider.id },
      data: {
        lastLatitude: data.latitude,
        lastLongitude: data.longitude,
        lastLocationAt: new Date(),
      },
    });
  }

  async triggerSOS(userId: string, bookingId: string, data: SOSData) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: true,
        provider: { include: { user: true } },
      },
    });
    if (!booking) throw new AppError('Booking not found', 404);

    const isCustomer = booking.customerId === userId;
    const triggeringUser = isCustomer ? booking.customer : booking.provider.user;
    const otherPartyUserId = isCustomer ? booking.provider.userId : booking.customerId;

    console.log(`🆘 SOS triggered for booking ${bookingId} by user ${userId}`);

    // Create critical report
    await prisma.report.create({
      data: {
        bookingId,
        reporterId: userId,
        reportedId: isCustomer ? booking.providerId : booking.customerId,
        type: 'OTHER',
        severity: 'CRITICAL',
        description: `SOS triggered: ${data.message || 'Emergency'}`,
      },
    });

    // Get location for SMS
    const location = await locationCache.getBookingLocation(bookingId);
    const locationUrl = location
      ? `https://maps.google.com/?q=${location.lat},${location.lng}`
      : undefined;

    // Send SMS to emergency contact if available
    if (triggeringUser.emergencyPhone) {
      const { sendSOSAlert } = await import('../utils/sms.js');
      await sendSOSAlert(triggeringUser.emergencyPhone, {
        userName: `${triggeringUser.firstName} ${triggeringUser.lastName}`,
        bookingNumber: booking.bookingNumber,
        locationUrl,
      });
    }

    // Send push notification to the other party
    const { sendPushToUser } = await import('../utils/push.js');
    await sendPushToUser(otherPartyUserId, {
      title: 'Emergency Alert',
      body: `An SOS has been triggered for booking #${booking.bookingNumber}`,
      data: { bookingId, type: 'SOS' },
    });

    // Notify admins
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', status: 'ACTIVE' },
      select: { id: true },
    });

    for (const admin of admins) {
      await notificationService.createNotification(
        admin.id,
        'SYSTEM',
        'SOS Alert',
        `Emergency SOS triggered for booking #${booking.bookingNumber}`,
        { bookingId, severity: 'CRITICAL' }
      );

      await sendPushToUser(admin.id, {
        title: 'SOS Alert - Immediate Attention Required',
        body: `Emergency for booking #${booking.bookingNumber}`,
        data: { bookingId, type: 'SOS', severity: 'CRITICAL' },
      });
    }
  }
}

export const bookingService = new BookingService();
