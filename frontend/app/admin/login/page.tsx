'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, AlertCircle, ArrowLeft } from 'lucide-react';
import CinematicBeamLoader from '@/components/loading/CinematicBeamLoader';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCinematicLoader, setShowCinematicLoader] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter administrative credentials.');
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
          rememberMe: false,
          isAdminPortal: true,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setIsLoading(false);
        setErrorMessage(data.message || 'Administrative authentication failed.');
        return;
      }

      setIsLoading(false);
      setShowCinematicLoader(true);

      setTimeout(() => {
        router.push('/admin/dashboard');
        router.refresh();
      }, 2300);

    } catch (err) {
      setIsLoading(false);
      setErrorMessage('Network connection error.');
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden bg-[#070311]">
      <AnimatePresence>
        {showCinematicLoader && (
          <CinematicBeamLoader
            message="Authenticating..."
            subMessage="Verifying administrative role permissions and audit telemetry..."
          />
        )}
      </AnimatePresence>

      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 80% at 50% -20%, #4a0429 0%, #1a082b 45%, #05020c 85%)',
        }}
      />
      <div 
        className="absolute w-[500px] h-[500px] rounded-full blur-[130px] pointer-events-none bottom-0 right-10 opacity-40"
        style={{
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.4) 0%, transparent 70%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-[420px] rounded-[36px] p-8 md:p-10 shadow-2xl backdrop-blur-2xl border border-red-500/20"
        style={{
          background: 'linear-gradient(145deg, rgba(50, 18, 54, 0.5) 0%, rgba(18, 8, 28, 0.75) 100%)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 30px -5px rgba(239, 68, 68, 0.15)',
        }}
      >
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="relative w-20 h-20 rounded-full flex items-center justify-center p-[2px] bg-gradient-to-tr from-red-500/50 via-purple-500/50 to-amber-500/50 shadow-[0_0_25px_rgba(239,68,68,0.3)]">
            <div className="w-full h-full rounded-full bg-[#1e0a24] flex items-center justify-center border border-red-500/30">
              <ShieldCheck className="w-10 h-10 text-red-400" strokeWidth={1.5} />
            </div>
          </div>
          <h1 className="mt-4 text-xl font-medium text-white tracking-wide">
            Admin Console
          </h1>
          <p className="text-xs text-red-300/70 tracking-widest uppercase mt-1">
            Restricted System Access
          </p>
        </div>

        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-200 text-xs flex items-center gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative group">
            <div className="absolute left-0 bottom-2.5 flex items-center pointer-events-none text-white/60 group-focus-within:text-red-400 transition-colors">
              <Mail className="w-5 h-5" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Admin Email"
              required
              className="login-input-underline text-sm md:text-base font-light"
            />
          </div>

          <div className="relative group">
            <div className="absolute left-0 bottom-2.5 flex items-center pointer-events-none text-white/60 group-focus-within:text-red-400 transition-colors">
              <Lock className="w-5 h-5" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin Password"
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

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || showCinematicLoader}
              className="w-full py-3.5 px-6 rounded-full text-white font-medium text-sm md:text-base tracking-widest uppercase transition-all duration-300 shadow-lg disabled:opacity-50 hover:shadow-[0_0_25px_rgba(220,38,38,0.5)] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(90deg, #b91c1c 0%, #7c2d12 50%, #6b21a8 100%)',
              }}
            >
              {isLoading ? 'Authenticating...' : 'ADMIN LOGIN'}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-4 border-t border-white/10 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to User Login</span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

