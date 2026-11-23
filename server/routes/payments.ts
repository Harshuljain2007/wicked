import crypto from 'crypto';
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { attachUser, type AuthenticatedRequest } from '../lib/authMiddleware.ts';
import { catalogStore } from '../lib/catalogStore.ts';
import { SERVER_CONFIG } from '../lib/config.ts';
import {
  createRazorpayOrder,
  signTestSandboxPayment,
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
} from '../lib/razorpay.ts';
import { paymentRateLimiter } from '../lib/rateLimiters.ts';
import {
  buildOrderPlacedSms,
  buildOwnerNewOrderSms,
  buildPaymentConfirmedSms,
  sendSms,
} from '../lib/sms.ts';

export const paymentsRouter = Router();

const addressSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email().max(180),
  phone: z.string().min(10).max(15),
  line1: z.string().min(4).max(240),
  city: z.string().min(2).max(80),
  state: z.string().min(2).max(80),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/),
});

const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(2).max(120),
        color: z.string().min(1).max(60),
        size: z.string().min(1).max(30),
        quantity: z.number().int().min(1).max(10),
      })
    )
    .min(1)
    .max(30),
  couponCode: z.string().max(32).optional(),
  deliveryMethod: z.enum(['standard', 'express']).default('standard'),
  isOutfitBundle: z.boolean().optional(),
  giftNote: z.string().trim().max(240).optional(),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Enter a valid 15-character GSTIN.')
    .optional(),
  shippingAddress: addressSchema,
});

paymentsRouter.post(
  '/create-order',
  paymentRateLimiter,
  attachUser,
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Please complete all required shipping fields.', details: parsed.error.flatten() });
      return;
    }

    const calc = catalogStore.recalculateCart(
      parsed.data.items,
      parsed.data.couponCode,
      parsed.data.deliveryMethod,
      Boolean(parsed.data.isOutfitBundle)
    );

    if (calc.error) {
      res.status(400).json({ error: calc.error });
      return;
    }

    try {
      const receipt = `rcpt_${Date.now()}`;
      const rzpOrder = await createRazorpayOrder({
        amountPaise: calc.totalPaise,
        receipt,
        notes: {
          customerEmail: parsed.data.shippingAddress.email,
          pincode: parsed.data.shippingAddress.pincode,
        },
      });

      const userId = req.user?.uid || `guest_${crypto.randomBytes(6).toString('hex')}`;
      const order = catalogStore.createOrder({
        userId,
        paymentMethod: 'razorpay',
        deliveryMethod: parsed.data.deliveryMethod,
        razorpayOrderId: rzpOrder.razorpayOrderId,
        subtotal: calc.subtotal,
        discount: calc.discount,
        shippingFee: calc.shippingFee,
        gstAmount: calc.gstAmount,
        total: calc.total,
        couponCode: calc.appliedCoupon,
        giftNote: parsed.data.giftNote || undefined,
        gstin: parsed.data.gstin || undefined,
        items: calc.items,
        shippingAddress: parsed.data.shippingAddress,
      });

      const orderToken = catalogStore.createOrderAccessToken(order.id);
      res.json({
        orderId: order.id,
        orderToken,
        razorpayOrderId: rzpOrder.razorpayOrderId,
        amountPaise: rzpOrder.amountPaise,
        currency: rzpOrder.currency,
        keyId: rzpOrder.keyId,
        mode: rzpOrder.mode,
        summary: {
          subtotal: calc.subtotal,
          discount: calc.discount,
          shippingFee: calc.shippingFee,
          gstAmount: calc.gstAmount,
          total: calc.total,
        },
      });
    } catch (error) {
      res.status(502).json({
        error: error instanceof Error ? error.message : 'Unable to initiate Razorpay order.',
      });
    }
  }
);

const sandboxSignSchema = z.object({
  razorpayOrderId: z.string().startsWith('order_test_'),
});

/**
 * Generates a signed test payment payload ONLY for preview sandbox orders (`order_test_*`)
 * so the exact same HMAC SHA256 verification flow runs when live/test Razorpay keys aren't set yet.
 */
paymentsRouter.post('/sandbox-authorize', paymentRateLimiter, (req, res) => {
  const parsed = sandboxSignSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid sandbox order ID.' });
    return;
  }
  const order = catalogStore.getOrderByRazorpayOrderId(parsed.data.razorpayOrderId);
  if (!order) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }
  const razorpayPaymentId = `pay_test_${crypto.randomBytes(6).toString('hex')}`;
  const razorpaySignature = signTestSandboxPayment(parsed.data.razorpayOrderId, razorpayPaymentId);
  res.json({
    razorpay_order_id: parsed.data.razorpayOrderId,
    razorpay_payment_id: razorpayPaymentId,
    razorpay_signature: razorpaySignature,
  });
});

const verifySchema = z.object({
  orderId: z.string().min(4).max(128),
  razorpay_order_id: z.string().min(4).max(128),
  razorpay_payment_id: z.string().min(4).max(128),
  razorpay_signature: z.string().min(8).max(256),
});

