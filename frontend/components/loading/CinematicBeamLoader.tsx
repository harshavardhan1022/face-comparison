'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface CinematicBeamLoaderProps {
  message?: string;
  subMessage?: string;
}

export default function CinematicBeamLoader({
  message = "Loading...",
  subMessage = "Authenticating secure session and initializing workspace..."
}: CinematicBeamLoaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070311] overflow-hidden"
    >
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-radial-gradient from-[#1a0a33]/60 via-[#0a0418]/90 to-[#05020c] pointer-events-none" />

      {/* Subtle background glow spots */}
      <div className="absolute w-[600px] h-[300px] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none -top-20" />
      <div className="absolute w-[500px] h-[250px] bg-cyan-900/20 rounded-full blur-[100px] pointer-events-none -bottom-10" />

      {/* Main beam container */}
      <div className="relative w-full max-w-xl h-24 flex items-center justify-center px-6">
        {/* Soft background glow spreading horizontally */}
        <motion.div
          animate={{
            scaleX: [0.85, 1.15, 0.85],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute w-3/4 h-8 bg-gradient-to-r from-transparent via-indigo-600/50 to-transparent blur-2xl"
        />

        {/* Cyan illumination on the left and purple on the right */}
        <motion.div
          animate={{
            scaleX: [0.9, 1.1, 0.9],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 2.0,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute w-4/5 h-4 bg-gradient-to-r from-cyan-400 via-white to-purple-500 blur-md rounded-full"
        />

        {/* Sharp, bright glowing horizontal core beam */}
        <motion.div
          animate={{
            scaleX: [0.75, 1.05, 0.75],
            scaleY: [0.8, 1.25, 0.8],
          }}
          transition={{
            duration: 2.0,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="relative z-10 w-2/3 h-[3px] bg-gradient-to-r from-cyan-300 via-white to-purple-300 rounded-full shadow-[0_0_20px_#ffffff,0_0_35px_#22d3ee,0_0_50px_#a855f7]"
        />

        {/* White center flare */}
        <motion.div
          animate={{
            scale: [0.8, 1.3, 0.8],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute z-20 w-4 h-4 bg-white rounded-full blur-[2px] shadow-[0_0_15px_#ffffff]"
        />
      </div>

      {/* Centered Loading Text */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="mt-6 text-center space-y-2 z-10"
      >
        <p className="text-xl md:text-2xl font-light text-white tracking-[0.2em] uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">
          {message}
        </p>
        {subMessage && (
          <p className="text-xs md:text-sm text-cyan-200/60 font-light tracking-wide max-w-sm">
            {subMessage}
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}

