import { ShieldCheck, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { lookupIndianPincode } from '../data/seedData';
import { useAuth } from '../hooks/useAuth';
import { useBag } from '../hooks/useBag';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import {
  buildClientOrderSmsText,
  recordSmsDispatch,
  saveStaticOrder,
  staticCreateOrder,
  staticSandboxAuthorize,
  staticVerifyPayment,
  syncOrderPaymentToFirestore,
  syncOrderToFirestore,
  tryApiJson,
} from '../lib/staticStore';
import type { Order } from '../types';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, cb: (resp: Record<string, unknown>) => void) => void;
    };
  }
}

interface SandboxCheckoutState {
  orderId: string;
  razorpayOrderId: string;
  amountPaise: number;
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const { user, addresses, getAuthToken } = useAuth();
  const {
    items,
    subtotal,
    discount,
    couponCode,
    applyCoupon,
    removeCoupon,
    isOutfitBundle,
    clearBag,
  } = useBag();

  const [fullName, setFullName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email && !user.email.endsWith('@sms.wicked.in') ? user.email : '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [line1, setLine1] = useState('');
  const [pincode, setPincode] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [smsAlertsOptIn, setSmsAlertsOptIn] = useState(true);
  const [includeGiftNote, setIncludeGiftNote] = useState(false);
  const [giftNote, setGiftNote] = useState('');
  const [includeGstin, setIncludeGstin] = useState(false);
  const [gstin, setGstin] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [promoMsg, setPromoMsg] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'standard' | 'express'>('standard');
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'cod'>('razorpay');

  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [sandboxModal, setSandboxModal] = useState<SandboxCheckoutState | null>(null);
  const [sandboxMethod, setSandboxMethod] = useState<'upi' | 'card' | 'netbanking' | 'wallet'>('upi');

  useDocumentMeta({
    title: 'Checkout — Wicked',
    description: 'Complete your Wicked order securely via Razorpay UPI, Cards, Netbanking, or Cash on Delivery.',
  });

  useEffect(() => {
    if (user?.email && !user.email.endsWith('@sms.wicked.in') && !email) setEmail(user.email);
    if (user?.displayName && !user.phone && !fullName) setFullName(user.displayName);
    if (user?.phone && !phone) setPhone(user.phone);
  }, [user, email, fullName, phone]);

  // Pincode auto-fill for city and state
  useEffect(() => {
    if (/^[1-9][0-9]{5}$/.test(pincode)) {
      fetch(`/api/pincode/${pincode}`)
        .then(async (r) => {
          const ct = r.headers.get('content-type') || '';
          return r.ok && ct.includes('application/json') ? r.json() : null;
        })
        .then((data) => {
          const resolved = data?.city ? data : lookupIndianPincode(pincode);
          if (resolved?.city && resolved?.state) {
            setCity(resolved.city);
            setStateName(resolved.state);
          }
        })
        .catch(() => {
          const local = lookupIndianPincode(pincode);
          if (local) {
            setCity(local.city);
            setStateName(local.state);
          }
        });
    }
  }, [pincode]);

  const netSubtotal = Math.max(0, subtotal - discount);
  const shippingFee = deliveryMethod === 'express' ? 149 : netSubtotal >= 1499 ? 0 : 79;
  const total = netSubtotal + shippingFee;

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-bold">Your bag is empty</h1>
        <p className="text-sm text-[#4D5A48] mt-2">
          Add garments to your bag before proceeding to checkout.
        </p>
        <Link
          to="/collections/all"
          className="inline-block mt-6 px-6 py-3 rounded-md bg-[#9CAF88] text-[#1F2A1C] font-semibold"
        >
          Explore Collection
        </Link>
      </div>
    );
  }

  const verifyPaymentOnServer = async (payload: {
    orderId: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => {
    setVerifying(true);
    setErrorMsg('');
    try {
      const api = await tryApiJson<{ verified?: boolean; order?: Order; orderToken?: string; error?: string }>(
        '/api/payments/verify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (api.available) {
        if (!api.ok || !api.data.verified || !api.data.order) {
          throw new Error(api.data.error || 'Payment verification failed. Please try again.');
        }
        saveStaticOrder(api.data.order);
        await syncOrderPaymentToFirestore(
          api.data.order.id,
          payload.razorpay_order_id,
          payload.razorpay_payment_id,
          api.data.order
        );
        if (smsAlertsOptIn) {
          void recordSmsDispatch({
            to: api.data.order.customerPhone,
            message: buildClientOrderSmsText(api.data.order),
            event: 'payment_confirmed',
            orderId: api.data.order.id,
            createdBy: api.data.order.userId,
          });
        }
        clearBag();
        navigate(`/order/${api.data.order.id}?token=${encodeURIComponent(api.data.orderToken || '')}`);
        return;
      }

      const verified = await staticVerifyPayment({
        orderId: payload.orderId,
        razorpay_order_id: payload.razorpay_order_id,
        razorpay_payment_id: payload.razorpay_payment_id,
      });
      if (smsAlertsOptIn) {
        void recordSmsDispatch({
          to: verified.order.customerPhone,
          message: buildClientOrderSmsText(verified.order),
          event: 'payment_confirmed',
          orderId: verified.order.id,
          createdBy: verified.order.userId,
        });
      }
      clearBag();
      navigate(`/order/${verified.order.id}?token=${encodeURIComponent(verified.orderToken)}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Verification failed. Retry payment.');
    } finally {
      setVerifying(false);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || verifying) return;
    setErrorMsg('');

    if (!/^[1-9][0-9]{5}$/.test(pincode)) {
      setErrorMsg('Please enter a valid 6-digit Indian pincode.');
      return;
    }

    setSubmitting(true);
    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const payload = {
        items: items.map((i) => ({
          productId: i.productId,
          color: i.color,
          size: i.size,
          quantity: i.quantity,
        })),
        couponCode: couponCode || undefined,
        deliveryMethod,
        isOutfitBundle,
        giftNote: includeGiftNote && giftNote.trim() ? giftNote.trim() : undefined,
        gstin: includeGstin && gstin.trim() ? gstin.trim().toUpperCase() : undefined,
        shippingAddress: {
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          line1: line1.trim(),
          city: city.trim(),
          state: stateName.trim(),
          pincode: pincode.trim(),
        },
      };

      if (paymentMethod === 'cod') {
        const api = await tryApiJson<{ order?: Order; orderToken?: string; error?: string }>(
          '/api/payments/cod',
          {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
          }
        );
        if (api.available) {
          if (!api.ok || !api.data.order) throw new Error(api.data.error || 'Unable to place COD order.');
          await syncOrderToFirestore(api.data.order);
          if (smsAlertsOptIn) {
            void recordSmsDispatch({
              to: api.data.order.customerPhone,
              message: buildClientOrderSmsText(api.data.order),
              event: 'order_placed',
              orderId: api.data.order.id,
              createdBy: api.data.order.userId,
            });
          }
          clearBag();
          navigate(`/order/${api.data.order.id}?token=${encodeURIComponent(api.data.orderToken || '')}`);
          return;
        }
        const created = await staticCreateOrder(payload, 'cod', user);
        if (smsAlertsOptIn) {
          void recordSmsDispatch({
            to: created.order.customerPhone,
            message: buildClientOrderSmsText(created.order),
            event: 'order_placed',
            orderId: created.order.id,
            createdBy: created.order.userId,
          });
        }
        clearBag();
        navigate(`/order/${created.order.id}?token=${encodeURIComponent(created.orderToken)}`);
        return;
      }

      const api = await tryApiJson<{
        orderId: string;
        orderToken: string;
        razorpayOrderId: string;
        amountPaise: number;
        currency: string;
        keyId?: string;
        mode?: string;
        error?: string;
      }>('/api/payments/create-order', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = api.available
        ? (() => {
            if (!api.ok) throw new Error(api.data.error || 'Unable to initiate payment.');
            return api.data;
          })()
        : await (async () => {
            const created = await staticCreateOrder(payload, 'razorpay', user);
            return {
              orderId: created.order.id,
              orderToken: created.orderToken,
              razorpayOrderId: created.razorpayOrderId || `order_test_${Date.now()}`,
              amountPaise: created.amountPaise,
              currency: 'INR',
              keyId: '',
              mode: 'sandbox',
            };
          })();

      if (data.mode === 'razorpay' && window.Razorpay) {
        const rzp = new window.Razorpay({
          key: data.keyId,
          amount: data.amountPaise,
          currency: data.currency,
          name: 'Wicked India',
          description: `Order ${data.orderId}`,
          order_id: data.razorpayOrderId,
          prefill: {
            name: fullName.trim(),
            email: email.trim(),
            contact: phone.trim(),
          },
          theme: {
            color: '#E8412C',
          },
          handler: async (response: Record<string, string>) => {
            await verifyPaymentOnServer({
              orderId: data.orderId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
          },
          modal: {
            ondismiss: () => {
              setErrorMsg('Payment was cancelled. You can retry payment anytime.');
            },
          },
        });
        rzp.on('payment.failed', () => {
          setErrorMsg('Payment failed at gateway. Please retry with another UPI ID or card.');
        });
        rzp.open();
      } else {
        // Test Sandbox Modal mirroring Razorpay Standard Checkout when keys aren't set yet
        setSandboxModal({
          orderId: data.orderId,
          razorpayOrderId: data.razorpayOrderId,
          amountPaise: data.amountPaise,
        });
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Checkout failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSandboxSuccess = async () => {
    if (!sandboxModal) return;
    const modalData = sandboxModal;
    setSandboxModal(null);
    setVerifying(true);
    try {
      const api = await tryApiJson<{
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
        error?: string;
      }>('/api/payments/sandbox-authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ razorpayOrderId: modalData.razorpayOrderId }),
      });

      const signed = api.available
        ? (() => {
            if (!api.ok) throw new Error(api.data.error || 'Authorization error.');
            return api.data;
          })()
        : staticSandboxAuthorize(modalData.razorpayOrderId);

      await verifyPaymentOnServer({
        orderId: modalData.orderId,
        razorpay_order_id: signed.razorpay_order_id,
        razorpay_payment_id: signed.razorpay_payment_id,
        razorpay_signature: signed.razorpay_signature,
      });
    } catch (err) {
      setVerifying(false);
      setErrorMsg(err instanceof Error ? err.message : 'Sandbox payment failed.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <p className="text-xs font-medium text-[#4D5A48]">Single-Page Checkout · Guest Checkout Enabled</p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold mt-1">Complete Your Order</h1>
      </div>

      {verifying && (
        <div className="mb-6 p-4 rounded-lg bg-[#9CAF88]/40 border border-[#7F956B] text-sm font-semibold">
          Verifying payment signature with server... Please do not refresh.
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 rounded-lg bg-[#E7ECE0] border border-[#1F2A1C] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[#1F2A1C]">{errorMsg}</p>
          <button
            type="button"
            onClick={() => setErrorMsg('')}
            className="text-xs font-semibold underline self-start sm:self-center"
          >
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left: Contact, Address, Delivery & Payment */}
        <div className="lg:col-span-7 space-y-8">
          {addresses.length > 0 && (
            <div className="p-5 rounded-lg bg-[#E7ECE0]/60 border border-[#C5D1B8]">
              <p className="text-xs font-semibold mb-3">Use Saved Address</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {addresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => {
                      setFullName(addr.fullName);
                      setPhone(addr.phone);
                      setLine1(addr.line1);
                      setCity(addr.city);
                      setStateName(addr.state);
                      setPincode(addr.pincode);
                    }}
                    className="p-3 text-left rounded-md bg-[#F7F5EF] border border-[#C5D1B8] hover:border-[#1F2A1C] text-xs"
                  >
                    <p className="font-bold">{addr.label || addr.fullName}</p>
                    <p className="text-[#4D5A48] truncate mt-0.5">{addr.line1}</p>
                    <p className="text-[#4D5A48] tabular-nums">
                      {addr.city}, {addr.state} - {addr.pincode}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <section className="p-6 rounded-lg bg-[#FCFBF7] border border-[#C5D1B8] space-y-4">
            <h2 className="font-display text-xl font-bold">1. Contact &amp; Shipping Address</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1" htmlFor="co-name">Full Name</label>
                <input
                  id="co-name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" htmlFor="co-email">Email</label>
                <input
                  id="co-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" htmlFor="co-phone">Mobile Number</label>
                <input
                  id="co-phone"
                  type="tel"
                  required
                  minLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98XXXXXXXX"
                  className="w-full px-3 py-2.5 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" htmlFor="co-pin">Pincode (Auto-fills City &amp; State)</label>
                <input
                  id="co-pin"
                  required
                  maxLength={6}
                  inputMode="numeric"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                  placeholder="400001"
                  className="w-full px-3 py-2.5 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" htmlFor="co-line1">Street Address / Apartment</label>
              <input
                id="co-line1"
                required
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1" htmlFor="co-city">City</label>
                <input
                  id="co-city"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" htmlFor="co-state">State</label>
                <input
                  id="co-state"
                  required
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-[#CFD9C3] space-y-3">
              <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={smsAlertsOptIn}
                  onChange={(e) => setSmsAlertsOptIn(e.target.checked)}
                  className="accent-[#1F2A1C]"
                />
                <span>Send SMS order &amp; dispatch alerts to this mobile number</span>
              </label>

              <div>
                <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeGiftNote}
                    onChange={(e) => setIncludeGiftNote(e.target.checked)}
                    className="accent-[#1F2A1C]"
                  />
                  <span>Add a complimentary studio gift note</span>
                </label>
              </div>
              {includeGiftNote && (
                <textarea
                  rows={2}
                  maxLength={240}
                  value={giftNote}
                  onChange={(e) => setGiftNote(e.target.value)}
                  placeholder="Write a personal note to print on a cotton studio card..."
                  className="w-full px-3 py-2 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md"
                />
              )}

              <div>
                <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeGstin}
                    onChange={(e) => setIncludeGstin(e.target.checked)}
                    className="accent-[#1F2A1C]"
                  />
                  <span>Add Business GSTIN for B2B Tax Invoice</span>
                </label>
                {includeGstin && (
                  <input
                    type="text"
                    maxLength={15}
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="15-digit GSTIN (e.g. 29AAACW9214L1Z5)"
                    className="mt-2 w-full px-3 py-2 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md font-mono"
                  />
                )}
              </div>
            </div>
          </section>

          <section className="p-6 rounded-lg bg-[#FCFBF7] border border-[#C5D1B8] space-y-3">
            <h2 className="font-display text-xl font-bold">2. Delivery Method</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-4 rounded-md border cursor-pointer flex items-center justify-between ${
                  deliveryMethod === 'standard'
                    ? 'bg-[#9CAF88]/30 border-[#1F2A1C]'
                    : 'bg-[#F7F5EF] border-[#C5D1B8]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="delivery"
                    checked={deliveryMethod === 'standard'}
                    onChange={() => setDeliveryMethod('standard')}
                    className="accent-[#1F2A1C]"
                  />
                  <div>
                    <p className="text-sm font-semibold">Standard Surface/Air</p>
                    <p className="text-xs text-[#4D5A48]">3–5 business days</p>
                  </div>
                </div>
                <span className="text-sm font-bold tabular-nums">
                  {netSubtotal >= 1499 ? 'Free' : '₹79'}
                </span>
              </label>

              <label
                className={`p-4 rounded-md border cursor-pointer flex items-center justify-between ${
                  deliveryMethod === 'express'
                    ? 'bg-[#9CAF88]/30 border-[#1F2A1C]'
                    : 'bg-[#F7F5EF] border-[#C5D1B8]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="delivery"
                    checked={deliveryMethod === 'express'}
                    onChange={() => setDeliveryMethod('express')}
                    className="accent-[#1F2A1C]"
                  />
                  <div>
                    <p className="text-sm font-semibold">Priority Express Air</p>
                    <p className="text-xs text-[#4D5A48]">1–2 business days</p>
                  </div>
                </div>
                <span className="text-sm font-bold tabular-nums">₹149</span>
              </label>
            </div>
          </section>

          <section className="p-6 rounded-lg bg-[#FCFBF7] border border-[#C5D1B8] space-y-3">
            <h2 className="font-display text-xl font-bold">3. Payment Method</h2>
            <div className="space-y-3">
              <label
                className={`p-4 rounded-md border cursor-pointer flex items-start gap-3 ${
                  paymentMethod === 'razorpay'
                    ? 'bg-[#9CAF88]/30 border-[#1F2A1C]'
                    : 'bg-[#F7F5EF] border-[#C5D1B8]'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'razorpay'}
                  onChange={() => setPaymentMethod('razorpay')}
                  className="mt-1 accent-[#1F2A1C]"
                />
                <div>
                  <p className="text-sm font-bold">Razorpay Secure (UPI, Cards, Netbanking, Wallets)</p>
                  <p className="text-xs text-[#4D5A48] mt-0.5">
                    Server-verified total and HMAC SHA256 payment confirmation.
                  </p>
                </div>
              </label>

              <label
                className={`p-4 rounded-md border cursor-pointer flex items-start gap-3 ${
                  paymentMethod === 'cod'
                    ? 'bg-[#9CAF88]/30 border-[#1F2A1C]'
                    : 'bg-[#F7F5EF] border-[#C5D1B8]'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  className="mt-1 accent-[#1F2A1C]"
                />
                <div>
                  <p className="text-sm font-bold">Cash on Delivery (COD)</p>
                  <p className="text-xs text-[#4D5A48] mt-0.5">
                    Pay via cash or UPI QR at your doorstep on arrival.
                  </p>
                </div>
              </label>
            </div>
          </section>
        </div>

        {/* Right: Order Summary */}
        <aside className="lg:col-span-5 p-6 rounded-lg bg-[#FCFBF7] border border-[#C5D1B8] lg:sticky lg:top-24 space-y-5">
          <h2 className="font-display text-xl font-bold">Order Summary</h2>

          <ul className="divide-y divide-[#CFD9C3] max-h-80 overflow-y-auto pr-1">
            {items.map((item) => (
              <li
                key={`${item.productId}-${item.color}-${item.size}`}
                className="py-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-12 h-14 object-cover rounded border border-[#C5D1B8] shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{item.name}</p>
                    <p className="text-xs text-[#4D5A48]">
                      {item.color} · {item.size} × {item.quantity}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold tabular-nums shrink-0">
                  ₹{(item.unitPrice * item.quantity).toLocaleString('en-IN')}
                </span>
              </li>
            ))}
          </ul>

          <div className="border-t border-[#CFD9C3] pt-4 space-y-2.5">
            {couponCode ? (
              <div className="flex items-center justify-between text-xs bg-[#E7ECE0] px-3 py-2 rounded-md">
                <span className="font-semibold">Coupon {couponCode} applied</span>
                <button type="button" onClick={removeCoupon} className="underline font-semibold">
                  Remove
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    placeholder="Promo code (FIRST10)"
                    aria-label="Promo code"
                    className="flex-1 px-3 py-2 text-xs bg-[#F7F5EF] border border-[#C5D1B8] rounded-md"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!promoInput.trim()) return;
                      const res = await applyCoupon(promoInput.trim());
                      setPromoMsg(res.message);
                      if (res.ok) setPromoInput('');
                    }}
                    className="px-3.5 py-2 text-xs font-bold bg-[#9CAF88] rounded-md hover:bg-[#8EA379]"
                  >
                    Apply
                  </button>
                </div>
                {promoMsg && <p className="text-[11px] text-[#4D5A48]">{promoMsg}</p>}
              </div>
            )}
          </div>

          <div className="space-y-2 text-sm border-t border-[#CFD9C3] pt-4">
            <div className="flex justify-between text-[#4D5A48]">
              <span>Subtotal</span>
              <span className="tabular-nums">₹{subtotal.toLocaleString('en-IN')}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between font-medium">
                <span>Discount {couponCode ? `(${couponCode})` : '(Bundle)'}</span>
                <span className="tabular-nums">-₹{discount.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between text-[#4D5A48]">
              <span>Shipping</span>
              <span className="tabular-nums">{shippingFee === 0 ? 'Free' : `₹${shippingFee}`}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-[#CFD9C3]">
              <span>Total (incl. GST)</span>
              <span className="tabular-nums">₹{total.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || verifying}
            className="w-full py-4 px-6 rounded-md btn-tomato text-center"
          >
            {submitting
              ? 'Preparing order...'
              : paymentMethod === 'razorpay'
              ? `Pay now · ₹${total.toLocaleString('en-IN')}`
              : `Place order · ₹${total.toLocaleString('en-IN')}`}
          </button>

          <p className="text-xs text-[#4D5A48] flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>Prices verified on Wicked servers · 7-day exchange guarantee</span>
          </p>
        </aside>
      </form>

      {/* Razorpay Test Sandbox Sheet (used automatically when test keys are not yet in env) */}
      {sandboxModal && (
        <div
          className="fixed inset-0 z-50 bg-[#1F2A1C]/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Razorpay Test Mode Checkout"
        >
          <div className="w-full max-w-md bg-[#F7F5EF] border border-[#C5D1B8] rounded-lg overflow-hidden">
            <div className="bg-[#E8412C] text-white px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-xs opacity-90">Razorpay Test Mode Checkout</p>
                <p className="font-display text-lg font-bold">Wicked Apparel India</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSandboxModal(null);
                  setErrorMsg('Payment window closed. Click Pay now to retry.');
                }}
                aria-label="Close payment window"
                className="p-1.5 rounded hover:bg-black/15"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex justify-between items-baseline border-b border-[#CFD9C3] pb-3">
                <span className="text-sm text-[#4D5A48]">Order {sandboxModal.orderId}</span>
                <span className="font-display text-2xl font-bold tabular-nums">
                  ₹{(sandboxModal.amountPaise / 100).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'upi', label: 'UPI / QR' },
                  { id: 'card', label: 'Card' },
                  { id: 'netbanking', label: 'Netbanking' },
                  { id: 'wallet', label: 'Wallets' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSandboxMethod(m.id as typeof sandboxMethod)}
                    className={`py-2.5 px-3 rounded-md border text-sm font-semibold ${
                      sandboxMethod === m.id
                        ? 'bg-[#9CAF88] border-[#1F2A1C] text-[#1F2A1C]'
                        : 'bg-[#FCFBF7] border-[#C5D1B8] text-[#4D5A48]'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="p-3 rounded-md bg-[#E7ECE0] text-xs text-[#4D5A48]">
                Test Mode Sandbox: Completing this payment generates a real HMAC SHA256 signature and runs full server-side verification. Add live/test keys in <code>.env</code> anytime to switch to live Razorpay Gateway.
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleSandboxSuccess}
                  className="w-full py-3.5 px-6 rounded-md btn-tomato"
                >
                  Pay now · ₹{(sandboxModal.amountPaise / 100).toLocaleString('en-IN')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSandboxModal(null);
                    setErrorMsg('Simulated payment failure. Retry payment or switch to Cash on Delivery.');
                  }}
                  className="w-full py-2 text-xs font-semibold text-[#4D5A48] underline"
                >
                  Simulate payment failure
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
