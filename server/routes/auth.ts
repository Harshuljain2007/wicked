import { Router } from 'express';
import { z } from 'zod';
import {
  type AuthenticatedRequest,
  requireAuth,
  signOtpSessionToken,
} from '../lib/authMiddleware.ts';
import { getSmsGatewayProvider, SERVER_CONFIG } from '../lib/config.ts';
import { createEmailOtp, verifyEmailOtp } from '../lib/otpStore.ts';
import { authRateLimiter } from '../lib/rateLimiters.ts';
import { normalizeIndianPhone, sendSms } from '../lib/sms.ts';

export const authRouter = Router();

const requestOtpSchema = z.object({
  email: z.string().email().max(180),
});

const verifyOtpSchema = z.object({
  email: z.string().email().max(180),
  code: z.string().regex(/^\d{6}$/),
});

const requestSmsOtpSchema = z.object({
  phone: z.string().min(10).max(20),
});

const verifySmsOtpSchema = z.object({
  phone: z.string().min(10).max(20),
  code: z.string().regex(/^\d{6}$/),
});

authRouter.post('/otp/request', authRateLimiter, (req, res) => {
  const parsed = requestOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Please provide a valid email address.' });
    return;
  }
  const { code, expiresInSeconds } = createEmailOtp(parsed.data.email);
  const isDevPreview = process.env.NODE_ENV !== 'production';
  res.json({
    sent: true,
    expiresInSeconds,
    message: `Verification code sent to ${parsed.data.email}.`,
    // In local/preview mode without an external SMTP relay, return previewCode so the OTP flow can be tested cleanly.
    ...(isDevPreview ? { previewCode: code } : {}),
  });
});

authRouter.post('/otp/verify', authRateLimiter, (req, res) => {
  const parsed = verifyOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Enter a valid email and 6-digit code.' });
    return;
  }
  const result = verifyEmailOtp(parsed.data.email, parsed.data.code);
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }
  const email = parsed.data.email.toLowerCase().trim();
  const token = signOtpSessionToken(email);
  res.json({
    token,
    user: {
      email,
      isAdmin: email === SERVER_CONFIG.adminEmail,
      provider: 'otp',
    },
  });
});

authRouter.post('/sms-otp/request', authRateLimiter, async (req, res) => {
  const parsed = requestSmsOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
    return;
  }
  const normalizedPhone = normalizeIndianPhone(parsed.data.phone);
  if (!normalizedPhone) {
    res.status(400).json({ error: 'Enter a valid mobile number (e.g. +91 98XXXXXXXX).' });
    return;
  }
  const { code, expiresInSeconds } = createEmailOtp(`sms:${normalizedPhone}`);
  const log = await sendSms({
    to: normalizedPhone,
    message: `Your Wicked verification code is ${code}. Valid for 10 minutes. Do not share this code.`,
    event: 'otp',
    createdBy: 'auth',
  });
  const isSandboxOrDev = getSmsGatewayProvider() === 'sandbox' || process.env.NODE_ENV !== 'production';
  res.json({
    sent: log.status !== 'failed',
    phone: normalizedPhone,
    expiresInSeconds,
    provider: log.provider,
    message:
      log.status === 'sent'
        ? `6-digit SMS code sent to ${normalizedPhone}.`
        : `6-digit SMS code ready for ${normalizedPhone}.`,
    ...(isSandboxOrDev ? { previewCode: code } : {}),
  });
});

authRouter.post('/sms-otp/verify', authRateLimiter, (req, res) => {
  const parsed = verifySmsOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Enter a valid mobile number and 6-digit code.' });
    return;
  }
  const normalizedPhone = normalizeIndianPhone(parsed.data.phone);
  if (!normalizedPhone) {
    res.status(400).json({ error: 'Invalid mobile number.' });
    return;
  }
  const result = verifyEmailOtp(`sms:${normalizedPhone}`, parsed.data.code);
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }
  const smsEmail = `${normalizedPhone.replace(/\D/g, '')}@sms.wicked.in`;
  const token = signOtpSessionToken(smsEmail);
  res.json({
    token,
    user: {
      phone: normalizedPhone,
      email: smsEmail,
      isAdmin: false,
      provider: 'otp',
    },
  });
});

authRouter.get('/session', requireAuth, (req: AuthenticatedRequest, res) => {
  res.json({ user: req.user });
});
