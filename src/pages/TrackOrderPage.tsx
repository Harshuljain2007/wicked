import { CheckCircle2, Package, Search, Truck } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { staticTrackOrder, tryApiJson } from '../lib/staticStore';
import type { Order } from '../types';

const TRACKING_STEPS = ['placed', 'paid', 'packed', 'shipped', 'delivered'];

export function TrackOrderPage() {
  const [orderId, setOrderId] = useState('');
  const [contact, setContact] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ order: Order; orderToken: string } | null>(null);

  useDocumentMeta({
    title: 'Track Your Order — Wicked',
    description: 'Check live Indian dispatch status, courier airway bill, and GST tax invoice for any Wicked order.',
  });

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const api = await tryApiJson<{ order?: Order; orderToken?: string; error?: string }>(
        '/api/orders/track',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: orderId.trim(), contact: contact.trim() }),
        }
      );

      if (api.available) {
        if (!api.ok || !api.data.order) {
          setError(api.data.error || 'Could not locate this order.');
          return;
        }
        setResult({ order: api.data.order, orderToken: api.data.orderToken || '' });
        return;
      }

      const localMatch = staticTrackOrder(orderId, contact);
      if (!localMatch) {
        setError('Order not found or contact email/phone does not match.');
        return;
      }
      setResult(localMatch);
    } catch {
      setError('Network error while checking order status.');
    } finally {
      setLoading(false);
    }
  };

  const currentStepIdx = result ? TRACKING_STEPS.indexOf(result.order.status) : -1;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div className="border-b border-[#C5D1B8] pb-6">
        <p className="text-xs font-medium text-[#4D5A48]">Dispatch &amp; Courier Status</p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold mt-1">Track Your Order</h1>
        <p className="text-sm text-[#4D5A48] mt-2">
          Enter your Wicked Order ID along with the email address or 10-digit mobile number used at checkout.
        </p>
      </div>

      <form
        onSubmit={handleTrack}
        className="p-6 rounded-lg bg-[#FCFBF7] border border-[#C5D1B8] space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="track-order-id" className="block text-xs font-semibold mb-1.5">
              Order ID
            </label>
            <input
              id="track-order-id"
              required
              value={orderId}
              onChange={(e) => setOrderId(e.target.value.toUpperCase())}
              placeholder="e.g. WKD-2026-1001"
              className="w-full px-3.5 py-2.5 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md font-mono"
            />
          </div>

          <div>
            <label htmlFor="track-contact" className="block text-xs font-semibold mb-1.5">
              Checkout Email or Mobile
            </label>
            <input
              id="track-contact"
              required
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="aarav.mehta@example.in or 98XXXXXXXX"
              className="w-full px-3.5 py-2.5 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-md bg-[#9CAF88] text-[#1F2A1C] text-sm font-bold hover:bg-[#8EA379] transition-colors inline-flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            <span>{loading ? 'Checking...' : 'Check Status'}</span>
          </button>

          <Link to="/account" className="text-xs font-semibold text-[#1F2A1C] underline">
            Signed-in member? View all orders in Account
          </Link>
        </div>

        {error && <p className="text-sm font-medium text-[#1F2A1C] pt-1">{error}</p>}
      </form>

      {result && (
        <div className="p-6 sm:p-8 rounded-lg bg-[#FCFBF7] border border-[#C5D1B8] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#CFD9C3] pb-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-[#1F2A1C] shrink-0 mt-0.5" />
              <div>
                <h2 className="font-display text-2xl font-bold tabular-nums">{result.order.id}</h2>
                <p className="text-xs text-[#4D5A48] mt-0.5">
                  Placed {new Date(result.order.createdAt).toLocaleDateString('en-IN')} ·{' '}
                  <span className="capitalize font-semibold text-[#1F2A1C]">
                    {result.order.status}
                  </span>
                  {result.order.trackingNumber && (
                    <>
                      {' '}
                      · AWB: <span className="font-mono">{result.order.trackingNumber}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <Link
              to={`/order/${result.order.id}?token=${encodeURIComponent(result.orderToken)}`}
              className="px-4 py-2 rounded-md bg-[#9CAF88] text-[#1F2A1C] text-xs font-bold hover:bg-[#8EA379] whitespace-nowrap self-start sm:self-auto"
            >
              Open Full Receipt &amp; GST PDF
            </Link>
          </div>

          {!['cancelled', 'returned'].includes(result.order.status) && (
            <div>
              <p className="text-xs font-semibold text-[#4D5A48] mb-3 flex items-center gap-1.5">
                <Truck className="w-4 h-4" />
                <span>
                  {result.order.deliveryMethod === 'express'
                    ? 'Priority Express Air (1–2 days)'
                    : 'Standard Surface/Air (3–5 days)'}
                </span>
              </p>
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

          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#4D5A48] flex items-center gap-1.5">
              <Package className="w-4 h-4" />
              <span>Items ({result.order.items.length})</span>
            </h3>
            <ul className="divide-y divide-[#CFD9C3]">
              {result.order.items.map((item, i) => (
                <li key={i} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-11 h-14 object-cover rounded border border-[#C5D1B8]"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <p className="text-sm font-semibold">{item.name}</p>
                      <p className="text-xs text-[#4D5A48]">
                        {item.color} · Size {item.size} × {item.quantity}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">
                    ₹{(item.unitPrice * item.quantity).toLocaleString('en-IN')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
