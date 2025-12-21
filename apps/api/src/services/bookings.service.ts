// ============================================================================
// Bookings Service
// ============================================================================

import { Prisma, BookingStatus } from '@prisma/client';
import { prisma } from '../config/database.js';
import { locationCache } from '../config/redis.js';
import { AppError } from '../middleware/errorHandler.js';
import { paymentService } from './payments.service.js';
import { notificationService } from './notifications.service.js';
import * as walletService from './wallet.service.js';
import { sendNotificationToUser, notifyBookingUpdate, notifyBookingCancelled } from '../socket/index.js';
import { sendPushToUser } from '../utils/push.js';
import { format, startOfDay, addMinutes, parse } from 'date-fns';

interface BookingQuery {
  limit?: string;
}

interface CreateBookingData {
  providerId: string;
  serviceId: string;
  duration: number;
  scheduledAt: string;
  addressId?: string;
  addressText?: string;
  addressNotes?: string;
  latitude?: number;
  longitude?: number;
  travelFee?: number;
  customerNotes?: string;
  paymentMethod?: 'CARD' | 'GCASH' | 'PAYMAYA' | 'CASH';
}

interface SOSData {
  message?: string;
}

class BookingService {
  async validateAvailability(providerId: string, scheduledAt: Date, duration: number) {
    // Server runs in Asia/Manila timezone, so format() already converts UTC to local time
    const dayOfWeek = scheduledAt.getDay(); // Gets day in local (Manila) timezone
    const timeStr = format(scheduledAt, 'HH:mm'); // Formats in local (Manila) timezone
    const dateOnly = startOfDay(scheduledAt);
    const endTime = addMinutes(scheduledAt, duration);
    const endTimeStr = format(endTime, 'HH:mm');

    // Check if provider has any availability configured
    const hasAvailabilityConfig = await prisma.providerAvailability.count({
      where: { providerId },
    });

    // Only validate availability if provider has configured their schedule
    if (hasAvailabilityConfig > 0) {
      // 1. Check if provider works on this day
      const availability = await prisma.providerAvailability.findFirst({
        where: { providerId, dayOfWeek, isAvailable: true },
      });
      if (!availability) {
        throw new AppError('Provider is not available on this day', 400);
      }

      // 2. Check if start time is within working hours
      if (timeStr < availability.startTime) {
        throw new AppError(`Provider is not available before ${availability.startTime}`, 400);
      }

      // 3. Check if end time (including service duration) is within working hours
      if (endTimeStr > availability.endTime) {
        throw new AppError(`Service would end after provider's working hours (${availability.endTime})`, 400);
      }
    }

    // 4. Check if date is blocked (always check this)
    const blocked = await prisma.providerBlockedDate.findFirst({
      where: { providerId, date: dateOnly },
    });
    if (blocked) {
      throw new AppError('Provider is unavailable on this date', 400);
    }

    // 5. Check for conflicting bookings (always check this)
    // New booking: [scheduledAt, scheduledAt + duration]
    const newBookingEnd = new Date(scheduledAt.getTime() + duration * 60 * 1000);
    // Only check bookings that could possibly overlap (max 2 hours before new booking start)
    const earliestConflict = new Date(scheduledAt.getTime() - 2 * 60 * 60 * 1000);

    // Find bookings that could potentially overlap
    const conflictingBookings = await prisma.booking.findMany({
      where: {
        providerId,
        status: { in: ['PENDING', 'ACCEPTED', 'PROVIDER_EN_ROUTE', 'PROVIDER_ARRIVED', 'IN_PROGRESS'] },
        scheduledAt: {
          gte: earliestConflict, // Don't check bookings that started too long ago
          lt: newBookingEnd,     // And starts before new booking ends
        },
      },
      select: { id: true, scheduledAt: true, duration: true },
    });

    // Check if any existing booking actually overlaps
    const hasConflict = conflictingBookings.some(existing => {
      const existingEnd = new Date(existing.scheduledAt.getTime() + existing.duration * 60 * 1000);
      // Conflict if: new.start < existing.end
      return scheduledAt < existingEnd;
    });

    if (hasConflict) {
      throw new AppError('Provider already has a booking at this time', 400);
    }
  }

  async listBookings(userId: string, role: string, query: BookingQuery) {
    const isProvider = role === 'provider';
    const hiddenFlag = isProvider ? '[HIDDEN_BY_PROVIDER]' : '[HIDDEN_BY_CUSTOMER]';

    // Build base where clause - handle null notes (NOT contains doesn't work with null)
    const baseWhere = isProvider
      ? {
          provider: { userId },
          OR: [
            { providerNotes: null },
            { NOT: { providerNotes: { contains: hiddenFlag } } },
          ],
        }
      : {
          customerId: userId,
          OR: [
            { customerNotes: null },
            { NOT: { customerNotes: { contains: hiddenFlag } } },
          ],
        };

    // Add status filter if provided
    const where = query.status
      ? { ...baseWhere, status: query.status }
      : baseWhere;

    const bookings = await prisma.booking.findMany({
      where,
      include: { service: true, provider: { include: { user: true } }, customer: true },
      orderBy: { createdAt: 'desc' },
      take: parseInt(query.limit || '100'),
    });
    return { data: bookings, pagination: { page: 1, limit: 100, total: bookings.length } };
  }

