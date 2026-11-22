import { useParams } from 'react-router-dom';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

const POLICY_COPY: Record<
  string,
  { title: string; updated: string; sections: { heading: string; body: string }[] }
> = {
  shipping: {
    title: 'Shipping Policy',
    updated: 'Effective November 2026',
    sections: [
      {
        heading: 'Dispatch & Transit Times',
        body: 'Orders placed before 2:00 PM IST ship the same business day from our Jaipur or Bengaluru fulfillment hubs. Metro cities receive deliveries in 2–3 business days; rest of India in 3–5 business days.',
      },
      {
        heading: 'Shipping Rates & Free Delivery',
        body: 'Standard delivery is free on all orders of ₹1,499 or above. Orders below ₹1,499 carry a flat ₹79 shipping charge. Priority Express Air is available at ₹149.',
      },
      {
        heading: 'Cash on Delivery',
        body: 'Cash on Delivery (COD) is supported across serviceable Indian pincodes with UPI QR or cash collection at doorstep.',
      },
    ],
  },
  returns: {
    title: 'Returns & 7-Day Exchange Policy',
    updated: 'Effective November 2026',
    sections: [
      {
        heading: '7-Day Size Exchange',
        body: 'Unworn garments with original tags intact may be exchanged for another size or colour within 7 days of delivery at zero pickup cost.',
      },
      {
        heading: 'Refund Timelines',
        body: 'Approved refunds for prepaid Razorpay orders are initiated to the original UPI ID, card, or bank account within 24 hours and reflect within 5–7 business days.',
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    updated: 'Effective November 2026',
    sections: [
      {
        heading: 'Data We Collect',
        body: 'We collect only the contact details, shipping address, and order metadata needed to fulfill your purchase and provide GST tax invoices.',
      },
      {
        heading: 'Payment Security',
        body: 'All online payments are processed via Razorpay over encrypted TLS. Wicked never stores raw card numbers, CVVs, or UPI PINs.',
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    updated: 'Effective November 2026',
    sections: [
      {
        heading: 'Pricing & GST',
        body: 'All listed prices in Indian Rupees (INR) are inclusive of applicable Apparel GST (5% or 12%).',
      },
      {
        heading: 'Order Verification',
        body: 'Wicked reserves the right to cancel orders where inventory is exhausted or payment signature verification fails.',
      },
    ],
  },
  contact: {
    title: 'Contact Wicked Studio',
    updated: 'Jaipur & Bengaluru, India',
    sections: [
      {
        heading: 'Customer Care',
        body: 'Email care@wickedindia.in or message our Bengaluru studio desk Monday through Saturday, 10:00 AM to 7:00 PM IST.',
      },
      {
        heading: 'Registered Office',
        body: 'Wicked Apparel India Pvt. Ltd., 42 Indiranagar 100 Feet Road, Bengaluru 560038, Karnataka, India.',
      },
    ],
  },
};

export function PolicyPage() {
  const { type = 'shipping' } = useParams();
  const content = POLICY_COPY[type] || POLICY_COPY.shipping;

  useDocumentMeta({
    title: `${content.title} — Wicked`,
    description: `${content.title} for Wicked Apparel India Pvt. Ltd.`,
  });

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14">
      <p className="text-xs font-medium text-[#4D5A48]">{content.updated}</p>
      <h1 className="font-display text-3xl sm:text-4xl font-bold mt-1 pb-6 border-b border-[#C5D1B8]">
        {content.title}
      </h1>

      <div className="mt-8 space-y-8">
        {content.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="font-display text-xl font-bold text-[#1F2A1C]">{s.heading}</h2>
            <p className="text-base text-[#4D5A48] mt-2 leading-relaxed">{s.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
