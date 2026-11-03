'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, User, AlertCircle, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';
import CinematicBeamLoader from '@/components/loading/CinematicBeamLoader';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  
  const [isLoading, setIsLoading] = useState(false);
  const [showCinematicLoader, setShowCinematicLoader] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);

  // Resend verification state
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
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
    if (!unconfirmedEmail || cooldown > 0 || isResending) return;
    setIsResending(true);
    setResendSuccess(null);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: unconfirmedEmail }),
      });
      const data = await res.json();
      setIsResending(false);

      if (!res.ok) {
        setErrorMessage(data.message || 'Failed to resend verification email.');
        if (data.remainingSeconds) {
          startCooldownTimer(data.remainingSeconds);
        }
      } else {
        setResendSuccess(data.message || 'Verification email resent.');
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
    setResendSuccess(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMessage('Please enter both your email ID and password.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password,
          rememberMe,
          isAdminPortal: false,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setIsLoading(false);
        const msg = data.message || 'Authentication failed. Please check your credentials.';
        setErrorMessage(msg);

        // Detect unconfirmed email to show single-click resend with cooldown
        if (msg.toLowerCase().includes('verify your email') || msg.toLowerCase().includes('not confirmed')) {
          setUnconfirmedEmail(cleanEmail);
        } else {
          setUnconfirmedEmail(null);
        }
        return;
      }

      // Successful authentication! Trigger cinematic beam animation transition
      setIsLoading(false);
      setShowCinematicLoader(true);

      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 2300);
    } catch {
      setIsLoading(false);
      setErrorMessage('A network error occurred. Please check your connection.');
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden bg-gradient-to-br from-[#120722] via-[#240b36] to-[#0d041a]">
      {/* Dynamic ambient lighting backdrop */}
      <div className="absolute inset-0 bg-radial-gradient from-purple-900/30 via-transparent to-black pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-600/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan-600/20 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Glassmorphic Login Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-[420px] rounded-[32px] p-8 md:p-10 border border-white/10 bg-white/[0.04] backdrop-blur-2xl shadow-2xl shadow-purple-950/50"
      >
        {/* Top Avatar Node */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-purple-500/20 via-pink-500/20 to-cyan-500/20 border border-white/20 flex items-center justify-center shadow-inner mb-4">
            <User className="w-10 h-10 text-white/80 stroke-[1.5]" />
          </div>
          <h1 className="text-2xl font-semibold tracking-wide text-white">Welcome Back</h1>
          <p className="text-sm text-purple-200/60 mt-1">AI Face Similarity Analyzer</p>
        </div>

        {/* Error Alert with Email Resend Support */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex flex-col gap-2"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <span className="text-xs text-red-200 leading-relaxed">{errorMessage}</span>
              </div>
              {unconfirmedEmail && (
                <div className="pt-2 border-t border-red-500/20 flex items-center justify-between">
                  <span className="text-[11px] text-purple-200/70">Didn't receive email?</span>
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={isResending || cooldown > 0}
                    className="text-xs font-medium text-cyan-300 hover:text-cyan-200 transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {isResending ? (
                      'Sending...'
                    ) : cooldown > 0 ? (
                      <>
                        <Clock className="w-3 h-3 animate-spin" />
                        Resend in {cooldown}s
                      </>
                    ) : (
                      'Resend Verification'
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {resendSuccess && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <span className="text-xs text-emerald-200 leading-relaxed">{resendSuccess}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email ID Field */}
          <div className="relative group">
            <div className="flex items-center gap-3 pb-2 border-b border-white/20 group-focus-within:border-cyan-400 transition-colors">
              <Mail className="w-5 h-5 text-white/50 group-focus-within:text-cyan-400 transition-colors" />
              <input
                type="email"
                placeholder="Email ID"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="email"
                className="w-full bg-transparent text-sm text-white placeholder-white/40 focus:outline-none"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="relative group">
            <div className="flex items-center gap-3 pb-2 border-b border-white/20 group-focus-within:border-cyan-400 transition-colors">
              <Lock className="w-5 h-5 text-white/50 group-focus-within:text-cyan-400 transition-colors" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
                className="w-full bg-transparent text-sm text-white placeholder-white/40 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-white/40 hover:text-white/80 transition-colors"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Options Row */}
          <div className="flex items-center justify-between text-xs text-white/70">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-white/10 text-cyan-400 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              Remember Me
            </label>
            <Link
              href="/forgot-password"
              className="text-purple-300 hover:text-cyan-300 transition-colors"
            >
              Forgot Password?
            </Link>
          </div>

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={isLoading || showCinematicLoader}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-500 hover:opacity-95 text-white font-medium text-sm tracking-wide shadow-lg shadow-purple-900/40 transition-all transform active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>AUTHENTICATING...</span>
              </>
            ) : (
              <span>LOGIN</span>
            )}
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="mt-8 text-center text-xs text-purple-200/50">
          Don't have an account?{' '}
          <Link href="/register" className="text-cyan-300 hover:underline font-medium">
            Register now
          </Link>
        </div>
      </motion.div>

      {/* Signature Cinematic Beam Loader Animation */}
      <AnimatePresence>
        {showCinematicLoader && (
          <CinematicBeamLoader
            message="Secure Session Verified"
            subMessage="Redirecting to AI Face Comparison Studio..."
          />
        )}
      </AnimatePresence>
    </div>
  );
}
