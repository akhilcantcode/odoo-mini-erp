'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/authStore';
import AuthScreen from '../components/AuthScreen';
import { Factory, ArrowRight, X, ChevronRight, Activity, TrendingUp, Layers } from 'lucide-react';
import { Btn } from '../components/ui';

export default function LandingPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeNav, setActiveNav] = useState('features');
  // Defer auth-aware rendering to client to avoid SSR/client hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const isAuthed = mounted && !!token;

  const handleCTA = () => {
    if (isAuthed) {
      router.push('/dashboard');
    } else {
      setShowAuthModal(true);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-50 overflow-hidden flex flex-col font-sans">
      {/* ── Background Gradients & Grid Overlay ── */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.85]" 
        style={{
          background: 'radial-gradient(circle 800px at 50% -200px, rgba(224, 242, 254, 0.7) 0%, rgba(255,255,255,0) 100%)'
        }}
      />
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.6]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(14, 165, 233, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(14, 165, 233, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px'
        }}
      />

      {/* ── Header / Navbar ── */}
      <header className="relative z-10 max-w-6xl mx-auto w-full px-6 py-5 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => router.push('/')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-sky-200">
            <Factory size={18} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-tight">Mini ERP</p>
            <p className="text-[10px] text-gray-400 font-medium tracking-wide">Supply & Manufacturing</p>
          </div>
        </div>

        {/* Center Nav Items */}
        <nav className="hidden md:flex items-center bg-white border border-gray-100 rounded-full px-1.5 py-1 shadow-sm">
          {[
            { id: 'features', label: 'Features' },
            { id: 'how-it-works', label: 'How it works' },
            { id: 'pricing', label: 'Pricing' },
            { id: 'about', label: 'About' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                activeNav === item.id 
                  ? 'bg-gray-900 text-white shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Action Buttons — always render unauthenticated version on server, swap after mount */}
        <div className="flex items-center gap-3">
          {isAuthed ? (
            <Btn size="sm" onClick={() => router.push('/dashboard')}>
              Go to Dashboard <ArrowRight size={13} />
            </Btn>
          ) : (
            <>
              <button 
                onClick={() => setShowAuthModal(true)} 
                className="text-xs font-semibold text-gray-600 hover:text-gray-950 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Sign In
              </button>
              <button 
                onClick={() => setShowAuthModal(true)} 
                className="inline-flex items-center gap-1 bg-gray-950 hover:bg-gray-800 text-white px-4 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-all duration-200 cursor-pointer"
              >
                Get started <ChevronRight size={13} />
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── Hero Section ── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto w-full px-6 pt-12 pb-16 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-gray-900 tracking-tight leading-[1.15] max-w-3xl">
          Your business <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">ERP</span>. <br className="hidden sm:inline" />
          For faster, deeper control.
        </h1>
        <p className="text-sm sm:text-base text-gray-500 font-medium max-w-xl mt-6 leading-relaxed">
          More than just a dashboard - it automates your procurement, manages your bills of materials, and tracks your inventory in real-time.
        </p>

        {/* CTA Buttons */}
        <div className="flex items-center gap-4 mt-8">
          <button
            onClick={handleCTA}
            className="bg-gray-950 hover:bg-gray-800 text-white px-6 py-3 rounded-full text-sm font-semibold shadow-md shadow-gray-200 transition-all duration-200 flex items-center gap-1.5 hover:translate-y-[-1px] active:translate-y-0 cursor-pointer"
          >
            {isAuthed ? 'Go to Dashboard' : "Let's begin"} <ArrowRight size={14} />
          </button>
          <button
            onClick={() => {
              const el = document.getElementById('mockup-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-6 py-3 rounded-full text-sm font-semibold shadow-sm transition-all duration-200 flex items-center gap-1.5 hover:border-gray-300 hover:translate-y-[-1px] active:translate-y-0 cursor-pointer"
          >
            Explore features
          </button>
        </div>

        {/* ── Mockup Metrics Section (Aino Style Cards) ── */}
        <section id="mockup-section" className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mt-20 animate-fade-in">
          {/* Card 1: Procurement Efficiency */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-150 p-5 shadow-lg shadow-sky-50/50 hover:shadow-xl hover:border-sky-200 transition-all duration-300 text-left flex flex-col justify-between min-h-[200px]">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Procurement Efficiency</span>
                <div className="p-1 rounded-lg bg-sky-50 text-sky-500">
                  <TrendingUp size={14} />
                </div>
              </div>
              <p className="text-4xl font-extrabold text-gray-900 tracking-tight mt-3">94%</p>
              <p className="text-xs font-semibold text-emerald-500 mt-1">▲ +3.4% this month</p>
            </div>
            
            <div className="mt-6">
              {/* Line chart visualization */}
              <svg viewBox="0 0 100 25" className="w-full h-12 text-sky-500" fill="none">
                <defs>
                  <linearGradient id="grad-sky" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgb(14, 165, 233)" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="rgb(14, 165, 233)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d="M0,20 Q15,4 30,16 T60,8 T90,20 T100,4 L100,25 L0,25 Z" fill="url(#grad-sky)" />
                <path d="M0,20 Q15,4 30,16 T60,8 T90,20 T100,4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="100" cy="4" r="2.5" fill="currentColor" />
              </svg>
              <div className="flex justify-between text-[9px] font-bold text-gray-400 mt-1">
                <span>Mon</span>
                <span>Wed</span>
                <span>Fri</span>
                <span>Sun</span>
              </div>
            </div>
          </div>

          {/* Card 2: Inventory Accuracy */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-150 p-5 shadow-lg shadow-sky-50/50 hover:shadow-xl hover:border-sky-200 transition-all duration-300 text-left flex flex-col justify-between min-h-[200px] md:scale-105 border-sky-100 ring-2 ring-sky-500/5">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase font-semibold">Inventory Accuracy</span>
                <div className="p-1 rounded-lg bg-emerald-50 text-emerald-500">
                  <Layers size={14} />
                </div>
              </div>
              <p className="text-4xl font-extrabold text-gray-900 tracking-tight mt-3">92%</p>
              <p className="text-xs font-semibold text-gray-400 mt-1">In-stock accuracy level</p>
            </div>

            <div className="mt-6 flex items-end justify-between gap-2.5 h-16">
              {[
                { label: 'Feb', height: 'h-10', active: false },
                { label: 'Mar', height: 'h-12', active: false },
                { label: 'May', height: 'h-16', active: true },
                { label: 'Jun', height: 'h-11', active: false }
              ].map((bar, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full bg-gray-100 rounded-md h-16 flex items-end overflow-hidden">
                    <div className={`w-full ${bar.height} rounded-md transition-all duration-500 ${bar.active ? 'bg-sky-500 shadow-sm shadow-sky-100' : 'bg-gray-300/60'}`} />
                  </div>
                  <span className={`text-[9px] font-bold ${bar.active ? 'text-sky-600 font-extrabold' : 'text-gray-400'}`}>{bar.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Manufacturing Fulfilled */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-150 p-5 shadow-lg shadow-sky-50/50 hover:shadow-xl hover:border-sky-200 transition-all duration-300 text-left flex flex-col justify-between min-h-[200px]">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Order Fulfillment</span>
                <div className="p-1 rounded-lg bg-indigo-50 text-indigo-500">
                  <Activity size={14} />
                </div>
              </div>
              <p className="text-4xl font-extrabold text-gray-900 tracking-tight mt-3">88%</p>
              <p className="text-xs font-semibold text-indigo-500 mt-1">Avg. completion timeline</p>
            </div>

            <div className="mt-6">
              {/* Daily completion vertical bar lines */}
              <div className="flex items-end justify-between gap-1.5 h-12">
                {[4, 6, 8, 5, 9, 11, 7, 10, 8, 12, 10, 13, 9, 14, 12].map((val, idx) => (
                  <div 
                    key={idx} 
                    className="flex-1 bg-sky-500/80 rounded-full hover:bg-sky-600 transition-colors"
                    style={{ height: `${(val / 15) * 100}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[9px] font-bold text-gray-400 mt-1.5">
                <span>Week 1</span>
                <span>Week 2</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-gray-150 py-8 bg-white/40 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-gray-400">
          <div className="flex items-center gap-2">
            <Factory size={14} className="text-sky-500" />
            <span>&copy; {new Date().getFullYear()} Mini ERP Inc. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-gray-700 transition">Privacy Policy</a>
            <a href="#" className="hover:text-gray-700 transition">Terms of Service</a>
            <a href="#" className="hover:text-gray-700 transition">Support</a>
          </div>
        </div>
      </footer>

      {/* ── Auth Screen Modal / Overlay ── */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in flex items-center justify-center">
          <div className="absolute right-6 top-6 z-50">
            <button
              onClick={() => setShowAuthModal(false)}
              className="p-2.5 rounded-xl bg-white border border-gray-200 shadow-md text-gray-400 hover:text-gray-600 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
          <AuthScreen onLogin={() => {
            setShowAuthModal(false);
            router.push('/dashboard');
          }} />
        </div>
      )}
    </div>
  );
}
