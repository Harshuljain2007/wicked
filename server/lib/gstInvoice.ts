import type { CartItem } from '../../src/types/index.ts';

/**
 * Indian Apparel GST slabs:
 * - Unit price <= ₹1,000: 5% GST (inclusive in MRP)
 * - Unit price > ₹1,000: 12% GST (inclusive in MRP)
 */
export function calculateGstBreakdown(items: CartItem[], discountRatio: number): {
  gstAmount: number;
  cgst: number;
  sgst: number;
} {
  let totalGst = 0;
  for (const item of items) {
    const lineTotal = item.unitPrice * item.quantity * (1 - discountRatio);
    const rate = item.unitPrice <= 1000 ? 0.05 : 0.12;
    const tax = lineTotal - lineTotal / (1 + rate);
    totalGst += tax;
  }
  const rounded = Math.round(totalGst * 100) / 100;
  const half = Math.round((rounded / 2) * 100) / 100;
  return {
    gstAmount: rounded,
    cgst: half,
    sgst: Math.round((rounded - half) * 100) / 100,
  };
}
