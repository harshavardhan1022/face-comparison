'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, Users, Activity, Cpu, Lock, 
  CheckCircle, AlertCircle, RefreshCw, Eye, ShieldAlert,
  Sliders, Database, FileCheck, Download, Search, Filter,
  UserCheck, UserX, Clock, ChevronLeft, ChevronRight,
  HardDrive, Server, Key, LogOut, Sparkles, Layers,
  ExternalLink, BarChart2, Check, AlertTriangle
} from 'lucide-react';
import Navbar from '@/components/ui/Navbar';
import LogoutAnimationModal from '@/components/auth/LogoutAnimationModal';

type AdminTab = 'overview' | 'users' | 'audit' | 'model' | 'system' | 'profile' | 'settings';

function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as AdminTab) || 'overview';
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);

  const [adminUser, setAdminUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Overview & Stats
  const [stats, setStats] = useState<any>(null);

  // Users Management
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState('ALL');
  const [selectedUserToEdit, setSelectedUserToEdit] = useState<any | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditPagination, setAuditPagination] = useState({ page: 1, limit: 15, totalCount: 0, totalPages: 1 });
  const [auditSearch, setAuditSearch] = useState('');
  const [auditTypeFilter, setAuditTypeFilter] = useState('ALL');
  const [auditSeverityFilter, setAuditSeverityFilter] = useState('ALL');
  const [loadingAudit, setLoadingAudit] = useState(false);

  // System Health
  const [telemetry, setTelemetry] = useState<any>(null);
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);

  // Admin Profile Edit State
  const [profileName, setProfileName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileStatus, setProfileStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Security Settings
  const [securitySettings, setSecuritySettings] = useState({
    sessionTimeoutHours: 24,
    auditLogRetentionDays: 90,
    strictAiScreening: true,
    maxConcurrentInferences: 8,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Logout Modal
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      if (!data.authenticated || (data.user.role !== 'ADMIN' && data.user.role !== 'SUPER_ADMIN')) {
        router.push('/compare');
        return;
      }
      setAdminUser(data.user);
      setProfileName(data.user.name);

      await Promise.all([
        loadStats(),
        loadUsers(),
        loadAuditLogs(1),
        loadTelemetry(),
        loadSecuritySettings(),
      ]);
    } catch (err) {
      console.error(err);
      router.push('/admin/login');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Stats fetch error:', err);
    }
  };

  const loadUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (userSearch) params.set('search', userSearch);
      if (userRoleFilter !== 'ALL') params.set('role', userRoleFilter);
      if (userStatusFilter !== 'ALL') params.set('status', userStatusFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users || []);
      }
    } catch (err) {
      console.error('Users fetch error:', err);
    }
  };

  const loadAuditLogs = async (page: number = 1) => {
    setLoadingAudit(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
      });
      if (auditSearch) params.set('search', auditSearch);
      if (auditTypeFilter !== 'ALL') params.set('eventType', auditTypeFilter);
      if (auditSeverityFilter !== 'ALL') params.set('severity', auditSeverityFilter);

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
        if (data.pagination) setAuditPagination(data.pagination);
      }
    } catch (err) {
      console.error('Audit logs fetch error:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const loadTelemetry = async () => {
    setLoadingTelemetry(true);
    try {
      const res = await fetch('/api/admin/system');
      if (res.ok) {
        const data = await res.json();
        setTelemetry(data.telemetry);
      }
    } catch (err) {
      console.error('Telemetry fetch error:', err);
    } finally {
      setLoadingTelemetry(false);
    }
  };

  const loadSecuritySettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) setSecuritySettings(data.settings);
      }
    } catch (err) {
      console.error('Settings fetch error:', err);
    }
  };

  const handleRefreshAll = async () => {
    setRefreshing(true);
    await Promise.all([
      loadStats(),
      loadUsers(),
      loadAuditLogs(auditPagination.page),
      loadTelemetry(),
    ]);
    setRefreshing(false);
  };

  const handleUpdateUserStatus = async (userId: string, nextStatus: string) => {
    setActionFeedback(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setActionFeedback({ type: 'error', message: data.message || 'Failed to update user status.' });
        return;
      }
      setActionFeedback({ type: 'success', message: `User status changed to ${nextStatus}.` });
      loadUsers();
      loadStats();
    } catch (err) {
      setActionFeedback({ type: 'error', message: 'Network error updating user status.' });
    }
  };

  const handleUpdateUserRole = async (userId: string, nextRole: string) => {
    setActionFeedback(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: nextRole }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setActionFeedback({ type: 'error', message: data.message || 'Failed to update role.' });
        return;
      }
      setActionFeedback({ type: 'success', message: `User role updated to ${nextRole}.` });
      setSelectedUserToEdit(null);
      loadUsers();
      loadStats();
    } catch (err) {
      setActionFeedback({ type: 'error', message: 'Network error updating user role.' });
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileStatus(null);
    setSavingProfile(true);

    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileName }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setProfileStatus({ type: 'error', message: data.message || 'Profile update failed.' });
        return;
      }
      setProfileStatus({ type: 'success', message: 'Administrator profile details updated.' });
      setAdminUser({ ...adminUser, name: profileName });
    } catch (err) {
      setProfileStatus({ type: 'error', message: 'Failed to update admin profile.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileStatus(null);

    if (newPassword !== confirmPassword) {
      setProfileStatus({ type: 'error', message: 'New password and confirmation do not match.' });
      return;
    }

    if (newPassword.length < 8) {
      setProfileStatus({ type: 'error', message: 'New password must be at least 8 characters long.' });
      return;
    }

    setSavingProfile(true);
    try {
      const res = await fetch('/api/admin/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setProfileStatus({ type: 'error', message: data.message || 'Password update failed.' });
        return;
      }
      setProfileStatus({ type: 'success', message: 'Administrator password successfully updated.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setProfileStatus({ type: 'error', message: 'Network error changing password.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsFeedback(null);
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(securitySettings),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setSettingsFeedback({ type: 'error', message: data.message || 'Failed to save security settings.' });
        return;
      }
      setSettingsFeedback({ type: 'success', message: 'Security policies updated and active.' });
    } catch (err) {
      setSettingsFeedback({ type: 'error', message: 'Network error saving settings.' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleExportAuditCsv = () => {
    const params = new URLSearchParams({ format: 'csv' });
    if (auditSearch) params.set('search', auditSearch);
    if (auditTypeFilter !== 'ALL') params.set('eventType', auditTypeFilter);
    if (auditSeverityFilter !== 'ALL') params.set('severity', auditSeverityFilter);
    window.open(`/api/admin/audit-logs?${params.toString()}`, '_blank');
  };

  const modelEval = stats?.modelEvaluations?.[0];
  const evalMetrics = modelEval?.evaluationMetrics ? JSON.parse(modelEval.evaluationMetrics) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070311] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-red-500 animate-spin" />
          <p className="text-sm font-medium text-white/70">Initializing Administrative Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070311] text-white flex flex-col font-sans selection:bg-red-500/30 selection:text-white">
      <Navbar user={adminUser} />

      {/* Logout Modal */}
      <LogoutAnimationModal
        isOpen={showLogoutModal}
        isAdmin={true}
        onClose={() => setShowLogoutModal(false)}
      />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Admin Header Banner */}
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 border border-red-500/20 bg-gradient-to-r from-red-950/40 via-purple-950/20 to-[#0c0517] backdrop-blur-2xl shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold tracking-wider uppercase">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Restricted Administration</span>
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                <span className="text-white/60 lowercase font-mono">({adminUser?.role})</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-light tracking-wide text-white">
                Administrative Control & Model Telemetry
              </h1>
              <p className="text-xs text-white/60 max-w-2xl leading-relaxed">
                Biometric inference verification, role-based access control, security event auditing, and AI pipeline orchestration.
              </p>
            </div>

            <div className="flex items-center gap-3 self-start md:self-auto">
              <button
                onClick={handleRefreshAll}
                disabled={refreshing}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white flex items-center gap-2 transition-all border border-white/10 shadow-lg"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh Data</span>
              </button>

              <button
                onClick={() => setShowLogoutModal(true)}
                className="px-4 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-xs text-red-200 flex items-center gap-2 transition-all border border-red-500/30"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Admin Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl overflow-x-auto scrollbar-none">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'users', label: 'User Accounts & Roles', icon: Users },
            { id: 'audit', label: 'Security & Audit Trail', icon: Lock },
            { id: 'model', label: 'AI Model Monitoring', icon: Cpu },
            { id: 'system', label: 'System Health & Workers', icon: Server },
            { id: 'profile', label: 'Admin Profile', icon: UserCheck },
            { id: 'settings', label: 'Security Settings', icon: Sliders },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-red-600/80 to-purple-600/80 text-white shadow-lg border border-red-400/30'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-white/50'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ACTION FEEDBACK ALERT */}
        <AnimatePresence>
          {actionFeedback && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs border ${
                actionFeedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                  : 'bg-red-500/10 border-red-500/30 text-red-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {actionFeedback.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                )}
                <span>{actionFeedback.message}</span>
              </div>
              <button
                onClick={() => setActionFeedback(null)}
                className="text-white/50 hover:text-white"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ======================================================== */}
        {/* TAB 1: OVERVIEW */}
        {/* ======================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="glass-card rounded-2xl p-6 border border-white/10 hover:border-cyan-500/30 transition-all">
                <div className="flex items-center justify-between text-white/60 mb-3">
                  <span className="text-xs uppercase tracking-wider font-semibold">User Accounts</span>
                  <Users className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-3xl font-light text-white">
                  {stats?.stats?.totalUsers || 0}
                </div>
                <div className="flex items-center gap-3 text-[11px] mt-2 text-white/50">
                  <span className="text-emerald-400 font-medium">
                    {stats?.stats?.activeUsers || 0} Active
                  </span>
                  <span>•</span>
                  <span className="text-amber-400">
                    {stats?.stats?.inactiveUsers || 0} Inactive
                  </span>
                  <span>•</span>
                  <span className="text-red-400">
                    {stats?.stats?.suspendedUsers || 0} Suspended
                  </span>
                </div>
              </div>

              <div className="glass-card rounded-2xl p-6 border border-white/10 hover:border-purple-500/30 transition-all">
                <div className="flex items-center justify-between text-white/60 mb-3">
                  <span className="text-xs uppercase tracking-wider font-semibold">Total Comparisons</span>
                  <Activity className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-3xl font-light text-white">
                  {stats?.stats?.totalComparisons || 0}
                </div>
                <div className="text-[11px] text-purple-300/80 mt-2">
                  Average Calibrated Score: {stats?.stats?.averageSimilarityScore || 0}%
                </div>
              </div>

              <div className="glass-card rounded-2xl p-6 border border-white/10 hover:border-emerald-500/30 transition-all">
                <div className="flex items-center justify-between text-white/60 mb-3">
                  <span className="text-xs uppercase tracking-wider font-semibold">Inference Engine</span>
                  <Cpu className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-xl font-medium text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{telemetry?.aiInference?.status || 'HEALTHY'}</span>
                </div>
                <div className="text-[11px] text-white/50 mt-2 truncate">
                  {telemetry?.aiInference?.engine || 'OpenCV YuNet + SFace'}
                </div>
              </div>

              <div className="glass-card rounded-2xl p-6 border border-white/10 hover:border-red-500/30 transition-all">
                <div className="flex items-center justify-between text-white/60 mb-3">
                  <span className="text-xs uppercase tracking-wider font-semibold">AI Screening Flags</span>
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                </div>
                <div className="text-3xl font-light text-red-300">
                  {stats?.stats?.aiDetectedCount || 0}
                </div>
                <div className="text-[11px] text-white/50 mt-2">
                  Synthetic faces rejected by FFT screening
                </div>
              </div>
            </div>

            {/* Quick Actions & Recent Stream */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Activity Table */}
              <div className="lg:col-span-2 glass-card rounded-3xl p-6 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <span>Recent Facial Inferences</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('audit')}
                    className="text-xs text-cyan-300 hover:underline flex items-center gap-1"
                  >
                    <span>View all logs</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-white/40 uppercase">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">User</th>
                        <th className="py-2.5 px-3 text-center">Score</th>
                        <th className="py-2.5 px-3 text-center">Verdict</th>
                        <th className="py-2.5 px-3 text-right">Consent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-white/70">
                      {(stats?.recentComparisons || []).slice(0, 6).map((c: any) => (
                        <tr key={c.id} className="hover:bg-white/[0.02]">
                          <td className="py-2.5 px-3 text-white/50">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-white/90">
                            {c.user?.email || 'Anonymous'}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-semibold text-cyan-300">
                            {Math.round(c.similarityScore)}%
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              c.verdict === 'HIGH_SIMILARITY'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : c.verdict === 'MODERATE_SIMILARITY'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-white/10 text-white/60'
                            }`}>
                              {c.verdict}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {c.consentGiven ? (
                              <span className="text-emerald-400 text-[10px] font-medium">Retained</span>
                            ) : (
                              <span className="text-white/30 text-[10px]">Purged</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Security Health Summary */}
              <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Security Telemetry</span>
                  </h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-white/60">Strict AI Screening</span>
                      <span className="text-emerald-400 font-semibold">Enabled (2D FFT)</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-white/60">Database Ping Latency</span>
                      <span className="text-cyan-300 font-mono">{telemetry?.database?.latencyMs || 0.4} ms</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-white/60">Worker Concurrency</span>
                      <span className="text-purple-300 font-mono">
                        {telemetry?.aiInference?.queue?.active_workers || 0} active / {securitySettings.maxConcurrentInferences} max
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-white/60">Session Timeout</span>
                      <span className="text-white font-mono">{securitySettings.sessionTimeoutHours} hrs</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('settings')}
                  className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white transition-all text-center border border-white/10"
                >
                  Adjust Security Policies
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: USER ACCOUNT MANAGEMENT & ROLES */}
        {/* ======================================================== */}
        {activeTab === 'users' && (
          <div className="glass-card rounded-3xl p-6 lg:p-8 border border-white/10 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-light text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" />
                  <span>User Account Lifecycle & Role Management</span>
                </h2>
                <p className="text-xs text-white/50">
                  Manage user authentication states, grant administrative privileges, and monitor account activity.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                    placeholder="Search name or email..."
                    className="pl-9 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none focus:border-cyan-400 w-48 sm:w-56"
                  />
                </div>

                <select
                  value={userRoleFilter}
                  onChange={(e) => { setUserRoleFilter(e.target.value); setTimeout(loadUsers, 50); }}
                  className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="ALL" className="bg-[#10081d]">All Roles</option>
                  <option value="USER" className="bg-[#10081d]">USER</option>
                  <option value="ADMIN" className="bg-[#10081d]">ADMIN</option>
                  <option value="SUPER_ADMIN" className="bg-[#10081d]">SUPER_ADMIN</option>
                </select>

                <select
                  value={userStatusFilter}
                  onChange={(e) => { setUserStatusFilter(e.target.value); setTimeout(loadUsers, 50); }}
                  className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="ALL" className="bg-[#10081d]">All Statuses</option>
                  <option value="ACTIVE" className="bg-[#10081d]">ACTIVE</option>
                  <option value="INACTIVE" className="bg-[#10081d]">INACTIVE</option>
                  <option value="SUSPENDED" className="bg-[#10081d]">SUSPENDED</option>
                </select>

                <button
                  onClick={loadUsers}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-white/40 uppercase tracking-wider">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Comparisons</th>
                    <th className="py-3 px-4">Last Login</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white/80">
                  {usersList.map((u) => {
                    const isSelf = u.id === adminUser.id;
                    const isSuperAdminTarget = u.role === 'SUPER_ADMIN';
                    const canEdit = !isSelf && (adminUser.role === 'SUPER_ADMIN' || !isSuperAdminTarget);

                    return (
                      <tr key={u.id} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-4">
                          <div className="font-medium text-white flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {isSelf && (
                              <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[9px] uppercase font-semibold">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-white/40">{u.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            u.role === 'SUPER_ADMIN'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : u.role === 'ADMIN'
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                              : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                            u.status === 'ACTIVE'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : u.status === 'INACTIVE'
                              ? 'bg-white/10 text-white/60'
                              : 'bg-red-500/20 text-red-300'
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-medium">
                          {u._count?.comparisons || 0}
                        </td>
                        <td className="py-3 px-4 text-white/50">
                          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="py-3 px-4 text-white/50">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {canEdit ? (
                              <>
                                <button
                                  onClick={() => setSelectedUserToEdit(u)}
                                  className="px-2.5 py-1 rounded-lg text-[11px] bg-white/10 hover:bg-white/20 text-white transition-colors"
                                >
                                  Edit Role
                                </button>

                                <button
                                  onClick={() => handleUpdateUserStatus(u.id, u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                                    u.status === 'ACTIVE'
                                      ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300'
                                      : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300'
                                  }`}
                                >
                                  {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                                </button>
                              </>
                            ) : (
                              <span className="text-[11px] text-white/30 italic">Protected</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Role Change Modal */}
            <AnimatePresence>
              {selectedUserToEdit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="w-full max-w-md rounded-2xl p-6 bg-[#160c24] border border-white/15 space-y-4 shadow-2xl"
                  >
                    <h3 className="text-base font-medium text-white flex items-center gap-2">
                      <Key className="w-4 h-4 text-amber-400" />
                      <span>Modify User Role</span>
                    </h3>
                    <p className="text-xs text-white/60">
                      Changing role for <span className="font-semibold text-white">{selectedUserToEdit.name}</span> ({selectedUserToEdit.email}).
                    </p>

                    <div className="space-y-2 pt-2">
                      {['USER', 'ADMIN', ...(adminUser.role === 'SUPER_ADMIN' ? ['SUPER_ADMIN'] : [])].map((roleOption) => (
                        <button
                          key={roleOption}
                          onClick={() => handleUpdateUserRole(selectedUserToEdit.id, roleOption)}
                          className={`w-full p-3 rounded-xl text-left text-xs flex items-center justify-between border transition-all ${
                            selectedUserToEdit.role === roleOption
                              ? 'bg-red-500/20 border-red-500/40 text-white font-medium'
                              : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                          }`}
                        >
                          <div>
                            <div className="font-semibold">{roleOption}</div>
                            <div className="text-[10px] text-white/40">
                              {roleOption === 'SUPER_ADMIN'
                                ? 'Full systemic access & role elevation authority'
                                : roleOption === 'ADMIN'
                                ? 'Telemetry, user management, and audit trail'
                                : 'Standard face comparison and history'}
                            </div>
                          </div>
                          {selectedUserToEdit.role === roleOption && (
                            <Check className="w-4 h-4 text-emerald-400" />
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="flex justify-end pt-3">
                      <button
                        onClick={() => setSelectedUserToEdit(null)}
                        className="px-4 py-2 rounded-xl bg-white/10 text-xs text-white hover:bg-white/15"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: SECURITY & AUDIT TRAIL */}
        {/* ======================================================== */}
        {activeTab === 'audit' && (
          <div className="glass-card rounded-3xl p-6 lg:p-8 border border-white/10 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-light text-white flex items-center gap-2">
                  <Lock className="w-5 h-5 text-amber-400" />
                  <span>Security & Inference Audit Trail</span>
                </h2>
                <p className="text-xs text-white/50">
                  Immutable security event record tracking authentication, administrative changes, and AI inference executions.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="text"
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadAuditLogs(1)}
                    placeholder="Search logs..."
                    className="pl-9 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none focus:border-amber-400 w-44"
                  />
                </div>

                <select
                  value={auditTypeFilter}
                  onChange={(e) => { setAuditTypeFilter(e.target.value); setTimeout(() => loadAuditLogs(1), 50); }}
                  className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none"
                >
                  <option value="ALL" className="bg-[#10081d]">All Event Types</option>
                  <option value="AUTH" className="bg-[#10081d]">AUTH</option>
                  <option value="ADMIN" className="bg-[#10081d]">ADMIN</option>
                  <option value="SECURITY" className="bg-[#10081d]">SECURITY</option>
                  <option value="INFERENCE" className="bg-[#10081d]">INFERENCE</option>
                </select>

                <select
                  value={auditSeverityFilter}
                  onChange={(e) => { setAuditSeverityFilter(e.target.value); setTimeout(() => loadAuditLogs(1), 50); }}
                  className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none"
                >
                  <option value="ALL" className="bg-[#10081d]">All Severities</option>
                  <option value="INFO" className="bg-[#10081d]">INFO</option>
                  <option value="WARN" className="bg-[#10081d]">WARN</option>
                  <option value="ERROR" className="bg-[#10081d]">ERROR</option>
                </select>

                <button
                  onClick={handleExportAuditCsv}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs flex items-center gap-1.5 border border-amber-500/30 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Audit Logs Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-white/10 text-white/40 uppercase">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Severity</th>
                    <th className="py-2.5 px-3">User</th>
                    <th className="py-2.5 px-3">IP Address</th>
                    <th className="py-2.5 px-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white/70">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3 text-white/45 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-cyan-300 font-semibold">
                        {log.action}
                      </td>
                      <td className="py-2.5 px-3 text-purple-300">
                        {log.eventType}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          log.severity === 'WARN' || log.severity === 'WARNING'
                            ? 'bg-amber-500/20 text-amber-300'
                            : log.severity === 'ERROR'
                            ? 'bg-red-500/20 text-red-300'
                            : 'bg-white/10 text-white/60'
                        }`}>
                          {log.severity || 'INFO'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-white/90">
                        {log.user?.email || 'SYSTEM'}
                      </td>
                      <td className="py-2.5 px-3 text-white/40">
                        {log.ipAddress || '127.0.0.1'}
                      </td>
                      <td className="py-2.5 px-3 text-white/50 max-w-xs truncate" title={log.details}>
                        {log.details || '-'}
                      </td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-white/40 italic">
                        No audit records found matching criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10 text-xs text-white/60">
              <div>
                Showing {(auditPagination.page - 1) * auditPagination.limit + 1} to{' '}
                {Math.min(auditPagination.page * auditPagination.limit, auditPagination.totalCount)} of{' '}
                {auditPagination.totalCount} records
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadAuditLogs(auditPagination.page - 1)}
                  disabled={auditPagination.page <= 1 || loadingAudit}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <span className="font-mono px-2">
                  {auditPagination.page} / {auditPagination.totalPages || 1}
                </span>

                <button
                  onClick={() => loadAuditLogs(auditPagination.page + 1)}
                  disabled={auditPagination.page >= auditPagination.totalPages || loadingAudit}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: AI MODEL MONITORING */}
        {/* ======================================================== */}
        {activeTab === 'model' && (
          <div className="space-y-6">
            {/* LFW Benchmark Card */}
            <div className="glass-card rounded-3xl p-6 lg:p-8 border border-white/10 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-light text-white flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-emerald-400" />
                    <span>LFW (Labeled Faces in the Wild) Empirical Benchmark</span>
                  </h2>
                  <p className="text-xs text-white/50">
                    Rigorous verification metrics on identity-disjoint test split under 10-fold cross validation.
                  </p>
                </div>
                <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
                  Engine: SFace ArcFace 128D
                </div>
              </div>

              {evalMetrics && (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                  {[
                    { label: 'Accuracy', val: `${(evalMetrics.accuracy * 100).toFixed(2)}%`, col: 'text-emerald-400' },
                    { label: 'ROC-AUC', val: evalMetrics.roc_auc.toFixed(4), col: 'text-cyan-400' },
                    { label: 'Precision', val: `${(evalMetrics.precision * 100).toFixed(2)}%`, col: 'text-white' },
                    { label: 'Recall', val: `${(evalMetrics.recall * 100).toFixed(2)}%`, col: 'text-white' },
                    { label: 'EER', val: `${(evalMetrics.eer * 100).toFixed(2)}%`, col: 'text-amber-400' },
                    { label: 'FAR', val: `${(evalMetrics.far * 100).toFixed(2)}%`, col: 'text-purple-300' },
                    { label: 'FRR', val: `${(evalMetrics.frr * 100).toFixed(2)}%`, col: 'text-pink-300' },
                    { label: 'TAR', val: `${(evalMetrics.tar * 100).toFixed(2)}%`, col: 'text-emerald-300' },
                  ].map((m, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 text-center space-y-1">
                      <span className="text-[10px] text-white/50 uppercase tracking-wider block">{m.label}</span>
                      <span className={`text-base font-semibold ${m.col}`}>{m.val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Threshold Calibration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-400" />
                  <span>Sigmoid Calibration Parameters</span>
                </h3>
                <p className="text-xs text-white/50">
                  Raw cosine similarity values are mapped non-linearly to an intuitive 0–100 calibrated facial similarity index:
                </p>

                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 font-mono text-xs text-cyan-300">
                  F(S) = 100 / (1 + exp(-k * (S - τ)))
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-white/60">Slope Steepness (k)</span>
                    <span className="font-mono text-white">8.5</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-white/60">Midpoint Offset (τ)</span>
                    <span className="font-mono text-white">0.380 (EER Threshold)</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-white/60">Identity Match Threshold</span>
                    <span className="font-mono text-emerald-400">≥ 65.0%</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-white/60">Definitive Identity Match</span>
                    <span className="font-mono text-emerald-300">≥ 80.0%</span>
                  </div>
                </div>
              </div>

              {/* AI-Generated Image Screening Telemetry */}
              <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  <span>Synthetic Image Screening Pipeline</span>
                </h3>
                <p className="text-xs text-white/50">
                  Every uploaded photograph undergoes 3-stage screening before biometric inference:
                </p>

                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3">
                    <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-mono text-[10px]">1</span>
                    <div>
                      <div className="font-semibold text-white">2D FFT Radial Power Spectrum Analysis</div>
                      <div className="text-white/50 text-[11px]">Identifies high-frequency checkerboard grid anomalies characteristic of GAN / Diffusion upsamplers.</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3">
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-[10px]">2</span>
                    <div>
                      <div className="font-semibold text-white">Chromatic Gradient Covariance</div>
                      <div className="text-white/50 text-[11px]">Detects unnatural Sobel edge correlations across RGB color channels.</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3">
                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px]">3</span>
                    <div>
                      <div className="font-semibold text-white">Local Patch Texture Shannon Entropy</div>
                      <div className="text-white/50 text-[11px]">Flags overly smooth skin diffusion patches lacking natural organic pore noise.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: SYSTEM HEALTH & WORKERS */}
        {/* ======================================================== */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-light text-white flex items-center gap-2">
                  <Server className="w-5 h-5 text-cyan-400" />
                  <span>Infrastructure Telemetry & AI Worker Pool</span>
                </h2>
                <p className="text-xs text-white/50">
                  Live CPU, memory, database connection pool, and asynchronous AI inference queue telemetry.
                </p>
              </div>

              <button
                onClick={loadTelemetry}
                disabled={loadingTelemetry}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white flex items-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingTelemetry ? 'animate-spin' : ''}`} />
                <span>Refresh Telemetry</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Host Hardware */}
              <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4">
                <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-cyan-400" />
                  <span>Host Hardware</span>
                </h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between text-white/70 mb-1">
                      <span>RAM Utilization</span>
                      <span className="font-mono text-cyan-300">
                        {telemetry?.hostSystem?.usedMemoryGB} GB / {telemetry?.hostSystem?.totalMemoryGB} GB ({telemetry?.hostSystem?.memoryUsagePct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-cyan-400 transition-all duration-500"
                        style={{ width: `${telemetry?.hostSystem?.memoryUsagePct || 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-white/60">CPU Cores</span>
                    <span className="font-mono text-white">{telemetry?.hostSystem?.cpuCount} Cores</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-white/60">Platform</span>
                    <span className="font-mono text-white">{telemetry?.hostSystem?.platform}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-white/60">Node Uptime</span>
                    <span className="font-mono text-white">{Math.round((telemetry?.uptimeSeconds || 0) / 60)} minutes</span>
                  </div>
                </div>
              </div>

              {/* Database Telemetry */}
              <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4">
                <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span>Database Connection Pool</span>
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-emerald-200">Status</span>
                    <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      {telemetry?.database?.status}
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-white/60">Engine</span>
                    <span className="font-mono text-white">{telemetry?.database?.engine}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-white/60">Ping Latency</span>
                    <span className="font-mono text-emerald-300">{telemetry?.database?.latencyMs} ms</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-white/60">Connection Pool</span>
                    <span className="text-white">{telemetry?.database?.connectionPool}</span>
                  </div>
                </div>
              </div>

              {/* AI Worker Pool */}
              <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4">
                <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  <span>AI Inference Worker Queue</span>
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                    <span className="text-purple-200">Worker Status</span>
                    <span className="font-semibold text-purple-300">
                      {telemetry?.aiInference?.status}
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-white/60">Active Workers</span>
                    <span className="font-mono text-white">
                      {telemetry?.aiInference?.queue?.active_workers || 0}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-white/60">Queue Depth</span>
                    <span className="font-mono text-white">
                      {telemetry?.aiInference?.queue?.queue_depth || 0}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-white/60">Inference Runtime</span>
                    <span className="text-white/80">{telemetry?.aiInference?.runtime}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 6: ADMIN PROFILE */}
        {/* ======================================================== */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Edit Admin Details */}
            <div className="glass-card rounded-3xl p-6 lg:p-8 border border-white/10 space-y-6">
              <div>
                <h2 className="text-base font-medium text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-cyan-400" />
                  <span>Administrator Details</span>
                </h2>
                <p className="text-xs text-white/50">
                  Update administrative display name and contact identity.
                </p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-white/60">Email Address (Read-only)</label>
                  <input
                    type="email"
                    disabled
                    value={adminUser.email}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-white/50 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-white/60">Administrator Name</label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-xs text-white focus:outline-none focus:border-cyan-400 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-white/60">Administrative Role</label>
                  <div className="px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-red-300 font-semibold font-mono">
                    {adminUser.role}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-500 hover:to-purple-500 text-xs font-medium text-white transition-all shadow-lg"
                >
                  {savingProfile ? 'Saving Details...' : 'Save Admin Details'}
                </button>
              </form>
            </div>

            {/* Change Admin Password */}
            <div className="glass-card rounded-3xl p-6 lg:p-8 border border-white/10 space-y-6">
              <div>
                <h2 className="text-base font-medium text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-400" />
                  <span>Change Password</span>
                </h2>
                <p className="text-xs text-white/50">
                  Requires current password verification for administrative credential rotation.
                </p>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-white/60">Current Password</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-white/60">New Password (min 8 characters)</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-white/60">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-medium text-white transition-all border border-white/15"
                >
                  {savingProfile ? 'Updating Password...' : 'Update Password'}
                </button>
              </form>

              {profileStatus && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  profileStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'
                }`}>
                  {profileStatus.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{profileStatus.message}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 7: SECURITY SETTINGS */}
        {/* ======================================================== */}
        {activeTab === 'settings' && (
          <div className="glass-card rounded-3xl p-6 lg:p-8 border border-white/10 space-y-6 max-w-3xl">
            <div>
              <h2 className="text-lg font-light text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-purple-400" />
                <span>System Security Policies & Retention</span>
              </h2>
              <p className="text-xs text-white/50">
                Configure global session lifetimes, audit trail retention horizons, and AI concurrency limits.
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-white/80">
                  Administrative & User Session Timeout (Hours)
                </label>
                <p className="text-[11px] text-white/40">
                  Inactivity threshold after which authentication cookies expire and require re-authentication.
                </p>
                <input
                  type="number"
                  min="1"
                  max="720"
                  value={securitySettings.sessionTimeoutHours}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeoutHours: parseInt(e.target.value) || 24 })}
                  className="w-36 px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-white/80">
                  Audit Log Retention Horizon (Days)
                </label>
                <p className="text-[11px] text-white/40">
                  How long security and inference audit logs are maintained before automatic database archiving.
                </p>
                <input
                  type="number"
                  min="7"
                  max="365"
                  value={securitySettings.auditLogRetentionDays}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, auditLogRetentionDays: parseInt(e.target.value) || 90 })}
                  className="w-36 px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-white/80">
                  Max Concurrent AI Inference Requests
                </label>
                <p className="text-[11px] text-white/40">
                  Worker semaphore limit preventing host GPU/CPU thrashing under high-concurrency traffic bursts.
                </p>
                <input
                  type="number"
                  min="1"
                  max="64"
                  value={securitySettings.maxConcurrentInferences}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, maxConcurrentInferences: parseInt(e.target.value) || 8 })}
                  className="w-36 px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="pt-2 flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <div>
                  <div className="text-xs font-semibold text-white">Strict AI-Generated Image Screening</div>
                  <div className="text-[11px] text-white/50">Reject synthetic images before running facial embedding extractor.</div>
                </div>
                <input
                  type="checkbox"
                  checked={securitySettings.strictAiScreening}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, strictAiScreening: e.target.checked })}
                  className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-500 hover:to-purple-500 text-xs font-medium text-white transition-all shadow-lg"
              >
                {savingSettings ? 'Saving Policy Changes...' : 'Save Security Policies'}
              </button>

              {settingsFeedback && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  settingsFeedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'
                }`}>
                  {settingsFeedback.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{settingsFeedback.message}</span>
                </div>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#070311] flex items-center justify-center text-white">
        <div className="w-8 h-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
      </div>
    }>
      <AdminDashboardContent />
    </Suspense>
  );
}
