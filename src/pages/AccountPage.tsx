import { LogOut, MapPin, Package, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LoginPanel } from '../components/LoginPanel';
import { ProductCard } from '../components/ProductCard';
import { SEED_PRODUCTS } from '../data/seedData';
import { useAuth } from '../hooks/useAuth';
import { useBag } from '../hooks/useBag';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import type { Order } from '../types';

export function AccountPage() {
  const {
    user,
    addresses,
    signOut,
    getAuthToken,
    saveAddress,
    deleteAddress,
  } = useAuth();
  const { wishlistIds } = useBag();

  const [orders, setOrders] = useState<Order[]>([]);
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [addrLabel, setAddrLabel] = useState('Home');
  const [addrName, setAddrName] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrLine1, setAddrLine1] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrState, setAddrState] = useState('');
  const [addrPin, setAddrPin] = useState('');

  useDocumentMeta({
    title: 'Account & Orders — Wicked',
    description: 'Sign in with Google or Email OTP to view order history, manage saved addresses, and access your Wicked wishlist.',
  });

  useEffect(() => {
    if (!user) {
      setOrders([]);
      return;
    }
    let active = true;
    (async () => {
      const token = await getAuthToken();
      if (!token) return;
      const res = await fetch('/api/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (active) setOrders(data.orders || []);
      }
    })();
    return () => {
      active = false;
    };
  }, [user, getAuthToken]);

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveAddress({
      label: addrLabel,
      fullName: addrName,
      phone: addrPhone,
      line1: addrLine1,
      city: addrCity,
      state: addrState,
      pincode: addrPin,
    });
    setShowAddrForm(false);
    setAddrName('');
    setAddrPhone('');
    setAddrLine1('');
    setAddrCity('');
    setAddrState('');
    setAddrPin('');
  };

  const wishedProducts = SEED_PRODUCTS.filter((p) => wishlistIds.includes(p.id));

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-14">
        <LoginPanel />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#C5D1B8]">
        <div>
          <p className="text-xs font-medium text-[#4D5A48]">Signed in as {user.email}</p>
          <h1 className="font-display text-3xl font-bold mt-1">Welcome, {user.displayName}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/track-order"
            className="px-4 py-2 rounded-md bg-[#E7ECE0] border border-[#C5D1B8] text-sm font-semibold"
          >
            Track Order
          </Link>
          {user.isAdmin && (
            <Link
              to="/admin"
              className="px-4 py-2 rounded-md bg-[#9CAF88] text-[#1F2A1C] text-sm font-bold"
            >
              Open Admin Console
            </Link>
          )}
          <button
            type="button"
            onClick={() => signOut()}
            className="px-4 py-2 rounded-md bg-[#E7ECE0] border border-[#C5D1B8] text-sm font-semibold inline-flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      </div>

      {/* Orders & Addresses */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-7 space-y-4">
          <h2 className="font-display text-2xl font-bold flex items-center gap-2">
            <Package className="w-5 h-5" />
            <span>Order History</span>
          </h2>
          {orders.length === 0 ? (
            <div className="p-6 rounded-lg bg-[#FCFBF7] border border-[#C5D1B8] text-sm text-[#4D5A48]">
              You have not placed any orders on this account yet.
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <Link
                  key={o.id}
                  to={`/order/${o.id}`}
                  className="block p-5 rounded-lg bg-[#FCFBF7] border border-[#C5D1B8] hover:border-[#1F2A1C] transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-display font-bold tabular-nums">{o.id}</p>
                      <p className="text-xs text-[#4D5A48] mt-0.5">
                        {new Date(o.createdAt).toLocaleDateString('en-IN')} · {o.items.length} item(s) ·{' '}
                        <span className="capitalize font-medium text-[#1F2A1C]">{o.status}</span>
                      </p>
                    </div>
                    <span className="font-bold tabular-nums">₹{o.total.toLocaleString('en-IN')}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              <span>Saved Addresses</span>
            </h2>
            <button
              type="button"
              onClick={() => setShowAddrForm((v) => !v)}
              className="px-3 py-1.5 rounded-md bg-[#E7ECE0] border border-[#C5D1B8] text-xs font-semibold inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          {showAddrForm && (
            <form
              onSubmit={handleSaveAddress}
              className="p-4 rounded-lg bg-[#FCFBF7] border border-[#C5D1B8] space-y-3"
            >
              <input
                placeholder="Label (Home / Studio)"
                value={addrLabel}
                onChange={(e) => setAddrLabel(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md"
              />
              <input
                required
                placeholder="Full Name"
                value={addrName}
                onChange={(e) => setAddrName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md"
              />
              <input
                required
                placeholder="Phone (+91)"
                value={addrPhone}
                onChange={(e) => setAddrPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md"
              />
              <input
                required
                placeholder="Address Line"
                value={addrLine1}
                onChange={(e) => setAddrLine1(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  required
                  placeholder="City"
                  value={addrCity}
                  onChange={(e) => setAddrCity(e.target.value)}
                  className="px-3 py-2 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md"
                />
                <input
                  required
                  placeholder="State"
                  value={addrState}
                  onChange={(e) => setAddrState(e.target.value)}
                  className="px-3 py-2 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md"
                />
                <input
                  required
                  maxLength={6}
                  placeholder="Pincode"
                  value={addrPin}
                  onChange={(e) => setAddrPin(e.target.value.replace(/\D/g, ''))}
                  className="px-3 py-2 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-[#9CAF88] rounded-md text-sm font-bold"
              >
                Save Address
              </button>
            </form>
          )}

          {addresses.length === 0 ? (
            <div className="p-6 rounded-lg bg-[#FCFBF7] border border-[#C5D1B8] text-sm text-[#4D5A48]">
              No saved addresses yet.
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="p-4 rounded-lg bg-[#FCFBF7] border border-[#C5D1B8] flex items-start justify-between gap-3"
                >
                  <div className="text-sm">
                    <p className="font-bold">{addr.label || addr.fullName}</p>
                    <p className="text-[#4D5A48]">{addr.line1}</p>
                    <p className="text-[#4D5A48] tabular-nums">
                      {addr.city}, {addr.state} - {addr.pincode}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteAddress(addr.id)}
                    aria-label="Delete address"
                    className="p-2 text-[#4D5A48] hover:text-[#1F2A1C]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Wishlist */}
      <section>
        <h2 className="font-display text-2xl font-bold mb-4">Saved Wishlist ({wishedProducts.length})</h2>
        {wishedProducts.length === 0 ? (
          <p className="text-sm text-[#4D5A48]">
            Tap the heart icon on any product to save it here.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {wishedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
