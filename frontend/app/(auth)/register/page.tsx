'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState<string | null>(null);

  // Resend cooldown timer for email verification
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const startCooldownTimer = (seconds: number) => {
    setCooldown(seconds);
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResendVerification = async () => {
    if (!registeredEmail || cooldown > 0 || isResending) return;
    setIsResending(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registeredEmail }),
      });
      const data = await res.json();
      setIsResending(false);

      if (!res.ok) {
        setErrorMessage(data.message || 'Failed to resend verification email.');
        if (data.remainingSeconds) {
          startCooldownTimer(data.remainingSeconds);
        }
      } else {
        setRegistrationSuccess('Verification email sent again. Please check your inbox.');
        startCooldownTimer(data.cooldownSeconds || 120);
      }
    } catch {
      setIsResending(false);
      setErrorMessage('Network connection error while resending verification.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setErrorMessage(null);
    setRegistrationSuccess(null);

    const cleanEmail = email.trim();
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters.');
      return;
    }

    if (!termsAccepted) {
      setErrorMessage('Please accept the biometric privacy policy and terms of service.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: cleanEmail,
          password,
          confirmPassword,
          termsAccepted,
        }),
      });

      const data = await res.json();
      setIsLoading(false);

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || 'Registration failed.');
        return;
      }

      // Success
      setRegisteredEmail(cleanEmail);
      setRegistrationSuccess(
        data.message || 'Account created! You can sign in now. Check your inbox if email verification is required.'
      );
      startCooldownTimer(120); // 2 min cooldown matching server-side limit
    } catch {
      setIsLoading(false);
      setErrorMessage('A network error occurred. Please check your connection.');
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden bg-gradient-to-br from-[#120722] via-[#240b36] to-[#0d041a]">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-radial-gradient from-purple-900/30 via-transparent to-black pointer-events-none" />
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-purple-600/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-cyan-600/20 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Glassmorphic Register Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-[440px] rounded-[32px] p-8 md:p-10 border border-white/10 bg-white/[0.04] backdrop-blur-2xl shadow-2xl shadow-purple-950/50"
      >
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-500/20 via-pink-500/20 to-cyan-500/20 border border-white/20 flex items-center justify-center shadow-inner mb-3">
            <User className="w-8 h-8 text-white/80 stroke-[1.5]" />
          </div>
          <h1 className="text-2xl font-semibold tracking-wide text-white">Create Account</h1>
          <p className="text-xs text-purple-200/60 mt-1">Join AI Face Similarity Analyzer</p>
        </div>

        {/* Alerts */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <span className="text-xs text-red-200 leading-relaxed">{errorMessage}</span>
            </motion.div>
          )}

          {registrationSuccess && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col gap-2.5"
            >
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <span className="text-xs text-emerald-200 leading-relaxed">{registrationSuccess}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-emerald-500/20">
                <Link
                  href="/login"
                  className="text-xs font-semibold text-emerald-300 hover:text-emerald-200 underline"
                >
                  Proceed to Login &rarr;
                </Link>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={isResending || cooldown > 0}
                  className="text-[11px] font-medium text-cyan-300 hover:text-cyan-200 disabled:opacity-50 flex items-center gap-1"
                >
                  {isResending ? (
                    'Sending...'
                  ) : cooldown > 0 ? (
                    <>
                      <Clock className="w-3 h-3 animate-spin" />
                      Resend in {cooldown}s
                    </>
                  ) : (
                    'Resend Email'
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative group">
            <div className="flex items-center gap-3 pb-2 border-b border-white/20 group-focus-within:border-cyan-400 transition-colors">
              <User className="w-5 h-5 text-white/50 group-focus-within:text-cyan-400 transition-colors" />
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
                className="w-full bg-transparent text-sm text-white placeholder-white/40 focus:outline-none"
              />
            </div>
          </div>

          <div className="relative group">
            <div className="flex items-center gap-3 pb-2 border-b border-white/20 group-focus-within:border-cyan-400 transition-colors">
              <Mail className="w-5 h-5 text-white/50 group-focus-within:text-cyan-400 transition-colors" />
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="email"
                className="w-full bg-transparent text-sm text-white placeholder-white/40 focus:outline-none"
              />
            </div>
          </div>

          <div className="relative group">
            <div className="flex items-center gap-3 pb-2 border-b border-white/20 group-focus-within:border-cyan-400 transition-colors">
              <Lock className="w-5 h-5 text-white/50 group-focus-within:text-cyan-400 transition-colors" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password (min 8 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="new-password"
                className="w-full bg-transparent text-sm text-white placeholder-white/40 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-white/40 hover:text-white/80 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="relative group">
            <div className="flex items-center gap-3 pb-2 border-b border-white/20 group-focus-within:border-cyan-400 transition-colors">
              <Lock className="w-5 h-5 text-white/50 group-focus-within:text-cyan-400 transition-colors" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="new-password"
                className="w-full bg-transparent text-sm text-white placeholder-white/40 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-start gap-2.5 text-xs text-white/70 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-white/20 bg-white/10 text-cyan-400 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span>
                I agree to the Terms and consent to processing biometric facial similarity strictly for this analysis.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-6 mt-4 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-500 hover:opacity-95 text-white font-medium text-sm tracking-wide shadow-lg shadow-purple-900/40 transition-all transform active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>CREATING ACCOUNT...</span>
              </>
            ) : (
              <span>REGISTER</span>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-purple-200/50">
          Already registered?{' '}
          <Link href="/login" className="text-cyan-300 hover:underline font-medium">
            Sign In here
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
