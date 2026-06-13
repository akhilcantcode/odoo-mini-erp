'use client';

import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { loginUser, registerUser } from '../services/auth';
import { Btn, Card, Input } from './ui';
import { Factory, RefreshCw } from 'lucide-react';

export default function AuthScreen({ onLogin }: { onLogin: () => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const { setAuth } = useAuthStore();

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
              onClick={() => { setIsLogin(false); setError(''); setRegistered(false); }}
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
            <Input label="Password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
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
