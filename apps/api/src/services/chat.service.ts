import { prisma } from '../config/database.js';
import { sendPushToUser } from '../utils/push.js';

export const chatService = {
  async getMessages(bookingId: string, userId: string) {
    // Verify user has access to this booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        provider: true,
      },
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    // Check if user is customer or provider
    const isCustomer = booking.customerId === userId;
    const isProvider = booking.provider?.userId === userId;

    if (!isCustomer && !isProvider) {
      throw new Error('Access denied');
    }

    // Get messages
    const messages = await prisma.message.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'asc' },
    });

    return messages.map((msg) => ({
      ...msg,
      isOwn: msg.senderId === userId,
    }));
  },

  async sendMessage(bookingId: string, senderId: string, content: string) {
    // Verify user has access to this booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        provider: true,
        customer: true,
      },
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    // Check if user is customer or provider
    const isCustomer = booking.customerId === senderId;
    const isProvider = booking.provider?.userId === senderId;

    if (!isCustomer && !isProvider) {
      throw new Error('Access denied');
    }

    // Check booking status - only allow chat during active booking
    const allowedStatuses = ['ACCEPTED', 'PROVIDER_EN_ROUTE', 'PROVIDER_ARRIVED', 'IN_PROGRESS'];
    if (!allowedStatuses.includes(booking.status)) {
      throw new Error('Chat is only available for active bookings');
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        bookingId,
        senderId,
        content,
      },
    });

    // Send push notification to other party
    const recipientId = isCustomer ? booking.provider?.userId : booking.customerId;
    const senderName = isCustomer
      ? `${booking.customer.firstName || 'Customer'}`
      : (booking.provider?.displayName || 'Therapist');

    if (recipientId) {
      // Send push notification asynchronously (don't await to not slow down response)
      sendPushToUser(recipientId, {
        title: `New message from ${senderName}`,
        body: content.length > 100 ? content.substring(0, 97) + '...' : content,
        data: {
          type: 'chat_message',
          bookingId,
          senderId,
        },
      }).catch((error) => {
        console.error('[Chat] Failed to send push notification:', error);
      });
    }

    return {
      ...message,
      isOwn: true,
    };
  },

  async markAsRead(bookingId: string, userId: string) {
    // Verify user has access to this booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        provider: true,
      },
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    // Mark all messages from other party as read
    await prisma.message.updateMany({
      where: {
        bookingId,
        senderId: { not: userId },
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { success: true };
  },

  async getUnreadCount(bookingId: string, userId: string) {
    const count = await prisma.message.count({
      where: {
        bookingId,
        senderId: { not: userId },
        isRead: false,
      },
    });

    return count;
  },
};
