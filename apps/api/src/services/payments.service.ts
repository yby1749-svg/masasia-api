// ============================================================================
// Payments Service - Placeholder
// ============================================================================

import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

interface WebhookBody {
  data: {
    attributes: {
      type: string;
      data: {
        attributes: {
          payment_intent_id: string;
        };
      };
    };
  };
}

class PaymentService {
  async handleWebhook(body: WebhookBody, _signature: string) {
    // TODO: Verify PayMongo webhook signature
    const event = body.data;
    
    if (event.attributes.type === 'payment.paid') {
      const paymentIntentId = event.attributes.data.attributes.payment_intent_id;
      const payment = await prisma.payment.findFirst({ where: { paymongoIntentId: paymentIntentId } });
      if (payment) {
        await prisma.payment.update({ where: { id: payment.id }, data: { status: 'COMPLETED', paidAt: new Date() } });
        await prisma.booking.update({ where: { id: payment.bookingId }, data: { status: 'PENDING' } });
        // TODO: Send notification to provider
      }
    }
  }

  async getPaymentDetail(userId: string, paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { booking: true },
    });
    if (!payment) throw new AppError('Payment not found', 404);
    return payment;
  }
}

export const paymentService = new PaymentService();
