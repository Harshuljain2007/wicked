import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

interface LoginPanelProps {
  onSuccess?: () => void;
  onContinueAsGuest?: () => void;
  heading?: string;
  subheading?: string;
}

export function LoginPanel({
  onSuccess,
  onContinueAsGuest,
  heading = 'Sign in to Wicked',
  subheading = 'Access saved addresses, track your orders, and sync your wishlist across devices.',
}: LoginPanelProps) {
  const { signInWithGoogle, requestOtp, verifyOtp, requestSmsOtp, verifySmsOtp } = useAuth();

  const [otpChannel, setOtpChannel] = useState<'email' | 'sms'>('sms');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [previewOtp, setPreviewOtp] = useState('');
  const [otpNotice, setOtpNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [authError, setAuthError] = useState('');

  const handleGoogle = async () => {
    setAuthError('');
    setBusy(true);
    try {
      await signInWithGoogle();
      onSuccess?.();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Google sign-in could not be completed.');
    } finally {
      setBusy(false);
    }
  };

  const handleRequestOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setAuthError('');
    setOtpNotice('');
    setBusy(true);
    try {
      if (otpChannel === 'sms') {
        const res = await requestSmsOtp(otpPhone);
        setOtpPhone(res.phone);
        setOtpSent(true);
        setPreviewOtp(res.previewCode || '');
        if (res.gatewayError) {
          setAuthError(`${res.message} (${res.gatewayError})`);
        } else {
          setOtpNotice(res.message);
        }
      } else {
        const res = await requestOtp(otpEmail);
        setOtpSent(true);
        setPreviewOtp(res.previewCode || '');
        setOtpNotice(res.message);
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Failed to send verification code.');
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setBusy(true);
    try {
      if (otpChannel === 'sms') {
        await verifySmsOtp(otpPhone, otpCode);
      } else {
        await verifyOtp(otpEmail, otpCode);
      }
      onSuccess?.();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setBusy(false);
    }
  };

  const switchChannel = (next: 'email' | 'sms') => {
    setOtpChannel(next);
    setOtpSent(false);
    setOtpCode('');
    setPreviewOtp('');
    setOtpNotice('');
    setAuthError('');
  };

  return (
    <div className="p-6 sm:p-8 rounded-lg bg-[#FCFBF7] border border-[#C5D1B8] space-y-6">
      <div>
        <p className="text-xs font-medium text-[#4D5A48]">Wicked Member Access</p>
        <h2 className="font-display text-2xl sm:text-3xl font-bold mt-1 text-[#1F2A1C]">
          {heading}
        </h2>
        <p className="text-sm text-[#4D5A48] mt-1.5 leading-relaxed">{subheading}</p>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={handleGoogle}
        className="w-full py-3 px-4 rounded-md bg-[#9CAF88] text-[#1F2A1C] font-bold text-sm hover:bg-[#8EA379] transition-colors min-h-[44px]"
      >
        {busy ? 'Connecting...' : 'Continue with Google'}
      </button>

      <div className="border-t border-[#CFD9C3] pt-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-[#4D5A48]">Or sign in via 6-digit OTP</p>
          <div className="inline-flex rounded-md border border-[#C5D1B8] bg-[#E7ECE0] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => switchChannel('sms')}
              className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                otpChannel === 'sms' ? 'bg-[#FCFBF7] text-[#1F2A1C]' : 'text-[#4D5A48]'
              }`}
            >
              Mobile SMS
            </button>
            <button
              type="button"
              onClick={() => switchChannel('email')}
              className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                otpChannel === 'email' ? 'bg-[#FCFBF7] text-[#1F2A1C]' : 'text-[#4D5A48]'
              }`}
            >
              Email
            </button>
          </div>
        </div>

        {!otpSent ? (
          <form onSubmit={handleRequestOtp} className="space-y-3">
            {otpChannel === 'sms' ? (
              <input
                type="tel"
                required
                value={otpPhone}
                onChange={(e) => setOtpPhone(e.target.value)}
                placeholder="+91 98XXXXXXXX"
                aria-label="Mobile number"
                className="w-full px-3 py-2.5 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md text-[#1F2A1C] placeholder:text-[#4D5A48] tabular-nums"
              />
            ) : (
              <input
                type="email"
                required
                value={otpEmail}
                onChange={(e) => setOtpEmail(e.target.value)}
                placeholder="you@example.com"
                aria-label="Email address"
                className="w-full px-3 py-2.5 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md text-[#1F2A1C] placeholder:text-[#4D5A48]"
              />
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 px-4 rounded-md bg-[#E7ECE0] border border-[#C5D1B8] font-semibold text-sm text-[#1F2A1C] hover:bg-[#9CAF88] transition-colors min-h-[44px]"
            >
              {busy
                ? 'Sending...'
                : otpChannel === 'sms'
                  ? 'Send 6-Digit SMS Code'
                  : 'Send 6-Digit Email Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-3">
            {otpNotice && (
              <p className="text-xs text-[#4D5A48]">{otpNotice}</p>
            )}
            {previewOtp && (
              <p className="text-xs bg-[#E7ECE0] p-2.5 rounded border border-[#C5D1B8] text-[#1F2A1C]">
                Preview {otpChannel === 'sms' ? 'SMS' : 'OTP'} code:{' '}
                <strong className="font-mono">{previewOtp}</strong>
              </p>
            )}
            <input
              type="text"
              required
              maxLength={6}
              inputMode="numeric"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 6-digit code"
              aria-label="6-digit verification code"
              className="w-full px-3 py-2.5 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md font-mono text-[#1F2A1C]"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={busy}
                className="flex-1 py-2.5 px-4 rounded-md bg-[#9CAF88] text-[#1F2A1C] font-bold text-sm min-h-[44px]"
              >
                Verify &amp; Sign In
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleRequestOtp()}
                className="px-3 py-2.5 rounded-md bg-[#E7ECE0] border border-[#C5D1B8] text-xs font-semibold text-[#1F2A1C]"
              >
                Resend
              </button>
              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setOtpCode('');
                  setPreviewOtp('');
                  setOtpNotice('');
                }}
                className="px-3 py-2.5 rounded-md bg-[#E7ECE0] border border-[#C5D1B8] text-xs font-semibold text-[#1F2A1C]"
              >
                Change
              </button>
            </div>
          </form>
        )}
        {authError && (
          <p className="text-xs text-[#E8412C] bg-[#F7F5EF] border border-[#E8412C]/30 rounded px-3 py-2 mt-3">
            {authError}
          </p>
        )}
      </div>

      {onContinueAsGuest && (
        <div className="border-t border-[#CFD9C3] pt-4 text-center">
          <button
            type="button"
            onClick={onContinueAsGuest}
            className="text-sm font-semibold text-[#1F2A1C] underline hover:opacity-80 py-2 px-3"
          >
            Browse Storefront as Guest
          </button>
        </div>
      )}
    </div>
  );
}
