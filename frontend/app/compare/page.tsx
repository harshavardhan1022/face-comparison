'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Shield, Scan, ArrowRight, Info, AlertCircle, FileText, Check, LayoutDashboard } from 'lucide-react';
import Navbar from '@/components/ui/Navbar';
import ImageUploadCard from '@/components/comparison/ImageUploadCard';
import EqualizerBarsLoader from '@/components/loading/EqualizerBarsLoader';
import AnimatedCircularPercentage from '@/components/results/AnimatedCircularPercentage';
import AiDetectionModal from '@/components/comparison/AiDetectionModal';
import { generatePdfComparisonReport } from '@/components/results/PdfReportGenerator';

export default function ComparePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; name: string; email: string; role: 'USER' | 'ADMIN' | 'SUPER_ADMIN' } | null>(null);
  
  // Image states
  const [image1, setImage1] = useState<File | null>(null);
  const [image2, setImage2] = useState<File | null>(null);
  const [preview1, setPreview1] = useState<string | null>(null);
  const [preview2, setPreview2] = useState<string | null>(null);
  const [savePhotosConsent, setSavePhotosConsent] = useState(false);

  // Processing & Loading States
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // AI Detection Modal State
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiFlaggedSlot, setAiFlaggedSlot] = useState<'IMAGE_1' | 'IMAGE_2' | null>(null);
  const [aiConfidence, setAiConfidence] = useState<number | undefined>(undefined);
  const [aiDetails, setAiDetails] = useState<string | undefined>(undefined);

  // Results State
  const [resultData, setResultData] = useState<any | null>(null);

  // Fetch current user session
  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        setUser(data.user);
      } catch (e) {
        router.push('/login');
      }
    }
    loadUser();
  }, [router]);

  const handleImage1Select = (file: File) => {
    setImage1(file);
    setPreview1(URL.createObjectURL(file));
    setErrorMessage(null);
  };

  const handleImage2Select = (file: File) => {
    setImage2(file);
    setPreview2(URL.createObjectURL(file));
    setErrorMessage(null);
  };

  const handleRemoveImage1 = () => {
    setImage1(null);
    if (preview1) URL.revokeObjectURL(preview1);
    setPreview1(null);
  };

  const handleRemoveImage2 = () => {
    setImage2(null);
    if (preview2) URL.revokeObjectURL(preview2);
    setPreview2(null);
  };

  const handleCheckComparison = async () => {
    if (!image1 || !image2) {
      setErrorMessage('Please upload both Photograph 1 and Photograph 2 before checking similarity.');
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);
    setLoadingStage(0);

    // Form data
    const formData = new FormData();
    formData.append('image1', image1);
    formData.append('image2', image2);
    formData.append('consentGiven', savePhotosConsent ? 'true' : 'false');

    // Stage progression timer
    const stageTimer = setInterval(() => {
      setLoadingStage((prev) => (prev < 5 ? prev + 1 : prev));
    }, 700);

    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      clearInterval(stageTimer);

      if (!res.ok) {
        setIsProcessing(false);
        // Catch AI-generated image detection
        if (json.code === 'AI_GENERATED_IMAGE_DETECTED') {
          setAiFlaggedSlot(json.flaggedSlot);
          setAiConfidence(json.confidence);
          setAiDetails(json.details);
          setAiModalOpen(true);
          return;
        }

        setErrorMessage(json.message || 'Facial comparison analysis failed.');
        return;
      }

      // Smooth completion
      setLoadingStage(5);
      setTimeout(() => {
        setIsProcessing(false);
        const data = json.data || json;
        setResultData(data);
      }, 800);

    } catch (err: any) {
      clearInterval(stageTimer);
      setIsProcessing(false);
      setErrorMessage('Failed to connect to comparison server. Please try again.');
    }
  };

  const handleAiModalReupload = (slot: 'IMAGE_1' | 'IMAGE_2') => {
    setAiModalOpen(false);
    if (slot === 'IMAGE_1') {
      handleRemoveImage1();
    } else {
      handleRemoveImage2();
    }
    setErrorMessage(`Please re-upload an authentic ${slot === 'IMAGE_1' ? 'Photograph 1' : 'Photograph 2'}.`);
  };

  const handleReset = () => {
    setResultData(null);
    handleRemoveImage1();
    handleRemoveImage2();
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#090514] text-white flex flex-col relative selection:bg-purple-500 selection:text-white">
      {/* Equalizer Bars Loading Screen (Triggered when user clicks CHECK) */}
      <AnimatePresence>
        {isProcessing && (
          <EqualizerBarsLoader currentStage={loadingStage} />
        )}
      </AnimatePresence>

      {/* Reference-Matched AI Detection Warning Modal */}
      <AiDetectionModal
        isOpen={aiModalOpen}
        flaggedSlot={aiFlaggedSlot}
        confidence={aiConfidence}
        details={aiDetails}
        onClose={() => setAiModalOpen(false)}
        onReupload={handleAiModalReupload}
        onCancel={() => {
          setAiModalOpen(false);
          setIsProcessing(false);
        }}
      />

      <Navbar user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex flex-col justify-between">
        {/* Top Header / Welcome Banner */}
        <div className="mb-8 md:mb-10 text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium tracking-wide shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            <span>Pretrained ArcFace & YuNet Inference Pipeline</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-light tracking-tight text-white">
            Facial Similarity Analysis
          </h1>
          <p className="text-sm md:text-base text-white/60 font-light leading-relaxed">
            Upload two high-resolution photographs to screen for AI artifacts, detect face landmarks, compute normalized ArcFace embeddings, and evaluate a calibrated similarity index.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 max-w-2xl mx-auto p-4 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-200 text-sm flex items-center gap-3 shadow-lg"
          >
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </motion.div>
        )}

        {/* Dynamic View: Comparison Form vs Results View */}
        {!resultData ? (
          <div className="space-y-8">
            {/* Dual Upload Cards Container */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
              {/* Photograph 1 Card */}
              <div className="glass-card rounded-[32px] p-6 lg:p-8 flex flex-col justify-between">
                <ImageUploadCard
                  label="Photograph 1"
                  sublabel="Reference portrait or ID photo"
                  file={image1}
                  previewUrl={preview1}
                  onFileSelect={handleImage1Select}
                  onRemove={handleRemoveImage1}
                />
              </div>

              {/* Photograph 2 Card */}
              <div className="glass-card rounded-[32px] p-6 lg:p-8 flex flex-col justify-between">
                <ImageUploadCard
                  label="Photograph 2"
                  sublabel="Target portrait for similarity test"
                  file={image2}
                  previewUrl={preview2}
                  onFileSelect={handleImage2Select}
                  onRemove={handleRemoveImage2}
                />
              </div>
            </div>

            {/* Explicit User Consent for Private Photo Retention (Section 5) */}
            <div className="glass-card rounded-2xl p-4 max-w-5xl mx-auto border border-white/10 flex items-start gap-3">
              <input
                type="checkbox"
                id="consentCompareCheck"
                checked={savePhotosConsent}
                onChange={(e) => setSavePhotosConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded bg-white/10 border-white/20 text-indigo-500 accent-indigo-600 cursor-pointer"
              />
              <label htmlFor="consentCompareCheck" className="text-xs text-white/80 cursor-pointer select-none leading-relaxed">
                <strong>Save my comparison photographs for future history and report downloads.</strong>
                <span className="block text-white/50 text-[11px] mt-0.5">
                  When enabled, your photographs are stored in your private encrypted account storage and embedded in PDF certificates. When unchecked, images are permanently purged post-inference.
                </span>
              </label>
            </div>

            {/* CHECK Button Section */}
            <div className="flex flex-col items-center justify-center pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCheckComparison}
                disabled={!image1 || !image2 || isProcessing}
                className="group relative px-12 py-4 rounded-full text-white font-medium text-base tracking-[0.2em] uppercase shadow-2xl transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden"
                style={{
                  background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)',
                  boxShadow: (!image1 || !image2) ? 'none' : '0 10px 30px -5px rgba(99, 102, 241, 0.5), 0 0 20px rgba(6, 182, 212, 0.3)',
                }}
              >
                <span className="relative z-10 flex items-center gap-3">
                  <Scan className="w-5 h-5 text-cyan-200 group-hover:rotate-12 transition-transform" />
                  <span>CHECK SIMILARITY</span>
                </span>
              </motion.button>

              <p className="mt-4 text-xs text-white/45 flex items-center gap-1.5 font-light">
                <Shield className="w-3.5 h-3.5 text-cyan-400/80" />
                <span>Zero retention guarantee: Uploads are permanently deleted after inference unless opted in</span>
              </p>
            </div>
          </div>
        ) : (
          /* Results View with Animated Circular Percentage (Section 8) */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-5xl mx-auto w-full space-y-8"
          >
            {/* Top Results Card */}
            <div className="glass-card rounded-[36px] p-8 md:p-12 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Circular Percentage Visualization */}
                <div className="lg:col-span-5 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-white/10 pb-8 lg:pb-0 lg:pr-8">
                  <AnimatedCircularPercentage
                    score={resultData.similarityScore ?? resultData.similarity_score ?? 0}
                    category={resultData.similarityCategory ?? resultData.similarity_category ?? 'Inconclusive'}
                    size={280}
                  />

                  <div className="text-center mt-2">
                    <p className="text-xs text-white/45 font-mono">
                      Raw Cosine: {(resultData.rawCosineScore ?? resultData.raw_cosine_similarity ?? 0)?.toFixed(4)}
                    </p>
                    <p className="text-[11px] text-white/40 mt-0.5">
                      Model: {resultData.modelVersion ?? resultData.model_version ?? 'SFace / YuNet'}
                    </p>
                  </div>
                </div>

                {/* Previews and Detailed Interpretation */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Thumbnails of both photos */}
                  <div className="flex items-center gap-4 justify-start">
                    <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-white/20 bg-black/40 shadow-md">
                      {(resultData.photo1Url || preview1) && (
                        <img src={resultData.photo1Url || preview1} alt="Photograph 1" className="w-full h-full object-cover" />
                      )}
                      <span className="absolute bottom-1 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-white/80">Photo 1</span>
                    </div>

                    <div className="text-white/40 text-sm font-light">vs</div>

                    <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-white/20 bg-black/40 shadow-md">
                      {(resultData.photo2Url || preview2) && (
                        <img src={resultData.photo2Url || preview2} alt="Photograph 2" className="w-full h-full object-cover" />
                      )}
                      <span className="absolute bottom-1 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-white/80">Photo 2</span>
                    </div>

                    <div className="pl-2">
                      <div className="text-xs text-white/50 uppercase tracking-wider font-mono">Status</div>
                      <div className="text-sm font-medium text-emerald-400 flex items-center gap-1 mt-0.5">
                        <Check className="w-4 h-4" /> Validated Authentic
                      </div>
                      <div className="text-xs text-white/40 mt-1">
                        Inference: {resultData.inferenceTimeMs ?? resultData.inference_time_ms ?? '--'} ms
                      </div>
                    </div>
                  </div>

                  {/* Scientific Explanation */}
                  <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
                    <div className="text-xs font-semibold text-cyan-300 tracking-wide uppercase flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" />
                      <span>Analysis Breakdown</span>
                    </div>
                    <p className="text-xs md:text-sm text-white/80 font-light leading-relaxed">
                      {resultData.explanation ?? resultData.calibrated_explanation ?? 'Facial similarity calculation complete.'}
                    </p>
                  </div>

                  {/* Quality Indicators */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                      <span className="text-white/50 block text-[10px] uppercase">Photo 1 Quality</span>
                      <span className="text-white font-medium">
                        {resultData.image1_analysis?.quality?.quality_label || 'Optimal'} ({resultData.image1_analysis?.quality?.overall_quality_score ?? 95})
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                      <span className="text-white/50 block text-[10px] uppercase">Photo 2 Quality</span>
                      <span className="text-white font-medium">
                        {resultData.image2_analysis?.quality?.quality_label || 'Optimal'} ({resultData.image2_analysis?.quality?.overall_quality_score ?? 95})
                      </span>
                    </div>
                  </div>

                  {/* Mandatory Identity Disclaimer */}
                  <div className="text-[11px] text-white/40 italic leading-normal">
                    * Scientific Note: This score represents calibrated biometric facial representation similarity based on ArcFace cosine metric distribution. It is an estimation measure and does not constitute conclusive legal proof of identity.
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons: Compare Again, Download PDF Report (with embedded photos!), View Dashboard */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <button
                onClick={handleReset}
                className="px-8 py-3 rounded-full text-sm font-medium tracking-wide bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg transition-all active:scale-95"
              >
                Compare Another Pair
              </button>

              <button
                onClick={() => {
                  generatePdfComparisonReport({
                    id: resultData.comparisonId || resultData.id || `SIM-${Date.now()}`,
                    similarityScore: resultData.similarityScore ?? resultData.similarity_score ?? 0,
                    rawCosineScore: resultData.rawCosineScore ?? resultData.raw_cosine_similarity ?? 0,
                    similarityCategory: resultData.similarityCategory ?? resultData.similarity_category ?? 'Inconclusive',
                    modelVersion: resultData.modelVersion ?? resultData.model_version ?? 'SFace / YuNet',
                    imageQuality: `${resultData.image1_analysis?.quality?.quality_label || 'Good'} / ${resultData.image2_analysis?.quality?.quality_label || 'Good'}`,
                    createdAt: resultData.createdAt || new Date().toISOString(),
                    explanation: resultData.explanation ?? resultData.calibrated_explanation ?? '',
                    userEmail: user?.email,
                    photo1Base64: resultData.photo1DataUrl || preview1 || undefined,
                    photo2Base64: resultData.photo2DataUrl || preview2 || undefined,
                  });
                }}
                className="px-7 py-3 rounded-full text-sm font-medium tracking-wide bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 border border-cyan-500/30 flex items-center gap-2 transition-all shadow-md active:scale-95"
              >
                <FileText className="w-4 h-4 text-cyan-300" />
                <span>Download PDF Report</span>
              </button>

              <button
                onClick={() => router.push('/dashboard?tab=history')}
                className="px-8 py-3 rounded-full text-sm font-medium tracking-wide bg-white/10 hover:bg-white/15 text-white border border-white/15 transition-all flex items-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4 text-cyan-300" />
                <span>Return to Dashboard</span>
              </button>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
