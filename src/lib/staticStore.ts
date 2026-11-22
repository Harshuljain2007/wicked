import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  IMG_KURTA_SAGE,
  SEED_BANNER,
  SEED_COUPONS,
  SEED_PRODUCTS,
  SEED_REVIEWS,
} from '../data/seedData';
import { auth, db } from '../firebase';
import type { AuthUser } from '../hooks/useAuth';
import type {
  BannerConfig,
  CartItem,
  Coupon,
  Order,
  OrderStatus,
  Product,
  Review,
  ShippingAddress,
} from '../types';

const ORDERS_KEY = 'wicked_static_orders_v1';
const PRODUCTS_KEY = 'wicked_static_products_v1';
const COUPONS_KEY = 'wicked_static_coupons_v1';
const BANNER_KEY = 'wicked_static_banner_v1';
const REVIEWS_KEY = 'wicked_static_reviews_v1';
const OTP_SESSION_KEY = 'wicked_static_otp_v1';

export type ApiJsonResult<T = unknown> =
  | { available: true; ok: boolean; status: number; data: T }
  | { available: false };

export async function tryApiJson<T = Record<string, unknown>>(
  url: string,
  init?: RequestInit
): Promise<ApiJsonResult<T>> {
  try {
    const res = await fetch(url, init);
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      return { available: false };
    }
    const text = await res.text();
    if (!text || text.trimStart().startsWith('<')) {
      return { available: false };
    }
    const data = JSON.parse(text) as T;
    return { available: true, ok: res.ok, status: res.status, data };
  } catch {
    return { available: false };
  }
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota or storage restriction errors
  }
}

function getSeedOrders(): Order[] {
  const now = '2026-11-18T10:30:00.000Z';
  return [
    {
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
          image: IMG_KURTA_SAGE,
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
    },
  ];
}

function calculateGstBreakdown(items: CartItem[], discountRatio: number): number {
  let totalGst = 0;
  for (const item of items) {
    const lineTotal = item.unitPrice * item.quantity * (1 - discountRatio);
    const rate = item.unitPrice <= 1000 ? 0.05 : 0.12;
    totalGst += lineTotal - lineTotal / (1 + rate);
  }
  return Math.round(totalGst * 100) / 100;
}

export function getStaticProducts(): Product[] {
  return readJson<Product[]>(PRODUCTS_KEY, SEED_PRODUCTS);
}

export function getStaticCoupons(): Coupon[] {
  return readJson<Coupon[]>(COUPONS_KEY, SEED_COUPONS);
}

export function getStaticBanner(): BannerConfig {
  return readJson<BannerConfig>(BANNER_KEY, SEED_BANNER);
}

export function getStaticReviews(productId?: string): Review[] {
  const all = readJson<Review[]>(REVIEWS_KEY, SEED_REVIEWS);
  return productId ? all.filter((r) => r.productId === productId) : all;
}

function getStaticOrders(): Order[] {
  const saved = readJson<Order[]>(ORDERS_KEY, []);
  const seeds = getSeedOrders();
  const merged = [...saved];
  for (const s of seeds) {
    if (!merged.some((o) => o.id === s.id)) merged.push(s);
  }
  return merged;
}

function saveStaticOrder(order: Order): void {
  const existing = getStaticOrders().filter((o) => o.id !== order.id);
  existing.unshift(order);
  writeJson(ORDERS_KEY, existing);
}

function makeOrderToken(orderId: string): string {
  return `static_tok_${orderId}`;
}

