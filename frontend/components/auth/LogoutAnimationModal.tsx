'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ShieldCheck } from 'lucide-react';

interface LogoutAnimationModalProps {
  isOpen: boolean;
  onComplete?: () => void;
  isAdmin?: boolean;
  onClose?: () => void;
}

export default function LogoutAnimationModal({
  isOpen,
  onComplete,
  isAdmin = false,
}: LogoutAnimationModalProps) {
  const router = useRouter();
  // Stages: 1 = Sphere, 2 = Orbit, 3 = Infinity, 4 = Confirmation
  const [stage, setStage] = useState<1 | 2 | 3 | 4>(1);
  const [countdown, setCountdown] = useState(4);

  const handleRedirect = useCallback(() => {
    if (onComplete) {
      onComplete();
    } else {
      router.push(isAdmin ? '/admin/login' : '/login');
      router.refresh();
    }
  }, [onComplete, isAdmin, router]);

  useEffect(() => {
    if (!isOpen) {
      setStage(1);
      setCountdown(4);
      return;
    }

    // Sequence timing matching reference video
    // Stage 1: Sphere (0s -> 1.5s)
    const t1 = setTimeout(() => setStage(2), 1500);

    // Stage 2: Orbit (1.5s -> 3.0s)
    const t2 = setTimeout(() => setStage(3), 3000);

    // Stage 3: Infinity (3.0s -> 4.8s)
    const t3 = setTimeout(() => setStage(4), 4800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isOpen]);

  // Countdown timer in stage 4
  useEffect(() => {
    if (stage !== 4) return;
    const interval = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [stage]);

  // Auto-redirect when countdown hits 0
  useEffect(() => {
    if (stage === 4 && countdown === 0) {
      handleRedirect();
    }
  }, [countdown, stage, handleRedirect]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#030108] text-white overflow-hidden select-none">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-radial-gradient from-[#0c051a] via-[#05010c] to-[#020005] pointer-events-none" />

      {/* Subtle deep blue ambient glow */}
      <div className="absolute w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Central Visual Transformation Canvas/SVG */}
      <div className="relative w-80 h-80 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {/* STAGE 1: Glowing Geometric Wireframe Sphere */}
          {stage === 1 && (
            <motion.div
              key="stage-sphere"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.15 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              className="relative w-44 h-44 flex items-center justify-center"
            >
              {/* Outer rotating dashed circles */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-full border border-cyan-400/40 border-dashed shadow-[0_0_25px_rgba(34,211,238,0.35)]"
              />

              {/* Tilted orbital ellipse 1 */}
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                className="absolute w-44 h-24 rounded-[100%] border border-cyan-300/50 shadow-[0_0_20px_rgba(34,211,238,0.4)]"
                style={{ transform: 'rotate(45deg)' }}
              />

              {/* Tilted orbital ellipse 2 */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
                className="absolute w-44 h-24 rounded-[100%] border border-indigo-400/50 shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                style={{ transform: 'rotate(-45deg)' }}
              />

              {/* Glowing center sphere core */}
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-400 via-white to-blue-500 blur-[1px] shadow-[0_0_35px_#22d3ee,0_0_60px_#818cf8]">
                <div className="w-full h-full rounded-full bg-white opacity-80" />
              </div>
            </motion.div>
          )}

          {/* STAGE 2: Circular Orbit with Moving Light Particle */}
          {stage === 2 && (
            <motion.div
              key="stage-orbit"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              className="relative w-56 h-56 flex items-center justify-center"
            >
              <svg width="220" height="220" viewBox="0 0 220 220" className="overflow-visible">
                {/* Thin glowing circular orbit ring */}
                <circle
                  cx="110"
                  cy="110"
                  r="90"
                  fill="none"
                  stroke="rgba(34, 211, 238, 0.35)"
                  strokeWidth="1.5"
                />
                <circle
                  cx="110"
                  cy="110"
                  r="90"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.7)"
                  strokeWidth="1"
                  strokeDasharray="25 150"
                  className="animate-spin"
                  style={{ animationDuration: '2s' }}
                />
              </svg>

              {/* Orbiting bright light particle */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="w-3.5 h-3.5 -translate-y-[90px] rounded-full bg-white shadow-[0_0_15px_#ffffff,0_0_25px_#22d3ee,0_0_40px_#38bdf8]" />
              </motion.div>

              {/* Soft center pulse */}
              <div className="w-8 h-8 rounded-full bg-cyan-400/20 blur-md" />
            </motion.div>
          )}

          {/* STAGE 3: Horizontal Infinity Loop (∞) with Orbiting Light Trail */}
          {stage === 3 && (
            <motion.div
              key="stage-infinity"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              className="relative w-80 h-44 flex items-center justify-center"
            >
              <svg
                width="300"
                height="150"
                viewBox="0 0 300 150"
                className="overflow-visible"
              >
                <defs>
                  <linearGradient id="infGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
                    <stop offset="50%" stopColor="#ffffff" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity="0.4" />
                  </linearGradient>

                  <filter id="infGlow" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#22d3ee" floodOpacity="0.6" />
                    <feDropShadow dx="0" dy="0" stdDeviation="14" floodColor="#818cf8" floodOpacity="0.4" />
                  </filter>
                </defs>

                {/* Lemniscate of Bernoulli / Smooth Infinity Path */}
                <path
                  d="M 150 75 C 190 25, 260 25, 260 75 C 260 125, 190 125, 150 75 C 110 25, 40 25, 40 75 C 40 125, 110 125, 150 75 Z"
                  fill="none"
                  stroke="rgba(34, 211, 238, 0.25)"
                  strokeWidth="2"
                />

                <motion.path
                  d="M 150 75 C 190 25, 260 25, 260 75 C 260 125, 190 125, 150 75 C 110 25, 40 25, 40 75 C 40 125, 110 125, 150 75 Z"
                  fill="none"
                  stroke="url(#infGrad)"
                  strokeWidth="2.5"
                  strokeDasharray="40 280"
                  filter="url(#infGlow)"
                  animate={{
                    strokeDashoffset: [-320, 0],
                  }}
                  transition={{
                    duration: 1.8,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                />
              </svg>
            </motion.div>
          )}

          {/* STAGE 4: Logout Confirmation Screen */}
          {stage === 4 && (
            <motion.div
              key="stage-confirmation"
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="flex flex-col items-center justify-center text-center space-y-5 px-6"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)]">
                <ShieldCheck className="w-8 h-8" strokeWidth={1.75} />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-2xl md:text-3xl font-light tracking-wide text-white">
                  Logged Out Successfully
                </h2>
                <p className="text-xs md:text-sm text-cyan-200/70 font-light tracking-wide">
                  Your session has ended securely. See you again!
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleRedirect}
                  className="px-8 py-3.5 rounded-full text-white font-medium text-xs md:text-sm tracking-widest uppercase transition-all duration-300 shadow-lg flex items-center gap-2 hover:shadow-[0_0_25px_rgba(99,102,241,0.55)] active:scale-95"
                  style={{
                    background: 'linear-gradient(90deg, #4f46e5 0%, #7c3aed 50%, #2563eb 100%)',
                  }}
                >
                  <span>Back to Login</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[11px] text-white/40 pt-1">
                Redirecting automatically in {countdown}s...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress Dots at Bottom */}
      {stage < 4 && (
        <div className="flex items-center gap-2 mt-6">
          <div className={`h-1.5 rounded-full transition-all duration-300 ${stage === 1 ? 'w-6 bg-cyan-400' : 'w-1.5 bg-white/20'}`} />
          <div className={`h-1.5 rounded-full transition-all duration-300 ${stage === 2 ? 'w-6 bg-cyan-400' : 'w-1.5 bg-white/20'}`} />
          <div className={`h-1.5 rounded-full transition-all duration-300 ${stage === 3 ? 'w-6 bg-cyan-400' : 'w-1.5 bg-white/20'}`} />
        </div>
      )}
    </div>
  );
}
