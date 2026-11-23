import { CheckCircle2, Download, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { downloadGstInvoicePdf } from '../lib/invoicePdf';
import { staticGetOrder, staticRequestExchange, tryApiJson } from '../lib/staticStore';
import type { Order } from '../types';

const TRACKING_STEPS = ['placed', 'paid', 'packed', 'shipped', 'delivered'];

export function OrderConfirmationPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user, getAuthToken } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exchangeReason, setExchangeReason] = useState('');
  const [exchangeFeedback, setExchangeFeedback] = useState('');

  const tokenParam = searchParams.get('token') || '';

  useDocumentMeta({
    title: order ? `Order ${order.id} — Wicked` : 'Order Tracking — Wicked',
    description: 'Track your Wicked order status, download your GST tax invoice PDF, or request a 7-day size exchange.',
  });

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const authToken = await getAuthToken();
      const headers: Record<string, string> = {};
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      const url = `/api/orders/${encodeURIComponent(id || '')}${
        tokenParam ? `?token=${encodeURIComponent(tokenParam)}` : ''
      }`;
      const api = await tryApiJson<{ order?: Order; error?: string }>(url, { headers });
      if (!active) return;

      if (api.available && api.ok && api.data.order) {
        setOrder(api.data.order);
        setLoading(false);
        return;
      }

      const fallbackOrder = await staticGetOrder(id || '', tokenParam, user);
      if (!active) return;
      if (!fallbackOrder) {
        setError((api.available && api.data.error) || 'Could not locate this order.');
      } else {
        setOrder(fallbackOrder);
      }
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [id, tokenParam, getAuthToken, user]);

  const handleRequestExchange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !exchangeReason.trim()) return;
    const authToken = await getAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers.Authorization = `Bearer ${authToken}`;

    const api = await tryApiJson<{ order?: Order; error?: string }>(
      `/api/orders/${encodeURIComponent(order.id)}/exchange`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason: exchangeReason.trim(), token: tokenParam }),
      }
    );

    if (api.available) {
      if (!api.ok || !api.data.order) {
        setExchangeFeedback(api.data.error || 'Could not submit exchange request.');
        return;
      }
      setOrder(api.data.order);
      setExchangeReason('');
      setExchangeFeedback('7-day exchange request registered. Our courier will schedule pickup.');
      return;
    }

    const updated = await staticRequestExchange(order.id, exchangeReason.trim());
    if (!updated) {
      setExchangeFeedback('Could not submit exchange request.');
      return;
    }
    setOrder(updated);
    setExchangeReason('');
    setExchangeFeedback('7-day exchange request registered. Our courier will schedule pickup.');
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center text-sm text-[#4D5A48]">
        Loading order receipt...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Order Unavailable</h1>
        <p className="text-sm text-[#4D5A48] mt-2">{error}</p>
        <Link
          to="/account"
          className="inline-block mt-6 px-5 py-2.5 bg-[#9CAF88] rounded-md font-semibold text-sm"
        >
          Go to Account &amp; Orders
        </Link>
      </div>
    );
  }

  const currentStepIdx = TRACKING_STEPS.indexOf(order.status);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div className="p-6 sm:p-8 rounded-lg bg-[#9CAF88]/30 border border-[#C5D1B8] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-7 h-7 text-[#1F2A1C] shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-[#4D5A48]">Order Confirmed</p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold mt-0.5 tabular-nums">
              {order.id}
            </h1>
            <p className="text-sm text-[#4D5A48] mt-1">
              Status: <span className="font-semibold text-[#1F2A1C] capitalize">{order.status}</span>
              {order.trackingNumber && (
                <>
                  {' '}
                  · Tracking: <span className="font-mono">{order.trackingNumber}</span>
                </>
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => downloadGstInvoicePdf(order)}
          className="px-4 py-2.5 rounded-md bg-[#F7F5EF] border border-[#1F2A1C]/30 text-sm font-semibold inline-flex items-center gap-2 hover:bg-[#E7ECE0] transition-colors shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Download GST Invoice PDF</span>
        </button>
      </div>

      {/* Status Timeline */}
      {['cancelled', 'returned'].includes(order.status) ? (
        <div className="p-5 rounded-lg bg-[#FCFBF7] border border-[#C5D1B8] text-sm">
          Order is marked <strong className="capitalize">{order.status}</strong>.
          {order.refundId && (
            <span className="ml-2 text-[#4D5A48]">
              Refund Reference: {order.refundId} (₹{order.refundAmount?.toLocaleString('en-IN')})
            </span>
          )}
        </div>
      ) : (
        <div className="p-6 rounded-lg bg-[#FCFBF7] border border-[#C5D1B8]">
          <p className="text-xs font-semibold text-[#4D5A48] mb-4">Fulfillment Progress</p>
          <div className="grid grid-cols-5 gap-2">
            {TRACKING_STEPS.map((step, idx) => {
              const reached = idx <= currentStepIdx;
              return (
                <div key={step} className="text-center">
                  <div
                    className={`h-2 rounded-full mb-2 ${
                      reached ? 'bg-[#1F2A1C]' : 'bg-[#E7ECE0]'
                    }`}
                  />
                  <span
                    className={`text-xs capitalize ${
                      reached ? 'font-bold text-[#1F2A1C]' : 'text-[#4D5A48]'
                    }`}
                  >
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Line Items & Shipping Details */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-7 p-6 rounded-lg bg-[#FCFBF7] border border-[#C5D1B8]">
          <h2 className="font-display text-lg font-bold mb-4">Garments Ordered</h2>
          <ul className="divide-y divide-[#CFD9C3]">
            {order.items.map((item, idx) => (
              <li key={idx} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-12 h-16 object-cover rounded border border-[#C5D1B8]"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <p className="text-sm font-semibold">{item.name}</p>
                    <p className="text-xs text-[#4D5A48]">
                      {item.color} · {item.size} × {item.quantity}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  ₹{(item.unitPrice * item.quantity).toLocaleString('en-IN')}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 pt-4 border-t border-[#CFD9C3] space-y-1.5 text-sm">
            <div className="flex justify-between text-[#4D5A48]">
              <span>Subtotal</span>
              <span className="tabular-nums">₹{order.subtotal.toLocaleString('en-IN')}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between">
                <span>Discount</span>
                <span className="tabular-nums">-₹{order.discount.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between text-[#4D5A48]">
              <span>Shipping</span>
              <span className="tabular-nums">
                {order.shippingFee === 0 ? 'Free' : `₹${order.shippingFee}`}
              </span>
            </div>
            <div className="flex justify-between text-[#4D5A48]">
              <span>Included GST</span>
              <span className="tabular-nums">₹{order.gstAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-2 border-t border-[#CFD9C3]">
              <span>Total</span>
              <span className="tabular-nums">₹{order.total.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-5 space-y-6">
          <div className="p-6 rounded-lg bg-[#FCFBF7] border border-[#C5D1B8] text-sm space-y-1.5">
            <h2 className="font-display text-lg font-bold mb-2">Delivery Address</h2>
            <p className="font-semibold">{order.shippingAddress.fullName}</p>
            <p className="text-[#4D5A48]">{order.shippingAddress.line1}</p>
            <p className="text-[#4D5A48] tabular-nums">
              {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
            </p>
            <p className="text-[#4D5A48] tabular-nums">{order.shippingAddress.phone}</p>
            <p className="text-[#4D5A48]">{order.shippingAddress.email}</p>
            {order.gstin && (
              <p className="text-xs font-mono pt-1 text-[#1F2A1C]">GSTIN: {order.gstin}</p>
            )}
            {order.giftNote && (
              <p className="text-xs pt-1 text-[#4D5A48]">
                Gift note: &ldquo;{order.giftNote}&rdquo;
              </p>
            )}
          </div>

          <div className="p-6 rounded-lg bg-[#FCFBF7] border border-[#C5D1B8]">
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              <span>7-Day Size Exchange</span>
            </h2>
            {order.exchangeRequested ? (
              <p className="text-sm text-[#4D5A48] mt-2">
                Exchange requested: &ldquo;{order.exchangeReason}&rdquo;
              </p>
            ) : (
              <form onSubmit={handleRequestExchange} className="mt-3 space-y-3">
                <input
                  type="text"
                  required
                  value={exchangeReason}
                  onChange={(e) => setExchangeReason(e.target.value)}
                  placeholder="Preferred new size or reason"
                  className="w-full px-3 py-2 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-[#9CAF88] text-[#1F2A1C] text-sm font-semibold hover:bg-[#8EA379] transition-colors"
                >
                  Request Exchange
                </button>
                {exchangeFeedback && <p className="text-xs text-[#4D5A48]">{exchangeFeedback}</p>}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
