import crypto from 'crypto';

interface OtpEntry {
  hash: string;
  expiresAt: number;
  attempts: number;
}

const otpStore = new Map<string, OtpEntry>();

function hashOtp(identifier: string, code: string): string {
  return crypto.createHash('sha256').update(`${identifier.toLowerCase()}:${code}`).digest('hex');
}

export function createEmailOtp(identifier: string): { code: string; expiresInSeconds: number } {
  const normalized = identifier.toLowerCase().trim();
  const code = String(crypto.randomInt(100000, 999999));
  otpStore.set(normalized, {
    hash: hashOtp(normalized, code),
    expiresAt: Date.now() + 10 * 60 * 1000,
    attempts: 0,
  });
  return { code, expiresInSeconds: 600 };
}

export function verifyEmailOtp(email: string, code: string): { ok: boolean; error?: string } {
  const normalized = email.toLowerCase().trim();
  const entry = otpStore.get(normalized);
  if (!entry) {
    return { ok: false, error: 'No active verification code found. Please request a new code.' };
  }
  if (entry.expiresAt < Date.now()) {
    otpStore.delete(normalized);
    return { ok: false, error: 'Verification code expired. Please request a new code.' };
  }
  if (entry.attempts >= 5) {
    otpStore.delete(normalized);
    return { ok: false, error: 'Too many invalid attempts. Please request a new code.' };
  }
  entry.attempts += 1;
  const candidate = hashOtp(normalized, code.trim());
  const a = Buffer.from(candidate);
  const b = Buffer.from(entry.hash);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, error: 'Invalid verification code.' };
  }
  otpStore.delete(normalized);
  return { ok: true };
}
