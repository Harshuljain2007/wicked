import { Router } from 'express';
import { z } from 'zod';
import { requireAdmin, type AuthenticatedRequest } from '../lib/authMiddleware.ts';
import { catalogStore } from '../lib/catalogStore.ts';
import { getSmsGatewayProvider, SERVER_CONFIG } from '../lib/config.ts';
import { issueRazorpayRefund } from '../lib/razorpay.ts';
import {
  buildOrderStatusSms,
  buildRefundSms,
  listSmsLogs,
  normalizeIndianPhone,
  sendSms,
} from '../lib/sms.ts';

export const adminRouter = Router();

adminRouter.use(requireAdmin);

adminRouter.get('/dashboard', (_req, res) => {
  const products = catalogStore.getProducts();
  const orders = catalogStore.listAllOrders();
  const todayStr = new Date().toISOString().slice(0, 10);

  const todaysOrders = orders.filter((o) => o.createdAt.slice(0, 10) === todayStr);
  const revenue = orders
    .filter((o) => o.status !== 'cancelled' && o.status !== 'returned')
    .reduce((sum, o) => sum + o.total, 0);

  const lowStockAlerts = products.flatMap((p) =>
    p.variants
      .filter((v) => v.stock <= 5)
      .map((v) => ({
        productId: p.id,
        productName: p.name,
        sku: v.sku,
        color: v.color,
        size: v.size,
        stock: v.stock,
      }))
  );

  res.json({
    stats: {
      totalOrders: orders.length,
      todaysOrdersCount: todaysOrders.length,
      totalRevenue: revenue,
      lowStockCount: lowStockAlerts.length,
      productCount: products.length,
    },
    lowStockAlerts,
    products,
    orders,
    coupons: catalogStore.getCoupons(),
    banner: catalogStore.getBanner(),
    showcase: catalogStore.getShowcase(),
  });
});

const productUpsertSchema = z.object({
  id: z.string().min(2).max(120),
  slug: z.string().min(2).max(140),
  name: z.string().min(2).max(140),
  category: z.enum(['tees', 'shirts', 'kurtas', 'hoodies', 'bottoms', 'accessories']),
  gender: z.enum(['men', 'women', 'unisex']),
  fit: z.string().min(2).max(60),
  price: z.number().positive().max(100000),
  compareAtPrice: z.number().nonnegative().optional(),
  gsm: z.number().nonnegative().max(1000),
  fabric: z.string().max(200),
  care: z.string().max(200),
  description: z.string().max(2000),
  isNew: z.boolean().optional(),
  onSale: z.boolean().optional(),
  featured: z.boolean().optional(),
  colors: z
    .array(
      z.object({
        name: z.string().min(1).max(60),
        hex: z.string().min(4).max(12),
        images: z.array(z.string().min(1).max(2000000)).min(1),
        priceDelta: z.number().optional(),
      })
    )
    .min(1),
  variants: z
    .array(
      z.object({
        sku: z.string().min(2).max(60),
        color: z.string().min(1).max(60),
        size: z.string().min(1).max(20),
        stock: z.number().int().min(0).max(10000),
      })
    )
    .min(1),
  rating: z.number().min(0).max(5).default(4.8),
  reviewCount: z.number().int().min(0).default(0),
});

adminRouter.post('/products', (req, res) => {
  const parsed = productUpsertSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid product payload.', details: parsed.error.flatten() });
    return;
  }
  const saved = catalogStore.upsertProduct(parsed.data);
  res.status(201).json({ product: saved });
});

adminRouter.put('/products/:id', (req, res) => {
  const parsed = productUpsertSchema.safeParse({ ...req.body, id: req.params.id });
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid product payload.', details: parsed.error.flatten() });
    return;
  }
  const saved = catalogStore.upsertProduct(parsed.data);
  res.json({ product: saved });
});

adminRouter.delete('/products/:id', (req, res) => {
  const deleted = catalogStore.deleteProduct(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }
  res.json({ deleted: true });
});

const orderUpdateSchema = z.object({
  status: z.enum(['placed', 'paid', 'packed', 'shipped', 'delivered', 'cancelled', 'returned']).optional(),
  trackingNumber: z.string().max(80).optional(),
});

adminRouter.patch('/orders/:id', (req: AuthenticatedRequest, res) => {
  const parsed = orderUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid order update.' });
    return;
  }
  const updated = catalogStore.updateOrderStatus(req.params.id, parsed.data);
  if (!updated) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }
  void sendSms({
    to: updated.customerPhone,
    message: buildOrderStatusSms(updated),
    event: 'status_update',
    orderId: updated.id,
    createdBy: req.user?.email || 'admin',
  });
  res.json({ order: updated });
});

