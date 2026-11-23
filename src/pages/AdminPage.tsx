import { AlertTriangle, Download, LogOut, MessageSquare, Plus, RefreshCw, Send, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { IMG_TEE_SAGE, SEED_SHOWCASE } from '../data/seedData';
import { auth } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import {
  buildClientOrderSmsText,
  buildSmsDeepLink,
  fetchAdminOrdersFromFirestore,
  getStaticSmsLogs,
  mergeOrdersList,
  mergeSmsLogs,
  recordSmsDispatch,
  saveStaticOrder,
  saveStaticSmsLog,
  staticAdminDeleteProduct,
  staticAdminOrdersCsv,
  staticAdminRefundOrder,
  staticAdminSaveBanner,
  staticAdminSaveCoupons,
  staticAdminUpdateOrder,
  staticAdminUpsertProduct,
  staticGetAdminDashboard,
  subscribeAdminOrders,
  subscribeAdminSmsLogs,
  syncAdminOrderUpdateToFirestore,
  tryApiJson,
} from '../lib/staticStore';
import type { BannerConfig, Coupon, Order, OrderStatus, Product, ShowcaseData, SmsLogRecord } from '../types';

interface DashboardResponse {
  stats: {
    totalOrders: number;
    todaysOrdersCount: number;
    totalRevenue: number;
    lowStockCount: number;
    productCount: number;
  };
  lowStockAlerts: Array<{
    productId: string;
    productName: string;
    sku: string;
    color: string;
    size: string;
    stock: number;
  }>;
  products: Product[];
  orders: Order[];
  coupons: Coupon[];
  banner: BannerConfig;
  showcase: ShowcaseData;
}

export function AdminPage() {
  const { user, signInWithGoogle, signOut, getAuthToken } = useAuth();
  const [tab, setTab] = useState<'orders' | 'products' | 'merchandising' | 'sms'>('orders');
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [firestoreOrders, setFirestoreOrders] = useState<Order[]>([]);
  const [syncingOrders, setSyncingOrders] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [toast, setToast] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  // Product editor state
  const [editingProd, setEditingProd] = useState<Product | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState<Product['category']>('tees');
  const [prodPrice, setProdPrice] = useState(1499);
  const [prodGsm, setProdGsm] = useState(280);
  const [prodFit, setProdFit] = useState('Boxy Fit');
  const [prodDesc, setProdDesc] = useState('');
  const [prodImage, setProdImage] = useState(IMG_TEE_SAGE);
  const [prodStock, setProdStock] = useState(15);

  // Coupon & Banner editor state
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponPct, setNewCouponPct] = useState(10);
  const [bannerHeadline, setBannerHeadline] = useState('');
  const [marqueeText, setMarqueeText] = useState('');

  // SMS Composer & Logs state
  const [smsTo, setSmsTo] = useState('');
  const [smsOrderId, setSmsOrderId] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [sendingSms, setSendingSms] = useState(false);
  const [apiSmsLogs, setApiSmsLogs] = useState<SmsLogRecord[]>([]);
  const [firestoreSmsLogs, setFirestoreSmsLogs] = useState<SmsLogRecord[]>([]);
  const [smsProviderLabel, setSmsProviderLabel] = useState<'twilio' | 'fast2sms' | 'sandbox'>('sandbox');

  useDocumentMeta({
    title: 'Admin Console — Wicked',
    description: 'Manage Wicked inventory, orders, refunds, coupons, and interactive showcase content.',
  });

  const loadDashboard = useCallback(async () => {
    const token = await getAuthToken();
    if (!token) return;
    const api = await tryApiJson<DashboardResponse & { error?: string }>('/api/admin/dashboard', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (api.available) {
      if (!api.ok) {
        setError(api.data.error || 'Admin access required.');
        return;
      }
      setError('');
      setData(api.data);
      setBannerHeadline(api.data.banner?.headline || '');
      setMarqueeText(api.data.banner?.marqueeText || '');
      return;
    }

    const staticDash = staticGetAdminDashboard();
    const fallbackData: DashboardResponse = {
      ...staticDash,
      showcase: SEED_SHOWCASE,
    };
    setError('');
    setData(fallbackData);
    setBannerHeadline(fallbackData.banner?.headline || '');
    setMarqueeText(fallbackData.banner?.marqueeText || '');
  }, [getAuthToken]);

  useEffect(() => {
    if (user?.isAdmin) {
      loadDashboard();
    }
  }, [user, loadDashboard]);

  useEffect(() => {
    if (!user?.isAdmin) {
      setApiSmsLogs([]);
      return;
    }
    setApiSmsLogs(getStaticSmsLogs());
    (async () => {
      const token = await getAuthToken();
      if (!token) return;
      const api = await tryApiJson<{
        provider?: 'twilio' | 'fast2sms' | 'sandbox';
        logs?: SmsLogRecord[];
      }>('/api/admin/sms/logs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (api.available && api.ok) {
        if (api.data.provider) setSmsProviderLabel(api.data.provider);
        if (Array.isArray(api.data.logs)) setApiSmsLogs(api.data.logs);
      }
    })();
  }, [user, getAuthToken]);

  useEffect(() => {
    if (!user?.isAdmin || !auth.currentUser?.emailVerified) {
      setFirestoreOrders([]);
      setFirestoreSmsLogs([]);
      return;
    }
    const unsub = subscribeAdminOrders(
      (remoteOrders) => {
        setFirestoreOrders(remoteOrders);
        for (const o of remoteOrders) {
          saveStaticOrder(o);
        }
      },
      (err) => {
        setToast(`Firestore sync notice: ${err.message}`);
      }
    );
    const unsubSms = subscribeAdminSmsLogs((logs) => {
      setFirestoreSmsLogs(logs);
      for (const l of logs) saveStaticSmsLog(l);
    });
    return () => {
      unsub();
      unsubSms();
    };
  }, [user]);

  const mergedOrders = useMemo(
    () => mergeOrdersList(data?.orders || [], firestoreOrders),
    [data?.orders, firestoreOrders]
  );

  const mergedSmsLogs = useMemo(
    () => mergeSmsLogs(getStaticSmsLogs(), apiSmsLogs, firestoreSmsLogs),
    [apiSmsLogs, firestoreSmsLogs]
  );

  const computedStats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todaysOrdersCount = mergedOrders.filter(
      (o) => (o.createdAt || '').slice(0, 10) === today
    ).length;
    const totalRevenue = mergedOrders
      .filter((o) => o.status !== 'cancelled' && o.status !== 'returned')
      .reduce((sum, o) => sum + o.total, 0);
    return {
      totalOrders: mergedOrders.length,
      todaysOrdersCount,
      totalRevenue,
      lowStockCount: data?.stats.lowStockCount ?? 0,
      productCount: data?.stats.productCount ?? 0,
    };
  }, [mergedOrders, data?.stats]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="p-8 rounded-lg bg-[#FCFBF7] border border-[#C5D1B8]">
          <h1 className="font-display text-2xl font-bold">Wicked Admin Sign In</h1>
          <p className="text-sm text-[#4D5A48] mt-2 mb-6">
            Sign in with the store owner account to manage inventory, orders, and Razorpay refunds.
          </p>
          <button
            type="button"
            onClick={() => signInWithGoogle()}
            className="w-full py-3 px-5 rounded-md bg-[#9CAF88] text-[#1F2A1C] font-bold text-sm"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      setData(null);
      setError('');
    } finally {
      setSigningOut(false);
    }
  };

  if (!user.isAdmin || error) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="p-8 rounded-lg bg-[#FCFBF7] border border-[#C5D1B8] space-y-5">
          <div>
            <h1 className="font-display text-2xl font-bold">Access Restricted</h1>
            <p className="text-sm text-[#4D5A48] mt-2">
              {error || `Signed in as ${user.email}. Admin privileges are restricted to the store owner.`}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="px-5 py-2.5 rounded-md bg-[#E7ECE0] border border-[#C5D1B8] text-[#1F2A1C] text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-[#9CAF88]/40 transition-colors disabled:opacity-60"
          >
            <LogOut className="w-4 h-4" />
            <span>{signingOut ? 'Signing out...' : 'Sign out'}</span>
          </button>
        </div>
      </div>
    );
  }

  const handleManualSync = async () => {
    setSyncingOrders(true);
    try {
      await loadDashboard();
      if (auth.currentUser?.emailVerified) {
        const remote = await fetchAdminOrdersFromFirestore();
        setFirestoreOrders(remote);
        for (const o of remote) saveStaticOrder(o);
      }
      setToast('Orders synced from Firestore and store backend.');
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Unable to sync orders.');
    } finally {
      setSyncingOrders(false);
    }
  };

  const handleUpdateOrder = async (orderId: string, status: OrderStatus, trackingNumber?: string) => {
    const token = await getAuthToken();
    if (!token) return;
    const targetOrder = mergedOrders.find((o) => o.id === orderId);
    const api = await tryApiJson(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status, trackingNumber }),
    });
    if (api.available && api.ok) {
      staticAdminUpdateOrder(orderId, status, trackingNumber);
      try {
        await syncAdminOrderUpdateToFirestore(orderId, { status, trackingNumber }, targetOrder);
      } catch {
        // Already updated on server
      }
      setToast(`Order ${orderId} updated to ${status}`);
      loadDashboard();
      return;
    }
    const updatedLocal = staticAdminUpdateOrder(orderId, status, trackingNumber);
    try {
      await syncAdminOrderUpdateToFirestore(
        orderId,
        { status, trackingNumber },
        updatedLocal || targetOrder
      );
      if (updatedLocal || targetOrder) {
        const orderForSms = {
          ...(updatedLocal || targetOrder)!,
          status,
          trackingNumber: trackingNumber !== undefined ? trackingNumber : (updatedLocal || targetOrder)?.trackingNumber,
        };
        if (orderForSms.customerPhone) {
          void recordSmsDispatch({
            to: orderForSms.customerPhone,
            message: buildClientOrderSmsText(orderForSms),
            event: 'status_update',
            orderId,
            createdBy: user.uid,
          });
        }
      }
      setToast(`Order ${orderId} updated to ${status}`);
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Failed to sync order update.');
    }
    loadDashboard();
  };

  const handleOpenSmsForOrder = (order: Order) => {
    setSmsTo(order.customerPhone || order.shippingAddress.phone || '');
    setSmsOrderId(order.id);
    setSmsMessage(buildClientOrderSmsText(order));
    setTab('sms');
  };

  const handleSendAdminSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsTo.trim() || !smsMessage.trim()) return;
    setSendingSms(true);
    try {
      const token = await getAuthToken();
      if (token) {
        const api = await tryApiJson<{ log?: SmsLogRecord; error?: string }>('/api/admin/sms/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            to: smsTo.trim(),
            message: smsMessage.trim(),
            orderId: smsOrderId.trim() || undefined,
            event: 'custom',
          }),
        });
        if (api.available) {
          if (!api.ok || !api.data.log) {
            throw new Error(api.data.error || 'Unable to send SMS.');
          }
          saveStaticSmsLog(api.data.log);
          setApiSmsLogs((prev) => [api.data.log!, ...prev]);
          await recordSmsDispatch({
            to: api.data.log.to,
            message: api.data.log.message,
            event: api.data.log.event,
            provider: api.data.log.provider,
            status: api.data.log.status,
            orderId: api.data.log.orderId,
            createdBy: user.uid,
          });
          setToast(
            api.data.log.status === 'sent'
              ? `SMS delivered to ${api.data.log.to}`
              : `SMS queued in sandbox log for ${api.data.log.to}`
          );
          setSmsMessage('');
          return;
        }
      }

      const log = await recordSmsDispatch({
        to: smsTo.trim(),
        message: smsMessage.trim(),
        event: 'custom',
        orderId: smsOrderId.trim() || undefined,
        createdBy: user.uid,
      });
      setApiSmsLogs((prev) => [log, ...prev]);
      setToast(`SMS saved to dispatch log for ${log.to}`);
      setSmsMessage('');
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'SMS send failed.');
    } finally {
      setSendingSms(false);
    }
  };

  const handleRefundOrder = async (order: Order) => {
    const token = await getAuthToken();
    if (!token) return;
    const api = await tryApiJson<{ error?: string; order?: Order }>(
      `/api/admin/orders/${encodeURIComponent(order.id)}/refund`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amountInr: order.total, reason: 'Admin issued refund' }),
      }
    );
    if (api.available && api.status !== 404) {
      if (api.ok) {
        staticAdminRefundOrder(order.id);
        try {
          await syncAdminOrderUpdateToFirestore(
            order.id,
            {
              status: 'returned',
              refundId: api.data.order?.refundId,
              refundAmount: order.total,
            },
            api.data.order || order
          );
        } catch {
          // Server refund already recorded
        }
        setToast(`Refund issued for ${order.id} (₹${order.total.toLocaleString('en-IN')})`);
        loadDashboard();
      } else {
        setToast(api.data.error || 'Refund failed.');
      }
      return;
    }
    const refunded = staticAdminRefundOrder(order.id);
    try {
      await syncAdminOrderUpdateToFirestore(
        order.id,
        {
          status: 'returned',
          refundId: refunded?.refundId,
          refundAmount: order.total,
        },
        refunded || order
      );
      setToast(`Refund issued for ${order.id} (₹${order.total.toLocaleString('en-IN')})`);
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Failed to sync refund.');
    }
    loadDashboard();
  };

  const handleExportCsv = async () => {
    const blob = new Blob([staticAdminOrdersCsv(mergedOrders)], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wicked-orders.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setProdImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = await getAuthToken();
    if (!token) return;
    const id = editingProd?.id || `wk-custom-${Date.now()}`;
    const slug =
      editingProd?.slug ||
      prodName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    const payload: Product = {
      id,
      slug,
      name: prodName,
      category: prodCategory,
      gender: editingProd?.gender || 'unisex',
      fit: prodFit,
      price: Number(prodPrice),
      gsm: Number(prodGsm),
      fabric: editingProd?.fabric || '100% Organic Cotton',
      care: editingProd?.care || 'Cold wash inside out.',
      description: prodDesc || 'Crafted by Wicked India.',
      isNew: true,
      featured: true,
      colors: [
        {
          name: 'Sage',
          hex: '#9CAF88',
          images: [prodImage],
        },
      ],
      variants: ['S', 'M', 'L', 'XL'].map((sz) => ({
        sku: `${id.toUpperCase()}-${sz}`,
        color: 'Sage',
        size: sz,
        stock: Number(prodStock),
      })),
      rating: editingProd?.rating || 4.8,
      reviewCount: editingProd?.reviewCount || 0,
    };

    const api = await tryApiJson(
      editingProd ? `/api/admin/products/${encodeURIComponent(id)}` : '/api/admin/products',
      {
        method: editingProd ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );
    if (!api.available || api.ok) {
      if (!api.available) staticAdminUpsertProduct(payload);
      setToast(editingProd ? 'Product updated.' : 'Product created.');
      setEditingProd(null);
      setProdName('');
      setProdDesc('');
      loadDashboard();
    }
  };

  const handleDeleteProduct = async (id: string) => {
    const token = await getAuthToken();
    if (!token) return;
    const api = await tryApiJson(`/api/admin/products/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!api.available || api.ok) {
      if (!api.available) staticAdminDeleteProduct(id);
      setToast('Product deleted.');
      loadDashboard();
    }
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = await getAuthToken();
    if (!token || !data?.banner) return;
    const nextBanner = {
      ...data.banner,
      headline: bannerHeadline,
      marqueeText,
    };
    const api = await tryApiJson('/api/admin/banners', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(nextBanner),
    });
    if (!api.available || api.ok) {
      if (!api.available) staticAdminSaveBanner(nextBanner);
      setToast('Homepage banner updated.');
      loadDashboard();
    }
  };

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = await getAuthToken();
    if (!token || !data) return;
    const updated = [
      ...data.coupons,
      {
        code: newCouponCode.toUpperCase().trim(),
        percentOff: Number(newCouponPct),
        minSubtotal: 0,
        active: true,
      },
    ];
    const api = await tryApiJson('/api/admin/coupons', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updated),
    });
    if (!api.available || api.ok) {
      if (!api.available) staticAdminSaveCoupons(updated);
      setNewCouponCode('');
      setToast('Coupon added.');
      loadDashboard();
    }
  };

  const orders = mergedOrders.filter(
    (o) => statusFilter === 'all' || o.status === statusFilter
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#C5D1B8]">
        <div>
          <p className="text-xs font-medium text-[#4D5A48]">
            Protected Store Console · Signed in as {user.email}
          </p>
          <h1 className="font-display text-3xl font-bold mt-1">Wicked Admin</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'orders', label: 'Orders & Refunds' },
            { id: 'products', label: 'Products & Stock' },
            { id: 'merchandising', label: 'Coupons & Banners' },
            { id: 'sms', label: 'SMS Alerts' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as typeof tab)}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                tab === t.id
                  ? 'bg-[#9CAF88] text-[#1F2A1C]'
                  : 'bg-[#E7ECE0] text-[#4D5A48] hover:text-[#1F2A1C]'
              }`}
            >
              {t.label}
            </button>
          ))}
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="px-4 py-2 rounded-md bg-[#E7ECE0] border border-[#C5D1B8] text-[#1F2A1C] text-sm font-semibold inline-flex items-center gap-2 hover:bg-[#9CAF88]/40 transition-colors disabled:opacity-60"
          >
            <LogOut className="w-4 h-4" />
            <span>{signingOut ? 'Signing out...' : 'Sign out'}</span>
          </button>
        </div>
      </div>

      {toast && (
        <div className="p-3.5 rounded-md bg-[#9CAF88]/40 border border-[#7F956B] text-sm font-semibold flex justify-between">
          <span>{toast}</span>
          <button type="button" onClick={() => setToast('')} className="underline text-xs">
            Close
          </button>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-lg bg-[#FCFBF7] border border-[#C5D1B8]">
          <p className="text-xs text-[#4D5A48]">Today&apos;s Orders</p>
          <p className="font-display text-3xl font-bold mt-1 tabular-nums">
            {computedStats.todaysOrdersCount}
          </p>
        </div>
        <div className="p-5 rounded-lg bg-[#FCFBF7] border border-[#C5D1B8]">
          <p className="text-xs text-[#4D5A48]">Total Revenue</p>
          <p className="font-display text-3xl font-bold mt-1 tabular-nums">
            ₹{computedStats.totalRevenue.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="p-5 rounded-lg bg-[#FCFBF7] border border-[#C5D1B8]">
          <p className="text-xs text-[#4D5A48]">Total Synced Orders</p>
          <p className="font-display text-3xl font-bold mt-1 tabular-nums">
            {computedStats.totalOrders}
          </p>
        </div>
        <div className="p-5 rounded-lg bg-[#FCFBF7] border border-[#C5D1B8]">
          <p className="text-xs text-[#4D5A48]">Low-Stock Alerts</p>
          <p className="font-display text-3xl font-bold mt-1 tabular-nums">
            {computedStats.lowStockCount}
          </p>
        </div>
      </div>

      {/* Low Stock Banner */}
      {(data?.lowStockAlerts.length ?? 0) > 0 && (
        <div className="p-4 rounded-lg bg-[#E7ECE0] border border-[#C5D1B8]">
          <p className="text-xs font-bold flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Low-Stock Variants (≤ 5 units)</span>
          </p>
          <div className="flex flex-wrap gap-3 text-xs tabular-nums">
            {data?.lowStockAlerts.slice(0, 8).map((a) => (
              <span key={a.sku} className="bg-[#F7F5EF] px-2.5 py-1 rounded border border-[#C5D1B8]">
                {a.productName} ({a.color}/{a.size}): <strong>{a.stock}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {tab === 'orders' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {['all', 'placed', 'paid', 'packed', 'shipped', 'delivered', 'returned'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize ${
                    statusFilter === s
                      ? 'bg-[#9CAF88] text-[#1F2A1C]'
                      : 'bg-[#E7ECE0] text-[#4D5A48]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleManualSync}
                disabled={syncingOrders}
                className="px-4 py-2 rounded-md bg-[#E7ECE0] border border-[#C5D1B8] text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-[#9CAF88] disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${syncingOrders ? 'animate-spin' : ''}`} />
                <span>{syncingOrders ? 'Syncing...' : 'Sync Orders'}</span>
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                className="px-4 py-2 rounded-md bg-[#E7ECE0] border border-[#C5D1B8] text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-[#9CAF88]"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-[#C5D1B8] rounded-lg bg-[#FCFBF7]">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#C5D1B8] bg-[#E7ECE0]/60 text-xs text-[#4D5A48]">
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Tracking</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#CFD9C3] tabular-nums">
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="py-3 px-4">
                      <p className="font-semibold">{o.id}</p>
                      <p className="text-[11px] text-[#4D5A48]">
                        {new Date(o.createdAt).toLocaleDateString('en-IN')} · {o.paymentMethod.toUpperCase()}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium">{o.shippingAddress.fullName}</p>
                      <p className="text-xs text-[#4D5A48]">{o.customerEmail}</p>
                      {o.customerPhone && (
                        <p className="text-xs text-[#4D5A48] tabular-nums">{o.customerPhone}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold">₹{o.total.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4">
                      <select
                        value={o.status}
                        onChange={(e) =>
                          handleUpdateOrder(o.id, e.target.value as OrderStatus, o.trackingNumber)
                        }
                        className="px-2 py-1 text-xs rounded border border-[#C5D1B8] bg-[#F7F5EF]"
                      >
                        {['placed', 'paid', 'packed', 'shipped', 'delivered', 'cancelled', 'returned'].map(
                          (st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          )
                        )}
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        defaultValue={o.trackingNumber || ''}
                        placeholder="AWB #"
                        onBlur={(e) => handleUpdateOrder(o.id, o.status, e.target.value)}
                        className="w-32 px-2 py-1 text-xs rounded border border-[#C5D1B8] bg-[#F7F5EF]"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {o.customerPhone && (
                          <button
                            type="button"
                            onClick={() => handleOpenSmsForOrder(o)}
                            className="px-2.5 py-1 rounded text-xs font-semibold bg-[#E7ECE0] border border-[#C5D1B8] hover:bg-[#9CAF88] inline-flex items-center gap-1"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>SMS</span>
                          </button>
                        )}
                        {o.status !== 'returned' ? (
                          <button
                            type="button"
                            onClick={() => handleRefundOrder(o)}
                            className="px-3 py-1 rounded text-xs font-semibold bg-[#E7ECE0] border border-[#C5D1B8] hover:bg-[#9CAF88]"
                          >
                            Refund
                          </button>
                        ) : (
                          <span className="text-xs text-[#4D5A48]">Refunded</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'products' && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <form
            onSubmit={handleSaveProduct}
            className="lg:col-span-5 p-6 rounded-lg bg-[#FCFBF7] border border-[#C5D1B8] space-y-4"
          >
            <h2 className="font-display text-xl font-bold flex items-center gap-2">
              <Plus className="w-5 h-5" />
              <span>{editingProd ? 'Edit Product' : 'Add New Product'}</span>
            </h2>
            <input
              required
              placeholder="Product Name"
              value={prodName}
              onChange={(e) => setProdName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={prodCategory}
                onChange={(e) => setProdCategory(e.target.value as Product['category'])}
                className="px-3 py-2 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md"
              >
                {['tees', 'shirts', 'kurtas', 'hoodies', 'bottoms', 'accessories'].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                type="number"
                required
                placeholder="Price INR"
                value={prodPrice}
                onChange={(e) => setProdPrice(Number(e.target.value))}
                className="px-3 py-2 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md tabular-nums"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <input
                type="number"
                placeholder="GSM"
                value={prodGsm}
                onChange={(e) => setProdGsm(Number(e.target.value))}
                className="px-3 py-2 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md"
              />
              <input
                placeholder="Fit"
                value={prodFit}
                onChange={(e) => setProdFit(e.target.value)}
                className="px-3 py-2 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md"
              />
              <input
                type="number"
                placeholder="Stock"
                value={prodStock}
                onChange={(e) => setProdStock(Number(e.target.value))}
                className="px-3 py-2 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md"
              />
            </div>
            <textarea
              rows={3}
              placeholder="Description"
              value={prodDesc}
              onChange={(e) => setProdDesc(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md"
            />
            <div>
              <label className="block text-xs font-semibold mb-1" htmlFor="prod-img-upload">
                Upload Product Image (or keep studio default)
              </label>
              <input
                id="prod-img-upload"
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="text-xs"
              />
            </div>
            <button type="submit" className="w-full py-3 px-5 rounded-md btn-tomato">
              {editingProd ? 'Save Changes' : 'Publish Product'}
            </button>
          </form>

          <div className="lg:col-span-7 space-y-3">
            {(data?.products || []).map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-lg bg-[#FCFBF7] border border-[#C5D1B8] flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={p.colors[0].images[0]}
                    alt={p.name}
                    className="w-12 h-14 object-cover rounded border border-[#C5D1B8] shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <p className="font-display font-bold text-sm truncate">{p.name}</p>
                    <p className="text-xs text-[#4D5A48] tabular-nums">
                      {p.category} · ₹{p.price.toLocaleString('en-IN')} ·{' '}
                      {p.variants.reduce((s, v) => s + v.stock, 0)} units total
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProd(p);
                      setProdName(p.name);
                      setProdCategory(p.category);
                      setProdPrice(p.price);
                      setProdGsm(p.gsm);
                      setProdFit(p.fit);
                      setProdDesc(p.description);
                      setProdImage(p.colors[0].images[0]);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded bg-[#E7ECE0] border border-[#C5D1B8]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(p.id)}
                    aria-label={`Delete ${p.name}`}
                    className="p-2 text-[#4D5A48] hover:text-[#1F2A1C]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'merchandising' && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <form
            onSubmit={handleSaveBanner}
            className="p-6 rounded-lg bg-[#FCFBF7] border border-[#C5D1B8] space-y-4"
          >
            <h2 className="font-display text-xl font-bold">Homepage Hero &amp; Marquee</h2>
            <div>
              <label className="block text-xs font-semibold mb-1" htmlFor="adm-headline">
                Hero Headline
              </label>
              <input
                id="adm-headline"
                value={bannerHeadline}
                onChange={(e) => setBannerHeadline(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" htmlFor="adm-marquee">
                Marquee Strip Text
              </label>
              <input
                id="adm-marquee"
                value={marqueeText}
                onChange={(e) => setMarqueeText(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md"
              />
            </div>
            <button type="submit" className="px-5 py-2.5 rounded-md btn-tomato">
              Save Banner
            </button>
          </form>

          <div className="p-6 rounded-lg bg-[#FCFBF7] border border-[#C5D1B8] space-y-4">
            <h2 className="font-display text-xl font-bold">Active Coupons</h2>
            <ul className="divide-y divide-[#CFD9C3] text-sm">
              {(data?.coupons || []).map((c) => (
                <li key={c.code} className="py-2.5 flex justify-between tabular-nums">
                  <span className="font-mono font-bold">{c.code}</span>
                  <span>{c.percentOff}% off (min ₹{c.minSubtotal})</span>
                </li>
              ))}
            </ul>
            <form onSubmit={handleAddCoupon} className="flex gap-2 pt-2">
              <input
                required
                placeholder="CODE20"
                value={newCouponCode}
                onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                className="flex-1 px-3 py-2 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md font-mono"
              />
              <input
                type="number"
                min={1}
                max={80}
                value={newCouponPct}
                onChange={(e) => setNewCouponPct(Number(e.target.value))}
                className="w-20 px-3 py-2 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md tabular-nums"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-md bg-[#9CAF88] text-[#1F2A1C] font-bold text-sm"
              >
                Add
              </button>
            </form>
          </div>
        </section>
      )}

      {tab === 'sms' && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <form
            onSubmit={handleSendAdminSms}
            className="lg:col-span-5 p-6 rounded-lg bg-[#FCFBF7] border border-[#C5D1B8] space-y-4"
          >
            <div>
              <h2 className="font-display text-xl font-bold flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                <span>Send Customer SMS</span>
              </h2>
              <p className="text-xs text-[#4D5A48] mt-1">
                Gateway mode: <strong className="uppercase">{smsProviderLabel}</strong> · Use quick order templates or open directly in your device SMS app.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" htmlFor="sms-order-select">
                Fill from Order (Optional)
              </label>
              <select
                id="sms-order-select"
                value={smsOrderId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSmsOrderId(id);
                  const found = mergedOrders.find((o) => o.id === id);
                  if (found) {
                    setSmsTo(found.customerPhone || found.shippingAddress.phone || '');
                    setSmsMessage(buildClientOrderSmsText(found));
                  }
                }}
                className="w-full px-3 py-2 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md"
              >
                <option value="">Select an order...</option>
                {mergedOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.id} — {o.shippingAddress.fullName} ({o.customerPhone || 'No phone'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" htmlFor="sms-to-input">
                Customer Mobile Number
              </label>
              <input
                id="sms-to-input"
                type="tel"
                required
                value={smsTo}
                onChange={(e) => setSmsTo(e.target.value)}
                placeholder="+91 98XXXXXXXX"
                className="w-full px-3 py-2 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md tabular-nums"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold" htmlFor="sms-body-input">
                  SMS Message
                </label>
                <span className="text-[11px] text-[#4D5A48] tabular-nums">
                  {smsMessage.length}/480
                </span>
              </div>
              <textarea
                id="sms-body-input"
                rows={4}
                required
                maxLength={480}
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                placeholder="Write a dispatch update, tracking AWB, or studio support message..."
                className="w-full px-3 py-2 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                {
                  label: 'Packed',
                  text: `WICKED: Your order ${smsOrderId || ''} is packed and ready for courier pickup. Help: +91 76657 12877.`,
                },
                {
                  label: 'Shipped',
                  text: `WICKED: Your order ${smsOrderId || ''} has been shipped! Track updates at wicked. Help: +91 76657 12877.`,
                },
                {
                  label: 'Out for Delivery',
                  text: `WICKED: Your order ${smsOrderId || ''} is out for delivery today. Keep your phone reachable.`,
                },
              ].map((tpl) => (
                <button
                  key={tpl.label}
                  type="button"
                  onClick={() => setSmsMessage(tpl.text.replace(/\s+/g, ' ').trim())}
                  className="px-2.5 py-1 rounded bg-[#E7ECE0] border border-[#C5D1B8] text-xs font-semibold hover:bg-[#9CAF88]/50"
                >
                  + {tpl.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="submit"
                disabled={sendingSms}
                className="flex-1 py-2.5 px-4 rounded-md bg-[#9CAF88] text-[#1F2A1C] font-bold text-sm hover:bg-[#8EA379] inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Send className="w-4 h-4" />
                <span>{sendingSms ? 'Sending...' : 'Send SMS'}</span>
              </button>
              {smsTo.trim() && smsMessage.trim() && (
                <a
                  href={buildSmsDeepLink(smsTo, smsMessage)}
                  className="py-2.5 px-4 rounded-md bg-[#E7ECE0] border border-[#C5D1B8] text-[#1F2A1C] font-semibold text-sm text-center hover:bg-[#9CAF88]/40"
                >
                  Open Phone SMS App
                </a>
              )}
            </div>
          </form>

          <div className="lg:col-span-7 p-6 rounded-lg bg-[#FCFBF7] border border-[#C5D1B8] space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-xl font-bold">SMS Dispatch Log</h2>
              <span className="text-xs text-[#4D5A48] tabular-nums">
                {mergedSmsLogs.length} message(s)
              </span>
            </div>

            {mergedSmsLogs.length === 0 ? (
              <p className="text-sm text-[#4D5A48] py-8 text-center">
                No SMS notifications dispatched yet. Order confirmations, status changes, and custom alerts will appear here.
              </p>
            ) : (
              <ul className="divide-y divide-[#CFD9C3] max-h-[460px] overflow-y-auto pr-1">
                {mergedSmsLogs.map((log) => (
                  <li key={log.id} className="py-3 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-[#1F2A1C] tabular-nums">
                        {log.to}
                        {log.orderId ? ` · ${log.orderId}` : ''}
                      </span>
                      <span className="text-[#4D5A48] capitalize">
                        {log.event.replace('_', ' ')} · {log.status} ·{' '}
                        {new Date(log.createdAt).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <p className="text-sm text-[#4D5A48] leading-snug">{log.message}</p>
                    {log.error && <p className="text-xs text-[#1F2A1C]">Error: {log.error}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
