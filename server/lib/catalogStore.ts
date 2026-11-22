import crypto from 'crypto';
import {
  SEED_BANNER,
  SEED_COUPONS,
  SEED_PRODUCTS,
  SEED_REVIEWS,
  SEED_SHOWCASE,
} from '../../src/data/seedData.ts';
import type {
  BannerConfig,
  CartItem,
  Coupon,
  Order,
  OrderStatus,
  Product,
  Review,
  ShippingAddress,
  ShowcaseData,
} from '../../src/types/index.ts';
import { SERVER_CONFIG } from './config.ts';
import { calculateGstBreakdown } from './gstInvoice.ts';

class CatalogStore {
  private products: Product[] = structuredClone(SEED_PRODUCTS);
  private coupons: Coupon[] = structuredClone(SEED_COUPONS);
  private banner: BannerConfig = structuredClone(SEED_BANNER);
  private showcase: ShowcaseData = structuredClone(SEED_SHOWCASE);
  private reviews: Review[] = structuredClone(SEED_REVIEWS);
  private orders: Map<string, Order> = new Map();
  private processedWebhookEvents: Set<string> = new Set();

  constructor() {
    this.seedInitialOrder();
  }

  private seedInitialOrder() {
    const now = new Date().toISOString();
    const sampleOrder: Order = {
      id: 'WKD-2026-1001',
      userId: 'seed-user-1',
      customerEmail: 'aarav.mehta@example.in',
      customerPhone: '+919820112233',
      status: 'delivered',
      paymentMethod: 'razorpay',
      deliveryMethod: 'standard',
      razorpayOrderId: 'order_seed_1001',
      razorpayPaymentId: 'pay_seed_1001',
      subtotal: 2499,
      discount: 0,
      shippingFee: 0,
      gstAmount: 267.75,
      total: 2499,
      items: [
        {
          productId: 'wk-kurta-01',
          slug: 'mandarin-handloom-kurta-overshirt',
          name: 'Mandarin Handloom Kurta Overshirt',
          category: 'kurtas',
          color: 'Sage',
          size: 'L',
          unitPrice: 2499,
          quantity: 1,
          image: this.products.find((p) => p.id === 'wk-kurta-01')?.colors[0].images[0] || '',
        },
      ],
      shippingAddress: {
        fullName: 'Aarav Mehta',
        email: 'aarav.mehta@example.in',
        phone: '+919820112233',
        line1: '402 Pali Hill Terrace, Bandra West',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400050',
      },
      trackingNumber: 'BLUEDART-88412039',
      createdAt: now,
      updatedAt: now,
    };
    this.orders.set(sampleOrder.id, sampleOrder);
  }

  getProducts(): Product[] {
    return this.products;
  }

  getProductBySlug(slug: string): Product | undefined {
    return this.products.find((p) => p.slug === slug || p.id === slug);
  }

  getProductById(id: string): Product | undefined {
    return this.products.find((p) => p.id === id);
  }

  upsertProduct(product: Product): Product {
    const idx = this.products.findIndex((p) => p.id === product.id);
    const updated = { ...product, updatedAt: new Date().toISOString() };
    if (idx >= 0) {
      this.products[idx] = updated;
    } else {
      this.products.unshift(updated);
    }
    return updated;
  }

  deleteProduct(id: string): boolean {
    const before = this.products.length;
    this.products = this.products.filter((p) => p.id !== id);
    return this.products.length < before;
  }

  getCoupons(): Coupon[] {
    return this.coupons;
  }

  setCoupons(coupons: Coupon[]): Coupon[] {
    this.coupons = coupons;
    return this.coupons;
  }

  validateCoupon(code: string | undefined, subtotal: number): { valid: boolean; coupon?: Coupon; reason?: string } {
    if (!code || !code.trim()) return { valid: false };
    const normalized = code.trim().toUpperCase();
    const coupon = this.coupons.find((c) => c.code.toUpperCase() === normalized && c.active);
    if (!coupon) {
      return { valid: false, reason: 'Coupon code is invalid or expired.' };
    }
    if (subtotal < coupon.minSubtotal) {
      return {
        valid: false,
        reason: `Minimum order value of ₹${coupon.minSubtotal.toLocaleString('en-IN')} required for ${coupon.code}.`,
      };
    }
    return { valid: true, coupon };
  }

  getBanner(): BannerConfig {
    return this.banner;
  }

  setBanner(banner: BannerConfig): BannerConfig {
    this.banner = banner;
    return this.banner;
  }

  getShowcase(): ShowcaseData {
    return this.showcase;
  }

  setShowcase(showcase: ShowcaseData): ShowcaseData {
    this.showcase = showcase;
    return this.showcase;
  }

  getReviewsForProduct(productId: string): Review[] {
    return this.reviews.filter((r) => r.productId === productId);
  }