async function syncOrderToFirestore(order: Order): Promise<void> {
  const fbUser = auth.currentUser;
  if (!fbUser || !fbUser.emailVerified) return;
  try {
    const docData: Record<string, unknown> = {
      id: order.id,
      userId: fbUser.uid,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      status: 'placed',
      paymentMethod: order.paymentMethod,
      total: order.total,
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      discount: order.discount,
      items: order.items,
      shippingAddress: order.shippingAddress,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (order.razorpayOrderId) docData.razorpayOrderId = order.razorpayOrderId;
    if (order.couponCode) docData.couponCode = order.couponCode;
    await setDoc(doc(db, 'orders', order.id), docData);
  } catch {
    // Keep checkout smooth even if Firestore rules reject optional fields
  }
}

export interface StaticCheckoutPayload {
  items: Array<{ productId: string; color: string; size: string; quantity: number }>;
  couponCode?: string;
  deliveryMethod: 'standard' | 'express';
  isOutfitBundle?: boolean;
  giftNote?: string;
  gstin?: string;
  shippingAddress: ShippingAddress;
}

export async function staticCreateOrder(
  payload: StaticCheckoutPayload,
  paymentMethod: 'razorpay' | 'cod',
  user: AuthUser | null
): Promise<{
  order: Order;
  orderToken: string;
  razorpayOrderId?: string;
  amountPaise: number;
}> {
  if (payload.gstin) {
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstinRegex.test(payload.gstin.toUpperCase())) {
      throw new Error('Enter a valid 15-character GSTIN.');
    }
  }

  const catalog = getStaticProducts();
  const authoritativeItems: CartItem[] = [];
  let subtotal = 0;

  for (const reqItem of payload.items) {
    const product = catalog.find((p) => p.id === reqItem.productId);
    if (!product) {
      throw new Error(`Product ${reqItem.productId} is no longer available.`);
    }
    const qty = Math.max(1, Math.min(10, Math.floor(Number(reqItem.quantity) || 1)));
    const colorObj =
      product.colors.find((c) => c.name.toLowerCase() === reqItem.color.toLowerCase()) ||
      product.colors[0];
    const unitPrice = product.price + (colorObj.priceDelta || 0);
    subtotal += unitPrice * qty;
    authoritativeItems.push({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      color: colorObj.name,
      size: reqItem.size,
      unitPrice,
      quantity: qty,
      image: colorObj.images[0] || product.colors[0].images[0],
    });
  }

  let discount = 0;
  let appliedCoupon: string | undefined;

  if (payload.isOutfitBundle && authoritativeItems.length >= 3) {
    discount = Math.round(subtotal * 0.12);
  }

  if (payload.couponCode) {
    const normalized = payload.couponCode.trim().toUpperCase();
    const coupon = getStaticCoupons().find(
      (c) => c.code.toUpperCase() === normalized && c.active
    );
    if (coupon && subtotal >= coupon.minSubtotal) {
      const couponDiscount = Math.round((subtotal * coupon.percentOff) / 100);
      if (couponDiscount >= discount) {
        discount = couponDiscount;
        appliedCoupon = coupon.code;
      }
    }
  }

  const netMerchandise = Math.max(0, subtotal - discount);
  const shippingFee =
    payload.deliveryMethod === 'express' ? 149 : netMerchandise >= 1499 ? 0 : 79;
  const total = netMerchandise + shippingFee;
  const discountRatio = subtotal > 0 ? discount / subtotal : 0;
  const gstAmount = calculateGstBreakdown(authoritativeItems, discountRatio);

  const rand = Math.floor(100000 + Math.random() * 899999);
  const id = `WKD-${new Date().getFullYear()}-${rand}`;
  const now = new Date().toISOString();
  const razorpayOrderId =
    paymentMethod === 'razorpay' ? `order_test_${Date.now().toString(36)}` : undefined;

  const order: Order = {
    id,
    userId: user?.uid || `guest_${Date.now().toString(36)}`,
    customerEmail: payload.shippingAddress.email,
    customerPhone: payload.shippingAddress.phone,
    status: 'placed',
    paymentMethod,
    deliveryMethod: payload.deliveryMethod,
    razorpayOrderId,
    subtotal,
    discount,
    shippingFee,
    gstAmount,
    total,
    couponCode: appliedCoupon,
    giftNote: payload.giftNote || undefined,
    gstin: payload.gstin || undefined,
    items: authoritativeItems,
    shippingAddress: payload.shippingAddress,
    createdAt: now,
    updatedAt: now,
  };

  saveStaticOrder(order);
  await syncOrderToFirestore(order);

  return {
    order,
    orderToken: makeOrderToken(order.id),
    razorpayOrderId,
    amountPaise: Math.round(total * 100),
  };
}

export function staticSandboxAuthorize(razorpayOrderId: string) {
  const paymentId = `pay_test_${Date.now().toString(36)}`;
  return {
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: `sig_test_${razorpayOrderId}_${paymentId}`,
  };
}

