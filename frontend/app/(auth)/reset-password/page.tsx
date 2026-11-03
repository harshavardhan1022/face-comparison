'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!token) {
      setErrorMessage('Missing password reset token. Please request a new reset link.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setIsLoading(false);
        setErrorMessage(data.message || 'Failed to reset password.');
        return;
      }

      setIsLoading(false);
      setIsSuccess(true);
    } catch (err) {
      setIsLoading(false);
      setErrorMessage('Network connection error. Please try again.');
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden bg-[#090414]">
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 80% at 20% -10%, #3d0c2c 0%, #170929 45%, #080312 80%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-10 w-full max-w-[440px] rounded-[36px] p-8 md:p-10 shadow-2xl backdrop-blur-2xl border border-white/10"
        style={{
          background: 'linear-gradient(145deg, rgba(46, 22, 69, 0.45) 0%, rgba(20, 11, 33, 0.65) 100%)',
        }}
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center p-[2px] bg-gradient-to-tr from-cyan-400/40 via-purple-500/40 to-pink-500/40 shadow-[0_0_20px_rgba(168,85,247,0.25)]">
            <div className="w-full h-full rounded-full bg-[#1b0d2b] flex items-center justify-center border border-white/15">
              <Lock className="w-7 h-7 text-white/80" strokeWidth={1.5} />
            </div>
          </div>
          <h1 className="text-xl font-medium text-white tracking-wide">
            Create New Password
          </h1>
          <p className="text-xs text-white/50 mt-1">
            Choose a strong, secure password for your account
          </p>
        </div>

        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs flex items-center gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </motion.div>
        )}

        {isSuccess ? (
          <div className="space-y-4 text-center">
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs flex flex-col items-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              <p className="font-medium text-sm">Password Updated!</p>
              <p className="text-white/70">
                Your password has been securely updated. You can now log in with your new credentials.
              </p>
            </div>

            <Link
              href="/login"
              className="w-full py-3.5 px-6 rounded-full text-white font-medium text-xs tracking-widest uppercase transition-all duration-300 shadow-lg flex items-center justify-center gap-2 hover:shadow-[0_0_25px_rgba(99,102,241,0.55)]"
              style={{
                background: 'linear-gradient(90deg, #4f46e5 0%, #7c3aed 50%, #2563eb 100%)',
              }}
            >
              <span>Go to Login</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative group">
              <div className="absolute left-0 bottom-2.5 flex items-center pointer-events-none text-white/60 group-focus-within:text-cyan-400 transition-colors">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New Password (min 8 chars)"
                required
                className="login-input-underline text-sm md:text-base font-light pr-8"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1 bottom-2.5 text-white/50 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="relative group">
              <div className="absolute left-0 bottom-2.5 flex items-center pointer-events-none text-white/60 group-focus-within:text-cyan-400 transition-colors">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm New Password"
                required
                className="login-input-underline text-sm md:text-base font-light"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-6 rounded-full text-white font-medium text-sm tracking-widest uppercase transition-all duration-300 shadow-lg disabled:opacity-50 hover:shadow-[0_0_25px_rgba(99,102,241,0.55)]"
              style={{
                background: 'linear-gradient(90deg, #4f46e5 0%, #7c3aed 50%, #2563eb 100%)',
              }}
            >
              {isLoading ? 'Updating...' : 'UPDATE PASSWORD'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#090414] flex items-center justify-center text-white">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}

