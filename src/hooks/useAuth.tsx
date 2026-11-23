import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import {
  staticRequestOtp,
  staticRequestSmsOtp,
  staticVerifyOtp,
  staticVerifySmsOtp,
  tryApiJson,
} from '../lib/staticStore';

export interface SavedAddressRecord {
  id: string;
  userId: string;
  label?: string;
  fullName: string;
  phone: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
}

export interface AuthUser {
  uid: string;
  email: string;
  phone?: string;
  displayName: string;
  isAdmin: boolean;
  provider: 'firebase' | 'otp';
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  addresses: SavedAddressRecord[];
  signInWithGoogle: () => Promise<void>;
  requestOtp: (email: string) => Promise<{ previewCode?: string; message: string }>;
  verifyOtp: (email: string, code: string) => Promise<void>;
  requestSmsOtp: (
    phone: string
  ) => Promise<{
    sent?: boolean;
    phone: string;
    previewCode?: string;
    message: string;
    gatewayError?: string;
    provider?: string;
  }>;
  verifySmsOtp: (phone: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  getAuthToken: () => Promise<string | null>;
  saveAddress: (address: Omit<SavedAddressRecord, 'id' | 'userId'>) => Promise<void>;
  deleteAddress: (id: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ADMIN_EMAIL = 'harshuljain923@gmail.com';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [otpUser, setOtpUser] = useState<AuthUser | null>(null);
  const [otpToken, setOtpToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState<SavedAddressRecord[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      setLoading(false);
      if (fbUser && fbUser.email) {
        const userRef = doc(db, 'users', fbUser.uid);
        try {
          await setDoc(
            userRef,
            {
              uid: fbUser.uid,
              email: fbUser.email,
              displayName: fbUser.displayName || fbUser.email.split('@')[0],
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch {
          // Profile merge may skip createdAt diff on subsequent logins; safe to ignore if already created
        }
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!firebaseUser) {
      setAddresses([]);
      return;
    }
    const addrCol = collection(db, 'users', firebaseUser.uid, 'addresses');
    const q = query(addrCol, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as SavedAddressRecord);
        setAddresses(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `users/${firebaseUser.uid}/addresses`);
      }
    );
    return () => unsub();
  }, [firebaseUser]);

  const user: AuthUser | null = firebaseUser
    ? {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Member',
        isAdmin:
          Boolean(firebaseUser.emailVerified) &&
          (firebaseUser.email || '').toLowerCase() === ADMIN_EMAIL,
        provider: 'firebase',
      }
    : otpUser;

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
  }, []);

  const requestOtp = useCallback(async (email: string) => {
    const api = await tryApiJson<{ previewCode?: string; message?: string; error?: string }>(
      '/api/auth/otp/request',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      }
    );
    if (api.available) {
      if (!api.ok) throw new Error(api.data.error || 'Could not send verification code.');
      return {
        previewCode: api.data.previewCode,
        message: api.data.message || 'Verification code sent.',
      };
    }
    return staticRequestOtp(email);
  }, []);

  const verifyOtp = useCallback(async (email: string, code: string) => {
    const api = await tryApiJson<{
      token?: string;
      user?: { email: string; isAdmin?: boolean };
      error?: string;
    }>('/api/auth/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    if (api.available) {
      if (!api.ok || !api.data.token || !api.data.user) {
        throw new Error(api.data.error || 'Invalid code.');
      }
      setOtpToken(api.data.token);
      setOtpUser({
        uid: `otp_${email.toLowerCase()}`,
        email: api.data.user.email,
        displayName: api.data.user.email.split('@')[0],
        isAdmin: Boolean(api.data.user.isAdmin),
        provider: 'otp',
      });
      return;
    }

    const verified = staticVerifyOtp(email, code);
    setOtpToken(verified.token);
    setOtpUser({
      uid: `otp_${verified.email.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
      email: verified.email,
      displayName: verified.email.split('@')[0],
      isAdmin: verified.isAdmin,
      provider: 'otp',
    });
  }, []);

  const requestSmsOtp = useCallback(async (phone: string) => {
    const api = await tryApiJson<{
      sent?: boolean;
      phone?: string;
      previewCode?: string;
      message?: string;
      error?: string;
      gatewayError?: string;
      provider?: string;
    }>('/api/auth/sms-otp/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    if (api.available) {
      if (!api.ok) throw new Error(api.data.error || 'Could not send SMS verification code.');
      return {
        sent: api.data.sent !== false,
        phone: api.data.phone || phone,
        previewCode: api.data.previewCode,
        message: api.data.message || 'SMS verification code sent.',
        gatewayError: api.data.gatewayError,
        provider: api.data.provider,
      };
    }
    return staticRequestSmsOtp(phone);
  }, []);

  const verifySmsOtp = useCallback(async (phone: string, code: string) => {
    const api = await tryApiJson<{
      token?: string;
      user?: { phone: string; email: string; isAdmin?: boolean };
      error?: string;
    }>('/api/auth/sms-otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code }),
    });
    if (api.available) {
      if (!api.ok || !api.data.token || !api.data.user) {
        throw new Error(api.data.error || 'Invalid SMS verification code.');
      }
      setOtpToken(api.data.token);
      setOtpUser({
        uid: `otp_${api.data.user.phone.replace(/\D/g, '')}`,
        email: api.data.user.email,
        phone: api.data.user.phone,
        displayName: api.data.user.phone,
        isAdmin: false,
        provider: 'otp',
      });
      return;
    }

    const verified = staticVerifySmsOtp(phone, code);
    setOtpToken(verified.token);
    setOtpUser({
      uid: `otp_${verified.phone.replace(/\D/g, '')}`,
      email: verified.email,
      phone: verified.phone,
      displayName: verified.phone,
      isAdmin: false,
      provider: 'otp',
    });
  }, []);

  const signOut = useCallback(async () => {
    if (firebaseUser) {
      await firebaseSignOut(auth);
    }
    setOtpToken(null);
    setOtpUser(null);
  }, [firebaseUser]);

  const getAuthToken = useCallback(async (): Promise<string | null> => {
    if (firebaseUser) {
      return firebaseUser.getIdToken();
    }
    return otpToken;
  }, [firebaseUser, otpToken]);

  const saveAddress = useCallback(
    async (address: Omit<SavedAddressRecord, 'id' | 'userId'>) => {
      if (!firebaseUser) {
        const localAddr: SavedAddressRecord = {
          ...address,
          id: `addr_${Date.now()}`,
          userId: user?.uid || 'guest',
        };
        setAddresses((prev) => [localAddr, ...prev]);
        return;
      }
      const id = `addr_${Date.now()}`;
      const path = `users/${firebaseUser.uid}/addresses/${id}`;
      try {
        await setDoc(doc(db, 'users', firebaseUser.uid, 'addresses', id), {
          ...address,
          id,
          userId: firebaseUser.uid,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    },
    [firebaseUser, user]
  );

  const deleteAddress = useCallback(
    async (id: string) => {
      if (!firebaseUser) {
        setAddresses((prev) => prev.filter((a) => a.id !== id));
        return;
      }
      const path = `users/${firebaseUser.uid}/addresses/${id}`;
      try {
        await deleteDoc(doc(db, 'users', firebaseUser.uid, 'addresses', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    },
    [firebaseUser]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        addresses,
        signInWithGoogle,
        requestOtp,
        verifyOtp,
        requestSmsOtp,
        verifySmsOtp,
        signOut,
        getAuthToken,
        saveAddress,
        deleteAddress,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
