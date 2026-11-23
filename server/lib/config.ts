import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

interface FirebaseAppletConfig {
  projectId: string;
  apiKey: string;
  firestoreDatabaseId: string;
}

let firebaseConfig: FirebaseAppletConfig = {
  projectId: '',
  apiKey: '',
  firestoreDatabaseId: '(default)',
};

try {
  const cfgPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(cfgPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
  }
} catch {
  // Fallback to empty config if unavailable
}

const EPHEMERAL_FALLBACK_SECRET = crypto.randomBytes(32).toString('hex');

export const SERVER_CONFIG = {
  port: Number(process.env.PORT || 3000),
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || process.env.APP_URL || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  adminEmail: (process.env.ADMIN_EMAIL || 'harshuljain923@gmail.com').toLowerCase(),
  ownerAlertPhone: (process.env.OWNER_ALERT_PHONE || '+917665712877').trim(),
  twilioAccountSid: (process.env.TWILIO_ACCOUNT_SID || '').trim(),
  twilioAuthToken: (process.env.TWILIO_AUTH_TOKEN || '').trim(),
  twilioFromNumber: (process.env.TWILIO_FROM_NUMBER || '').trim(),
  fast2smsApiKey: (process.env.FAST2SMS_API_KEY || '').trim(),
  fast2smsSenderId: (process.env.FAST2SMS_SENDER_ID || 'WICKED').trim(),
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  sessionSigningKey: process.env.SESSION_SECRET || EPHEMERAL_FALLBACK_SECRET,
  sandboxSigningSecret: process.env.RAZORPAY_KEY_SECRET || EPHEMERAL_FALLBACK_SECRET,
  firebase: firebaseConfig,
};

export function hasRealRazorpayKeys(): boolean {
  return (
    Boolean(SERVER_CONFIG.razorpayKeyId) &&
    !SERVER_CONFIG.razorpayKeyId.includes('placeholder') &&
    Boolean(SERVER_CONFIG.razorpayKeySecret)
  );
}

export function getSmsGatewayProvider(): 'twilio' | 'fast2sms' | 'sandbox' {
  if (
    SERVER_CONFIG.twilioAccountSid &&
    SERVER_CONFIG.twilioAuthToken &&
    SERVER_CONFIG.twilioFromNumber
  ) {
    return 'twilio';
  }
  if (SERVER_CONFIG.fast2smsApiKey) {
    return 'fast2sms';
  }
  return 'sandbox';
}
