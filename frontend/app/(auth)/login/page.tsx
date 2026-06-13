'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import { fetchApi } from '../../../services/api';
import { Loader2, Command, Sun, Moon, Check, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { theme, toggleTheme } = useThemeStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetchApi('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      setAuth(res.user, res.token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row transition-colors" style={{ background: 'var(--bg-app)' }}>
      {/* ─── LEFT COLUMN: SIGN IN FORM ─── */}
      <div className="w-full md:w-[45%] flex flex-col justify-between p-8 md:p-12 lg:p-16 relative z-10" style={{ background: 'var(--bg-panel)' }}>
        {/* Top brand header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/25">
              <Command className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-[17px] font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>OdooMini</span>
          </div>

          <button onClick={toggleTheme} className="p-2 rounded-xl transition-all border"
            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>
        </div>

        {/* Center content */}
        <div className="max-w-[380px] w-full mx-auto my-auto py-12">
          <div className="mb-8">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold mb-3 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              Claim your 50% discount today!
            </div>
            <h1 className="text-[28px] font-bold tracking-tight mb-2" style={{ color: 'var(--text-main)' }}>One Intelligent Platform</h1>
            <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>Sign in to access your ERP & CRM dashboard.</p>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-[13px] font-medium text-center" style={{ background: 'var(--bg-badge-danger)', color: 'var(--danger)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }} htmlFor="email">Email Address</label>
              <input 
                id="email" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-[14px] focus:outline-none transition-all"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                placeholder="admin@odoomini.io" 
                required 
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[12px] font-semibold" style={{ color: 'var(--text-muted)' }} htmlFor="password">Password</label>
                <a href="#" className="text-[12px] font-medium hover:underline" style={{ color: 'var(--primary)' }}>Forgot?</a>
              </div>
              <input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-[14px] focus:outline-none transition-all"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                placeholder="••••••••" 
                required 
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 text-[14px] font-bold text-white rounded-xl transition-all shadow-md disabled:opacity-60 flex items-center justify-center gap-2 mt-6 cursor-pointer"
              style={{ background: 'var(--primary)', boxShadow: '0 4px 14px rgba(0, 111, 238, 0.2)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--primary)'}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        </div>

        {/* Bottom footer */}
        <div className="text-[12px] text-center md:text-left flex flex-wrap gap-x-4 gap-y-1 justify-center md:justify-start" style={{ color: 'var(--text-light)' }}>
          <span>© {new Date().getFullYear()} OdooMini.</span>
          <a href="#" className="hover:underline">Privacy</a>
          <a href="#" className="hover:underline">Terms</a>
        </div>
      </div>

      {/* ─── RIGHT COLUMN: FLOATING SKY ILLUSTRATION (Eario.ai Style) ─── */}
      <div className="hidden md:flex flex-1 relative overflow-hidden bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-600 p-12 flex-col justify-between">
        {/* Decorative Blurred Spots */}
        <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-white/20 blur-[100px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-blue-300/30 blur-[120px] rounded-full" />

        {/* Cloud Vectors */}
        <div className="absolute top-8 left-8 text-white/10 select-none text-[80px] font-extrabold tracking-widest leading-none pointer-events-none">
          OdooMini
        </div>

        {/* Floating Dashboard Interface Mockup */}
        <div className="relative flex-1 flex items-center justify-center">
          <div className="w-full max-w-[500px] relative aspect-[4/3] rounded-2xl bg-white/90 backdrop-blur-md p-6 shadow-2xl border border-white/40 animate-float">
            {/* Mock Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <span className="text-[11px] font-semibold text-slate-400 ml-2">odoomini.io/dashboard</span>
              </div>
              <div className="w-16 h-4 rounded bg-slate-200/50" />
            </div>

            {/* Mock Dashboard Body */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Earnings</div>
                  <div className="text-[20px] font-extrabold text-slate-800 mt-1">$20,245</div>
                  <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full mt-2">
                    +12% vs last month
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">In Progress</div>
                  <div className="text-[20px] font-extrabold text-slate-800 mt-1">15 Sales</div>
                  <div className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full mt-2">
                    76% of target
                  </div>
                </div>
              </div>

              {/* Monthly Sales Mock Chart */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Monthly Sales</div>
                <div className="h-24 flex items-end justify-between gap-2 px-1">
                  {[35, 60, 45, 80, 55, 95, 70, 85].map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <div className={`w-full rounded-t-md transition-all duration-500 ${i === 5 ? 'bg-blue-500' : 'bg-slate-100'}`} style={{ height: `${h}%` }} />
                      <span className="text-[9px] font-bold text-slate-300 mt-1.5">{['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A'][i]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Floating Card */}
          <div className="absolute -bottom-6 -left-6 w-[200px] bg-white rounded-2xl p-4 shadow-xl border border-white/50 animate-float-delayed hidden lg:block">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate-800">Transaction History</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px]">
                <span className="font-semibold text-slate-400">#001</span>
                <span className="font-bold text-slate-800">$1,040</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="font-semibold text-slate-400">#002</span>
                <span className="font-bold text-slate-800">$710</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="font-semibold text-slate-400">#003</span>
                <span className="font-bold text-slate-800">$2,700</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer brand values */}
        <div className="flex items-center justify-between text-white/70 text-[12px] relative z-10 border-t border-white/20 pt-4">
          <span className="font-semibold">Simple. Connected. Beautiful.</span>
          <span className="opacity-75">Odoo Mini Suite</span>
        </div>
      </div>
    </div>
  );
}
