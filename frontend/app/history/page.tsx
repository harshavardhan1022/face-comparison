'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { History, Download, ArrowLeft, Calendar, FileText, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';
import Navbar from '@/components/ui/Navbar';

interface ComparisonRecord {
  id: string;
  similarityScore: number;
  rawCosineScore: number;
  similarityCategory: string;
  modelVersion: string;
  imageQuality: string;
  createdAt: string;
}

export default function HistoryPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [history, setHistory] = useState<ComparisonRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const userRes = await fetch('/api/auth/me');
        if (!userRes.ok) {
          router.push('/login');
          return;
        }
        const userData = await userRes.json();
        setUser(userData.user);

        const histRes = await fetch('/api/history');
        if (histRes.ok) {
          const histData = await histRes.json();
          setHistory(histData.history || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  const getBadgeStyle = (category: string) => {
    switch (category) {
      case 'High Similarity':
        return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300';
      case 'Moderate Similarity':
        return 'bg-amber-500/15 border-amber-500/30 text-amber-300';
      case 'Low Similarity':
        return 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300';
      default:
        return 'bg-slate-500/15 border-slate-500/30 text-slate-300';
    }
  };

  return (
    <div className="min-h-screen bg-[#090514] text-white flex flex-col">
      <Navbar user={user} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/compare"
                className="text-white/60 hover:text-white inline-flex items-center gap-1 text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Comparison</span>
              </Link>
            </div>
            <h1 className="text-2xl md:text-3xl font-light text-white tracking-wide">
              Comparison History
            </h1>
            <p className="text-xs text-white/50">
              Audit log of all your previous facial similarity analyses
            </p>
          </div>

          <Link
            href="/compare"
            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-xs font-medium text-white tracking-wider uppercase hover:opacity-95 transition-opacity inline-flex items-center gap-2 shadow-lg"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>New Comparison</span>
          </Link>
        </div>

        {/* History Table / Cards */}
        {loading ? (
          <div className="p-12 text-center text-white/50 text-sm">
            Loading comparison history records...
          </div>
        ) : history.length === 0 ? (
          <div className="glass-card rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-white/40">
              <History className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium text-white">No Comparisons Yet</h3>
            <p className="text-xs text-white/50 leading-relaxed">
              You haven't compared any facial photographs yet. Upload two photographs on the comparison dashboard to run your first analysis.
            </p>
            <Link
              href="/compare"
              className="inline-block px-6 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium uppercase tracking-wider transition-colors"
            >
              Start Comparison
            </Link>
          </div>
        ) : (
          <div className="glass-card rounded-[28px] overflow-hidden border border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-xs font-medium text-white/50 uppercase tracking-wider">
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6">Similarity Index</th>
                    <th className="py-4 px-6">Category</th>
                    <th className="py-4 px-6">Cosine Metric</th>
                    <th className="py-4 px-6">Quality</th>
                    <th className="py-4 px-6">Model</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white/80">
                  {history.map((record) => (
                    <tr
                      key={record.id}
                      className="hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="py-4 px-6 text-xs text-white/60 font-mono">
                        {new Date(record.createdAt).toLocaleDateString()} {new Date(record.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-base font-semibold text-white">
                          {record.similarityScore}%
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getBadgeStyle(record.similarityCategory)}`}>
                          {record.similarityCategory}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-xs font-mono text-cyan-300">
                        {record.rawCosineScore.toFixed(4)}
                      </td>
                      <td className="py-4 px-6 text-xs text-white/60">
                        {record.imageQuality}
                      </td>
                      <td className="py-4 px-6 text-xs text-white/50 font-mono">
                        {record.modelVersion}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

