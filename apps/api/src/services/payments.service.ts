// ============================================================================
// Payments Service - PayMongo Integration
// ============================================================================

import axios from 'axios';
import crypto from 'crypto';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { notificationService } from './notifications.service.js';
import { sendNotificationToUser, sendBookingRequest } from '../socket/index.js';

const PAYMONGO_API_URL = 'https://api.paymongo.com/v1';
const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY || '';
const PAYMONGO_WEBHOOK_SECRET = process.env.PAYMONGO_WEBHOOK_SECRET || '';

// PayMongo API client
const paymongoClient = axios.create({
  baseURL: PAYMONGO_API_URL,
  headers: {
    'Authorization': `Basic ${Buffer.from(PAYMONGO_SECRET_KEY + ':').toString('base64')}`,
    'Content-Type': 'application/json',
  },
});

interface CreatePaymentIntentData {
  bookingId: string;
  amount: number;
  description: string;
  metadata?: Record<string, string>;
  method?: 'CARD' | 'GCASH' | 'PAYMAYA';
}

interface WebhookEvent {
  data: {
    id: string;
    type: string;
    attributes: {
      type: string;
      data: {
        id: string;
        type: string;
        attributes: {
          amount: number;
          status: string;
          payment_intent_id?: string;
          payment_method_used?: string;
          billing?: {
            name?: string;
            email?: string;
          };
          last_payment_error?: {
            message?: string;
          };
        };
      };
    };
  };
}

interface RefundData {
  paymentId: string;
  amount?: number;
  reason: string;
}

