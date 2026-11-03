'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your email ID.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      setIsLoading(false);
      setSubmitted(true);
    } catch (err) {
      setIsLoading(false);
      setErrorMessage('Failed to connect to authentication server. Please try again.');
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
        className="relative z-10 w-full max-w-[420px] rounded-[36px] p-8 md:p-10 shadow-2xl backdrop-blur-2xl border border-white/10"
        style={{
          background: 'linear-gradient(145deg, rgba(46, 22, 69, 0.45) 0%, rgba(20, 11, 33, 0.65) 100%)',
        }}
      >
        <div className="text-center mb-6">
          <h1 className="text-xl font-medium text-white tracking-wide">
            Reset Password
          </h1>
          <p className="text-xs text-white/50 mt-1">
            Enter your email ID to receive verification instructions
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {submitted ? (
          <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs space-y-3 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <p>
              If an account with <strong>{email}</strong> exists, a single-use password-reset link has been dispatched to your email.
            </p>
            <p className="text-white/60 text-[11px]">
              Please check your inbox or spam folder. The link is valid for 1 hour.
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-block px-6 py-2 rounded-full bg-emerald-600 text-white font-medium text-xs uppercase"
              >
                Back to Login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative group">
              <div className="absolute left-0 bottom-2.5 flex items-center pointer-events-none text-white/60 group-focus-within:text-cyan-400 transition-colors">
                <Mail className="w-5 h-5" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email ID"
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
              {isLoading ? 'DISPATCHING...' : 'SEND RESET INSTRUCTIONS'}
            </button>
          </form>
        )}

        <div className="mt-8 pt-4 border-t border-white/10 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Login</span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
