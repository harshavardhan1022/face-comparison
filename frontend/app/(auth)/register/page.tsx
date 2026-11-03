'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, CheckSquare, AlertCircle } from 'lucide-react';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (!termsAccepted) {
      setErrorMessage('Please accept the privacy policy and consent to facial processing.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          confirmPassword,
          termsAccepted,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setIsLoading(false);
        setErrorMessage(data.message || 'Registration failed.');
        return;
      }

      // Success, route to compare
      router.push('/compare');
      router.refresh();
    } catch (err) {
      setIsLoading(false);
      setErrorMessage('A network error occurred. Please check your connection.');
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden bg-[#090414]">
      {/* Background gradients */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 80% at 20% -10%, #3d0c2c 0%, #170929 45%, #080312 80%)',
        }}
      />
      <div 
        className="absolute w-[600px] h-[600px] rounded-full blur-[140px] pointer-events-none -bottom-20 -right-20 opacity-60"
        style={{
          background: 'radial-gradient(circle, rgba(14, 116, 144, 0.45) 0%, rgba(30, 27, 75, 0.2) 65%, transparent 100%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[460px] rounded-[36px] p-8 md:p-10 shadow-2xl backdrop-blur-2xl border border-white/10"
        style={{
          background: 'linear-gradient(145deg, rgba(46, 22, 69, 0.45) 0%, rgba(20, 11, 33, 0.65) 100%)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px -10px rgba(168, 85, 247, 0.15)',
        }}
      >
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center p-[2px] bg-gradient-to-tr from-cyan-400/40 via-purple-500/40 to-pink-500/40 shadow-[0_0_20px_rgba(168,85,247,0.25)]">
            <div className="w-full h-full rounded-full bg-[#1b0d2b] flex items-center justify-center border border-white/15">
              <User className="w-8 h-8 text-white/80" strokeWidth={1.5} />
            </div>
          </div>
          <h1 className="mt-3 text-xl font-medium text-white tracking-wide">
            Create Account
          </h1>
          <p className="text-xs text-white/50 tracking-wider uppercase mt-1">
            Join AI Facial Similarity Analyzer
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative group">
            <div className="absolute left-0 bottom-2.5 flex items-center pointer-events-none text-white/60 group-focus-within:text-cyan-400 transition-colors">
              <User className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full Name"
              required
              className="login-input-underline text-sm md:text-base font-light"
            />
          </div>

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

          <div className="relative group">
            <div className="absolute left-0 bottom-2.5 flex items-center pointer-events-none text-white/60 group-focus-within:text-cyan-400 transition-colors">
              <Lock className="w-5 h-5" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (minimum 8 characters)"
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
              placeholder="Confirm Password"
              required
              className="login-input-underline text-sm md:text-base font-light"
            />
          </div>

          <div className="pt-2">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-white/70 hover:text-white select-none">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded bg-white/10 border-white/20 text-indigo-500 accent-indigo-600 cursor-pointer"
              />
              <span>
                I agree to the Terms of Service, Privacy Policy, and consent to ephemeral facial similarity analysis. Photographs are purged post-inference.
              </span>
            </label>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-6 rounded-full text-white font-medium text-sm md:text-base tracking-widest uppercase transition-all duration-300 shadow-lg disabled:opacity-50 hover:shadow-[0_0_25px_rgba(99,102,241,0.55)] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(90deg, #4f46e5 0%, #7c3aed 50%, #2563eb 100%)',
              }}
            >
              {isLoading ? 'Creating Account...' : 'REGISTER'}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-white/10 text-center">
          <p className="text-xs text-white/60">
            Already registered?{' '}
            <Link href="/login" className="text-cyan-300 hover:text-cyan-200 font-medium ml-1">
              Log in here
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

