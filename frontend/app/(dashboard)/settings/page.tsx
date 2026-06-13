'use client';

import React from 'react';
import { useAuthStore } from '../../../store/authStore';

export default function SettingsPage() {
  const { user } = useAuthStore();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-[24px] font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>Workspace Settings</h1>
        <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Configure user profile and system preferences</p>
      </div>

      <div className="space-y-6">
        {/* Profile Details */}
        <div 
          className="rounded-2xl p-6"
          style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}
        >
          <h2 className="text-[16px] font-bold mb-4" style={{ color: 'var(--text-main)' }}>User Profile</h2>
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Name</label>
              <input 
                type="text" 
                className="w-full px-4 py-2.5 rounded-xl text-[14px] focus:outline-none transition-all"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                value={user?.name || 'Admin User'} 
                readOnly 
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Email Address</label>
              <input 
                type="email" 
                className="w-full px-4 py-2.5 rounded-xl text-[14px] focus:outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-light)' }}
                value="admin@odoomini.io" 
                readOnly 
              />
            </div>
          </div>
        </div>

        {/* Danger zone actions */}
        <div 
          className="rounded-2xl p-6"
          style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}
        >
          <h2 className="text-[16px] font-bold text-red-500 mb-1" style={{ color: 'var(--danger)' }}>Danger Zone</h2>
          <p className="text-[12px] mb-4" style={{ color: 'var(--text-muted)' }}>Warning: The actions here are destructive and cannot be undone.</p>
          <button 
            className="px-4 py-2.5 text-[13px] font-bold rounded-xl transition-all cursor-pointer" 
            style={{ background: 'var(--bg-badge-danger)', color: 'var(--danger)', border: '1px solid transparent' }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--danger)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
          >
            Delete Workspace
          </button>
        </div>
      </div>
    </div>
  );
}
