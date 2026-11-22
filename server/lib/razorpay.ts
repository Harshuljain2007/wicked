import crypto from 'crypto';
import { hasRealRazorpayKeys, SERVER_CONFIG } from './config.ts';

export interface RazorpayOrderResult {
  razorpayOrderId: string;
  amountPaise: number;
  currency: 'INR';
  keyId: string;
  mode: 'razorpay' | 'test_sandbox';
}

export async function createRazorpayOrder(params: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrderResult> {
  if (hasRealRazorpayKeys()) {
    const auth = Buffer.from(
      `${SERVER_CONFIG.razorpayKeyId}:${SERVER_CONFIG.razorpayKeySecret}`
    ).toString('base64');

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: params.amountPaise,
        currency: 'INR',
        receipt: params.receipt,
        notes: params.notes || {},
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Razorpay order creation failed: ${errorText}`);
    }

    const data = (await response.json()) as { id: string; amount: number };
    return {
      razorpayOrderId: data.id,
      amountPaise: data.amount,
      currency: 'INR',
      keyId: SERVER_CONFIG.razorpayKeyId,
      mode: 'razorpay',
    };
  }

  // Preview / Test Sandbox mode when RAZORPAY_KEY_SECRET is not yet populated in environment
  const razorpayOrderId = `order_test_${crypto.randomBytes(6).toString('hex')}`;
  return {
    razorpayOrderId,
    amountPaise: params.amountPaise,
    currency: 'INR',
    keyId: SERVER_CONFIG.razorpayKeyId || 'rzp_test_wicked_sandbox',
    mode: 'test_sandbox',
  };
}

export function signTestSandboxPayment(razorpayOrderId: string, razorpayPaymentId: string): string {
  return crypto
    .createHmac('sha256', SERVER_CONFIG.sandboxSigningSecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
}

export function verifyRazorpayPaymentSignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): boolean {
  const secret = hasRealRazorpayKeys()
    ? SERVER_CONFIG.razorpayKeySecret
    : SERVER_CONFIG.sandboxSigningSecret;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
    .digest('hex');

  const actualBuf = Buffer.from(params.razorpaySignature.trim());
  const expectedBuf = Buffer.from(expected);
  return actualBuf.length === expectedBuf.length && crypto.timingSafeEqual(actualBuf, expectedBuf);
}

export function verifyRazorpayWebhookSignature(rawBody: Buffer, signatureHeader: string): boolean {
  const secret = SERVER_CONFIG.razorpayWebhookSecret || SERVER_CONFIG.sandboxSigningSecret;
  if (!secret || !signatureHeader) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const actualBuf = Buffer.from(signatureHeader.trim());
  const expectedBuf = Buffer.from(expected);
  return actualBuf.length === expectedBuf.length && crypto.timingSafeEqual(actualBuf, expectedBuf);
}

export async function issueRazorpayRefund(params: {
  paymentId: string;
  amountPaise: number;
  notes?: Record<string, string>;
}): Promise<{ refundId: string; status: string; amountPaise: number }> {
  if (hasRealRazorpayKeys() && !params.paymentId.startsWith('pay_test_') && !params.paymentId.startsWith('pay_seed_')) {
    const auth = Buffer.from(
      `${SERVER_CONFIG.razorpayKeyId}:${SERVER_CONFIG.razorpayKeySecret}`
    ).toString('base64');

    const response = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(params.paymentId)}/refund`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: params.amountPaise,
          notes: params.notes || {},
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Razorpay refund failed: ${errorText}`);
    }

    const data = (await response.json()) as { id: string; status: string; amount: number };
    return {
      refundId: data.id,
      status: data.status,
      amountPaise: data.amount,
    };
  }

  return {
    refundId: `rfnd_test_${crypto.randomBytes(6).toString('hex')}`,
    status: 'processed',
    amountPaise: params.amountPaise,
  };
}
