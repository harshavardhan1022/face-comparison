'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, User, AlertCircle, ShieldAlert } from 'lucide-react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your email ID and password.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          rememberMe,
          isAdminPortal: false,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setIsLoading(false);
        setErrorMessage(data.message || 'Authentication failed. Please check your credentials.');
        return;
      }

      // Successful authentication! Trigger cinematic beam animation transition
      setIsLoading(false);
      setShowCinematicLoader(true);

      // Smoothly navigate to comparison dashboard after cinematic beam transition
      setTimeout(() => {
        router.push('/compare');
        router.refresh();
      }, 2300);

    } catch (err) {
      setIsLoading(false);
      setErrorMessage('Network connection error. Please try again.');
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden bg-[#090414]">
      {/* Cinematic Login Loading Animation (Triggered upon confirmed authentication) */}
      <AnimatePresence>
        {showCinematicLoader && (
          <CinematicBeamLoader
            message="Loading..."
            subMessage="Welcome back. Preparing your facial analysis workspace..."
          />
        )}
      </AnimatePresence>

      {/* Full-Screen Dark Gradient Background: Deep purple and burgundy with soft blue illumination on bottom-right */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 80% at 20% -10%, #3d0c2c 0%, #170929 45%, #080312 80%)',
        }}
      />
      {/* Soft blue illumination towards bottom-right */}
      <div 
        className="absolute w-[600px] h-[600px] rounded-full blur-[140px] pointer-events-none -bottom-20 -right-20 opacity-60"
        style={{
          background: 'radial-gradient(circle, rgba(14, 116, 144, 0.45) 0%, rgba(30, 27, 75, 0.2) 65%, transparent 100%)',
        }}
      />
      {/* Subtle top burgundy glow */}
      <div 
        className="absolute w-[500px] h-[400px] rounded-full blur-[120px] pointer-events-none -top-24 -left-10 opacity-50"
        style={{
          background: 'radial-gradient(circle, rgba(131, 24, 67, 0.4) 0%, transparent 70%)',
        }}
      />

      {/* Centered Glassmorphism Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[420px] rounded-[36px] p-8 md:p-10 shadow-2xl backdrop-blur-2xl border border-white/10"
        style={{
          background: 'linear-gradient(145deg, rgba(46, 22, 69, 0.45) 0%, rgba(20, 11, 33, 0.65) 100%)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px -10px rgba(168, 85, 247, 0.15)',
        }}
      >
        {/* Circular Profile / Avatar Placeholder at Top */}
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="relative w-20 h-20 rounded-full flex items-center justify-center p-[2px] bg-gradient-to-tr from-cyan-400/40 via-purple-500/40 to-pink-500/40 shadow-[0_0_20px_rgba(168,85,247,0.25)]">
            <div className="w-full h-full rounded-full bg-[#1b0d2b] flex items-center justify-center border border-white/15">
              <User className="w-10 h-10 text-white/80" strokeWidth={1.5} />
            </div>
          </div>
          <h1 className="mt-4 text-xl font-medium text-white tracking-wide">
            Account Login
          </h1>
          <p className="text-xs text-white/50 tracking-wider uppercase mt-1">
            AI Facial Similarity Analyzer
          </p>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs flex items-center gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email ID Field with Envelope Icon & Underline Style */}
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
              autoComplete="email"
              className="login-input-underline text-sm md:text-base font-light"
            />
          </div>

          {/* Password Field with Lock Icon, Eye Toggle & Underline Style */}
          <div className="relative group">
            <div className="absolute left-0 bottom-2.5 flex items-center pointer-events-none text-white/60 group-focus-within:text-cyan-400 transition-colors">
              <Lock className="w-5 h-5" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              autoComplete="current-password"
              className="login-input-underline text-sm md:text-base font-light pr-8"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-1 bottom-2.5 text-white/50 hover:text-white transition-colors focus:outline-none"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Remember Me Checkbox & Forgot Password Link */}
          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-white/70 hover:text-white select-none transition-colors">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded bg-white/10 border-white/20 text-indigo-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-indigo-600"
              />
              <span>Remember Me</span>
            </label>

            <Link
              href="/forgot-password"
              className="text-cyan-300/80 hover:text-cyan-200 transition-colors"
            >
              Forgot Password?
            </Link>
          </div>

          {/* Wide Rounded LOGIN Button: Deep purple to blue gradient, glow effect */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || showCinematicLoader}
              className="w-full py-3.5 px-6 rounded-full text-white font-medium text-sm md:text-base tracking-widest uppercase transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_25px_rgba(99,102,241,0.55)] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(90deg, #4f46e5 0%, #7c3aed 50%, #2563eb 100%)',
              }}
            >
              {isLoading ? 'Verifying...' : 'LOGIN'}
            </button>
          </div>
        </form>

        {/* Footer Links: Register & Admin Access */}
        <div className="mt-8 pt-4 border-t border-white/10 text-center space-y-3">
          <p className="text-xs text-white/60">
            Don't have an account?{' '}
            <Link href="/register" className="text-cyan-300 hover:text-cyan-200 font-medium ml-1">
              Register now
            </Link>
          </p>

          <div>
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-1.5 text-[11px] text-purple-300/60 hover:text-purple-200 transition-colors"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Administrative Portal Login</span>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

