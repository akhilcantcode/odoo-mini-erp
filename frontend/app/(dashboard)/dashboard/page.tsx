'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../../services/api';
import { TrendingUp, Package, Activity, Users, ArrowUpRight, Loader2, ExternalLink, Calendar, Search, ArrowUpDown, Filter } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const { data: stats, isLoading: sl } = useQuery({ queryKey: ['dashboardStats'], queryFn: () => fetchApi('/dashboard/stats') });
  const { data: auditLogs, isLoading: al } = useQuery({ queryKey: ['auditLogs'], queryFn: () => fetchApi('/audit') });
  const { data: sales, isLoading: salesLoading } = useQuery({ queryKey: ['salesOrders'], queryFn: () => fetchApi('/sales') });
  const { data: contacts, isLoading: contactsLoading } = useQuery({ queryKey: ['contacts'], queryFn: () => fetchApi('/contacts') });

  // Calculate stats from dynamic database
  const totalRevenue = useMemo(() => {
    if (!sales) return 20245; // Default fallback to match screenshot
    return sales.reduce((sum: number, order: any) => {
      return sum + order.items.reduce((s: number, i: any) => s + ((i.product?.salesPrice || 0) * i.quantity), 0);
    }, 0);
  }, [sales]);

  const activeSalesCount = useMemo(() => {
    if (!sales) return 15;
    return sales.filter((s: any) => s.status !== 'delivered').length;
  }, [sales]);

  const pipelineSummary = useMemo(() => {
    if (!sales) return { draft: 1, confirmed: 2, delivered: 1, total: 4 };
    const draft = sales.filter((s: any) => s.status === 'draft').length;
    const confirmed = sales.filter((s: any) => s.status === 'confirmed').length;
    const delivered = sales.filter((s: any) => s.status === 'delivered').length;
    return { draft, confirmed, delivered, total: draft + confirmed + delivered || 1 };
  }, [sales]);

  const chartData = [
    { m: 'Jan', val: 240, label: '$240.00' },
    { m: 'Feb', val: 380, label: '$380.00' },
    { m: 'Mar', val: 310, label: '$310.00' },
    { m: 'Apr', val: 490, label: '$490.00' },
    { m: 'May', val: 420, label: '$420.00' },
    { m: 'Jun', val: 570, label: '$570.00 June 2024' },
    { m: 'Jul', val: 480, label: '$480.00' },
    { m: 'Aug', val: 510, label: '$510.00' },
  ];

  if (sl || al || salesLoading || contactsLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── METRIC CARDS ROW ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Earning Card */}
        <div 
          className="rounded-2xl p-6 transition-all"
          style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-[13px] font-bold" style={{ color: 'var(--text-muted)' }}>Total Earning</span>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-[32px] font-extrabold tracking-tight" style={{ color: 'var(--text-main)' }}>
              ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
              +12% $19,054 Last month
            </span>
          </div>
        </div>

        {/* In Progress Card */}
        <div 
          className="rounded-2xl p-6 transition-all"
          style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-[13px] font-bold" style={{ color: 'var(--text-muted)' }}>In Progress</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-[32px] font-extrabold tracking-tight" style={{ color: 'var(--text-main)' }}>
              {activeSalesCount} Sales
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
              76% 26 Sales yesterday
            </span>
          </div>
        </div>
      </div>

      {/* ─── GRAPH & LIST ROW ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Sales SVG Bar Graph */}
        <div 
          className="lg:col-span-2 rounded-2xl p-6 flex flex-col justify-between"
          style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-[15px] font-bold" style={{ color: 'var(--text-main)' }}>Monthly Sales</h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Overview of sales performance</p>
            </div>
            <div className="flex gap-1">
              <span className="text-[10px] px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">2026</span>
            </div>
          </div>

          <div className="relative h-48 flex items-end justify-between gap-3 px-2">
            {chartData.map((d, i) => {
              const h = (d.val / 600) * 100;
              const isHovered = hoveredBar === i;
              return (
                <div 
                  key={i} 
                  className="flex-1 flex flex-col items-center relative group cursor-pointer"
                  onMouseEnter={() => setHoveredBar(i)}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  {/* Tooltip on hover */}
                  <div 
                    className={`absolute -top-10 px-3 py-1.5 rounded-lg text-[10px] font-bold text-white bg-slate-900 dark:bg-slate-800 shadow-lg pointer-events-none transition-all duration-200 z-10 whitespace-nowrap ${
                      isHovered ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95'
                    }`}
                  >
                    {d.label}
                  </div>

                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-lg overflow-hidden h-36 flex items-end">
                    <div 
                      className="w-full rounded-t-lg transition-all duration-300"
                      style={{ 
                        height: `${h}%`, 
                        background: isHovered ? 'var(--primary)' : 'rgba(0, 111, 238, 0.4)' 
                      }} 
                    />
                  </div>
                  <span className="text-[10px] font-bold mt-2" style={{ color: isHovered ? 'var(--text-main)' : 'var(--text-light)' }}>
                    {d.m}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Transaction History Mockup */}
        <div 
          className="rounded-2xl p-6"
          style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[15px] font-bold" style={{ color: 'var(--text-main)' }}>Transaction History</h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Keep track of transactions easily</p>
            </div>
            <Link href="/sales" className="text-slate-400 hover:text-blue-500 transition-colors">
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-4">
            <div className="flex text-[11px] font-bold uppercase tracking-wider pb-2 border-b" style={{ borderColor: 'var(--border-color)', color: 'var(--text-light)' }}>
              <span className="w-1/4">ID Order</span>
              <span className="w-2/5">Date</span>
              <span className="w-1/3 text-right">Total</span>
            </div>
            <div className="space-y-3">
              {(sales || []).slice(0, 4).map((order: any, idx: number) => {
                const total = order.items.reduce((s: number, i: any) => s + ((i.product?.salesPrice || 0) * i.quantity), 0);
                return (
                  <div key={order.id || idx} className="flex items-center text-[13px] font-medium" style={{ color: 'var(--text-main)' }}>
                    <span className="w-1/4 font-semibold">{order.id}</span>
                    <span className="w-2/5 text-slate-400">{new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span className="w-1/3 text-right font-bold">${total.toLocaleString()}</span>
                  </div>
                );
              })}
              {(!sales || sales.length === 0) && (
                <div className="space-y-3">
                  <div className="flex items-center text-[13px] font-medium">
                    <span className="w-1/4 font-semibold">#001</span>
                    <span className="w-2/5 text-slate-400">2026-06-12</span>
                    <span className="w-1/3 text-right font-bold">$1,040</span>
                  </div>
                  <div className="flex items-center text-[13px] font-medium">
                    <span className="w-1/4 font-semibold">#002</span>
                    <span className="w-2/5 text-slate-400">2026-06-11</span>
                    <span className="w-1/3 text-right font-bold">$710</span>
                  </div>
                  <div className="flex items-center text-[13px] font-medium">
                    <span className="w-1/4 font-semibold">#003</span>
                    <span className="w-2/5 text-slate-400">2026-06-10</span>
                    <span className="w-1/3 text-right font-bold">$2,700</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── CONTACTS & PIPELINE ROW ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Contact Management Component */}
        <div 
          className="lg:col-span-3 rounded-2xl p-6"
          style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[15px] font-bold" style={{ color: 'var(--text-main)' }}>Contact Management</h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Manage relationship with customers</p>
            </div>
            <div className="flex gap-2">
              <button className="p-1.5 rounded-lg border text-slate-400" style={{ borderColor: 'var(--border-color)' }}>
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 rounded-lg border text-slate-400" style={{ borderColor: 'var(--border-color)' }}>
                <Filter className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
            {(contacts || []).slice(0, 3).map((c: any, i: number) => (
              <div key={c.id || i} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-400 to-indigo-500 flex items-center justify-center text-[11px] font-bold text-white shadow-sm shrink-0">
                    {c.name.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold" style={{ color: 'var(--text-main)' }}>{c.name}</h4>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{c.role} · {c.company}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold" style={{ color: 'var(--text-main)' }}>{c.phone}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-light)' }}>{c.email}</p>
                </div>
              </div>
            ))}
            {(!contacts || contacts.length === 0) && (
              <div className="space-y-3">
                {[
                  { name: 'Leslie Alexander', role: 'VP Operations', company: 'Aria Design', email: 'leslie@aria.com', phone: '(555) 019-2834' },
                  { name: 'Kristin Watson', role: 'Supply Manager', company: 'Globex Corp', email: 'kristin@globex.com', phone: '(555) 014-9982' },
                  { name: 'Dianne Russell', role: 'Purchasing Lead', company: 'Acme Furnishings', email: 'dianne@acme.com', phone: '(555) 012-7364' },
                ].map((c, i) => (
                  <div key={i} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-400 to-indigo-500 flex items-center justify-center text-[11px] font-bold text-white shadow-sm shrink-0">
                        {c.name.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <div>
                        <h4 className="text-[13px] font-bold" style={{ color: 'var(--text-main)' }}>{c.name}</h4>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{c.role} · {c.company}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-semibold" style={{ color: 'var(--text-main)' }}>{c.phone}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-light)' }}>{c.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sales Pipeline Circular Donut Chart */}
        <div 
          className="lg:col-span-2 rounded-2xl p-6 flex flex-col justify-between"
          style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}
        >
          <div>
            <h3 className="text-[15px] font-bold" style={{ color: 'var(--text-main)' }}>Sales Pipeline</h3>
            <p className="text-[11px] mb-4" style={{ color: 'var(--text-muted)' }}>Status of funnel pipeline deals</p>
          </div>

          <div className="relative flex items-center justify-center py-2">
            {/* SVG Donut */}
            <svg width="140" height="140" viewBox="0 0 36 36" className="transform -rotate-90">
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--border-color)" strokeWidth="3" />
              {/* Draft slice (gray) */}
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#94A3B8" strokeWidth="3.2" 
                strokeDasharray={`${(pipelineSummary.draft / pipelineSummary.total) * 100} ${100 - (pipelineSummary.draft / pipelineSummary.total) * 100}`}
                strokeDashoffset="0"
              />
              {/* Confirmed slice (blue) */}
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--primary)" strokeWidth="3.2" 
                strokeDasharray={`${(pipelineSummary.confirmed / pipelineSummary.total) * 100} ${100 - (pipelineSummary.confirmed / pipelineSummary.total) * 100}`}
                strokeDashoffset={`-${(pipelineSummary.draft / pipelineSummary.total) * 100}`}
              />
              {/* Delivered slice (green) */}
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10B981" strokeWidth="3.2" 
                strokeDasharray={`${(pipelineSummary.delivered / pipelineSummary.total) * 100} ${100 - (pipelineSummary.delivered / pipelineSummary.total) * 100}`}
                strokeDashoffset={`-${((pipelineSummary.draft + pipelineSummary.confirmed) / pipelineSummary.total) * 100}`}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-[18px] font-extrabold" style={{ color: 'var(--text-main)' }}>{pipelineSummary.total}</span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Total Deals</span>
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 text-center border-t text-[11px] font-bold" style={{ borderColor: 'var(--border-color)' }}>
            <div>
              <div className="text-[#94A3B8]">• Lead</div>
              <div style={{ color: 'var(--text-main)' }}>{pipelineSummary.draft}</div>
            </div>
            <div>
              <div className="text-blue-500">• Qualified</div>
              <div style={{ color: 'var(--text-main)' }}>{pipelineSummary.confirmed}</div>
            </div>
            <div>
              <div className="text-emerald-500">• Closed</div>
              <div style={{ color: 'var(--text-main)' }}>{pipelineSummary.delivered}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── LIVE AUDIT LOG ACTIVITY ─── */}
      <div 
        className="rounded-2xl p-6"
        style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-bold" style={{ color: 'var(--text-main)' }}>Recent Activity</h3>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Audit
          </span>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
          {(auditLogs || []).slice(0, 4).map((log: any, idx: number) => (
            <div key={log.id || idx} className="flex items-center justify-between py-3 text-[13px]">
              <div className="flex items-center gap-3">
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ 
                    background: log.action.includes('CREATE') ? '#10B981' : log.action.includes('CONFIRM') ? 'var(--primary)' : '#FBBF24' 
                  }} 
                />
                <div>
                  <span className="font-bold" style={{ color: 'var(--text-main)' }}>{log.action.replace(/_/g, ' ')}</span>
                  <span className="text-slate-400 ml-2">{log.entityType}</span>
                </div>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {new Date(log.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
