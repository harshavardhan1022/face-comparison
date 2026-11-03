'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cpu, AlertTriangle, RefreshCw, ArrowRight } from 'lucide-react';

interface AiDetectionModalProps {
  isOpen: boolean;
  flaggedSlot: 'IMAGE_1' | 'IMAGE_2' | null;
  confidence?: number;
  details?: string;
  onClose: () => void;
  onReupload: (slot: 'IMAGE_1' | 'IMAGE_2') => void;
  onCancel: () => void;
}

export default function AiDetectionModal({
  isOpen,
  flaggedSlot,
  confidence,
  details,
  onClose,
  onReupload,
  onCancel,
}: AiDetectionModalProps) {
  if (!isOpen || !flaggedSlot) return null;

  const slotName = flaggedSlot === 'IMAGE_1' ? 'Photograph 1' : 'Photograph 2';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window: Matches Exact Screenshot Reference */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-lg rounded-[32px] p-8 md:p-10 border border-cyan-500/30 text-white shadow-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(165deg, rgba(16, 10, 32, 0.95) 0%, rgba(8, 4, 18, 0.98) 100%)',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 45px -5px rgba(6, 182, 212, 0.3)',
          }}
        >
          {/* Subtle blue illumination in top center */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-36 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close button at top-right */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors focus:outline-none"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col items-center text-center space-y-4">
            {/* Glowing Circular AI Icon: Blue Microchip Symbol */}
            <div className="relative w-20 h-20 rounded-full flex items-center justify-center p-[2px] bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 shadow-[0_0_30px_rgba(34,211,238,0.5)]">
              <div className="w-full h-full rounded-full bg-[#0a0518] flex items-center justify-center border border-cyan-400/40">
                <Cpu className="w-10 h-10 text-cyan-300 animate-pulse" strokeWidth={1.75} />
              </div>
            </div>

            {/* Popup Heading */}
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
                AI Detected!
              </span>
              <h2 className="text-xl md:text-2xl font-light tracking-wide text-white">
                Analysis Complete: AI-Generated Content Identified
              </h2>
            </div>

            {/* Description */}
            <p className="text-xs md:text-sm text-white/70 font-light leading-relaxed max-w-md">
              The uploaded photograph appears to contain AI-generated or synthetically manipulated content. Please upload an original photograph to continue with facial similarity analysis.
            </p>

            {/* Specific Flagged Slot Badge */}
            <div className="w-full p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/25 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-cyan-300">
                <AlertTriangle className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Triggered by: <strong>{slotName}</strong></span>
              </div>
              {confidence && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200 font-mono text-[11px] border border-cyan-500/30">
                  {(confidence * 100).toFixed(1)}% synth confidence
                </span>
              )}
            </div>

            {details && (
              <p className="text-[11px] text-white/45 italic leading-normal text-left w-full px-1">
                Detection note: {details}
              </p>
            )}

            {/* Action Buttons */}
            <div className="w-full pt-4 space-y-3">
              {/* Primary: Re-upload Photo */}
              <button
                onClick={() => onReupload(flaggedSlot)}
                className="w-full py-3.5 px-6 rounded-full text-white font-medium text-sm tracking-widest uppercase transition-all duration-300 shadow-lg flex items-center justify-center gap-2 hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(90deg, #0284c7 0%, #06b6d4 50%, #3b82f6 100%)',
                }}
              >
                <RefreshCw className="w-4 h-4" />
                <span>Re-upload Photo</span>
              </button>

              {/* Secondary: Cancel Comparison */}
              <button
                onClick={onCancel}
                className="w-full py-2.5 text-xs text-white/60 hover:text-white transition-colors"
              >
                Cancel Comparison
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

