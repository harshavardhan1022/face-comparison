'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Sun, Moon, LogOut, ScanFace, LayoutDashboard, Shield, History } from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';
import LogoutAnimationModal from '@/components/auth/LogoutAnimationModal';

interface NavbarProps {
  user?: {
    name: string;
    email: string;
    role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  } | null;
}

export default function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [showLogoutAnimation, setShowLogoutAnimation] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
    setShowLogoutAnimation(true);
  };

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Face Comparison', href: '/compare', icon: ScanFace },
    ...(user && ['ADMIN', 'SUPER_ADMIN'].includes(user.role)
      ? [{ label: 'Admin Portal', href: '/admin/dashboard', icon: Shield }]
      : []),
  ];

  return (
    <>
      <LogoutAnimationModal
        isOpen={showLogoutAnimation}
        isAdmin={user ? ['ADMIN', 'SUPER_ADMIN'].includes(user.role) : false}
      />

      <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#090514]/75 dark:bg-[#090514]/75 backdrop-blur-xl transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 via-purple-500 to-pink-500 p-[1.5px] shadow-[0_0_15px_rgba(168,85,247,0.35)] group-hover:shadow-[0_0_22px_rgba(34,211,238,0.5)] transition-all">
              <div className="w-full h-full bg-[#160b26] rounded-[14px] flex items-center justify-center">
                <ScanFace className="w-5 h-5 text-cyan-300 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold tracking-wide text-white flex items-center gap-2">
                <span>FaceSimilarity</span>
                <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  AI PRO
                </span>
              </div>
              <p className="text-[10px] text-white/50 tracking-wider font-light">
                Calibrated Facial Analysis
              </p>
            </div>
          </Link>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href === '/dashboard' && pathname.startsWith('/dashboard'));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium tracking-wide transition-all ${
                    isActive
                      ? 'bg-white/15 text-white shadow-sm border border-white/20'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 text-cyan-300" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Tools: Theme Switcher, User Pill, Logout */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors focus:outline-none"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-300" />
              ) : (
                <Moon className="w-4 h-4 text-purple-300" />
              )}
            </button>

            {/* User Info */}
            {user && (
              <Link
                href="/dashboard"
                className="hidden sm:flex items-center gap-2.5 pl-2 border-l border-white/10 hover:opacity-85 transition-opacity"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center text-xs font-semibold text-white shadow-inner">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <div className="text-xs font-medium text-white leading-tight">
                    {user.name}
                  </div>
                  <div className="text-[10px] text-white/50 flex items-center gap-1">
                    <span className={['ADMIN', 'SUPER_ADMIN'].includes(user.role) ? 'text-red-400 font-semibold' : 'text-cyan-400'}>
                      {user.role}
                    </span>
                  </div>
                </div>
              </Link>
            )}

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-full text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-colors ml-1 focus:outline-none"
              title="Log out"
              aria-label="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
