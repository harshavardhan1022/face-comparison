'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface EqualizerBarsLoaderProps {
  currentStage?: number;
  stageName?: string;
}

const STAGES = [
  "Validating photographs...",
  "Detecting faces...",
  "Aligning facial landmarks...",
  "Extracting facial representations...",
  "Calculating similarity...",
  "Preparing results..."
];

export default function EqualizerBarsLoader({
  currentStage,
  stageName
}: EqualizerBarsLoaderProps) {
  const [internalStageIndex, setInternalStageIndex] = useState(0);

  // Auto-progress stages gracefully if parent doesn't provide real-time updates
  useEffect(() => {
    if (currentStage !== undefined) {
      setInternalStageIndex(Math.min(currentStage, STAGES.length - 1));
      return;
    }

    const interval = setInterval(() => {
      setInternalStageIndex((prev) => (prev < STAGES.length - 1 ? prev + 1 : prev));
    }, 650);

    return () => clearInterval(interval);
  }, [currentStage]);

  const activeMessage = stageName || STAGES[internalStageIndex];

  // 6 rounded bars with calibrated height ranges & animation delays
  const bars = [
    { heightRange: [24, 76, 24], duration: 1.1, delay: 0.0 },
    { heightRange: [42, 98, 42], duration: 1.3, delay: 0.15 },
    { heightRange: [72, 28, 72], duration: 1.0, delay: 0.3 },
    { heightRange: [32, 104, 32], duration: 1.25, delay: 0.2 },
    { heightRange: [88, 38, 88], duration: 1.15, delay: 0.35 },
    { heightRange: [28, 82, 28], duration: 1.05, delay: 0.1 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#1d0a2f] overflow-hidden"
    >
      {/* Deep purple gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#2a0d45] via-[#1b082e] to-[#0f041b] pointer-events-none" />

      {/* Soft ambient magenta glow in the center */}
      <div className="absolute w-96 h-96 bg-fuchsia-600/15 rounded-full blur-[110px] pointer-events-none" />

      {/* Centered Equalizer Wave Bars */}
      <div className="relative z-10 flex items-center justify-center gap-3 h-32 px-8">
        {bars.map((bar, i) => (
          <motion.div
            key={i}
            animate={{
              height: bar.heightRange,
            }}
            transition={{
              duration: bar.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: bar.delay,
            }}
            className="w-3 rounded-full bg-gradient-to-t from-fuchsia-600 via-pink-500 to-fuchsia-400 shadow-[0_0_20px_rgba(217,70,239,0.7)]"
            style={{ minHeight: '18px' }}
          />
        ))}
      </div>

      {/* Centered LOADING Typography (Soft Lavender, Spaced) */}
      <div className="relative z-10 mt-8 text-center space-y-3">
        <h2 className="text-xl md:text-2xl font-light text-[#e9d5ff] tracking-[0.35em] uppercase drop-shadow-[0_0_12px_rgba(233,213,255,0.4)]">
          LOADING
        </h2>

        {/* Dynamic Stage Progression Message */}
        <div className="h-6 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={activeMessage}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="text-xs md:text-sm font-light text-pink-200/80 tracking-wide"
            >
              {activeMessage}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Stage step indicators */}
        <div className="flex items-center justify-center gap-1.5 pt-2">
          {STAGES.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx <= internalStageIndex
                  ? 'w-6 bg-fuchsia-400 shadow-[0_0_6px_#d946ef]'
                  : 'w-1.5 bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