export function staticVerifyPayment(params: {
  orderId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
}): { verified: boolean; order: Order; orderToken: string } {
  const orders = getStaticOrders();
  const order = orders.find((o) => o.id === params.orderId);
  if (!order) {
    throw new Error('Order could not be found in this browser session.');
  }
  const updated: Order = {
    ...order,
    status: 'paid',
    razorpayOrderId: params.razorpay_order_id,
    razorpayPaymentId: params.razorpay_payment_id,
    updatedAt: new Date().toISOString(),
  };
  saveStaticOrder(updated);
  return {
    verified: true,
    order: updated,
    orderToken: makeOrderToken(updated.id),
  };
}

export async function staticGetOrder(
  id: string,
  _token: string,
  user: AuthUser | null
): Promise<Order | null> {
  const local = getStaticOrders().find((o) => o.id === id);
  if (local) return local;

  if (auth.currentUser?.emailVerified && user) {
    try {
      const snap = await getDoc(doc(db, 'orders', id));
      if (snap.exists()) {
        const d = snap.data() as Partial<Order> & { subtotal?: number };
        const items = (d.items || []) as CartItem[];
        return {
          ...(d as Order),
          gstAmount: d.gstAmount ?? calculateGstBreakdown(items, 0),
          deliveryMethod: d.deliveryMethod || 'standard',
          createdAt: typeof d.createdAt === 'string' ? d.createdAt : new Date().toISOString(),
          updatedAt: typeof d.updatedAt === 'string' ? d.updatedAt : new Date().toISOString(),
        };
      }
    } catch {
      // Ignore permission or offline errors
    }
  }
  return null;
}

export function staticRequestExchange(orderId: string, reason: string): Order | null {
  const order = getStaticOrders().find((o) => o.id === orderId);
  if (!order) return null;
  const updated: Order = {
    ...order,
    exchangeRequested: true,
    exchangeReason: reason,
    updatedAt: new Date().toISOString(),
  };
  saveStaticOrder(updated);
  return updated;
}

export function staticTrackOrder(
  orderId: string,
  contact: string
): { order: Order; orderToken: string } | null {
  const normalizedId = orderId.trim().toUpperCase();
  const rawContact = contact.trim().toLowerCase();
  const phoneDigits = contact.replace(/\D/g, '').slice(-10);

  const match = getStaticOrders().find((o) => {
    if (o.id.toUpperCase() !== normalizedId) return false;
    const emailMatch = o.customerEmail.toLowerCase() === rawContact;
    const orderDigits = (o.customerPhone || '').replace(/\D/g, '').slice(-10);
    const phoneMatch = phoneDigits.length === 10 && orderDigits === phoneDigits;
    return emailMatch || phoneMatch;
  });

  if (!match) return null;
  return { order: match, orderToken: makeOrderToken(match.id) };
}

export async function staticGetAccountOrders(user: AuthUser): Promise<Order[]> {
  const all = getStaticOrders();
  const email = user.email.toLowerCase();
  const matched = all.filter(
    (o) => o.userId === user.uid || o.customerEmail.toLowerCase() === email
  );

  if (auth.currentUser?.emailVerified) {
    try {
      const q = query(collection(db, 'orders'), where('userId', '==', auth.currentUser.uid));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        const data = d.data() as Order;
        if (!matched.some((m) => m.id === data.id)) {
          matched.push({
            ...data,
            gstAmount: data.gstAmount ?? calculateGstBreakdown(data.items || [], 0),
            deliveryMethod: data.deliveryMethod || 'standard',
            createdAt: typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString(),
            updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString(),
          });
        }
      }
    } catch {
      // Ignore offline/index issues
    }
  }

  return matched.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function staticSubmitReview(
  payload: {
    productId: string;
    authorName: string;
    rating: number;
    title: string;
    body: string;
  },
  user: AuthUser
): Promise<Review> {
  const review: Review = {
    id: `rev-${Date.now()}`,
    productId: payload.productId,
    userId: user.uid,
    authorName: payload.authorName,
    rating: payload.rating,
    title: payload.title,
    body: payload.body,
    verifiedBuyer: false,
    createdAt: new Date().toISOString(),
  };

  const existing = getStaticReviews();
  writeJson(REVIEWS_KEY, [review, ...existing]);

  if (auth.currentUser?.emailVerified) {
    try {
      await setDoc(doc(db, 'reviews', review.id), {
        id: review.id,
        productId: review.productId,
        userId: auth.currentUser.uid,
        authorName: review.authorName,
        rating: review.rating,
        title: review.title,
        body: review.body,
        verifiedBuyer: false,
        createdAt: serverTimestamp(),
      });
    } catch {
      // Saved locally already
    }
  }

  return review;
}

