import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Timestamp,
} from 'firebase/firestore';
import {
  IMG_KURTA_SAGE,
  SEED_BANNER,
  SEED_COUPONS,
  SEED_PRODUCTS,
  SEED_REVIEWS,
} from '../data/seedData';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
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
  SmsEventType,
  SmsLogRecord,
  SmsProviderType,
} from '../types';

const ORDERS_KEY = 'wicked_static_orders_v1';
const PRODUCTS_KEY = 'wicked_static_products_v2';
const COUPONS_KEY = 'wicked_static_coupons_v1';
const BANNER_KEY = 'wicked_static_banner_v1';
const REVIEWS_KEY = 'wicked_static_reviews_v1';
const OTP_SESSION_KEY = 'wicked_static_otp_v1';
const SMS_LOGS_KEY = 'wicked_static_sms_logs_v1';

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

function toIsoString(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value;
  if (value && typeof value === 'object') {
    const ts = value as Partial<Timestamp> & { seconds?: number; toDate?: () => Date };
    if (typeof ts.toDate === 'function') {
      return ts.toDate().toISOString();
    }
    if (typeof ts.seconds === 'number') {
      return new Date(ts.seconds * 1000).toISOString();
    }
  }
  return new Date().toISOString();
}

function sanitizeFirestoreUserId(rawUserId: string | undefined): string {
  const fbUser = auth.currentUser;
  if (fbUser && fbUser.emailVerified) {
    return fbUser.uid;
  }
  const cleaned = (rawUserId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  if (/^(guest|otp)_[a-zA-Z0-9_-]+$/.test(cleaned)) {
    return cleaned.slice(0, 128);
  }
  const suffix = cleaned.replace(/^_+/, '') || Date.now().toString(36);
  return `guest_${suffix}`.slice(0, 128);
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

function normalizeFirestoreOrder(raw: Record<string, unknown>): Order {
  const d = raw as Partial<Order>;
  const items = Array.isArray(d.items) ? (d.items as CartItem[]) : [];
  const subtotal = Number(d.subtotal || 0);
  const discount = Number(d.discount || 0);
  const discountRatio = subtotal > 0 ? discount / subtotal : 0;
  return {
    id: String(d.id || ''),
    userId: String(d.userId || ''),
    customerEmail: String(d.customerEmail || d.shippingAddress?.email || ''),
    customerPhone: String(d.customerPhone || d.shippingAddress?.phone || ''),
    status: (d.status || 'placed') as OrderStatus,
    paymentMethod: d.paymentMethod === 'cod' ? 'cod' : 'razorpay',
    deliveryMethod: d.deliveryMethod === 'express' ? 'express' : 'standard',
    razorpayOrderId: d.razorpayOrderId ? String(d.razorpayOrderId) : undefined,
    razorpayPaymentId: d.razorpayPaymentId ? String(d.razorpayPaymentId) : undefined,
    subtotal,
    discount,
    shippingFee: Number(d.shippingFee || 0),
    gstAmount:
      typeof d.gstAmount === 'number'
        ? d.gstAmount
        : calculateGstBreakdown(items, discountRatio),
    total: Number(d.total || 0),
    couponCode: d.couponCode ? String(d.couponCode) : undefined,
    giftNote: d.giftNote ? String(d.giftNote) : undefined,
    gstin: d.gstin ? String(d.gstin) : undefined,
    items,
    shippingAddress: d.shippingAddress as ShippingAddress,
    trackingNumber: d.trackingNumber ? String(d.trackingNumber) : undefined,
    exchangeRequested: Boolean(d.exchangeRequested),
    exchangeReason: d.exchangeReason ? String(d.exchangeReason) : undefined,
    refundId: d.refundId ? String(d.refundId) : undefined,
    refundAmount: typeof d.refundAmount === 'number' ? d.refundAmount : undefined,
    createdAt: toIsoString(d.createdAt),
    updatedAt: toIsoString(d.updatedAt),
  };
}

export function mergeOrdersList(...lists: Order[][]): Order[] {
  const byId = new Map<string, Order>();
  for (const list of lists) {
    for (const order of list) {
      if (!order?.id) continue;
      const prev = byId.get(order.id);
      if (!prev) {
        byId.set(order.id, order);
        continue;
      }
      const prevTime = new Date(prev.updatedAt || prev.createdAt).getTime();
      const nextTime = new Date(order.updatedAt || order.createdAt).getTime();
      if (nextTime >= prevTime) {
        byId.set(order.id, { ...prev, ...order });
      }
    }
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
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

export function getStaticOrders(): Order[] {
  const saved = readJson<Order[]>(ORDERS_KEY, []);
  const seeds = getSeedOrders();
  const merged = [...saved];
  for (const s of seeds) {
    if (!merged.some((o) => o.id === s.id)) merged.push(s);
  }
  return merged.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function saveStaticOrder(order: Order): void {
  const existing = getStaticOrders().filter((o) => o.id !== order.id);
  existing.unshift(order);
  writeJson(ORDERS_KEY, existing);
}

function makeOrderToken(orderId: string): string {
  return `static_tok_${orderId}`;
}

function buildOrderFirestorePayload(order: Order, userIdOverride?: string): Record<string, unknown> {
  const userId = userIdOverride || sanitizeFirestoreUserId(order.userId);
  const docData: Record<string, unknown> = {
    id: order.id,
    userId,
    customerEmail: (order.customerEmail || order.shippingAddress.email || '').slice(0, 180),
    customerPhone: (order.customerPhone || order.shippingAddress.phone || '').slice(0, 20),
    status: order.status,
    paymentMethod: order.paymentMethod,
    deliveryMethod: order.deliveryMethod || 'standard',
    total: Number(order.total || 0),
    subtotal: Number(order.subtotal || 0),
    shippingFee: Number(order.shippingFee || 0),
    discount: Number(order.discount || 0),
    gstAmount: Number(order.gstAmount || 0),
    items: order.items,
    shippingAddress: order.shippingAddress,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (order.razorpayOrderId) docData.razorpayOrderId = order.razorpayOrderId.slice(0, 100);
  if (order.razorpayPaymentId) docData.razorpayPaymentId = order.razorpayPaymentId.slice(0, 100);
  if (order.couponCode) docData.couponCode = order.couponCode.slice(0, 32);
  if (order.giftNote) docData.giftNote = order.giftNote.slice(0, 240);
  if (order.gstin) docData.gstin = order.gstin.slice(0, 15);
  if (order.trackingNumber) docData.trackingNumber = order.trackingNumber.slice(0, 80);
  if (order.refundId) docData.refundId = order.refundId.slice(0, 100);
  if (typeof order.refundAmount === 'number') docData.refundAmount = order.refundAmount;
  return docData;
}

export async function syncOrderToFirestore(order: Order): Promise<void> {
  saveStaticOrder(order);
  try {
    const docData = buildOrderFirestorePayload({
      ...order,
      status: order.status === 'paid' ? 'paid' : 'placed',
    });
    await setDoc(doc(db, 'orders', order.id), docData);
  } catch (err) {
    console.error('Firestore order sync error:', err);
  }
}

export async function syncOrderPaymentToFirestore(
  orderId: string,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  fallbackOrder?: Order
): Promise<void> {
  const fbUser = auth.currentUser;
  if (fbUser && fbUser.emailVerified) {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'paid',
        razorpayPaymentId: razorpayPaymentId.slice(0, 100),
        updatedAt: serverTimestamp(),
      });
      return;
    } catch {
      // Document may not exist yet in Firestore (e.g., created via Express backend)
    }
  }

  const orderToWrite =
    fallbackOrder || getStaticOrders().find((o) => o.id === orderId);
  if (orderToWrite) {
    await syncOrderToFirestore({
      ...orderToWrite,
      status: 'paid',
      razorpayOrderId,
      razorpayPaymentId,
    });
  }
}

export function subscribeAdminOrders(
  onOrders: (orders: Order[]) => void,
  onError?: (error: Error) => void
): () => void {
  const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const orders = snap.docs.map((d) =>
        normalizeFirestoreOrder(d.data() as Record<string, unknown>)
      );
      onOrders(orders);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      } catch (wrapped) {
        onError?.(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function fetchAdminOrdersFromFirestore(): Promise<Order[]> {
  try {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) =>
      normalizeFirestoreOrder(d.data() as Record<string, unknown>)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'orders');
  }
}

export async function syncAdminOrderUpdateToFirestore(
  orderId: string,
  updates: {
    status?: OrderStatus;
    trackingNumber?: string;
    refundId?: string;
    refundAmount?: number;
  },
  fallbackOrder?: Order
): Promise<void> {
  const orderRef = doc(db, 'orders', orderId);
  const patch: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (updates.status) patch.status = updates.status;
  if (typeof updates.trackingNumber === 'string') {
    patch.trackingNumber = updates.trackingNumber.slice(0, 80);
  }
  if (typeof updates.refundId === 'string') {
    patch.refundId = updates.refundId.slice(0, 100);
  }
  if (typeof updates.refundAmount === 'number') {
    patch.refundAmount = updates.refundAmount;
  }

  try {
    const snap = await getDoc(orderRef);
    if (snap.exists()) {
      await updateDoc(orderRef, patch);
      return;
    }
    const base = fallbackOrder || getStaticOrders().find((o) => o.id === orderId);
    if (base) {
      const merged: Order = {
        ...base,
        ...updates,
      };
      const payload = buildOrderFirestorePayload(
        merged,
        /^[a-zA-Z0-9_-]{2,128}$/.test(base.userId) ? base.userId : 'seed_user_1'
      );
      await setDoc(orderRef, payload);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
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
    userId: sanitizeFirestoreUserId(user?.uid),
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
  // For verified Firebase users or COD orders, sync immediately; guest Razorpay orders sync on payment verification with status='paid'
  if (paymentMethod === 'cod' || auth.currentUser?.emailVerified) {
    await syncOrderToFirestore(order);
  }

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

export async function staticVerifyPayment(params: {
  orderId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
}): Promise<{ verified: boolean; order: Order; orderToken: string }> {
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
  await syncOrderPaymentToFirestore(
    updated.id,
    params.razorpay_order_id,
    params.razorpay_payment_id,
    updated
  );
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
  const local = getStaticOrders().find((o) => o.id === id) || null;

  if (auth.currentUser?.emailVerified && user) {
    try {
      const snap = await getDoc(doc(db, 'orders', id));
      if (snap.exists()) {
        const remote = normalizeFirestoreOrder(snap.data() as Record<string, unknown>);
        if (!local) return remote;
        const localTime = new Date(local.updatedAt || local.createdAt).getTime();
        const remoteTime = new Date(remote.updatedAt || remote.createdAt).getTime();
        return remoteTime >= localTime ? remote : local;
      }
    } catch {
      // Ignore permission or offline errors
    }
  }
  return local;
}

export async function staticRequestExchange(
  orderId: string,
  reason: string
): Promise<Order | null> {
  const order = getStaticOrders().find((o) => o.id === orderId);
  if (!order) return null;
  const updated: Order = {
    ...order,
    exchangeRequested: true,
    exchangeReason: reason,
    updatedAt: new Date().toISOString(),
  };
  saveStaticOrder(updated);
  if (auth.currentUser?.emailVerified) {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        exchangeRequested: true,
        exchangeReason: reason.slice(0, 500),
        updatedAt: serverTimestamp(),
      });
    } catch {
      // Saved locally already
    }
  }
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
  const localMatched = all.filter(
    (o) => o.userId === user.uid || o.customerEmail.toLowerCase() === email
  );
  const remoteMatched: Order[] = [];

  if (auth.currentUser?.emailVerified) {
    try {
      const q = query(collection(db, 'orders'), where('userId', '==', auth.currentUser.uid));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        remoteMatched.push(normalizeFirestoreOrder(d.data() as Record<string, unknown>));
      }
    } catch {
      // Ignore offline/index issues
    }
  }

  return mergeOrdersList(localMatched, remoteMatched);
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
): Order | undefined {
  const order = getStaticOrders().find((o) => o.id === orderId);
  if (!order) return undefined;
  const updated: Order = {
    ...order,
    status,
    trackingNumber: trackingNumber !== undefined ? trackingNumber : order.trackingNumber,
    updatedAt: new Date().toISOString(),
  };
  saveStaticOrder(updated);
  return updated;
}

export function staticAdminRefundOrder(orderId: string): Order | undefined {
  const order = getStaticOrders().find((o) => o.id === orderId);
  if (!order) return undefined;
  const updated: Order = {
    ...order,
    status: 'returned',
    refundId: `rfnd_static_${Date.now().toString(36)}`,
    refundAmount: order.total,
    updatedAt: new Date().toISOString(),
  };
  saveStaticOrder(updated);
  return updated;
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

export function staticAdminOrdersCsv(ordersInput?: Order[]): string {
  const orders = ordersInput || getStaticOrders();
  const header = 'Order ID,Customer Name,Email,Total INR,Status,Payment,Created At';
  const rows = orders.map((o) =>
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

export function normalizeClientIndianPhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  if (digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }
  return null;
}

export function buildSmsDeepLink(phone: string, message: string): string {
  const normalized = normalizeClientIndianPhone(phone) || phone.replace(/[^\d+]/g, '');
  const encodedBody = encodeURIComponent(message);
  return `sms:${normalized}?body=${encodedBody}`;
}

export function buildClientOrderSmsText(order: Order): string {
  if (order.status === 'paid') {
    return `WICKED: Payment of Rs.${order.total.toLocaleString('en-IN')} received for Order ${order.id}. We are preparing your dispatch. Help: +91 76657 12877.`;
  }
  if (order.status === 'packed' || order.status === 'shipped' || order.status === 'delivered') {
    const awb = order.trackingNumber ? ` AWB: ${order.trackingNumber}.` : '';
    return `WICKED: Update for Order ${order.id} — status is now ${order.status.toUpperCase()}.${awb} Queries: +91 76657 12877.`;
  }
  if (order.status === 'returned' || order.status === 'cancelled') {
    return `WICKED: Order ${order.id} is marked ${order.status.toUpperCase()}. Reach us at +91 76657 12877 for any assistance.`;
  }
  return `WICKED: Order ${order.id} for Rs.${order.total.toLocaleString('en-IN')} (${order.paymentMethod.toUpperCase()}) is confirmed! Queries: +91 76657 12877.`;
}

export function getStaticSmsLogs(): SmsLogRecord[] {
  return readJson<SmsLogRecord[]>(SMS_LOGS_KEY, []).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function saveStaticSmsLog(entry: SmsLogRecord): void {
  const existing = getStaticSmsLogs().filter((l) => l.id !== entry.id);
  existing.unshift(entry);
  if (existing.length > 150) existing.length = 150;
  writeJson(SMS_LOGS_KEY, existing);
}

export function mergeSmsLogs(...lists: SmsLogRecord[][]): SmsLogRecord[] {
  const map = new Map<string, SmsLogRecord>();
  for (const list of lists) {
    for (const item of list) {
      if (!item?.id) continue;
      map.set(item.id, item);
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function recordSmsDispatch(params: {
  to: string;
  message: string;
  event: SmsEventType;
  provider?: SmsProviderType;
  status?: SmsLogRecord['status'];
  orderId?: string;
  createdBy?: string;
}): Promise<SmsLogRecord> {
  const normalized = normalizeClientIndianPhone(params.to) || params.to.trim();
  const id = `sms_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const createdBy = sanitizeFirestoreUserId(params.createdBy);
  const record: SmsLogRecord = {
    id,
    orderId: params.orderId,
    to: normalized,
    message: params.message.trim().slice(0, 480),
    event: params.event,
    provider: params.provider || 'sandbox',
    status: params.status || 'simulated',
    createdBy,
    createdAt: new Date().toISOString(),
  };

  saveStaticSmsLog(record);

  try {
    const docData: Record<string, unknown> = {
      id: record.id,
      to: record.to.slice(0, 24),
      message: record.message.slice(0, 500),
      event: record.event,
      provider: record.provider,
      status: record.status,
      createdBy,
      createdAt: serverTimestamp(),
    };
    if (record.orderId && /^[a-zA-Z0-9_-]{2,128}$/.test(record.orderId)) {
      docData.orderId = record.orderId;
    }
    await setDoc(doc(db, 'smsLogs', record.id), docData);
  } catch {
    // Saved locally even if offline or unauthenticated
  }

  return record;
}

export function subscribeAdminSmsLogs(
  onLogs: (logs: SmsLogRecord[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(collection(db, 'smsLogs'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const logs: SmsLogRecord[] = snap.docs.map((d) => {
        const raw = d.data() as Partial<SmsLogRecord>;
        return {
          id: String(raw.id || d.id),
          orderId: raw.orderId ? String(raw.orderId) : undefined,
          to: String(raw.to || ''),
          message: String(raw.message || ''),
          event: (raw.event || 'custom') as SmsEventType,
          provider: (raw.provider || 'sandbox') as SmsProviderType,
          status: (raw.status || 'simulated') as SmsLogRecord['status'],
          createdBy: String(raw.createdBy || 'system'),
          error: raw.error ? String(raw.error) : undefined,
          createdAt: toIsoString(raw.createdAt),
        };
      });
      onLogs(logs);
    },
    (error) => {
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  );
}

export function staticRequestSmsOtp(phone: string): {
  phone: string;
  previewCode: string;
  message: string;
} {
  const normalized = normalizeClientIndianPhone(phone);
  if (!normalized) {
    throw new Error('Enter a valid 10-digit Indian mobile number.');
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  try {
    sessionStorage.setItem(
      OTP_SESSION_KEY,
      JSON.stringify({ email: `sms:${normalized}`, code, exp: Date.now() + 10 * 60_000 })
    );
  } catch {
    // Ignore storage error
  }
  void recordSmsDispatch({
    to: normalized,
    message: `Your Wicked verification code is ${code}. Valid for 10 minutes.`,
    event: 'otp',
    provider: 'sandbox',
    status: 'simulated',
    createdBy: `otp_${normalized.replace(/\D/g, '')}`,
  });
  return {
    phone: normalized,
    previewCode: code,
    message: `6-digit SMS code generated for ${normalized}.`,
  };
}

export function staticVerifySmsOtp(
  phone: string,
  code: string
): { token: string; phone: string; email: string; isAdmin: boolean } {
  const normalized = normalizeClientIndianPhone(phone);
  if (!normalized) {
    throw new Error('Enter a valid 10-digit Indian mobile number.');
  }
  let stored: { email: string; code: string; exp: number } | null = null;
  try {
    const raw = sessionStorage.getItem(OTP_SESSION_KEY);
    if (raw) stored = JSON.parse(raw);
  } catch {
    // Ignore
  }
  if (
    !stored ||
    stored.email !== `sms:${normalized}` ||
    stored.code !== code.trim() ||
    Date.now() > stored.exp
  ) {
    throw new Error('Invalid or expired 6-digit SMS code.');
  }
  try {
    sessionStorage.removeItem(OTP_SESSION_KEY);
  } catch {
    // Ignore
  }
  return {
    token: `static_sms_${Date.now().toString(36)}`,
    phone: normalized,
    email: `${normalized.replace(/\D/g, '')}@sms.wicked.in`,
    isAdmin: false,
  };
}
