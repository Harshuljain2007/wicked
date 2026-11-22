import { AlertTriangle, Download, LogOut, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { IMG_TEE_SAGE, SEED_SHOWCASE } from '../data/seedData';
import { useAuth } from '../hooks/useAuth';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import {
  staticAdminDeleteProduct,
  staticAdminOrdersCsv,
  staticAdminRefundOrder,
  staticAdminSaveBanner,
  staticAdminSaveCoupons,
  staticAdminUpdateOrder,
  staticAdminUpsertProduct,
  staticGetAdminDashboard,
  tryApiJson,
} from '../lib/staticStore';
import type { BannerConfig, Coupon, Order, OrderStatus, Product, ShowcaseData } from '../types';

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
  const [tab, setTab] = useState<'orders' | 'products' | 'merchandising'>('orders');
  const [data, setData] = useState<DashboardResponse | null>(null);
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

  const handleUpdateOrder = async (orderId: string, status: OrderStatus, trackingNumber?: string) => {
    const token = await getAuthToken();
    if (!token) return;
    const api = await tryApiJson(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status, trackingNumber }),
    });
    if (api.available) {
      if (api.ok) {
        setToast(`Order ${orderId} updated to ${status}`);
        loadDashboard();
      }
      return;
    }
    staticAdminUpdateOrder(orderId, status, trackingNumber);
    setToast(`Order ${orderId} updated to ${status}`);
    loadDashboard();
  };

  const handleRefundOrder = async (order: Order) => {
    const token = await getAuthToken();
    if (!token) return;
    const api = await tryApiJson<{ error?: string }>(
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
    if (api.available) {
      if (api.ok) {
        setToast(`Refund issued for ${order.id} (₹${order.total.toLocaleString('en-IN')})`);
        loadDashboard();
      } else {
        setToast(api.data.error || 'Refund failed.');
      }
      return;
    }
    staticAdminRefundOrder(order.id);
    setToast(`Refund issued for ${order.id} (₹${order.total.toLocaleString('en-IN')})`);
    loadDashboard();
  };

  const handleExportCsv = async () => {
    const token = await getAuthToken();
    if (!token) return;
    let blob: Blob;
    try {
      const res = await fetch('/api/admin/orders/export.csv', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('text/csv')) {
        blob = await res.blob();
      } else {
        blob = new Blob([staticAdminOrdersCsv()], { type: 'text/csv;charset=utf-8;' });
      }
    } catch {
      blob = new Blob([staticAdminOrdersCsv()], { type: 'text/csv;charset=utf-8;' });
    }
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

  const orders = (data?.orders || []).filter(
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
            {data?.stats.todaysOrdersCount ?? 0}
          </p>
        </div>
        <div className="p-5 rounded-lg bg-[#FCFBF7] border border-[#C5D1B8]">
          <p className="text-xs text-[#4D5A48]">Total Revenue</p>
          <p className="font-display text-3xl font-bold mt-1 tabular-nums">
            ₹{(data?.stats.totalRevenue ?? 0).toLocaleString('en-IN')}
          </p>
        </div>
        <div className="p-5 rounded-lg bg-[#FCFBF7] border border-[#C5D1B8]">
          <p className="text-xs text-[#4D5A48]">Catalog Products</p>
          <p className="font-display text-3xl font-bold mt-1 tabular-nums">
            {data?.stats.productCount ?? 0}
          </p>
        </div>
        <div className="p-5 rounded-lg bg-[#FCFBF7] border border-[#C5D1B8]">
          <p className="text-xs text-[#4D5A48]">Low-Stock Alerts</p>
          <p className="font-display text-3xl font-bold mt-1 tabular-nums">
            {data?.stats.lowStockCount ?? 0}
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

            <button
              type="button"
              onClick={handleExportCsv}
              className="px-4 py-2 rounded-md bg-[#E7ECE0] border border-[#C5D1B8] text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-[#9CAF88]"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
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
                  <th className="py-3 px-4">Refund</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#CFD9C3] tabular-nums">
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="py-3 px-4 font-semibold">{o.id}</td>
                    <td className="py-3 px-4">
                      <p className="font-medium">{o.shippingAddress.fullName}</p>
                      <p className="text-xs text-[#4D5A48]">{o.customerEmail}</p>
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
    </div>
  );
}
