'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../../services/api';
import { Loader2, Plus, Calendar, MoreHorizontal, DollarSign } from 'lucide-react';

export default function SalesPipelinePage() {
  const { data: sales, isLoading } = useQuery({ queryKey: ['salesOrders'], queryFn: () => fetchApi('/sales') });

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  const columns = [
    { id: 'draft', title: 'Leads', color: '#94A3B8', bgMuted: 'bg-slate-100 dark:bg-slate-800' },
    { id: 'confirmed', title: 'Qualified', color: 'var(--primary)', bgMuted: 'var(--primary-muted)' },
    { id: 'delivered', title: 'Closed Won', color: '#10B981', bgMuted: 'bg-emerald-50 dark:bg-emerald-950/20' },
  ];

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>Sales Pipeline</h1>
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Track and manage your leads and opportunities</p>
        </div>
        <button 
          className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-bold text-white rounded-xl transition-all shadow-md cursor-pointer"
          style={{ background: 'var(--primary)', boxShadow: '0 4px 14px rgba(0, 111, 238, 0.2)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--primary)'}
        >
          <Plus className="w-4 h-4" /> New Deal
        </button>
      </div>

      {/* Columns Container */}
      <div className="flex-1 flex gap-5 overflow-x-auto pb-4 items-start">
        {columns.map((col) => {
          const items = sales?.filter((s: any) => s.status === col.id) || [];
          const totalVal = items.reduce((sum: number, s: any) => 
            sum + s.items.reduce((is: number, i: any) => is + ((i.product?.salesPrice || 0) * i.quantity), 0), 0
          );

          return (
            <div key={col.id} className="w-[340px] shrink-0 flex flex-col max-h-full rounded-2xl p-4" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
              {/* Column Title */}
              <div className="flex items-center justify-between mb-4 pb-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: col.color }} />
                  <span className="text-[14px] font-bold" style={{ color: 'var(--text-main)' }}>{col.title}</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800" style={{ color: 'var(--text-muted)' }}>
                    {items.length}
                  </span>
                </div>
                <span className="text-[12px] font-extrabold" style={{ color: 'var(--text-muted)' }}>
                  ${totalVal.toLocaleString()}
                </span>
              </div>

              {/* Cards Container */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[calc(100vh-290px)]">
                {items.map((sale: any) => {
                  const total = sale.items.reduce((s: number, i: any) => s + ((i.product?.salesPrice || 0) * i.quantity), 0);
                  return (
                    <div 
                      key={sale.id}
                      className="rounded-xl p-4 transition-all duration-200 border cursor-pointer group hover:-translate-y-0.5"
                      style={{ background: 'var(--bg-app)', borderColor: 'var(--border-color)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-color-hover)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.02)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md" style={{ background: 'var(--bg-panel)', color: 'var(--primary)', border: '1px solid var(--border-color)' }}>
                          {sale.id}
                        </span>
                        <button className="opacity-0 group-hover:opacity-100 transition-all text-slate-400 hover:text-slate-600">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>

                      <h4 className="text-[14px] font-bold tracking-tight mb-1" style={{ color: 'var(--text-main)' }}>{sale.customerName}</h4>
                      <p className="text-[11px] mb-4 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                        {sale.items.map((i: any) => `${i.quantity}× ${i.product?.name || 'Item'}`).join(' · ')}
                      </p>

                      <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-light)' }}>
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(sale.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                        <span className="text-[14px] font-extrabold" style={{ color: 'var(--text-main)' }}>
                          ${total.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {items.length === 0 && (
                  <div className="py-12 text-center rounded-xl border-2 border-dashed flex flex-col items-center justify-center" style={{ borderColor: 'var(--border-color)' }}>
                    <p className="text-[12px] font-semibold" style={{ color: 'var(--text-light)' }}>No active deals</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