const refundSchema = z.object({
  amountInr: z.number().positive(),
  reason: z.string().max(240).optional(),
});

adminRouter.post('/orders/:id/refund', async (req, res) => {
  const parsed = refundSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Enter a valid refund amount in INR.' });
    return;
  }
  const order = catalogStore.getOrder(req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }
  if (parsed.data.amountInr > order.total) {
    res.status(400).json({ error: 'Refund amount cannot exceed order total.' });
    return;
  }
  if (!order.razorpayPaymentId) {
    const updated = catalogStore.updateOrderStatus(order.id, {
      status: 'returned',
      refundId: `cod_rfnd_${Date.now()}`,
      refundAmount: parsed.data.amountInr,
    });
    if (updated) {
      void sendSms({
        to: updated.customerPhone,
        message: buildRefundSms(updated),
        event: 'refund',
        orderId: updated.id,
        createdBy: 'admin',
      });
    }
    res.json({ order: updated });
    return;
  }
  try {
    const refund = await issueRazorpayRefund({
      paymentId: order.razorpayPaymentId,
      amountPaise: Math.round(parsed.data.amountInr * 100),
      notes: { reason: parsed.data.reason || 'Admin refund' },
    });
    const updated = catalogStore.updateOrderStatus(order.id, {
      status: 'returned',
      refundId: refund.refundId,
      refundAmount: Math.round(refund.amountPaise / 100),
    });
    if (updated) {
      void sendSms({
        to: updated.customerPhone,
        message: buildRefundSms(updated),
        event: 'refund',
        orderId: updated.id,
        createdBy: 'admin',
      });
    }
    res.json({ order: updated, refund });
  } catch (error) {
    res.status(502).json({
      error: error instanceof Error ? error.message : 'Razorpay refund failed.',
    });
  }
});

adminRouter.get('/orders/export.csv', (_req, res) => {
  const orders = catalogStore.listAllOrders();
  const header = ['Order ID', 'Date', 'Customer', 'Email', 'Phone', 'Payment', 'Status', 'Total INR', 'Tracking'];
  const rows = orders.map((o) => [
    o.id,
    o.createdAt,
    `"${o.shippingAddress.fullName.replace(/"/g, '""')}"`,
    o.customerEmail,
    o.customerPhone,
    o.paymentMethod,
    o.status,
    String(o.total),
    o.trackingNumber || '',
  ]);
  const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="wicked-orders.csv"');
  res.send(csv);
});

adminRouter.put('/coupons', (req, res) => {
  const schema = z.array(
    z.object({
      code: z.string().min(3).max(32),
      percentOff: z.number().min(1).max(80),
      minSubtotal: z.number().min(0),
      active: z.boolean(),
    })
  );
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid coupons list.' });
    return;
  }
  const coupons = catalogStore.setCoupons(parsed.data);
  res.json({ coupons });
});

adminRouter.put('/banners', (req, res) => {
  const schema = z.object({
    id: z.string().min(1).max(64),
    headline: z.string().min(2).max(160),
    subheadline: z.string().max(320),
    ctaLabel: z.string().min(1).max(60),
    ctaPath: z.string().min(1).max(120),
    marqueeText: z.string().max(240),
    heroImage: z.string().min(1),
    active: z.boolean(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid banner payload.' });
    return;
  }
  const banner = catalogStore.setBanner(parsed.data);
  res.json({ banner });
});

adminRouter.put('/showcase', (req, res) => {
  const showcase = catalogStore.setShowcase(req.body);
  res.json({ showcase });
});

adminRouter.get('/sms/logs', (_req, res) => {
  const provider = getSmsGatewayProvider();
  res.json({
    provider,
    liveConfigured: provider !== 'sandbox',
    ownerAlertPhone: SERVER_CONFIG.ownerAlertPhone,
    logs: listSmsLogs(),
  });
});

const adminSendSmsSchema = z.object({
  to: z.string().min(10).max(20),
  message: z.string().trim().min(3).max(480),
  orderId: z.string().max(128).optional(),
  event: z
    .enum(['order_placed', 'payment_confirmed', 'status_update', 'refund', 'otp', 'custom'])
    .optional(),
});

adminRouter.post('/sms/send', async (req: AuthenticatedRequest, res) => {
  const parsed = adminSendSmsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Enter a valid mobile number and SMS message (3-480 chars).' });
    return;
  }
  const normalized = normalizeIndianPhone(parsed.data.to);
  if (!normalized) {
    res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number or +91 number.' });
    return;
  }
  const log = await sendSms({
    to: normalized,
    message: parsed.data.message,
    event: parsed.data.event || 'custom',
    orderId: parsed.data.orderId,
    createdBy: req.user?.email || 'admin',
  });
  res.status(log.status === 'failed' ? 502 : 200).json({ log });
});
