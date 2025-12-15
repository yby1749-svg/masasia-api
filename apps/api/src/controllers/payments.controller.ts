// ============================================================================
// Payments Controller
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { paymentService } from '../services/payments.service.js';

// Validation schemas
const createPaymentIntentSchema = z.object({
  bookingId: z.string(),
  amount: z.number().positive(),
  description: z.string().optional(),
});

const attachPaymentMethodSchema = z.object({
  paymentMethodId: z.string(),
});

const refundSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().min(1),
});

// Handle PayMongo webhook
export const handleWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const signature = req.headers['paymongo-signature'] as string || '';

    // Handle both raw buffer (production) and parsed JSON (tests)
    let rawBody: string;
    let body: unknown;

    if (Buffer.isBuffer(req.body)) {
      rawBody = req.body.toString('utf8');
      body = JSON.parse(rawBody);
    } else if (typeof req.body === 'object') {
      // Already parsed (in tests or when raw middleware wasn't applied)
      body = req.body;
      rawBody = JSON.stringify(req.body);
    } else {
      rawBody = String(req.body);
      body = JSON.parse(rawBody);
    }

    await paymentService.handleWebhook(body as Parameters<typeof paymentService.handleWebhook>[0], signature, rawBody);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// Handle payment callback (redirect from GCash/PayMaya)
export const handleCallback = async (req: Request, res: Response): Promise<void> => {
  const { status, payment_intent_id } = req.query;

  // Redirect to mobile app with deep link
  const appScheme = process.env.APP_SCHEME || 'masasia';
  const redirectUrl = `${appScheme}://payment/callback?status=${status}&payment_intent_id=${payment_intent_id}`;

  res.redirect(redirectUrl);
};

// Create payment intent
export const createPaymentIntent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = createPaymentIntentSchema.parse(req.body);
    const result = await paymentService.createPaymentIntent({
      bookingId: data.bookingId,
      amount: data.amount,
      description: data.description || 'MASASIA Service Payment',
    });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// Attach payment method to intent
export const attachPaymentMethod = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { paymentIntentId } = req.params;
    const data = attachPaymentMethodSchema.parse(req.body);
    const result = await paymentService.attachPaymentMethod(paymentIntentId, data.paymentMethodId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// Get payment status
export const getPaymentStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { paymentIntentId } = req.params;
    const result = await paymentService.getPaymentStatus(paymentIntentId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// Request refund
export const requestRefund = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { paymentId } = req.params;
    const data = refundSchema.parse(req.body);
    const result = await paymentService.processRefund({
      paymentId,
      amount: data.amount,
      reason: data.reason,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// Get payment detail
export const getPaymentDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payment = await paymentService.getPaymentDetail(req.user!.id, req.params.paymentId);
    res.json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
};