export function staticRequestOtp(email: string): { previewCode: string; message: string } {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  try {
    sessionStorage.setItem(
      OTP_SESSION_KEY,
      JSON.stringify({ email: email.trim().toLowerCase(), code, exp: Date.now() + 10 * 60_000 })
    );
  } catch {
    // Ignore storage error
  }
  return {
    previewCode: code,
    message: '6-digit verification code generated for preview sign-in.',
  };
}

export function staticVerifyOtp(
  email: string,
  code: string
): { token: string; email: string; isAdmin: boolean } {
  let stored: { email: string; code: string; exp: number } | null = null;
  try {
    const raw = sessionStorage.getItem(OTP_SESSION_KEY);
    if (raw) stored = JSON.parse(raw);
  } catch {
    // Ignore
  }
  const normalized = email.trim().toLowerCase();
  if (!stored || stored.email !== normalized || stored.code !== code.trim() || Date.now() > stored.exp) {
    throw new Error('Invalid or expired 6-digit verification code.');
  }
  try {
    sessionStorage.removeItem(OTP_SESSION_KEY);
  } catch {
    // Ignore
  }
  return {
    token: `static_otp_${Date.now().toString(36)}`,
    email: normalized,
    isAdmin: false,
  };
}

export function staticGetAdminDashboard() {
  const products = getStaticProducts();
  const orders = getStaticOrders();
  const coupons = getStaticCoupons();
  const banner = getStaticBanner();
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
  const today = new Date().toISOString().slice(0, 10);
  const todaysOrdersCount = orders.filter((o) => o.createdAt.slice(0, 10) === today).length;
  const totalRevenue = orders
    .filter((o) => o.status !== 'cancelled' && o.status !== 'returned')
    .reduce((sum, o) => sum + o.total, 0);

  return {
    stats: {
      totalOrders: orders.length,
      todaysOrdersCount,
      totalRevenue,
      lowStockCount: lowStockAlerts.length,
      productCount: products.length,
    },
    lowStockAlerts,
    products,
    orders,
    coupons,
    banner,
  };
}

export function staticAdminUpdateOrder(
  orderId: string,
  status: OrderStatus,
  trackingNumber?: string
): void {
  const order = getStaticOrders().find((o) => o.id === orderId);
  if (!order) return;
  saveStaticOrder({
    ...order,
    status,
    trackingNumber: trackingNumber !== undefined ? trackingNumber : order.trackingNumber,
    updatedAt: new Date().toISOString(),
  });
}

export function staticAdminRefundOrder(orderId: string): void {
  const order = getStaticOrders().find((o) => o.id === orderId);
  if (!order) return;
  saveStaticOrder({
    ...order,
    status: 'returned',
    refundId: `rfnd_static_${Date.now().toString(36)}`,
    refundAmount: order.total,
    updatedAt: new Date().toISOString(),
  });
}

export function staticAdminUpsertProduct(product: Product): void {
  const list = getStaticProducts().filter((p) => p.id !== product.id);
  list.unshift({ ...product, updatedAt: new Date().toISOString() });
  writeJson(PRODUCTS_KEY, list);
}

export function staticAdminDeleteProduct(id: string): void {
  const list = getStaticProducts().filter((p) => p.id !== id);
  writeJson(PRODUCTS_KEY, list);
}

export function staticAdminSaveBanner(banner: BannerConfig): void {
  writeJson(BANNER_KEY, banner);
}

export function staticAdminSaveCoupons(coupons: Coupon[]): void {
  writeJson(COUPONS_KEY, coupons);
}

export function staticAdminOrdersCsv(): string {
  const header = 'Order ID,Customer Name,Email,Total INR,Status,Payment,Created At';
  const rows = getStaticOrders().map((o) =>
    [
      o.id,
      `"${o.shippingAddress.fullName.replace(/"/g, '""')}"`,
      o.customerEmail,
      o.total,
      o.status,
      o.paymentMethod,
      o.createdAt,
    ].join(',')
  );
  return [header, ...rows].join('\n');
}