  async createBooking(customerId: string, data: CreateBookingData) {
    const provider = await prisma.provider.findUnique({
      where: { id: data.providerId },
      include: { services: { where: { serviceId: data.serviceId } } },
    });
    if (!provider || provider.status !== 'APPROVED') throw new AppError('Provider not found', 404);

    const providerService = provider.services[0];
    if (!providerService) throw new AppError('Service not available', 400);

    // Validate provider availability
    const scheduledAt = new Date(data.scheduledAt);
    await this.validateAvailability(data.providerId, scheduledAt, data.duration);

    // Get address details if addressId is provided
    let addressText = data.addressText;
    let latitude = data.latitude;
    let longitude = data.longitude;

    if (data.addressId && !addressText) {
      const address = await prisma.address.findUnique({
        where: { id: data.addressId },
      });
      if (!address) throw new AppError('Address not found', 404);
      if (address.userId !== customerId) throw new AppError('Address does not belong to user', 403);

      // Construct address text from address fields
      const parts: (string | null)[] = [address.addressLine1];
      if (address.addressLine2) parts.push(address.addressLine2);
      parts.push(address.city, address.province, address.postalCode);
      addressText = parts.filter((p): p is string => Boolean(p)).join(', ');
      latitude = address.latitude;
      longitude = address.longitude;
    }

    if (!addressText) throw new AppError('Address text is required', 400);
    if (latitude === undefined || longitude === undefined) {
      throw new AppError('Address coordinates are required', 400);
    }

    // Get customer info for notification
    const customer = await prisma.user.findUnique({
      where: { id: customerId },
      select: { firstName: true, lastName: true },
    });

    const serviceAmount = data.duration === 90 ? providerService.price90 || providerService.price60 * 1.5 :
                          providerService.price120 || providerService.price60 * 2;

    const travelFee = data.travelFee || 0;
    const totalAmount = serviceAmount + travelFee;

    // Calculate earnings based on whether provider belongs to a shop
    // Shop therapist: Platform 8%, Shop 37%, Therapist 55%
    // Independent: Platform 8%, Therapist 92%
    const providerWithShop = await prisma.provider.findUnique({
      where: { id: provider.id },
      include: { shop: true },
    });

    const isShopAffiliated = providerWithShop?.shopId && providerWithShop.shop?.status === 'APPROVED';

    let platformFee: number;
    let providerEarning: number;
    let shopEarning: number | null = null;

    if (isShopAffiliated) {
      // Shop-affiliated therapist
      platformFee = serviceAmount * 0.08;
      shopEarning = serviceAmount * 0.37;
      providerEarning = serviceAmount * 0.55 + travelFee; // Therapist gets travel fee
    } else {
      // Independent therapist
      platformFee = serviceAmount * 0.08;
      providerEarning = serviceAmount * 0.92 + travelFee;
    }

    const booking = await prisma.booking.create({
      data: {
        bookingNumber: `CM${Date.now().toString(36).toUpperCase()}`,
        customerId,
        providerId: provider.id,
        serviceId: data.serviceId,
        duration: data.duration,
        scheduledAt: new Date(data.scheduledAt),
        addressId: data.addressId,
        addressText,
        addressNotes: data.addressNotes,
        latitude,
        longitude,
        serviceAmount,
        travelFee,
        totalAmount,
        platformFee,
        providerEarning,
        shopId: isShopAffiliated ? providerWithShop.shopId : null,
        shopEarning,
        customerNotes: data.customerNotes,
      },
      include: { service: true, provider: { include: { user: true } } },
    });

    // Create payment based on payment method
    let payment;
    const paymentMethod = data.paymentMethod || 'CARD';

    if (paymentMethod === 'CASH') {
      // For cash payments, create a payment record without PayMongo
      payment = await prisma.payment.create({
        data: {
          bookingId: booking.id,
          amount: totalAmount,
          method: 'CASH',
          status: 'PENDING',
        },
      });
    } else {
      // For online payments (CARD, GCASH, PAYMAYA), create PayMongo intent
      payment = await paymentService.createPaymentIntent({
        bookingId: booking.id,
        amount: totalAmount,
        description: `${booking.service.name} - ${data.duration} minutes`,
        method: paymentMethod,
      });
    }

    // Notify provider about new booking request
    const customerName = customer ? `${customer.firstName} ${customer.lastName}` : 'A customer';
    await notificationService.createNotification(
      provider.userId,
      'BOOKING_REQUEST',
      'New Booking Request',
      `${customerName} requested a ${booking.service.name} session`,
      { bookingId: booking.id }
    );

    sendNotificationToUser(provider.userId, {
      type: 'BOOKING_REQUEST',
      title: 'New Booking Request',
      body: `${customerName} requested a ${booking.service.name} session`,
      data: { bookingId: booking.id },
    });

    await sendPushToUser(provider.userId, {
      title: 'New Booking Request',
      body: `${customerName} requested a ${booking.service.name} session`,
      data: { bookingId: booking.id, type: 'new_booking' },
    });

    return { booking, payment };
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

    await sendPushToUser(notifyUserId, {
      title: 'Booking Cancelled',
      body: `Your booking has been cancelled by the ${cancelledBy}`,
      data: { bookingId, type: 'booking_cancelled' },
    });

    notifyBookingCancelled(bookingId, reason);

    return updatedBooking;
  }

