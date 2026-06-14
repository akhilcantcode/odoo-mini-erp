'use client';

import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X, ShieldAlert } from 'lucide-react';

export function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600 border-gray-200',
    confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
    received: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
    done: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  const cls = colorMap[status] || 'bg-gray-100 text-gray-600 border-gray-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

export function LedgerTypeBadge({ type }: { type: string }) {
  const colorMap: Record<string, string> = {
    PURCHASE: 'bg-blue-50 text-blue-700',
    SALE: 'bg-purple-50 text-purple-700',
    MANUFACTURE_CONSUME: 'bg-orange-50 text-orange-700',
    MANUFACTURE_PRODUCE: 'bg-emerald-50 text-emerald-700',
    ADJUSTMENT: 'bg-gray-100 text-gray-700',
  };
  const cls = colorMap[type] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {type.replace(/_/g, ' ')}
    </span>
  );
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-[var(--border)] shadow-[var(--shadow-sm)] ${className}`}>
      {children}
    </div>
  );
}

export function Btn({ children, onClick, variant = 'primary', size = 'md', disabled = false, type, className = '', title }: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  title?: string;
}) {
  const base = 'inline-flex items-center justify-center gap-1.5 font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';
  const sizeMap = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm' };
  const variantMap = {
    primary: 'bg-sky-600 text-white hover:bg-sky-700 focus:ring-sky-400 shadow-sm',
    secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 focus:ring-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-400',
    ghost: 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:ring-gray-300',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${sizeMap[size]} ${variantMap[variant]} ${className}`} title={title}>
      {children}
    </button>
  );
}

export function Input({ label, ...props }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-gray-500">{label}</label>}
      <input
        {...props}
        className={`w-full px-3 py-2 text-sm bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition placeholder:text-gray-400 ${props.className || ''}`}
      />
    </div>
  );
}

export function Select({ label, children, ...props }: { label?: string; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-gray-500">{label}</label>}
      <select
        {...props}
        className={`w-full px-3 py-2 text-sm bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition ${props.className || ''}`}
      >
        {children}
      </select>
    </div>
  );
}

export function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-3 rounded-full bg-sky-50 text-sky-500 mb-3">{icon}</div>
      <p className="text-sm font-medium text-gray-700">{title}</p>
      <p className="text-xs text-gray-400 mt-1">{description}</p>
    </div>
  );
}

export function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  const color = type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700';
  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium animate-fade-in flex items-center gap-2 ${color}`}>
      {type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      {message}
      <button onClick={onClose} className="ml-2 hover:opacity-70 cursor-pointer"><X size={14} /></button>
    </div>
  );
}

export function AccessDenied({ module }: { module: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <div className="p-4 rounded-2xl bg-red-50 text-red-500 mb-4 border border-red-100 shadow-sm animate-pulse">
        <ShieldAlert size={32} />
      </div>
      <h3 className="text-lg font-bold text-gray-900">Access Denied</h3>
      <p className="text-sm text-gray-500 mt-2 max-w-sm">
        You do not have sufficient privileges to view the <strong>{module}</strong> module. Please contact your administrator if you believe this is an error.
      </p>
    </div>
  );
}

