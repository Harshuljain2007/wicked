import { Router } from 'express';
import { z } from 'zod';
import {
  type AuthenticatedRequest,
  requireAuth,
  signOtpSessionToken,
} from '../lib/authMiddleware.ts';
import { SERVER_CONFIG } from '../lib/config.ts';
import { createEmailOtp, verifyEmailOtp } from '../lib/otpStore.ts';
import { authRateLimiter } from '../lib/rateLimiters.ts';

export const authRouter = Router();

const requestOtpSchema = z.object({
  email: z.string().email().max(180),
});

const verifyOtpSchema = z.object({
  email: z.string().email().max(180),
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

authRouter.get('/session', requireAuth, (req: AuthenticatedRequest, res) => {
  res.json({ user: req.user });
});
