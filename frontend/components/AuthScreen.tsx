'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { loginUser, registerUser } from '../services/auth';
import { Btn, Card, Input } from './ui';
import { Factory, RefreshCw, Eye, EyeOff } from 'lucide-react';

export default function AuthScreen({ onLogin }: { onLogin: () => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [suggestedPassword, setSuggestedPassword] = useState('');
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { setAuth } = useAuthStore();

  useEffect(() => {
    if (!isLogin && name.trim().length >= 2 && email.includes('@')) {
      if (!suggestedPassword) {
        const randomNum = Math.floor(Math.random() * 10); // Guarantees at least one number
        const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
        const specialChars = '!@#$%^&*';
        const randomSpecial = specialChars[Math.floor(Math.random() * specialChars.length)];
        setSuggestedPassword(`${name.split(' ')[0]}${randomPart}${randomNum}${randomSpecial}`);
      }
    } else {
      setSuggestedPassword('');
      setShowSuggestion(false);
    }
  }, [name, email, isLogin, suggestedPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        const res = await loginUser(email, password);
        setAuth(res.user, res.accessToken, res.refreshToken);
        onLogin();
      } else {
        await registerUser({ name, email, password, companyName });
        setRegistered(true);
        setIsLogin(true);
        setName('');
        setCompanyName('');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-blue-50 px-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sky-600 text-white shadow-lg mb-4">
            <Factory size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Mini ERP</h1>
          <p className="text-sm text-gray-500 mt-1">Supply & Manufacturing Dashboard</p>
        </div>

        <Card className="p-6">
          {/* Toggle Tabs */}
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition cursor-pointer ${isLogin ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); setRegistered(false); setSuggestedPassword(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition cursor-pointer ${!isLogin ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              Register
            </button>
          </div>

          {registered && <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">Company registered! You can now sign in.</div>}
          {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {!isLogin && <Input label="Full Name" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} required />}
            <Input label="Email" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required />
            <div className="relative">
              <Input 
                label="Password" 
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••" 
                value={password} 
                onChange={e => {
                  setPassword(e.target.value);
                  setShowSuggestion(false);
                }}
                onFocus={() => {
                  if (!isLogin && suggestedPassword && !password) {
                    setShowSuggestion(true);
                  }
                }}
                onBlur={() => setTimeout(() => setShowSuggestion(false), 200)}
                required 
              />
              <button
                type="button"
                className="absolute right-3 bottom-2.5 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
              
              {/* Google-like Password Suggestion Popover */}
              {showSuggestion && (
                <div className="absolute top-[calc(100%+4px)] left-0 w-full z-50 bg-white border border-gray-200 rounded-lg shadow-xl shadow-sky-900/10 p-1.5 animate-fade-in origin-top">
                  <div className="flex items-start gap-3 p-2 hover:bg-sky-50/80 rounded-md cursor-pointer transition-colors"
                       onMouseDown={(e) => {
                         e.preventDefault(); // Prevents input blur from firing before click
                         setPassword(suggestedPassword);
                         setShowSuggestion(false);
                       }}>
                    <div className="mt-0.5 w-6 h-6 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-gray-900 leading-none">Use suggested password</p>
                      <p className="text-sm font-mono text-gray-700 mt-1.5 tracking-wide">{suggestedPassword}</p>
                      <p className="text-[10px] text-gray-400 mt-1 leading-tight">Mini ERP will securely save this strong password for your account.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {!isLogin && <Input label="Company Name" placeholder="Acme Industries" value={companyName} onChange={e => setCompanyName(e.target.value)} required />}
            <Btn disabled={loading} className="w-full mt-2">
              {loading ? <RefreshCw size={14} className="animate-spin-slow" /> : null}
              {isLogin ? 'Sign In' : 'Create Account'}
            </Btn>
          </form>
        </Card>
      </div>
    </div>
  );
}
