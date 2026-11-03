import Link from 'next/link';
import { ScanFace, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#070311] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-2xl">
        <ScanFace className="w-8 h-8 text-cyan-400" />
      </div>
      <h1 className="text-4xl font-light tracking-wide mb-2">404 - Page Not Found</h1>
      <p className="text-sm text-white/50 max-w-md mb-8">
        The biometric analysis resource or dashboard page you requested does not exist or has been relocated.
      </p>
      <Link
        href="/dashboard"
        className="px-6 py-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 text-xs font-medium text-white shadow-lg hover:shadow-cyan-500/20 transition-all flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Dashboard</span>
      </Link>
    </div>
  );
}

