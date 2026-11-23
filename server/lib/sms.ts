import crypto from 'crypto';
import type { Order, SmsEventType, SmsLogRecord } from '../../src/types/index.ts';
import { getSmsGatewayProvider, SERVER_CONFIG } from './config.ts';

const smsLogs: SmsLogRecord[] = [];

export function normalizeIndianPhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  if (digits.length >= 10 && digits.length <= 15) {
    return trimmed.startsWith('+') ? `+${digits}` : `+${digits}`;
  }
  return null;
}

function recordSmsLog(entry: SmsLogRecord): SmsLogRecord {
  smsLogs.unshift(entry);
  if (smsLogs.length > 200) smsLogs.length = 200;
  return entry;
}

export function listSmsLogs(): SmsLogRecord[] {
  return [...smsLogs];
}

export async function sendSms(params: {
  to: string;
  message: string;
  event: SmsEventType;
  orderId?: string;
  createdBy?: string;
}): Promise<SmsLogRecord> {
  const normalized = normalizeIndianPhone(params.to);
  const id = `sms_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
  const createdAt = new Date().toISOString();
  const createdBy = params.createdBy || 'system';
  const cleanMsg = params.message.trim().slice(0, 480);

  if (!normalized) {
    return recordSmsLog({
      id,
      orderId: params.orderId,
      to: params.to,
      message: cleanMsg,
      event: params.event,
      provider: getSmsGatewayProvider(),
      status: 'failed',
      error: 'Invalid mobile number format.',
      createdBy,
      createdAt,
    });
  }

  const provider = getSmsGatewayProvider();

  if (provider === 'twilio') {
    try {
      const auth = Buffer.from(
        `${SERVER_CONFIG.twilioAccountSid}:${SERVER_CONFIG.twilioAuthToken}`
      ).toString('base64');
      const body = new URLSearchParams({
        To: normalized,
        From: SERVER_CONFIG.twilioFromNumber,
        Body: cleanMsg,
      });
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(
          SERVER_CONFIG.twilioAccountSid
        )}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        }
      );
      if (!res.ok) {
        const text = await res.text();
        return recordSmsLog({
          id,
          orderId: params.orderId,
          to: normalized,
          message: cleanMsg,
          event: params.event,
          provider: 'twilio',
          status: 'failed',
          error: `Twilio HTTP ${res.status}: ${text.slice(0, 120)}`,
          createdBy,
          createdAt,
        });
      }
      return recordSmsLog({
        id,
        orderId: params.orderId,
        to: normalized,
        message: cleanMsg,
        event: params.event,
        provider: 'twilio',
        status: 'sent',
        createdBy,
        createdAt,
      });
    } catch (err) {
      return recordSmsLog({
        id,
        orderId: params.orderId,
        to: normalized,
        message: cleanMsg,
        event: params.event,
        provider: 'twilio',
        status: 'failed',
        error: err instanceof Error ? err.message : 'Twilio request failed.',
        createdBy,
        createdAt,
      });
    }
  }

  if (provider === 'fast2sms') {
    try {
      const localTen = normalized.replace(/\D/g, '').slice(-10);
      const sendViaFast2Sms = async (bodyPayload: Record<string, unknown>) => {
        const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            authorization: SERVER_CONFIG.fast2smsApiKey,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(bodyPayload),
        });
        const rawText = await res.text();
        let parsedJson: { return?: boolean; message?: string | string[]; status_code?: number } | null =
          null;
        try {
          parsedJson = JSON.parse(rawText);
        } catch {
          parsedJson = null;
        }
        const ok = res.ok && parsedJson?.return !== false;
        const msgText = Array.isArray(parsedJson?.message)
          ? parsedJson.message.join(', ')
          : parsedJson?.message || rawText;
        return { ok, status: res.status, msgText };
      };

      // Fast2SMS Quick SMS ('q') does not accept sender_id or language
      let result = await sendViaFast2Sms({
        route: 'q',
        message: cleanMsg,
        flash: 0,
        numbers: localTen,
      });

      // Fallback to Fast2SMS OTP route if Quick SMS is disabled for OTP traffic on the account
      if (!result.ok && params.event === 'otp') {
        const otpDigits = cleanMsg.match(/\b(\d{4,8})\b/)?.[1];
        if (otpDigits) {
          const otpAttempt = await sendViaFast2Sms({
            route: 'otp',
            variables_values: otpDigits,
            flash: 0,
            numbers: localTen,
          });
          if (otpAttempt.ok) {
            result = otpAttempt;
          } else {
            result.msgText = `${result.msgText} (OTP route: ${otpAttempt.msgText})`;
          }
        }
      }

      if (!result.ok) {
        const errMsg = `Fast2SMS HTTP ${result.status}: ${String(result.msgText).slice(0, 320)}`;
        console.error('[WICKED FAST2SMS ERROR]', errMsg);
        return recordSmsLog({
          id,
          orderId: params.orderId,
          to: normalized,
          message: cleanMsg,
          event: params.event,
          provider: 'fast2sms',
          status: 'failed',
          error: errMsg,
          createdBy,
          createdAt,
        });
      }
      return recordSmsLog({
        id,
        orderId: params.orderId,
        to: normalized,
        message: cleanMsg,
        event: params.event,
        provider: 'fast2sms',
        status: 'sent',
        createdBy,
        createdAt,
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Fast2SMS request failed.';
      console.error('[WICKED FAST2SMS EXCEPTION]', errMsg);
      return recordSmsLog({
        id,
        orderId: params.orderId,
        to: normalized,
        message: cleanMsg,
        event: params.event,
        provider: 'fast2sms',
        status: 'failed',
        error: errMsg,
        createdBy,
        createdAt,
      });
    }
  }

  // Sandbox mode when external SMS gateway credentials are not yet configured
  console.log(`[WICKED SMS SANDBOX] -> ${normalized} (${params.event}): ${cleanMsg}`);
  return recordSmsLog({
    id,
    orderId: params.orderId,
    to: normalized,
    message: cleanMsg,
    event: params.event,
    provider: 'sandbox',
    status: 'simulated',
    createdBy,
    createdAt,
  });
}

export function buildOrderPlacedSms(order: Order): string {
  return `WICKED: Order ${order.id} for Rs.${order.total.toLocaleString('en-IN')} (${order.paymentMethod.toUpperCase()}) is confirmed! Track anytime at wicked. Help: +91 76657 12877.`;
}

export function buildPaymentConfirmedSms(order: Order): string {
  return `WICKED: Payment of Rs.${order.total.toLocaleString('en-IN')} received for Order ${order.id}. We are packing your garments from our studio.`;
}

export function buildOrderStatusSms(order: Order): string {
  const awb = order.trackingNumber ? ` AWB: ${order.trackingNumber}.` : '';
  return `WICKED: Update for Order ${order.id} — status is now ${order.status.toUpperCase()}.${awb} Queries: +91 76657 12877.`;
}

export function buildRefundSms(order: Order): string {
  return `WICKED: Refund of Rs.${(order.refundAmount || order.total).toLocaleString('en-IN')} has been initiated for Order ${order.id}. It reflects in 5-7 business days.`;
}

export function buildOwnerNewOrderSms(order: Order): string {
  return `WICKED ADMIN ALERT: New ${order.paymentMethod.toUpperCase()} order ${order.id} for Rs.${order.total.toLocaleString('en-IN')} by ${order.shippingAddress.fullName} (${order.customerPhone}).`;
}
