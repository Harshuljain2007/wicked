import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { SERVER_CONFIG } from './config.ts';

let adminAuthInitialized = false;

function getFirebaseAdminAuth() {
  if (!SERVER_CONFIG.firebase.projectId) {
    return null;
  }
  if (!adminAuthInitialized) {
    if (!getApps().length) {
      initializeApp({ projectId: SERVER_CONFIG.firebase.projectId });
    }
    adminAuthInitialized = true;
  }
  return getAuth(getApp());
}

export interface AuthenticatedUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  isAdmin: boolean;
  provider: 'firebase' | 'otp';
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export function signOtpSessionToken(email: string): string {
  const payload = {
    uid: `otp_${crypto.createHash('sha256').update(email.toLowerCase()).digest('hex').slice(0, 20)}`,
    email: email.toLowerCase(),
    emailVerified: true,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', SERVER_CONFIG.sessionSigningKey)
    .update(encoded)
    .digest('base64url');
  return `otp.${encoded}.${sig}`;
}

export function verifyOtpSessionToken(token: string): AuthenticatedUser | null {
  if (!token.startsWith('otp.')) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [, encoded, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SERVER_CONFIG.sessionSigningKey)
    .update(encoded)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8'));
    if (!parsed.exp || parsed.exp < Date.now()) return null;
    const email = String(parsed.email || '').toLowerCase();
    return {
      uid: String(parsed.uid),
      email,
      emailVerified: true,
      isAdmin: email === SERVER_CONFIG.adminEmail,
      provider: 'otp',
    };
  } catch {
    return null;
  }
}

export async function resolveUserFromRequest(req: Request): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  if (!token) return null;

  if (token.startsWith('otp.')) {
    return verifyOtpSessionToken(token);
  }

  try {
    const adminAuth = getFirebaseAdminAuth();
    if (!adminAuth) return null;
    const decoded = await adminAuth.verifyIdToken(token);
    const email = (decoded.email || '').toLowerCase();
    const emailVerified = Boolean(decoded.email_verified);
    return {
      uid: decoded.uid,
      email,
      emailVerified,
      isAdmin: emailVerified && email === SERVER_CONFIG.adminEmail,
      provider: 'firebase',
    };
  } catch {
    return null;
  }
}

export async function attachUser(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  req.user = (await resolveUserFromRequest(req)) || undefined;
  next();
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const user = await resolveUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  req.user = user;
  next();
}

export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const user = await resolveUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: 'Admin sign-in required.' });
    return;
  }
  if (!user.isAdmin) {
    res.status(403).json({ error: 'Forbidden: Admin access required.' });
    return;
  }
  req.user = user;
  next();
}
