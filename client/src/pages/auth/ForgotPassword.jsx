// client/src/pages/auth/ForgotPassword.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useNotifications } from '../../contexts/NotificationContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import Logo from '../../components/ui/Logo';
import {
  Mail,
  Lock,
  Key,
  Check,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export function ForgotPassword() {
  const navigate = useNavigate();
  const { showError, showSuccess } = useNotifications();

  const [step, setStep] = useState('request'); // 'request' | 'verify_otp' | 'set_password'
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Check URL query parameters if launched via direct email link
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tokenParam = params.get('resetToken');
      const emailParam = params.get('email');
      if (tokenParam && emailParam) {
        setEmail(emailParam);
        setToken(tokenParam);
        setStep('set_password');
      } else if (emailParam) {
        setEmail(emailParam);
        setStep('verify_otp');
      }
    } catch (e) {}
  }, []);

  // Step 1: Request OTP by entering Email
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email) {
      showError('Please enter your registered corporate email address.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim() });
      showSuccess(res.message || 'Verification code sent to your email!');
      setStep('verify_otp');
    } catch (err) {
      showError(err.message || 'Failed to send reset email. Please verify your email.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP Only
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!token || token.trim().length !== 6) {
      showError('Please enter the 6-digit verification code sent to your email.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-reset-token', {
        email: email.trim(),
        token: token.trim()
      });
      showSuccess(res.message || 'Verification code confirmed!');
      setStep('set_password');
    } catch (err) {
      showError(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Set New Password Only
  const handlePerformReset = async (e) => {
    e.preventDefault();
    if (!newPassword) {
      showError('Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      showError('New password must be at least 6 characters in length.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showError('Passwords do not match. Please re-enter.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        email: email.trim(),
        token: token.trim(),
        new_password: newPassword
      });
      showSuccess(res.message || 'Password reset successfully! You can now log in.');
      navigate('/login');
    } catch (err) {
      showError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4 sm:p-6 lg:p-12 relative overflow-hidden">
      {/* Subtle ambient decorative gradient orbs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-400/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-teal-400/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg z-10">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/50 rounded-3xl border border-slate-200/80">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="flex justify-center mb-4">
              <Logo size="md" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {step === 'request' && 'Forgot Password'}
              {step === 'verify_otp' && 'Verify 6-Digit Code'}
              {step === 'set_password' && 'Set New Password'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {step === 'request' && 'Enter your registered corporate email to receive a 6-digit verification code.'}
              {step === 'verify_otp' && `Enter the 6-digit verification code sent to ${email}`}
              {step === 'set_password' && `Create a strong new password for ${email}`}
            </p>
          </div>

          {/* Step 1: Request OTP */}
          {step === 'request' && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl text-xs text-emerald-900 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <Key className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <p className="font-bold text-emerald-950">Password Recovery</p>
                  <p className="text-emerald-800 leading-relaxed">
                    Enter your email to receive a 6-digit OTP code directly in your inbox.
                  </p>
                </div>
              </div>

              <Input
                label="Corporate Email Address"
                type="email"
                required
                icon={Mail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. employee@peoplepay360.com"
              />

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={loading}
                  className="w-full font-semibold"
                  icon={<ArrowRight className="w-4 h-4 ml-1" />}
                >
                  Send Verification Code
                </Button>
              </div>

              <div className="pt-4 border-t border-slate-100 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Return to Sign In
                </Link>
              </div>
            </form>
          )}

          {/* Step 2: Verify OTP Only */}
          {step === 'verify_otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="p-3 bg-sky-50/70 border border-sky-200/80 rounded-xl text-xs text-sky-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>
                    Code sent to: <strong className="font-mono text-slate-900">{email}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('request')}
                  className="text-sky-700 hover:text-sky-900 text-[11px] font-semibold underline cursor-pointer"
                >
                  Change
                </button>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 text-center">
                  Enter 6-Digit Verification Code
                </label>
                <div className="flex justify-center">
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    required
                    value={token}
                    onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="w-48 text-center text-3xl font-mono font-black tracking-[0.35em] py-2.5 px-3 bg-white border-2 border-slate-300 rounded-xl shadow-xs focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-slate-900 placeholder:text-slate-300"
                  />
                </div>
                <p className="text-[11px] text-slate-400 text-center">
                  Please check your inbox (and spam folder) for the 6-digit OTP.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={loading}
                  className="w-full font-semibold"
                  icon={<ArrowRight className="w-4 h-4 ml-1" />}
                >
                  Verify Code & Continue
                </Button>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setStep('request')}
                  className="text-slate-500 hover:text-slate-800 font-medium inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Change Email
                </button>
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={loading}
                  className="text-emerald-700 hover:text-emerald-800 font-semibold"
                >
                  Resend Code
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Set New Password Only */}
          {step === 'set_password' && (
            <form onSubmit={handlePerformReset} className="space-y-4">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Code verified for <strong className="font-mono">{email}</strong>. Enter your new password below.
                </span>
              </div>

              <Input
                label="New Password"
                type="password"
                required
                icon={Lock}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
              />

              <Input
                label="Confirm New Password"
                type="password"
                required
                icon={Lock}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
              />

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={loading}
                  className="w-full font-semibold"
                  icon={<Check className="w-4 h-4 ml-1" />}
                >
                  Update Password & Return to Sign In
                </Button>
              </div>

              <div className="pt-4 border-t border-slate-100 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Cancel and Sign In
                </Link>
              </div>
            </form>
          )}

          {/* Footer Security Badge */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5 text-slate-500 font-normal">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Protected by Enterprise Role-Based Access Control
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
