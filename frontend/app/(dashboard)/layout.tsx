'use client';

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTokenRefresh } from '../../hooks/useTokenRefresh';
import { useAuthStore } from '../../store/authStore';
import AuthScreen from '../../components/AuthScreen';
import { Toast } from '../../components/ui';
import {
  LayoutDashboard, Package, Warehouse, ShoppingBag, ShoppingCart, Factory,
  Settings2, Users, ScrollText, User, LogOut, RefreshCw
} from 'lucide-react';

type TabKey = 'dashboard' | 'products' | 'inventory' | 'sales' | 'purchases' | 'manufacturing' | 'bom' | 'users' | 'audit';

const TABS: { key: TabKey; path: string; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
  { key: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { key: 'products', path: '/products', label: 'Products', icon: <Package size={18} /> },
  { key: 'inventory', path: '/inventory', label: 'Inventory', icon: <Warehouse size={18} /> },
  { key: 'sales', path: '/sales', label: 'Sales Orders', icon: <ShoppingBag size={18} /> },
  { key: 'purchases', path: '/purchases', label: 'Purchase Orders', icon: <ShoppingCart size={18} /> },
  { key: 'manufacturing', path: '/manufacturing', label: 'Manufacturing Orders', icon: <Factory size={18} /> },
  { key: 'bom', path: '/bom', label: 'Bills of Materials', icon: <Settings2 size={18} /> },
  { key: 'users', path: '/users', label: 'User Permissions', icon: <Users size={18} />, adminOnly: true },
  { key: 'audit', path: '/audit', label: 'Audit Trails', icon: <ScrollText size={18} /> },
];

type ToastContextType = (message: string, type: 'success' | 'error') => void;
const ToastContext = createContext<ToastContextType>(() => {});

export const useToast = () => useContext(ToastContext);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, token, logout } = useAuthStore();
  const [toastData, setToastData] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Proactively refresh the access token 5 min before it expires
  useTokenRefresh();

  // Handle hydration mismatch
  useEffect(() => {
    setHydrated(true);
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToastData({ message, type });
  }, []);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <RefreshCw size={24} className="animate-spin-slow text-sky-500" />
      </div>
    );
  }

  if (!token) {
    return (
      <>
        <AuthScreen onLogin={() => router.refresh()} />
        {toastData && <Toast message={toastData.message} type={toastData.type} onClose={() => setToastData(null)} />}
      </>
    );
  }

  // Helper to check if tab is active
  const isActive = (tabPath: string) => {
    if (tabPath === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(tabPath);
  };

  return (
    <ToastContext.Provider value={showToast}>
      <div className="flex h-screen overflow-hidden bg-[var(--background)]">
        {/* Sidebar */}
        <aside className="w-60 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col">
          {/* Logo */}
          <div className="px-5 py-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-sm">
                <Factory size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 leading-tight">Mini ERP</p>
                <p className="text-[10px] text-gray-400">Supply & Manufacturing</p>
              </div>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
            {TABS.filter(tab => !tab.adminOnly || user?.roles?.some(r => r === 'OWNER' || r === 'ADMIN')).map(tab => {
              const active = isActive(tab.path);
              return (
                <Link
                  key={tab.key}
                  href={tab.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? 'bg-sky-50 text-sky-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className={active ? 'text-sky-600' : 'text-gray-400'}>{tab.icon}</span>
                  {tab.label}
                </Link>
              );
            })}
          </nav>

          {/* Profile */}
          <div className="px-3 py-4 border-t border-gray-100">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                {user?.name?.[0]?.toUpperCase() || <User size={14} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{user?.name || 'User'}</p>
                <p className="text-[10px] text-gray-400 truncate">{user?.roles?.join(', ') || 'Authenticated'}</p>
              </div>
              <button
                onClick={() => {
                  logout();
                  router.push('/');
                }}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                title="Log out"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-6 py-6">
            {children}
          </div>
        </main>

        {/* Toast */}
        {toastData && <Toast message={toastData.message} type={toastData.type} onClose={() => setToastData(null)} />}
      </div>
    </ToastContext.Provider>
  );
}