  addReview(review: Review): Review {
    this.reviews.unshift(review);
    const prod = this.getProductById(review.productId);
    if (prod) {
      const all = this.getReviewsForProduct(prod.id);
      const avg = all.reduce((sum, r) => sum + r.rating, 0) / all.length;
      prod.rating = Math.round(avg * 10) / 10;
      prod.reviewCount = all.length;
    }
    return review;
  }

  hasUserPurchasedProduct(userId: string, email: string | undefined, productId: string): boolean {
    for (const order of this.orders.values()) {
      const matchesUser =
        (userId && order.userId === userId) ||
        (email && order.customerEmail.toLowerCase() === email.toLowerCase());
      if (
        matchesUser &&
        ['paid', 'packed', 'shipped', 'delivered'].includes(order.status) &&
        order.items.some((i) => i.productId === productId)
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Authoritatively recalculate cart prices, stock, bundle discounts, coupon discounts, and shipping.
   * Never trusts prices sent from the browser.
   */
  recalculateCart(
    requestedItems: Array<{ productId: string; color: string; size: string; quantity: number }>,
    couponCode?: string,
    deliveryMethod: 'standard' | 'express' = 'standard',
    isOutfitBundle = false
  ): {
    items: CartItem[];
    subtotal: number;
    discount: number;
    shippingFee: number;
    gstAmount: number;
    total: number;
    totalPaise: number;
    appliedCoupon?: string;
    error?: string;
  } {
    if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
      return {
        items: [],
        subtotal: 0,
        discount: 0,
        shippingFee: 0,
        gstAmount: 0,
        total: 0,
        totalPaise: 0,
        error: 'Your bag is empty.',
      };
    }

    const authoritativeItems: CartItem[] = [];
    let subtotal = 0;

    for (const reqItem of requestedItems) {
      const product = this.getProductById(reqItem.productId);
      if (!product) {
        return {
          items: [],
          subtotal: 0,
          discount: 0,
          shippingFee: 0,
          gstAmount: 0,
          total: 0,
          totalPaise: 0,
          error: `Product ${reqItem.productId} is no longer available.`,
        };
      }
      const qty = Math.max(1, Math.min(10, Math.floor(Number(reqItem.quantity) || 1)));
      const colorObj =
        product.colors.find((c) => c.name.toLowerCase() === String(reqItem.color).toLowerCase()) ||
        product.colors[0];
      const variant = product.variants.find(
        (v) =>
          v.color.toLowerCase() === colorObj.name.toLowerCase() &&
          v.size.toLowerCase() === String(reqItem.size).toLowerCase()
      );
      if (!variant) {
        return {
          items: [],
          subtotal: 0,
          discount: 0,
          shippingFee: 0,
          gstAmount: 0,
          total: 0,
          totalPaise: 0,
          error: `Selected size ${reqItem.size} in ${colorObj.name} is unavailable for ${product.name}.`,
        };
      }
      if (variant.stock < qty) {
        return {
          items: [],
          subtotal: 0,
          discount: 0,
          shippingFee: 0,
          gstAmount: 0,
          total: 0,
          totalPaise: 0,
          error: `Only ${variant.stock} left in stock for ${product.name} (${colorObj.name} / ${variant.size}).`,
        };
      }

      const unitPrice = product.price + (colorObj.priceDelta || 0);
      subtotal += unitPrice * qty;
      authoritativeItems.push({
        productId: product.id,
        slug: product.slug,
        name: product.name,
        category: product.category,
        color: colorObj.name,
        size: variant.size,
        unitPrice,
        quantity: qty,
        image: colorObj.images[0] || product.colors[0].images[0],
      });
    }

    let discount = 0;
    let appliedCoupon: string | undefined;

    if (isOutfitBundle && authoritativeItems.length >= 3) {
      discount = Math.round(subtotal * 0.12);
    }

    if (couponCode) {
      const check = this.validateCoupon(couponCode, subtotal);
      if (check.valid && check.coupon) {
        const couponDiscount = Math.round((subtotal * check.coupon.percentOff) / 100);
        if (couponDiscount >= discount) {
          discount = couponDiscount;
          appliedCoupon = check.coupon.code;
        }
      }
    }

    const netMerchandise = Math.max(0, subtotal - discount);
    const shippingFee =
      deliveryMethod === 'express' ? 149 : netMerchandise >= 1499 ? 0 : 79;
    const total = netMerchandise + shippingFee;
    const discountRatio = subtotal > 0 ? discount / subtotal : 0;
    const { gstAmount } = calculateGstBreakdown(authoritativeItems, discountRatio);

    return {
      items: authoritativeItems,
      subtotal,
      discount,
      shippingFee,
      gstAmount,
      total,
      totalPaise: Math.round(total * 100),
      appliedCoupon,
    };
  }

  createOrder(params: {
    userId: string;
    paymentMethod: 'razorpay' | 'cod';
    deliveryMethod: 'standard' | 'express';
    razorpayOrderId?: string;
    subtotal: number;
    discount: number;
    shippingFee: number;
    gstAmount: number;
    total: number;
    couponCode?: string;
    giftNote?: string;
    gstin?: string;
    items: CartItem[];
    shippingAddress: ShippingAddress;
  }): Order {
    const id = `WKD-${new Date().getFullYear()}-${crypto.randomInt(1000, 9999)}${crypto.randomInt(10, 99)}`;
    const now = new Date().toISOString();
    const order: Order = {
      id,
      userId: params.userId,
      customerEmail: params.shippingAddress.email,
      customerPhone: params.shippingAddress.phone,
      status: 'placed',
      paymentMethod: params.paymentMethod,
      deliveryMethod: params.deliveryMethod,
      razorpayOrderId: params.razorpayOrderId,
      subtotal: params.subtotal,
      discount: params.discount,
      shippingFee: params.shippingFee,
      gstAmount: params.gstAmount,
      total: params.total,
      couponCode: params.couponCode,
      giftNote: params.giftNote,
      gstin: params.gstin,
      items: params.items,
      shippingAddress: params.shippingAddress,
      createdAt: now,
      updatedAt: now,
    };
    this.orders.set(id, order);
    if (params.paymentMethod === 'cod') {
      this.decrementStockForOrder(order);
    }
    return order;
  }

  decrementStockForOrder(order: Order): void {
    for (const item of order.items) {
      const product = this.getProductById(item.productId);
      if (!product) continue;
      const variant = product.variants.find(
        (v) =>
          v.color.toLowerCase() === item.color.toLowerCase() &&
          v.size.toLowerCase() === item.size.toLowerCase()
      );
      if (variant) {
        variant.stock = Math.max(0, variant.stock - item.quantity);
      }
    }
  }

  getOrder(id: string): Order | undefined {
    return this.orders.get(id);
  }

  getOrderByRazorpayOrderId(razorpayOrderId: string): Order | undefined {
    for (const order of this.orders.values()) {
      if (order.razorpayOrderId === razorpayOrderId) return order;
    }
    return undefined;
  }

  getOrderByRazorpayPaymentId(razorpayPaymentId: string): Order | undefined {
    for (const order of this.orders.values()) {
      if (order.razorpayPaymentId === razorpayPaymentId) return order;
    }
    return undefined;
  }

  listAllOrders(): Order[] {
    return Array.from(this.orders.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  listOrdersForUser(uid: string, email?: string): Order[] {
    return this.listAllOrders().filter(
      (o) =>
        o.userId === uid ||
        (email && o.customerEmail.toLowerCase() === email.toLowerCase())
    );
  }

  markOrderPaid(orderId: string, razorpayPaymentId: string): Order | undefined {
    const order = this.orders.get(orderId);
    if (!order) return undefined;
    if (order.status === 'placed') {
      this.decrementStockForOrder(order);
      order.status = 'paid';
    }
    order.razorpayPaymentId = razorpayPaymentId;
    order.updatedAt = new Date().toISOString();
    return order;
  }

  updateOrderStatus(
    orderId: string,
    updates: {
      status?: OrderStatus;
      trackingNumber?: string;
      exchangeRequested?: boolean;
      exchangeReason?: string;
      refundId?: string;
      refundAmount?: number;
    }
  ): Order | undefined {
    const order = this.orders.get(orderId);
    if (!order) return undefined;
    if (updates.status) order.status = updates.status;
    if (typeof updates.trackingNumber === 'string') order.trackingNumber = updates.trackingNumber;
    if (typeof updates.exchangeRequested === 'boolean') {
      order.exchangeRequested = updates.exchangeRequested;
    }
    if (typeof updates.exchangeReason === 'string') order.exchangeReason = updates.exchangeReason;
    if (typeof updates.refundId === 'string') order.refundId = updates.refundId;
    if (typeof updates.refundAmount === 'number') order.refundAmount = updates.refundAmount;
    order.updatedAt = new Date().toISOString();
    return order;
  }

  hasProcessedWebhook(eventId: string): boolean {
    return this.processedWebhookEvents.has(eventId);
  }

  markWebhookProcessed(eventId: string): void {
    this.processedWebhookEvents.add(eventId);
  }

  createOrderAccessToken(orderId: string): string {
    return crypto
      .createHmac('sha256', SERVER_CONFIG.sessionSigningKey)
      .update(`order_access:${orderId}`)
      .digest('hex');
  }

  verifyOrderAccessToken(orderId: string, token: string): boolean {
    const expected = this.createOrderAccessToken(orderId);
    const a = Buffer.from(expected);
    const b = Buffer.from(token);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
}

export const catalogStore = new CatalogStore();