paymentsRouter.post('/verify', paymentRateLimiter, (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Missing payment verification fields.' });
    return;
  }

  const order = catalogStore.getOrder(parsed.data.orderId);
  if (!order || order.razorpayOrderId !== parsed.data.razorpay_order_id) {
    res.status(404).json({ error: 'Order mismatch.' });
    return;
  }

  if (order.status === 'paid') {
    res.json({
      verified: true,
      order,
      orderToken: catalogStore.createOrderAccessToken(order.id),
    });
    return;
  }

  const isValid = verifyRazorpayPaymentSignature({
    razorpayOrderId: parsed.data.razorpay_order_id,
    razorpayPaymentId: parsed.data.razorpay_payment_id,
    razorpaySignature: parsed.data.razorpay_signature,
  });

  if (!isValid) {
    res.status(400).json({
      verified: false,
      error: 'Payment signature verification failed. Please retry payment.',
    });
    return;
  }

  const updated = catalogStore.markOrderPaid(order.id, parsed.data.razorpay_payment_id);
  if (updated) {
    void sendSms({
      to: updated.customerPhone,
      message: buildPaymentConfirmedSms(updated),
      event: 'payment_confirmed',
      orderId: updated.id,
      createdBy: updated.userId,
    });
    if (SERVER_CONFIG.ownerAlertPhone) {
      void sendSms({
        to: SERVER_CONFIG.ownerAlertPhone,
        message: buildOwnerNewOrderSms(updated),
        event: 'payment_confirmed',
        orderId: updated.id,
        createdBy: 'system',
      });
    }
  }
  res.json({
    verified: true,
    order: updated,
    orderToken: catalogStore.createOrderAccessToken(order.id),
  });
});

paymentsRouter.post('/cod', paymentRateLimiter, attachUser, (req: AuthenticatedRequest, res) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Please complete all required shipping fields.' });
    return;
  }

  const calc = catalogStore.recalculateCart(
    parsed.data.items,
    parsed.data.couponCode,
    parsed.data.deliveryMethod,
    Boolean(parsed.data.isOutfitBundle)
  );

  if (calc.error) {
    res.status(400).json({ error: calc.error });
    return;
  }

  const userId = req.user?.uid || `guest_${crypto.randomBytes(6).toString('hex')}`;
  const order = catalogStore.createOrder({
    userId,
    paymentMethod: 'cod',
    deliveryMethod: parsed.data.deliveryMethod,
    subtotal: calc.subtotal,
    discount: calc.discount,
    shippingFee: calc.shippingFee,
    gstAmount: calc.gstAmount,
    total: calc.total,
    couponCode: calc.appliedCoupon,
    giftNote: parsed.data.giftNote || undefined,
    gstin: parsed.data.gstin || undefined,
    items: calc.items,
    shippingAddress: parsed.data.shippingAddress,
  });

  void sendSms({
    to: order.customerPhone,
    message: buildOrderPlacedSms(order),
    event: 'order_placed',
    orderId: order.id,
    createdBy: order.userId,
  });
  if (SERVER_CONFIG.ownerAlertPhone) {
    void sendSms({
      to: SERVER_CONFIG.ownerAlertPhone,
      message: buildOwnerNewOrderSms(order),
      event: 'order_placed',
      orderId: order.id,
      createdBy: 'system',
    });
  }

  res.json({
    order,
    orderToken: catalogStore.createOrderAccessToken(order.id),
  });
});

export function razorpayWebhookHandler(req: Request, res: Response): void {
  const signature = String(req.headers['x-razorpay-signature'] || '');
  const rawBody = Buffer.isBuffer(req.body)
    ? req.body
    : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}));

  if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
    res.status(400).json({ error: 'Invalid webhook signature.' });
    return;
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody.toString('utf-8')) as Record<string, unknown>;
  } catch {
    res.status(400).json({ error: 'Malformed webhook JSON.' });
    return;
  }

  const eventName = String(payload.event || '');
  const eventId =
    String(req.headers['x-razorpay-event-id'] || '') ||
    `${eventName}:${String((payload.payload as Record<string, unknown>)?.payment ? JSON.stringify((payload.payload as Record<string, unknown>).payment) : Date.now())}`;

  if (catalogStore.hasProcessedWebhook(eventId)) {
    res.json({ received: true, idempotent: true });
    return;
  }

  const paymentEntity = ((payload.payload as Record<string, { entity?: Record<string, unknown> }>)
    ?.payment?.entity || {}) as Record<string, unknown>;
  const refundEntity = ((payload.payload as Record<string, { entity?: Record<string, unknown> }>)
    ?.refund?.entity || {}) as Record<string, unknown>;

  if (eventName === 'payment.captured') {
    const rzpOrderId = String(paymentEntity.order_id || '');
    const rzpPaymentId = String(paymentEntity.id || '');
    const order = catalogStore.getOrderByRazorpayOrderId(rzpOrderId);
    if (order && rzpPaymentId) {
      catalogStore.markOrderPaid(order.id, rzpPaymentId);
    }
  } else if (eventName === 'payment.failed') {
    const rzpOrderId = String(paymentEntity.order_id || '');
    const order = catalogStore.getOrderByRazorpayOrderId(rzpOrderId);
    if (order && order.status === 'placed') {
      catalogStore.updateOrderStatus(order.id, { status: 'cancelled' });
    }
  } else if (eventName === 'refund.processed') {
    const paymentId = String(refundEntity.payment_id || '');
    const refundId = String(refundEntity.id || '');
    const amountPaise = Number(refundEntity.amount || 0);
    const order = catalogStore.getOrderByRazorpayPaymentId(paymentId);
    if (order) {
      catalogStore.updateOrderStatus(order.id, {
        status: 'returned',
        refundId,
        refundAmount: Math.round(amountPaise / 100),
      });
    }
  }

  catalogStore.markWebhookProcessed(eventId);
  res.json({ received: true });
}