class PaymentService {
  // Create a PayMongo Payment Intent
  async createPaymentIntent(data: CreatePaymentIntentData) {
    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
      include: { customer: true, service: true },
    });

    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    // If PayMongo is not configured, create mock payment for development/testing
    const isMockMode = !PAYMONGO_SECRET_KEY ||
                       PAYMONGO_SECRET_KEY === '' ||
                       PAYMONGO_SECRET_KEY.includes('xxx') ||
                       process.env.NODE_ENV === 'test';

    if (isMockMode) {
      const mockIntentId = `pi_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const payment = await prisma.payment.create({
        data: {
          bookingId: data.bookingId,
          amount: data.amount,
          currency: 'PHP',
          paymongoIntentId: mockIntentId,
          method: data.method || 'CARD',
          status: 'PENDING',
        },
      });

      console.log(`[Payment] Created mock payment intent: ${mockIntentId}`);

      return {
        id: payment.id,
        paymentId: payment.id,
        paymentIntentId: mockIntentId,
        clientKey: `pk_test_mock_${mockIntentId}`,
        status: 'awaiting_payment_method',
        checkoutUrl: `${process.env.API_URL || 'http://localhost:3000'}/api/v1/payments/mock-checkout/${payment.id}`,
        method: data.method || 'CARD',
      };
    }

    try {
      // Create Payment Intent in PayMongo
      const response = await paymongoClient.post('/payment_intents', {
        data: {
          attributes: {
            amount: Math.round(data.amount * 100), // Convert to centavos
            payment_method_allowed: ['card', 'gcash', 'paymaya', 'grab_pay'],
            payment_method_options: {
              card: {
                request_three_d_secure: 'any',
              },
            },
            currency: 'PHP',
            description: data.description,
            statement_descriptor: 'MASASIA',
            metadata: {
              booking_id: data.bookingId,
              customer_id: booking.customerId,
              ...data.metadata,
            },
          },
        },
      });

      const paymentIntent = response.data.data;

      // Create payment record in database
      const payment = await prisma.payment.create({
        data: {
          bookingId: data.bookingId,
          amount: data.amount,
          currency: 'PHP',
          paymongoIntentId: paymentIntent.id,
          method: data.method || 'CARD',
          status: 'PENDING',
        },
      });

      return {
        id: payment.id,
        paymentId: payment.id,
        paymentIntentId: paymentIntent.id,
        clientKey: paymentIntent.attributes.client_key,
        status: paymentIntent.attributes.status,
        checkoutUrl: paymentIntent.attributes.next_action?.redirect?.url,
        method: data.method || 'CARD',
      };
    } catch (error) {
      console.error('PayMongo create intent error:', error);
      throw new AppError('Failed to create payment intent', 500);
    }
  }

  // Attach a payment method to a payment intent
  async attachPaymentMethod(paymentIntentId: string, paymentMethodId: string) {
    try {
      const response = await paymongoClient.post(
        `/payment_intents/${paymentIntentId}/attach`,
        {
          data: {
            attributes: {
              payment_method: paymentMethodId,
              return_url: `${process.env.API_URL}/api/v1/payments/callback`,
            },
          },
        }
      );

      return response.data.data;
    } catch (error) {
      console.error('PayMongo attach error:', error);
      throw new AppError('Failed to attach payment method', 500);
    }
  }

  // Verify webhook signature
  private verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!PAYMONGO_WEBHOOK_SECRET) {
      console.warn('Warning: PayMongo webhook secret not configured');
      return true; // Skip verification in development
    }

    try {
      const parts = signature.split(',');
      const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1];
      const signatures = parts
        .filter(p => p.startsWith('te=') || p.startsWith('li='))
        .map(p => p.split('=')[1]);

      if (!timestamp || signatures.length === 0) {
        return false;
      }

      const signedPayload = `${timestamp}.${payload}`;
      const expectedSignature = crypto
        .createHmac('sha256', PAYMONGO_WEBHOOK_SECRET)
        .update(signedPayload)
        .digest('hex');

      return signatures.some(sig =>
        crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSignature))
      );
    } catch {
      return false;
    }
  }

  // Handle PayMongo webhook events
  async handleWebhook(body: WebhookEvent, signature: string, rawBody: string) {
    // Skip signature verification in test mode or if no secret configured
    if (process.env.NODE_ENV !== 'test' && PAYMONGO_WEBHOOK_SECRET) {
      if (!this.verifyWebhookSignature(rawBody, signature)) {
        throw new AppError('Invalid webhook signature', 401);
      }
    }

    // Handle case where body structure might be different
    if (!body?.data?.attributes) {
      console.log('📥 PayMongo webhook received with invalid structure');
      return; // Return success but do nothing
    }

    const event = body.data.attributes;
    const eventType = event.type;
    const paymentData = event.data?.attributes;

    if (!paymentData) {
      console.log('📥 PayMongo webhook received without payment data');
      return;
    }

    console.log(`📥 PayMongo webhook received: ${eventType}`);

    switch (eventType) {
      case 'payment.paid': {
        const paymentIntentId = paymentData.payment_intent_id;
        if (!paymentIntentId) break;

        const payment = await prisma.payment.findFirst({
          where: { paymongoIntentId: paymentIntentId },
          include: { booking: { include: { service: true, customer: true, provider: true } } },
        });

        if (payment) {
          // Map PayMongo payment method to our enum
          const methodMap: Record<string, PaymentMethod> = {
            'card': 'CREDIT_CARD',
            'gcash': 'GCASH',
            'paymaya': 'PAYMAYA',
            'grab_pay': 'GRAB_PAY',
          };

          const method = methodMap[paymentData.payment_method_used || 'card'] || 'CREDIT_CARD';

          // Update payment status
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'COMPLETED',
              method,
              paidAt: new Date(),
              paymongoPaymentId: event.data.id,
            },
          });

          // Update booking status to PENDING (awaiting provider acceptance)
          await prisma.booking.update({
            where: { id: payment.bookingId },
            data: { status: 'PENDING' },
          });

          // Notify provider of new booking
          const booking = payment.booking;
          if (booking.provider) {
            // Create notification in database
            await notificationService.createNotification(
              booking.provider.userId,
              'BOOKING_REQUEST',
              'New Booking Request',
              `You have a new booking request for ${booking.service.name}`,
              { bookingId: booking.id }
            );

            // Send real-time notification via Socket.IO
            sendNotificationToUser(booking.provider.userId, {
              type: 'BOOKING_REQUEST',
              title: 'New Booking Request',
              body: `You have a new booking request for ${booking.service.name}`,
              data: { bookingId: booking.id },
            });

            // Send booking details
            sendBookingRequest(booking.provider.userId, {
              id: booking.id,
              customer: { firstName: booking.customer.firstName },
              service: { name: booking.service.name },
              duration: booking.duration,
              totalAmount: booking.totalAmount,
              scheduledAt: booking.scheduledAt.toISOString(),
              addressText: booking.addressText,
            });
          }

          console.log(`✅ Payment completed for booking ${payment.bookingId}`);
        }
        break;
      }

      case 'payment.failed': {
        const paymentIntentId = paymentData.payment_intent_id;
        if (!paymentIntentId) break;

        const payment = await prisma.payment.findFirst({
          where: { paymongoIntentId: paymentIntentId },
        });

        if (payment) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'FAILED',
              failedAt: new Date(),
              failureReason: paymentData.last_payment_error?.message || 'Payment failed',
            },
          });

          console.log(`❌ Payment failed for booking ${payment.bookingId}`);
        }
        break;
      }

      default:
        console.log(`Unhandled webhook event: ${eventType}`);
    }
  }

  // Process refund
  async processRefund(data: RefundData) {
    const payment = await prisma.payment.findUnique({
      where: { id: data.paymentId },
      include: { booking: true },
    });

    if (!payment) {
      throw new AppError('Payment not found', 404);
    }

    if (payment.status !== 'COMPLETED') {
      throw new AppError('Can only refund completed payments', 400);
    }

    if (!payment.paymongoPaymentId) {
      throw new AppError('No PayMongo payment ID found', 400);
    }

    const refundAmount = data.amount || payment.amount;

    if (refundAmount > payment.amount - payment.refundedAmount) {
      throw new AppError('Refund amount exceeds remaining payment', 400);
    }

    try {
      // Create refund in PayMongo
      await paymongoClient.post('/refunds', {
        data: {
          attributes: {
            amount: Math.round(refundAmount * 100),
            payment_id: payment.paymongoPaymentId,
            reason: data.reason,
            metadata: {
              booking_id: payment.bookingId,
            },
          },
        },
      });

      // Update payment record
      const newRefundedAmount = payment.refundedAmount + refundAmount;
      const newStatus: PaymentStatus = newRefundedAmount >= payment.amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED';

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: newStatus,
          refundedAmount: newRefundedAmount,
          refundedAt: new Date(),
          refundReason: data.reason,
        },
      });

      // Update booking status
      await prisma.booking.update({
        where: { id: payment.bookingId },
        data: { status: 'CANCELLED' },
      });

      console.log(`💰 Refund processed for payment ${payment.id}: ${refundAmount} PHP`);

      return { success: true, refundedAmount: refundAmount };
    } catch (error) {
      console.error('PayMongo refund error:', error);
      throw new AppError('Failed to process refund', 500);
    }
  }

  // Get payment details
  async getPaymentDetail(userId: string, paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
          include: {
            customer: { select: { id: true, firstName: true, lastName: true } },
            provider: { select: { id: true, userId: true } },
          },
        },
      },
    });

    if (!payment) {
      throw new AppError('Payment not found', 404);
    }

    // Verify user has access to this payment
    const isCustomer = payment.booking.customerId === userId;
    const isProvider = payment.booking.provider.userId === userId;

    if (!isCustomer && !isProvider) {
      throw new AppError('Access denied', 403);
    }

    return payment;
  }

  // Get payment status from PayMongo
  async getPaymentStatus(paymentIntentId: string) {
    try {
      const response = await paymongoClient.get(`/payment_intents/${paymentIntentId}`);
      return response.data.data.attributes;
    } catch (error) {
      console.error('PayMongo status check error:', error);
      throw new AppError('Failed to check payment status', 500);
    }
  }
}

export const paymentService = new PaymentService();
