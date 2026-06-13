'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import {
  Home, Users, BarChart3, Settings, Menu, Bell, LogOut,
  X, CheckSquare, Sun, Moon, Command, Search
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [sidebar, setSidebar] = useState(false);
  const [greeting, setGreeting] = useState('Good Morning');

  useEffect(() => {
    if (typeof window !== 'undefined' && !token) {
      router.push('/login');
    }
  }, [token, router]);

  // Set greeting based on time of day
  useEffect(() => {
    const hr = new Date().getHours();
    if (hr < 12) setGreeting('Good Morning');
    else if (hr < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  // Sync data-theme attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  if (!token) return null;

  const nav = [
    { name: 'Overview', href: '/dashboard', icon: Home, color: 'bg-blue-500 text-blue-600' },
    { name: 'Pipeline', href: '/sales', icon: BarChart3, color: 'bg-indigo-500 text-indigo-600' },
    { name: 'Contacts', href: '/contacts', icon: Users, color: 'bg-emerald-500 text-emerald-600' },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare, color: 'bg-amber-500 text-amber-600' },
    { name: 'Settings', href: '/settings', icon: Settings, color: 'bg-slate-500 text-slate-600' },
  ];

  return (
    <div className="h-screen w-full flex overflow-hidden transition-colors" style={{ background: 'var(--bg-app)', color: 'var(--text-main)' }}>
      {/* Mobile drawer overlay */}
      {sidebar && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebar(false)} />
      )}

      {/* ─── SIDEBAR NAVIGATION (Eario.ai Style) ─── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] flex flex-col transition-all duration-300 lg:static lg:translate-x-0 ${
          sidebar ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: 'var(--bg-panel)', borderRight: '1px solid var(--border-color)' }}
      >
        {/* Workspace Brand Switcher */}
        <div className="h-[64px] flex items-center justify-between px-6 shrink-0" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/25">
              <Command className="w-4 h-4 text-white" />
            </div>
            <span className="text-[16px] font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>OdooMini</span>
          </Link>
          <button className="lg:hidden p-1.5 rounded-lg border" style={{ borderColor: 'var(--border-color)' }} onClick={() => setSidebar(false)}>
            <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <p className="text-[11px] font-bold uppercase tracking-wider px-3 mb-2.5" style={{ color: 'var(--text-light)' }}>Power Features</p>
          {nav.map((link) => {
            const active = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setSidebar(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-semibold transition-all"
                style={{
                  background: active ? 'var(--primary-muted)' : 'transparent',
                  color: active ? 'var(--primary)' : 'var(--text-muted)',
                }}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                    active ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer Panel */}
        <div className="p-4 space-y-2 shrink-0" style={{ borderTop: '1px solid var(--border-color)' }}>
          {/* Theme toggler button */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
            style={{ color: 'var(--text-muted)' }}
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800">
              {theme === 'light' ? (
                <Moon className="w-4 h-4" style={{ color: 'var(--text-light)' }} />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
            </div>
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </button>

          {/* User profile dropdown drawer */}
          <div
            className="flex items-center justify-between p-2 rounded-xl border transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-400 to-blue-500 flex items-center justify-center text-[12px] font-bold text-white shadow-sm shrink-0">
                {user?.name?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold truncate" style={{ color: 'var(--text-main)' }}>{user?.name || 'Admin User'}</p>
                <p className="text-[10px] truncate" style={{ color: 'var(--text-light)' }}>admin@odoomini.io</p>
              </div>
            </div>
            <button
              onClick={() => {
                logout();
                router.push('/login');
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ─── MAIN CONTENT CONTAINER ─── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* App Shell Header */}
        <header className="h-[64px] flex items-center justify-between px-6 shrink-0" style={{ background: 'var(--bg-panel)', borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-1.5 rounded-lg border" style={{ borderColor: 'var(--border-color)' }} onClick={() => setSidebar(true)}>
              <Menu className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
            </button>
            
            {/* Page Greeting Titles */}
            <div className="hidden sm:block">
              <h2 className="text-[15px] font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>
                {greeting}, {user?.name || 'Admin'}!
              </h2>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                offer top-notch service to cater to your customers' needs.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Search Input Bar */}
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-light)' }} />
              <input
                type="text"
                placeholder="Search..."
                className="pl-9 pr-12 py-1.5 rounded-lg text-[13px] w-48 focus:outline-none transition-all"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold px-1.5 py-0.5 rounded border"
                style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-color)', color: 'var(--text-light)' }}
              >
                ⌘K
              </span>
            </div>

            {/* Notification alert bell */}
            <button className="relative p-2 rounded-xl transition-all hover:bg-slate-100 dark:hover:bg-slate-800" style={{ color: 'var(--text-muted)' }}>
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
            </button>
          </div>
        </header>

        {/* Scrollable Workspace Container */}
        <main className="flex-1 overflow-y-auto" style={{ background: 'var(--bg-app)' }}>
          <div className="max-w-[1280px] mx-auto px-6 py-8 h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
