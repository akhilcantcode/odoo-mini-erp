'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../../services/api';
import { Loader2, Plus, Search, Mail, Phone, MoreHorizontal } from 'lucide-react';

export default function ContactsPage() {
  const [search, setSearch] = useState('');
  const { data: contacts, isLoading } = useQuery({ queryKey: ['contacts'], queryFn: () => fetchApi('/contacts') });

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  const filtered = contacts?.filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.company.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>Contacts Directory</h1>
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{filtered.length} active entries found</p>
        </div>
        <button 
          className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-bold text-white rounded-xl transition-all shadow-md cursor-pointer"
          style={{ background: 'var(--primary)', boxShadow: '0 4px 14px rgba(0, 111, 238, 0.2)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--primary)'}
        >
          <Plus className="w-4 h-4" /> Add Contact
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-light)' }} />
        <input
          type="text"
          placeholder="Filter by name, company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-[13px] focus:outline-none transition-all"
          style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
          onFocus={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
          onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
        />
      </div>

      {/* Modern Data Table */}
      <div 
        className="rounded-2xl overflow-hidden border" 
        style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-color)', boxShadow: 'var(--shadow-card)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-light)' }}>Name</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-light)' }}>Company</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider hidden md:table-cell" style={{ color: 'var(--text-light)' }}>Email</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider hidden lg:table-cell" style={{ color: 'var(--text-light)' }}>Phone</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-light)' }}>Status</th>
                <th className="px-6 py-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
              {filtered.map((contact: any) => (
                <tr 
                  key={contact.id} 
                  className="group cursor-pointer transition-colors"
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-400 to-indigo-500 flex items-center justify-center text-[12px] font-bold text-white shadow-sm shrink-0">
                        {contact.name.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <div>
                        <div className="text-[13.5px] font-bold" style={{ color: 'var(--text-main)' }}>{contact.name}</div>
                        <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{contact.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[13px] font-medium" style={{ color: 'var(--text-main)' }}>{contact.company}</td>
                  <td className="px-6 py-4 text-[13px] hidden md:table-cell" style={{ color: 'var(--text-muted)' }}>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {contact.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[13px] hidden lg:table-cell" style={{ color: 'var(--text-muted)' }}>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {contact.phone}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span 
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full"
                      style={{ 
                        background: contact.status === 'active' ? 'var(--bg-badge-success)' : 'var(--bg-badge-danger)',
                        color: contact.status === 'active' ? 'var(--success)' : 'var(--danger)'
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: contact.status === 'active' ? 'var(--success)' : 'var(--danger)' }} />
                      {contact.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 transition-all">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-[13px] font-semibold text-slate-400">No contacts match the filter query.</p>
          </div>
        )}
      </div>
    </div>
  );
}
