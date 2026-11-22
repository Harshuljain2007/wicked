import { jsPDF } from 'jspdf';
import type { Order } from '../types';

export function downloadGstInvoicePdf(order: Order): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 44;
  let y = 52;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(31, 42, 28);
  doc.text('WICKED APPAREL INDIA', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(77, 90, 72);
  y += 18;
  doc.text('Tax Invoice (GST) • GSTIN: 08AAACW9214L1Z5 • Jaipur & Bengaluru Studio', margin, y);

  y += 28;
  doc.setDrawColor(197, 209, 184);
  doc.line(margin, y, 550, y);

  y += 22;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(31, 42, 28);
  doc.text(`Invoice / Order No: ${order.id}`, margin, y);
  doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, 380, y);

  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Payment Method: ${order.paymentMethod === 'razorpay' ? 'Online (Razorpay)' : 'Cash on Delivery'}`, margin, y);
  doc.text(`Status: ${order.status.toUpperCase()}`, 380, y);

  if (order.razorpayPaymentId) {
    y += 16;
    doc.text(`Payment Ref: ${order.razorpayPaymentId}`, margin, y);
  }

  y += 26;
  doc.setFont('helvetica', 'bold');
  doc.text('Billed & Shipped To:', margin, y);
  y += 15;
  doc.setFont('helvetica', 'normal');
  doc.text(order.shippingAddress.fullName, margin, y);
  y += 14;
  doc.text(order.shippingAddress.line1, margin, y);
  y += 14;
  doc.text(
    `${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}`,
    margin,
    y
  );
  y += 14;
  doc.text(`Phone: ${order.shippingAddress.phone} | Email: ${order.shippingAddress.email}`, margin, y);

  if (order.gstin) {
    y += 14;
    doc.text(`Buyer GSTIN: ${order.gstin}`, margin, y);
  }
  if (order.giftNote) {
    y += 14;
    doc.text(`Gift / Studio Note: ${order.giftNote.slice(0, 90)}`, margin, y);
  }

  y += 28;
  doc.setFillColor(231, 236, 224);
  doc.rect(margin, y - 14, 506, 22, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('Item Description', margin + 8, y);
  doc.text('Qty', 340, y);
  doc.text('Rate (INR)', 395, y);
  doc.text('Amount (INR)', 475, y);

  y += 22;
  doc.setFont('helvetica', 'normal');
  for (const item of order.items) {
    doc.text(`${item.name} (${item.color} / ${item.size})`, margin + 8, y);
    doc.text(String(item.quantity), 346, y);
    doc.text(item.unitPrice.toFixed(2), 400, y);
    doc.text((item.unitPrice * item.quantity).toFixed(2), 480, y);
    y += 20;
  }

  y += 12;
  doc.line(margin, y, 550, y);
  y += 20;

  const summaryX = 365;
  doc.text('Subtotal:', summaryX, y);
  doc.text(`INR ${order.subtotal.toFixed(2)}`, 475, y);
  y += 16;
  doc.text('Discount:', summaryX, y);
  doc.text(`-INR ${order.discount.toFixed(2)}`, 475, y);
  y += 16;
  doc.text('Shipping:', summaryX, y);
  doc.text(order.shippingFee === 0 ? 'FREE' : `INR ${order.shippingFee.toFixed(2)}`, 475, y);
  y += 16;
  doc.text('Included GST (CGST + SGST):', summaryX, y);
  doc.text(`INR ${order.gstAmount.toFixed(2)}`, 475, y);
  y += 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total Paid:', summaryX, y);
  doc.text(`INR ${order.total.toFixed(2)}`, 475, y);

  y += 42;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(77, 90, 72);
  doc.text('This is a computer-generated GST tax invoice. 7-day size exchange applicable on unworn garments.', margin, y);

  doc.save(`Wicked-Invoice-${order.id}.pdf`);
}
