// ============================================================================
// Scheduled Tasks Service - Booking Reminders
// ============================================================================

import { prisma } from '../config/database.js';
import { sendPushToUser } from '../utils/push.js';
import { format } from 'date-fns';

// Track which bookings have been notified to avoid duplicates
const notifiedBookings = new Set<string>();

/**
 * Check for bookings starting within 1 hour and send reminder notifications
 */
async function sendOneHourReminders() {
  try {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const fiftyMinutesFromNow = new Date(now.getTime() + 50 * 60 * 1000);

    // Find bookings starting in 50-60 minutes that haven't been notified
    // Using 50-60 minute window to ensure we catch them even with scheduler variance
    const upcomingBookings = await prisma.booking.findMany({
      where: {
        scheduledAt: {
          gte: fiftyMinutesFromNow,
          lte: oneHourFromNow,
        },
        status: {
          in: ['ACCEPTED'],
        },
        providerId: { not: null },
      },
      include: {
        provider: {
          include: {
            user: true,
          },
        },
        customer: true,
        service: true,
      },
    });

    for (const booking of upcomingBookings) {
      // Skip if already notified
      if (notifiedBookings.has(booking.id)) {
        continue;
      }

      const provider = booking.provider;
      const customer = booking.customer;
      const service = booking.service;

      if (!provider?.user || !customer || !service) {
        continue;
      }

      const scheduledTime = format(new Date(booking.scheduledAt), 'h:mm a');
      const customerName = `${customer.firstName} ${customer.lastName}`;

      // Send notification to provider
      await sendPushToUser(provider.user.id, {
        title: 'Upcoming Appointment - 1 Hour',
        body: `${service.name} with ${customerName} at ${scheduledTime}. Get ready!`,
        data: {
          type: 'booking_reminder',
          bookingId: booking.id,
        },
      });

      // Create notification record
      await prisma.notification.create({
        data: {
          userId: provider.user.id,
          type: 'booking_reminder',
          title: 'Upcoming Appointment - 1 Hour',
          body: `${service.name} with ${customerName} at ${scheduledTime}. Get ready!`,
          data: {
            bookingId: booking.id,
            serviceName: service.name,
            customerName,
            scheduledAt: booking.scheduledAt.toISOString(),
          },
          pushSent: true,
          pushSentAt: new Date(),
        },
      });

      // Mark as notified
      notifiedBookings.add(booking.id);

      console.log(`[Scheduler] Sent 1-hour reminder for booking ${booking.id} to provider ${provider.user.id}`);
    }

    // Clean up old entries (older than 2 hours)
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    for (const bookingId of notifiedBookings) {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: { scheduledAt: true },
      });
      if (booking && new Date(booking.scheduledAt) < twoHoursAgo) {
        notifiedBookings.delete(bookingId);
      }
    }
  } catch (error) {
    console.error('[Scheduler] Error sending reminders:', error);
  }
}

/**
 * Check for bookings starting within 15 minutes - urgent reminder
 */
async function sendFifteenMinuteReminders() {
  try {
    const now = new Date();
    const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);
    const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);

    const upcomingBookings = await prisma.booking.findMany({
      where: {
        scheduledAt: {
          gte: tenMinutesFromNow,
          lte: fifteenMinutesFromNow,
        },
        status: {
          in: ['ACCEPTED'],
        },
        providerId: { not: null },
      },
      include: {
        provider: {
          include: {
            user: true,
          },
        },
        customer: true,
        service: true,
      },
    });

    for (const booking of upcomingBookings) {
      const reminderId = `${booking.id}_15min`;
      if (notifiedBookings.has(reminderId)) {
        continue;
      }

      const provider = booking.provider;
      const customer = booking.customer;
      const service = booking.service;

      if (!provider?.user || !customer || !service) {
        continue;
      }

      const customerName = `${customer.firstName} ${customer.lastName}`;

      await sendPushToUser(provider.user.id, {
        title: 'Starting Soon - 15 Minutes!',
        body: `${service.name} with ${customerName}. Time to head out!`,
        data: {
          type: 'booking_urgent',
          bookingId: booking.id,
        },
      });

      await prisma.notification.create({
        data: {
          userId: provider.user.id,
          type: 'booking_reminder',
          title: 'Starting Soon - 15 Minutes!',
          body: `${service.name} with ${customerName}. Time to head out!`,
          data: {
            bookingId: booking.id,
            urgent: true,
          },
          pushSent: true,
          pushSentAt: new Date(),
        },
      });

      notifiedBookings.add(reminderId);
      console.log(`[Scheduler] Sent 15-min urgent reminder for booking ${booking.id}`);
    }
  } catch (error) {
    console.error('[Scheduler] Error sending 15-min reminders:', error);
  }
}

let schedulerInterval: NodeJS.Timeout | null = null;

/**
 * Start the scheduler - runs every 5 minutes
 */
export function startScheduler() {
  if (schedulerInterval) {
    console.log('[Scheduler] Already running');
    return;
  }

  console.log('[Scheduler] Starting booking reminder scheduler');

  // Run immediately on start
  sendOneHourReminders();
  sendFifteenMinuteReminders();

  // Then run every 5 minutes
  schedulerInterval = setInterval(() => {
    sendOneHourReminders();
    sendFifteenMinuteReminders();
  }, 5 * 60 * 1000);
}

/**
 * Stop the scheduler
 */
export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[Scheduler] Stopped');
  }
}
