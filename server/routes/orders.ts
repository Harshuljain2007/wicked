import crypto from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import {
  attachUser,
  type AuthenticatedRequest,
  requireAuth,
} from '../lib/authMiddleware.ts';
import { catalogStore } from '../lib/catalogStore.ts';

export const ordersRouter = Router();

ordersRouter.get('/', requireAuth, (req: AuthenticatedRequest, res) => {
  const orders = catalogStore.listOrdersForUser(req.user!.uid, req.user!.email);
  res.json({ orders });
});

const trackSchema = z.object({
  orderId: z.string().trim().min(4).max(60),
  contact: z.string().trim().min(4).max(160),
});

ordersRouter.post('/track', (req, res) => {
  const parsed = trackSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Enter a valid Order ID and email or mobile number.' });
    return;
  }
  const order = catalogStore.getOrder(parsed.data.orderId.toUpperCase());
  if (!order) {
    res.status(404).json({ error: 'No matching order found. Please check your Order ID.' });
    return;
  }

  const contact = parsed.data.contact.toLowerCase();
  const normalizedInputDigits = contact.replace(/\D/g, '').slice(-10);
  const normalizedOrderDigits = order.customerPhone.replace(/\D/g, '').slice(-10);

  const emailMatches = order.customerEmail.toLowerCase() === contact;
  const phoneMatches =
    normalizedInputDigits.length === 10 &&
    normalizedOrderDigits.length === 10 &&
    normalizedInputDigits === normalizedOrderDigits;

  if (!emailMatches && !phoneMatches) {
    res.status(403).json({
      error: 'Order ID does not match that email or 10-digit mobile number.',
    });
    return;
  }

  res.json({
    order,
    orderToken: catalogStore.createOrderAccessToken(order.id),
  });
});

ordersRouter.get('/:id', attachUser, (req: AuthenticatedRequest, res) => {
  const order = catalogStore.getOrder(req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  const token = String(req.query.token || '');
  const hasTokenAccess = token ? catalogStore.verifyOrderAccessToken(order.id, token) : false;
  const isOwner =
    Boolean(req.user) &&
    (req.user!.isAdmin ||
      order.userId === req.user!.uid ||
      (req.user!.email && order.customerEmail.toLowerCase() === req.user!.email.toLowerCase()));

  if (!hasTokenAccess && !isOwner) {
    res.status(403).json({ error: 'Sign in or provide a valid order receipt token to view this order.' });
    return;
  }

  res.json({ order });
});

const exchangeSchema = z.object({
  reason: z.string().min(4).max(500),
  token: z.string().optional(),
});

ordersRouter.post('/:id/exchange', attachUser, (req: AuthenticatedRequest, res) => {
  const parsed = exchangeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Please describe the size or exchange reason.' });
    return;
  }
  const order = catalogStore.getOrder(req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  const hasTokenAccess = parsed.data.token
    ? catalogStore.verifyOrderAccessToken(order.id, parsed.data.token)
    : false;
  const isOwner =
    Boolean(req.user) &&
    (req.user!.isAdmin ||
      order.userId === req.user!.uid ||
      order.customerEmail.toLowerCase() === req.user!.email.toLowerCase());

  if (!hasTokenAccess && !isOwner) {
    res.status(403).json({ error: 'Unauthorized.' });
    return;
  }

  const ageMs = Date.now() - new Date(order.createdAt).getTime();
  if (ageMs > 7 * 24 * 60 * 60 * 1000) {
    res.status(400).json({ error: 'The 7-day exchange window has closed for this order.' });
    return;
  }

  const updated = catalogStore.updateOrderStatus(order.id, {
    exchangeRequested: true,
    exchangeReason: parsed.data.reason,
  });
  res.json({ order: updated });
});

const reviewSchema = z.object({
  productId: z.string().min(2).max(120),
  authorName: z.string().min(2).max(80),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(2).max(120),
  body: z.string().min(4).max(1000),
});

ordersRouter.post('/reviews', requireAuth, (req: AuthenticatedRequest, res) => {
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Please complete all review fields.' });
    return;
  }
  const verifiedBuyer = catalogStore.hasUserPurchasedProduct(
    req.user!.uid,
    req.user!.email,
    parsed.data.productId
  );
  const review = catalogStore.addReview({
    id: `rev_${crypto.randomBytes(6).toString('hex')}`,
    productId: parsed.data.productId,
    userId: req.user!.uid,
    authorName: parsed.data.authorName,
    rating: parsed.data.rating,
    title: parsed.data.title,
    body: parsed.data.body,
    verifiedBuyer,
    createdAt: new Date().toISOString(),
  });
  res.status(201).json({ review });
});
