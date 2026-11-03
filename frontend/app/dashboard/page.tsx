'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, ScanFace, History, User, Shield, LogOut, 
  Sparkles, CheckCircle2, AlertCircle, FileText, Trash2, 
  Eye, RefreshCw, Key, Lock, ArrowRight, ShieldAlert, Cpu, X
} from 'lucide-react';

import Navbar from '@/components/ui/Navbar';
import ImageUploadCard from '@/components/comparison/ImageUploadCard';
import EqualizerBarsLoader from '@/components/loading/EqualizerBarsLoader';
import AnimatedCircularPercentage from '@/components/results/AnimatedCircularPercentage';
import AiDetectionModal from '@/components/comparison/AiDetectionModal';
import LogoutAnimationModal from '@/components/auth/LogoutAnimationModal';
import { generatePdfComparisonReport } from '@/components/results/PdfReportGenerator';

type TabType = 'overview' | 'compare' | 'history' | 'profile' | 'security';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabType) || 'overview';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // User state
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // History state
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Comparison State
  const [image1, setImage1] = useState<File | null>(null);
  const [image2, setImage2] = useState<File | null>(null);
  const [preview1, setPreview1] = useState<string | null>(null);
  const [preview2, setPreview2] = useState<string | null>(null);
  const [savePhotosConsent, setSavePhotosConsent] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [comparisonResult, setComparisonResult] = useState<any | null>(null);

  // AI Detection Modal State
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiFlaggedSlot, setAiFlaggedSlot] = useState<'IMAGE_1' | 'IMAGE_2' | null>(null);
  const [aiConfidence, setAiConfidence] = useState<number | undefined>(undefined);
  const [aiDetails, setAiDetails] = useState<string | undefined>(undefined);

  // Profile Edit State
  const [nameInput, setNameInput] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Logout Modal State
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Notification Banner
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      setUser(data.user);
      setNameInput(data.user.name);
      loadHistory();
    } catch (e) {
      router.push('/login');
    } finally {
      setLoadingUser(false);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        setHistoryList(data.history || []);
      }
    } catch (e) {
      console.warn('Failed to load history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Image Upload Handlers
  const handleImage1Select = (file: File) => {
    setImage1(file);
    setPreview1(URL.createObjectURL(file));
  };

  const handleImage2Select = (file: File) => {
    setImage2(file);
    setPreview2(URL.createObjectURL(file));
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

  // CHECK Comparison with AI Detection Screening
  const handleRunComparison = async () => {
    if (!image1 || !image2) {
      setBannerNotice('Please upload both Photograph 1 and Photograph 2 before checking similarity.');
      return;
    }

    setBannerNotice(null);
    setIsProcessing(true);
    setLoadingStage(0);

    const formData = new FormData();
    formData.append('image1', image1);
    formData.append('image2', image2);
    formData.append('consentGiven', savePhotosConsent ? 'true' : 'false');

    const stageInterval = setInterval(() => {
      setLoadingStage((prev) => (prev < 5 ? prev + 1 : prev));
    }, 700);

    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        body: formData,
      });

      clearInterval(stageInterval);
      const data = await res.json();

      if (!res.ok) {
        setIsProcessing(false);
        // Check if AI image was detected
        if (data.code === 'AI_GENERATED_IMAGE_DETECTED') {
          setAiFlaggedSlot(data.flaggedSlot);
          setAiConfidence(data.confidence);
          setAiDetails(data.details);
          setAiModalOpen(true);
          return;
        }

        setBannerNotice(data.message || 'Comparison failed.');
        return;
      }

      setLoadingStage(5);
      setTimeout(() => {
        setIsProcessing(false);
        setComparisonResult(data.data);
        loadHistory();
      }, 700);

    } catch (err) {
      clearInterval(stageInterval);
      setIsProcessing(false);
      setBannerNotice('Network error. Failed to complete comparison.');
    }
  };

  // Selective re-upload action for AI Detection Modal
  const handleAiModalReupload = (slot: 'IMAGE_1' | 'IMAGE_2') => {
    setAiModalOpen(false);
    if (slot === 'IMAGE_1') {
      handleRemoveImage1();
    } else {
      handleRemoveImage2();
    }
    setBannerNotice(`Please re-upload an authentic original ${slot === 'IMAGE_1' ? 'Photograph 1' : 'Photograph 2'}.`);
  };

  // Profile Name Update
  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    setIsSavingProfile(true);
    setProfileMessage(null);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameInput.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser((prev: any) => ({ ...prev, name: data.user.name }));
        setIsEditingName(false);
        setProfileMessage({ type: 'success', text: 'Your personal details have been updated.' });
      } else {
        setProfileMessage({ type: 'error', text: data.message || 'Failed to update name.' });
      }
    } catch (e) {
      setProfileMessage({ type: 'error', text: 'Network error updating name.' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);

    if (newPassword.length < 8) {
      setProfileMessage({ type: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setProfileMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setIsSavingProfile(true);

    try {
      const res = await fetch('/api/user/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setProfileMessage({ type: 'success', text: 'Your password has been changed successfully.' });
      } else {
        setProfileMessage({ type: 'error', text: data.message || 'Failed to update password.' });
      }
    } catch (e) {
      setProfileMessage({ type: 'error', text: 'Network error changing password.' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // History Delete
  const handleDeleteHistoryItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this comparison record and its retained photographs?')) return;
    try {
      const res = await fetch(`/api/history?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setHistoryList((prev) => prev.filter((item) => item.id !== id));
        setBannerNotice('Comparison record deleted.');
      }
    } catch (e) {
      console.warn(e);
    }
  };

  // Trigger Logout Animation
  const handleInitiateLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Logout API error:', e);
    }
    setShowLogoutModal(true);
  };

  // Navigation Items
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'compare', label: 'Face Comparison', icon: ScanFace },
    { id: 'history', label: 'Comparison History', icon: History, count: historyList.length },
    { id: 'profile', label: 'Personal Details', icon: User },
    { id: 'security', label: 'Security Settings', icon: Shield },
  ];

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-[#090514] flex items-center justify-center text-white">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          <span className="text-sm font-light">Loading User Dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090514] text-white flex flex-col">
      {/* Equalizer Wave Loading Screen */}
      <AnimatePresence>
        {isProcessing && <EqualizerBarsLoader currentStage={loadingStage} />}
      </AnimatePresence>

      {/* AI-Generated Image Detection Modal */}
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

      {/* Video-Inspired Logout Animation Modal */}
      <LogoutAnimationModal
        isOpen={showLogoutModal}
        isAdmin={false}
      />

      <Navbar user={user} />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
        {/* Left Sidebar Navigation */}
        <aside className="w-full md:w-64 shrink-0 space-y-6">
          {/* User mini card */}
          <div className="glass-card rounded-2xl p-5 border border-white/10 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-cyan-400 to-purple-600 flex items-center justify-center text-base font-semibold text-white shadow-md">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <h2 className="text-sm font-medium text-white truncate">{user?.name}</h2>
              <p className="text-[11px] text-white/50 truncate">{user?.email}</p>
            </div>
          </div>

          {/* Navigation tabs */}
          <nav className="glass-card rounded-2xl p-2.5 border border-white/10 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as TabType)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium tracking-wide transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-600/30 to-indigo-600/30 text-white border border-purple-500/30 shadow-sm'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-cyan-300" />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-white/70">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Logout button */}
            <div className="pt-2 mt-2 border-t border-white/10">
              <button
                onClick={handleInitiateLogout}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-medium text-red-300/80 hover:text-red-200 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4 text-red-400" />
                <span>Logout</span>
              </button>
            </div>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          {bannerNotice && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 text-xs flex items-center justify-between shadow-md"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>{bannerNotice}</span>
              </div>
              <button onClick={() => setBannerNotice(null)} className="text-white/50 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Welcome Banner */}
              <div className="glass-card rounded-[28px] p-8 border border-white/10 relative overflow-hidden">
                <div className="relative z-10 space-y-2 max-w-xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-medium">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Welcome back, {user?.name}</span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-light text-white">
                    Facial Biometrics & Similarity Overview
                  </h1>
                  <p className="text-xs md:text-sm text-white/60 font-light leading-relaxed">
                    Compare portraits, review historical congruence indices, and export cryptographic PDF verification reports.
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={() => setActiveTab('compare')}
                      className="px-6 py-2.5 rounded-full text-xs font-semibold tracking-wider uppercase text-white bg-gradient-to-r from-purple-600 to-indigo-600 shadow-md hover:opacity-95 transition-opacity"
                    >
                      Start New Comparison
                    </button>
                  </div>
                </div>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass-card rounded-2xl p-5 border border-white/10">
                  <div className="text-xs uppercase tracking-wider text-white/50">Total Analyses</div>
                  <div className="text-3xl font-semibold text-white mt-1">{historyList.length}</div>
                  <div className="text-[11px] text-cyan-300 mt-1">Processed securely</div>
                </div>

                <div className="glass-card rounded-2xl p-5 border border-white/10">
                  <div className="text-xs uppercase tracking-wider text-white/50">High Congruence Matches</div>
                  <div className="text-3xl font-semibold text-white mt-1">
                    {historyList.filter((h) => h.similarityCategory === 'High Similarity').length}
                  </div>
                  <div className="text-[11px] text-emerald-400 mt-1">ArcFace genuine pairs</div>
                </div>

                <div className="glass-card rounded-2xl p-5 border border-white/10">
                  <div className="text-xs uppercase tracking-wider text-white/50">Average Similarity</div>
                  <div className="text-3xl font-semibold text-white mt-1">
                    {historyList.length > 0
                      ? (historyList.reduce((acc, h) => acc + h.similarityScore, 0) / historyList.length).toFixed(1)
                      : '0'}%
                  </div>
                  <div className="text-[11px] text-purple-300 mt-1">Calibrated index mean</div>
                </div>
              </div>

              {/* Recent History Snippet */}
              <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Recent Comparisons</h3>
                  <button
                    onClick={() => setActiveTab('history')}
                    className="text-xs text-cyan-300 hover:text-cyan-200"
                  >
                    View All ({historyList.length})
                  </button>
                </div>

                {historyList.length === 0 ? (
                  <p className="text-xs text-white/45 italic">No comparisons recorded yet.</p>
                ) : (
                  <div className="divide-y divide-white/5 text-xs">
                    {historyList.slice(0, 4).map((rec) => (
                      <div key={rec.id} className="py-3 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-white text-sm">{rec.similarityScore}%</span>
                          <span className="ml-2 text-white/50 font-mono text-[11px]">
                            {new Date(rec.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-purple-500/15 text-purple-200 border border-purple-500/25">
                          {rec.similarityCategory}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: FACE COMPARISON */}
          {activeTab === 'compare' && (
            <div className="space-y-8">
              {!comparisonResult ? (
                <div className="space-y-6">
                  {/* Upload Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass-card rounded-[28px] p-6 border border-white/10">
                      <ImageUploadCard
                        label="Photograph 1"
                        sublabel="Reference portrait photo"
                        file={image1}
                        previewUrl={preview1}
                        onFileSelect={handleImage1Select}
                        onRemove={handleRemoveImage1}
                      />
                    </div>

                    <div className="glass-card rounded-[28px] p-6 border border-white/10">
                      <ImageUploadCard
                        label="Photograph 2"
                        sublabel="Target portrait photo"
                        file={image2}
                        previewUrl={preview2}
                        onFileSelect={handleImage2Select}
                        onRemove={handleRemoveImage2}
                      />
                    </div>
                  </div>

                  {/* Explicit User Consent for Private Photo Retention (Section 5) */}
                  <div className="glass-card rounded-2xl p-4 border border-white/10 flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="consentCheck"
                      checked={savePhotosConsent}
                      onChange={(e) => setSavePhotosConsent(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded bg-white/10 border-white/20 text-indigo-500 accent-indigo-600 cursor-pointer"
                    />
                    <label htmlFor="consentCheck" className="text-xs text-white/80 cursor-pointer select-none leading-relaxed">
                      <strong>Save my comparison photographs for future history and report downloads.</strong>
                      <span className="block text-white/50 text-[11px] mt-0.5">
                        When enabled, your photographs are stored in your private encrypted account storage and embedded in PDF certificates. When unchecked, images are permanently purged post-inference.
                      </span>
                    </label>
                  </div>

                  {/* CHECK Button */}
                  <div className="flex flex-col items-center justify-center pt-2">
                    <button
                      onClick={handleRunComparison}
                      disabled={!image1 || !image2 || isProcessing}
                      className="px-12 py-3.5 rounded-full text-white font-medium text-sm tracking-[0.2em] uppercase shadow-xl transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_25px_rgba(99,102,241,0.55)] active:scale-95"
                      style={{
                        background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)',
                      }}
                    >
                      CHECK SIMILARITY
                    </button>
                    <p className="text-[11px] text-white/45 mt-2.5">
                      Protected by real-time synthetic AI artifact screening and YuNet landmark detection
                    </p>
                  </div>
                </div>
              ) : (
                /* Results View with Circular Score & Photo Previews */
                <div className="space-y-6">
                  <div className="glass-card rounded-[32px] p-8 md:p-10 border border-white/10">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                      <div className="lg:col-span-5 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-white/10 pb-6 lg:pb-0 lg:pr-6">
                        <AnimatedCircularPercentage
                          score={comparisonResult.similarity_score}
                          category={comparisonResult.similarity_category}
                          size={260}
                        />
                        <div className="text-center mt-2 text-xs text-white/45 font-mono">
                          Raw Cosine: {comparisonResult.raw_cosine_similarity?.toFixed(4)}
                        </div>
                      </div>

                      <div className="lg:col-span-7 space-y-4">
                        <div className="flex items-center gap-3">
                          {preview1 && (
                            <img src={preview1} alt="P1" className="w-20 h-20 rounded-xl object-cover border border-white/20" />
                          )}
                          <span className="text-white/40 text-xs">vs</span>
                          {preview2 && (
                            <img src={preview2} alt="P2" className="w-20 h-20 rounded-xl object-cover border border-white/20" />
                          )}
                          <div className="pl-2">
                            <span className="text-xs text-emerald-400 font-medium block">Validated Authentic</span>
                            <span className="text-[11px] text-white/50">{comparisonResult.model_version}</span>
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-white/80 leading-relaxed">
                          {comparisonResult.calibrated_explanation}
                        </div>

                        <div className="flex flex-wrap gap-3 pt-2">
                          <button
                            onClick={() => {
                              generatePdfComparisonReport({
                                id: comparisonResult.id,
                                similarityScore: comparisonResult.similarity_score,
                                rawCosineScore: comparisonResult.raw_cosine_similarity,
                                similarityCategory: comparisonResult.similarity_category,
                                modelVersion: comparisonResult.model_version,
                                imageQuality: 'Optimal',
                                createdAt: comparisonResult.createdAt || new Date().toISOString(),
                                explanation: comparisonResult.calibrated_explanation,
                                userEmail: user?.email,
                                photo1Base64: comparisonResult.photo1DataUrl,
                                photo2Base64: comparisonResult.photo2DataUrl,
                              });
                            }}
                            className="px-6 py-2.5 rounded-full text-xs font-semibold tracking-wider uppercase bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 hover:bg-cyan-500/30 transition-colors flex items-center gap-2"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Download PDF Report</span>
                          </button>

                          <button
                            onClick={() => {
                              setComparisonResult(null);
                              handleRemoveImage1();
                              handleRemoveImage2();
                            }}
                            className="px-6 py-2.5 rounded-full text-xs font-medium tracking-wider uppercase bg-white/10 hover:bg-white/15 text-white transition-colors"
                          >
                            Compare Another Pair
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: COMPARISON HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-2">
                <div>
                  <h2 className="text-lg font-medium text-white">Comparison History</h2>
                  <p className="text-xs text-white/50">All previous facial similarity analyses and retained certificates</p>
                </div>
                {historyList.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm('Clear entire comparison history?')) {
                        fetch('/api/history', { method: 'DELETE' }).then(() => loadHistory());
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-lg text-xs text-red-300 hover:bg-red-500/15 border border-red-500/20 transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All</span>
                  </button>
                )}
              </div>

              {loadingHistory ? (
                <div className="p-8 text-center text-xs text-white/50">Loading records...</div>
              ) : historyList.length === 0 ? (
                <div className="glass-card rounded-2xl p-10 text-center text-white/50 space-y-3">
                  <History className="w-8 h-8 mx-auto text-white/30" />
                  <p className="text-xs">No comparisons recorded yet.</p>
                  <button
                    onClick={() => setActiveTab('compare')}
                    className="px-5 py-2 rounded-full bg-indigo-600 text-white text-xs font-medium uppercase"
                  >
                    Run First Comparison
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyList.map((rec) => {
                    const img1 = rec.retainedImages?.find((img: any) => img.slot === 'IMAGE_1');
                    const img2 = rec.retainedImages?.find((img: any) => img.slot === 'IMAGE_2');

                    return (
                      <div
                        key={rec.id}
                        className="glass-card rounded-2xl p-4 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3.5">
                          {/* Photo thumbnails if retained */}
                          {rec.hasRetainedImages && img1?.storageKey && img2?.storageKey ? (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <img src={img1.storageKey} alt="P1" className="w-11 h-11 rounded-lg object-cover border border-white/20" />
                              <img src={img2.storageKey} alt="P2" className="w-11 h-11 rounded-lg object-cover border border-white/20" />
                            </div>
                          ) : (
                            <div className="w-11 h-11 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-white/40">
                              Purged
                            </div>
                          )}

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-base font-semibold text-white">{rec.similarityScore}%</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-500/15 text-purple-200 border border-purple-500/25">
                                {rec.similarityCategory}
                              </span>
                            </div>
                            <div className="text-[11px] text-white/50 mt-0.5 font-mono">
                              {new Date(rec.createdAt).toLocaleDateString()} · Cosine: {rec.rawCosineScore?.toFixed(4)}
                            </div>
                          </div>
                        </div>

                        {/* Actions: Download Report with Both Photos, Delete */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const meta = rec.metadataJson ? JSON.parse(rec.metadataJson) : {};
                              generatePdfComparisonReport({
                                id: rec.id,
                                similarityScore: rec.similarityScore,
                                rawCosineScore: rec.rawCosineScore,
                                similarityCategory: rec.similarityCategory,
                                modelVersion: rec.modelVersion,
                                imageQuality: rec.imageQuality,
                                createdAt: rec.createdAt,
                                explanation: meta.calibrated_explanation || 'Calibrated biometric inference analysis.',
                                userEmail: user?.email,
                                photo1Base64: img1?.storageKey,
                                photo2Base64: img2?.storageKey,
                              });
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/15 text-cyan-200 border border-white/10 flex items-center gap-1.5 transition-colors"
                            title="Download PDF Certificate"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>PDF Report</span>
                          </button>

                          <button
                            onClick={() => handleDeleteHistoryItem(rec.id)}
                            className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PERSONAL DETAILS (EDIT PROFILE & PASSWORD) */}
          {activeTab === 'profile' && (
            <div className="space-y-6 max-w-2xl">
              {profileMessage && (
                <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2 border ${
                  profileMessage.type === 'success'
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
                    : 'bg-red-500/15 border-red-500/30 text-red-200'
                }`}>
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{profileMessage.text}</span>
                </div>
              )}

              {/* Edit Name Section */}
              <div className="glass-card rounded-[28px] p-6 md:p-8 border border-white/10 space-y-4">
                <h3 className="text-base font-medium text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-cyan-400" />
                  <span>Personal Details</span>
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-white/50 block mb-1">Email Address (Read-only)</label>
                    <input
                      type="text"
                      disabled
                      value={user?.email}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white/50 text-xs font-mono cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-white/50 block mb-1">Full Name</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        disabled={!isEditingName}
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        className={`flex-1 px-4 py-2.5 rounded-xl text-xs text-white border transition-colors ${
                          isEditingName
                            ? 'bg-white/10 border-cyan-400 focus:outline-none'
                            : 'bg-white/[0.03] border-white/10'
                        }`}
                      />
                      {isEditingName ? (
                        <>
                          <button
                            onClick={handleSaveName}
                            disabled={isSavingProfile}
                            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-medium text-white"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setNameInput(user?.name);
                              setIsEditingName(false);
                            }}
                            className="px-3 py-2 rounded-xl bg-white/10 text-xs text-white/70"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setIsEditingName(true)}
                          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Change Password Section */}
              <div className="glass-card rounded-[28px] p-6 md:p-8 border border-white/10 space-y-4">
                <h3 className="text-base font-medium text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-purple-400" />
                  <span>Update Password</span>
                </h3>

                <form onSubmit={handleChangePassword} className="space-y-3.5">
                  <div>
                    <label className="text-xs text-white/50 block mb-1">Current Password</label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-white/50 block mb-1">New Password</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-white/50 block mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="px-6 py-2.5 rounded-full text-xs font-semibold tracking-wider uppercase text-white bg-gradient-to-r from-purple-600 to-indigo-600 shadow-md hover:opacity-95"
                    >
                      {isSavingProfile ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 5: SECURITY SETTINGS */}
          {activeTab === 'security' && (
            <div className="space-y-6 max-w-2xl">
              <div className="glass-card rounded-[28px] p-6 md:p-8 border border-white/10 space-y-4">
                <h3 className="text-base font-medium text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <span>Security & Biometric Privacy Safeguards</span>
                </h3>

                <div className="space-y-3 text-xs text-white/70 leading-relaxed">
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
                    <strong className="text-white block mb-0.5">Ephemeral Memory Processing</strong>
                    Facial images are verified in-memory during inference and immediately purged unless you check the explicit retention box.
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
                    <strong className="text-white block mb-0.5">Session Authentication</strong>
                    Your session is protected with secure HTTP-only cookies and cryptographically signed JWT tokens.
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
                    <strong className="text-white block mb-0.5">Synthetic Media Shield</strong>
                    Automatic AI-generation screening prevents synthetic spoofing before facial embedding extraction.
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function UserDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#070311] flex items-center justify-center text-white">
        <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
