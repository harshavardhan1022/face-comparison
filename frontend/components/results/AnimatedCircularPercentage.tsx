'use client';

import React, { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface AnimatedCircularPercentageProps {
  score: number; // Final calibrated score [0 - 100]
  category: string; // "High Similarity" | "Moderate Similarity" | "Low Similarity" | "Inconclusive"
  size?: number; // Outer diameter in pixels
  strokeWidth?: number;
}

export default function AnimatedCircularPercentage({
  score,
  category,
  size = 280,
  strokeWidth = 18,
}: AnimatedCircularPercentageProps) {
  const [displayScore, setDisplayScore] = useState(0);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Spring animation for smooth count-up
  const springScore = useSpring(0, {
    stiffness: 45,
    damping: 16,
    restDelta: 0.05,
  });

  const strokeDashoffset = useTransform(
    springScore,
    [0, 100],
    [circumference, circumference - (score / 100) * circumference]
  );

  useEffect(() => {
    springScore.set(score);
    const unsubscribe = springScore.on("change", (latest) => {
      setDisplayScore(Math.round(latest));
    });
    return () => unsubscribe();
  }, [score, springScore]);

  // Color scheme based on similarity category
  const getCategoryStyles = () => {
    switch (category) {
      case 'High Similarity':
        return {
          gradientId: 'grad-high',
          stop1: '#22d3ee', // Cyan
          stop2: '#a855f7', // Purple
          badgeBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
          glowColor: 'rgba(34, 211, 238, 0.45)',
        };
      case 'Moderate Similarity':
        return {
          gradientId: 'grad-mod',
          stop1: '#a855f7', // Purple
          stop2: '#f59e0b', // Amber
          badgeBg: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
          glowColor: 'rgba(245, 158, 11, 0.4)',
        };
      case 'Low Similarity':
        return {
          gradientId: 'grad-low',
          stop1: '#ec4899', // Pink
          stop2: '#6366f1', // Indigo
          badgeBg: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300',
          glowColor: 'rgba(236, 72, 153, 0.4)',
        };
      default:
        return {
          gradientId: 'grad-inc',
          stop1: '#94a3b8',
          stop2: '#64748b',
          badgeBg: 'bg-slate-500/15 border-slate-500/30 text-slate-300',
          glowColor: 'rgba(148, 163, 184, 0.3)',
        };
    }
  };

  const styles = getCategoryStyles();

  return (
    <div className="flex flex-col items-center justify-center p-6 select-none">
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90"
        >
          <defs>
            <linearGradient id={styles.gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={styles.stop1} />
              <stop offset="100%" stopColor={styles.stop2} />
            </linearGradient>

            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow
                dx="0"
                dy="0"
                stdDeviation="8"
                floodColor={styles.glowColor}
              />
            </filter>
          </defs>

          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />

          {/* Animated Indicator Stroke */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={`url(#${styles.gradientId})`}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            filter="url(#glow)"
          />
        </svg>

        {/* Centered Numerical Value & Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="flex items-baseline justify-center">
            <span className="text-6xl md:text-7xl font-light tracking-tight text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
              {displayScore}
            </span>
            <span className="text-2xl md:text-3xl font-light text-cyan-300 ml-1">
              %
            </span>
          </div>

          <span className="text-xs uppercase tracking-[0.25em] text-white/60 font-medium mt-1">
            Similarity
          </span>
        </div>
      </div>

      {/* Similarity Category Badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className={`mt-4 px-5 py-1.5 rounded-full border text-xs md:text-sm font-medium tracking-wide uppercase shadow-sm ${styles.badgeBg}`}
      >
        {category}
      </motion.div>
    </div>
  );
}