  async acceptBooking(userId: string, bookingId: string) {
    const provider = await prisma.provider.findUnique({
      where: { userId },
      include: { shop: true },
    });
    if (!provider) throw new AppError('Provider not found', 404);

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, providerId: provider.id },
      include: { service: true, payment: true },
    });
    if (!booking) throw new AppError('Booking not found', 404);
    if (booking.status !== 'PENDING') throw new AppError('Cannot accept this booking', 400);

    // Check if this is a CASH payment - if so, deduct platform fee from wallet
    const isCashPayment = booking.payment?.method === 'CASH';

    if (isCashPayment) {
      const serviceAmount = booking.serviceAmount;

      if (provider.shopId && provider.shop?.status === 'APPROVED') {
        // Shop-affiliated therapist: deduct from shop wallet
        await walletService.deductShopPlatformFee(provider.shopId, bookingId, serviceAmount);
      } else {
        // Independent therapist: deduct from provider wallet
        await walletService.deductProviderPlatformFee(provider.id, bookingId, serviceAmount);
      }
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
    });

    // Notify customer
    await notificationService.createNotification(
      booking.customerId,
      'BOOKING_ACCEPTED',
      'Booking Confirmed',
      `Your booking for ${booking.service.name} has been accepted`,
      { bookingId }
    );

    sendNotificationToUser(booking.customerId, {
      type: 'BOOKING_ACCEPTED',
      title: 'Booking Confirmed',
      body: `Your booking for ${booking.service.name} has been accepted`,
      data: { bookingId },
    });

    await sendPushToUser(booking.customerId, {
      title: 'Booking Confirmed',
      body: `Your booking for ${booking.service.name} has been accepted`,
      data: { bookingId, type: 'booking_accepted' },
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

    await sendPushToUser(booking.customerId, {
      title: 'Booking Declined',
      body: `Your booking for ${booking.service.name} was declined`,
      data: { bookingId, type: 'booking_rejected' },
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

      // Earnings are pre-calculated in the booking (providerEarning, shopEarning)
      // Shop therapist: Platform 8%, Shop 37%, Therapist 55%
      // Independent: Platform 8%, Therapist 92%

      if (booking.shopId && booking.shopEarning) {
        // Shop-affiliated therapist: distribute to both shop and provider
        await prisma.shop.update({
          where: { id: booking.shopId },
          data: {
            balance: { increment: booking.shopEarning },
            totalEarnings: { increment: booking.shopEarning },
          },
        });

        // Provider gets their 55% share
        await prisma.provider.update({
          where: { id: provider.id },
          data: {
            balance: { increment: booking.providerEarning },
            totalEarnings: { increment: booking.providerEarning },
            completedBookings: { increment: 1 },
          },
        });
      } else {
        // Individual provider: gets 92% (all non-platform earnings)
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

      await sendPushToUser(booking.customerId, {
        title: notificationTitle,
        body: notificationBody,
        data: { bookingId, type: `booking_${status.toLowerCase()}` },
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

  async hideBooking(userId: string, bookingId: string) {
    // Check if booking exists and belongs to the user
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        OR: [
          { customerId: userId },
          { provider: { userId } },
        ],
      },
    });

    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    // Only allow hiding completed, cancelled, or rejected bookings
    const hidableStatuses = ['COMPLETED', 'CANCELLED', 'REJECTED'];
    if (!hidableStatuses.includes(booking.status)) {
      throw new AppError('Can only hide completed or cancelled bookings', 400);
    }

    // Soft delete by updating a hidden flag
    // For now, we'll just mark it in the customerNotes/providerNotes field
    // In production, you'd add a hiddenByCustomer/hiddenByProvider boolean field
    const isCustomer = booking.customerId === userId;

    await prisma.booking.update({
      where: { id: bookingId },
      data: isCustomer
        ? { customerNotes: (booking.customerNotes || '') + ' [HIDDEN_BY_CUSTOMER]' }
        : { providerNotes: (booking.providerNotes || '') + ' [HIDDEN_BY_PROVIDER]' },
    });

    return { success: true };
  }
}

export const bookingService = new BookingService();
