'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getAuditLogs, getAuditStats } from '../../../features/audit/services';
import type { AuditLog, AuditStats, AuditPaginatedResponse } from '../../../features/audit/types';
import { Card, EmptyState } from '../../../components/ui';
import {
  RefreshCw, ScrollText, Filter, RotateCcw,
  ChevronLeft, ChevronRight, FileText, PenLine, Trash2, Activity
} from 'lucide-react';

/* ─── MODULE / ENTITY TYPE MAPPINGS ─── */
const MODULE_MAP: Record<string, string> = {
  SalesOrder: 'Sales',
  PurchaseOrder: 'Purchase',
  ManufacturingOrder: 'Manufacturing',
  Inventory: 'Inventory',
  BoM: 'Manufacturing',
  Product: 'Products',
};

const RECORD_TYPE_MAP: Record<string, string> = {
  SalesOrder: 'Sales Order',
  PurchaseOrder: 'Purchase Order',
  ManufacturingOrder: 'Manufacturing Order',
  Inventory: 'Item',
  BoM: 'Bill of Materials',
  Product: 'Product',
};

const ACTION_DISPLAY: Record<string, { label: string; color: string }> = {
  CREATE: { label: 'Created', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  SET: { label: 'Created', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CONFIRM: { label: 'Updated', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  DELIVER: { label: 'Updated', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  RECEIVE: { label: 'Updated', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  START: { label: 'Updated', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  COMPLETE: { label: 'Updated', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  ADJUST: { label: 'Updated', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  UPDATE: { label: 'Updated', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  DELETE: { label: 'Deleted', color: 'bg-red-50 text-red-700 border-red-200' },
  CANCEL: { label: 'Deleted', color: 'bg-red-50 text-red-700 border-red-200' },
};

const ALL_MODULES = ['All Modules', 'Sales', 'Purchase', 'Manufacturing', 'Inventory', 'Products'];
const MODULE_TO_ENTITY: Record<string, string> = {
  Sales: 'SalesOrder',
  Purchase: 'PurchaseOrder',
  Manufacturing: 'ManufacturingOrder',
  Inventory: 'Inventory',
  Products: 'Product',
};

const ALL_ACTIONS = ['All Actions', 'CREATE', 'CONFIRM', 'DELIVER', 'RECEIVE', 'START', 'COMPLETE', 'ADJUST', 'CANCEL', 'DELETE', 'SET'];

/* ─── HELPER: Extract field changes ─── */
function getFieldChanges(log: AuditLog): { field: string; oldVal: string; newVal: string } {
  const oldValue = log.oldValue as Record<string, unknown> | null;
  const newValue = log.newValue as Record<string, unknown> | null;

  if (!oldValue && !newValue) return { field: '-', oldVal: '-', newVal: '-' };

  if (!oldValue && newValue) {
    // Created — show main field
    const keys = Object.keys(newValue);
    if (keys.length === 0) return { field: '-', oldVal: '-', newVal: '-' };
    return { field: '-', oldVal: '-', newVal: '-' };
  }

  if (oldValue && newValue) {
    // Find changed fields
    const allKeys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);
    const changedKeys: string[] = [];
    for (const key of allKeys) {
      if (JSON.stringify(oldValue[key]) !== JSON.stringify(newValue[key])) {
        changedKeys.push(key);
      }
    }
    if (changedKeys.length === 0) return { field: '-', oldVal: '-', newVal: '-' };

    const mainKey = changedKeys[0];
    const label = mainKey.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
    return {
      field: label,
      oldVal: formatValue(oldValue[mainKey]),
      newVal: formatValue(newValue[mainKey]),
    };
  }

  return { field: '-', oldVal: '-', newVal: '-' };
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '-';
  if (typeof val === 'number') return val.toLocaleString();
  if (typeof val === 'string') return val;
  return JSON.stringify(val);
}

/* ─── MAIN COMPONENT ─── */
function AuditPageContent() {
  const searchParams = useSearchParams();
  const [response, setResponse] = useState<AuditPaginatedResponse>({ data: [], total: 0, page: 1, pageSize: 25 });
  const [stats, setStats] = useState<AuditStats>({ total: 0, creates: 0, updates: 0, deletes: 0 });
  const [loading, setLoading] = useState(true);

  // Filter state
  const [filterModule, setFilterModule] = useState('All Modules');
  const [filterAction, setFilterAction] = useState('All Actions');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Applied filters (only applied when user clicks "Filter")
  const [appliedFilters, setAppliedFilters] = useState<{
    entityType?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }>({});

  useEffect(() => {
    const typeParam = searchParams.get('type');
    if (typeParam) {
      // Map entity type to module for display
      for (const [mod, entity] of Object.entries(MODULE_TO_ENTITY)) {
        if (entity === typeParam) {
          setFilterModule(mod);
          setAppliedFilters(prev => ({ ...prev, entityType: typeParam }));
          break;
        }
      }
    }
  }, [searchParams]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const filters: Record<string, unknown> = {
        page: currentPage,
        pageSize,
      };
      if (appliedFilters.entityType) filters.entityType = appliedFilters.entityType;
      if (appliedFilters.action) filters.action = appliedFilters.action;
      if (appliedFilters.startDate) filters.startDate = appliedFilters.startDate;
      if (appliedFilters.endDate) filters.endDate = appliedFilters.endDate;

      const [logRes, statsRes] = await Promise.all([
        getAuditLogs(filters as any),
        getAuditStats(),
      ]);
      setResponse(logRes);
      setStats(statsRes);
    } catch {
      /* swallow */
    }
    setLoading(false);
  }, [currentPage, appliedFilters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilter = () => {
    const newFilters: typeof appliedFilters = {};
    if (filterModule !== 'All Modules') {
      newFilters.entityType = MODULE_TO_ENTITY[filterModule] || filterModule;
    }
    if (filterAction !== 'All Actions') {
      newFilters.action = filterAction;
    }
    if (filterStartDate) newFilters.startDate = filterStartDate;
    if (filterEndDate) newFilters.endDate = filterEndDate;
    setAppliedFilters(newFilters);
    setCurrentPage(1);
  };

  const handleReset = () => {
    setFilterModule('All Modules');
    setFilterAction('All Actions');
    setFilterStartDate('');
    setFilterEndDate('');
    setAppliedFilters({});
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(response.total / pageSize));

  // Generate page numbers to show
  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ─── HEADER ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Audit Logs</h2>
          <p className="text-xs text-gray-500 mt-0.5">Track all system changes and user activity</p>
        </div>
      </div>

      {/* ─── STAT CARDS ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Logs */}
        <div className="relative overflow-hidden rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-4 shadow-sm">
          <div className="absolute top-3 right-3 p-1.5 rounded-lg bg-sky-100/60">
            <Activity size={16} className="text-sky-500" />
          </div>
          <p className="text-xs font-medium text-sky-600 uppercase tracking-wide">Total Logs</p>
          <p className="text-2xl font-bold text-sky-700 mt-1">{stats.total.toLocaleString()}</p>
          <p className="text-[10px] text-sky-500 mt-0.5">All time logs</p>
        </div>

        {/* Create Actions */}
        <div className="relative overflow-hidden rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
          <div className="absolute top-3 right-3 p-1.5 rounded-lg bg-emerald-100/60">
            <FileText size={16} className="text-emerald-500" />
          </div>
          <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Create Actions</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.creates.toLocaleString()}</p>
          <p className="text-[10px] text-emerald-500 mt-0.5">Records Created</p>
        </div>

        {/* Update Actions */}
        <div className="relative overflow-hidden rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
          <div className="absolute top-3 right-3 p-1.5 rounded-lg bg-amber-100/60">
            <PenLine size={16} className="text-amber-500" />
          </div>
          <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Update Actions</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{stats.updates.toLocaleString()}</p>
          <p className="text-[10px] text-amber-500 mt-0.5">Records Updated</p>
        </div>

        {/* Delete Actions */}
        <div className="relative overflow-hidden rounded-xl border border-red-100 bg-gradient-to-br from-red-50 to-white p-4 shadow-sm">
          <div className="absolute top-3 right-3 p-1.5 rounded-lg bg-red-100/60">
            <Trash2 size={16} className="text-red-400" />
          </div>
          <p className="text-xs font-medium text-red-500 uppercase tracking-wide">Delete Actions</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{stats.deletes.toLocaleString()}</p>
          <p className="text-[10px] text-red-400 mt-0.5">Records Deleted</p>
        </div>
      </div>

      {/* ─── FILTER BAR ─── */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Date Range */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Date Range</label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={filterStartDate}
                onChange={e => setFilterStartDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 w-[130px]"
              />
              <span className="text-xs text-gray-400">–</span>
              <input
                type="date"
                value={filterEndDate}
                onChange={e => setFilterEndDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 w-[130px]"
              />
            </div>
          </div>

          {/* Module */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Module</label>
            <select
              value={filterModule}
              onChange={e => setFilterModule(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 min-w-[130px] cursor-pointer"
            >
              {ALL_MODULES.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Actions</label>
            <select
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 min-w-[130px] cursor-pointer"
            >
              {ALL_ACTIONS.map(a => (
                <option key={a} value={a}>{a === 'All Actions' ? a : a}</option>
              ))}
            </select>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleFilter}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition shadow-sm cursor-pointer"
            >
              <Filter size={12} /> Filter
            </button>
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 transition cursor-pointer"
            >
              <RotateCcw size={12} /> Reset
            </button>
          </div>

          {/* Spacer + Pagination */}
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            {getPageNumbers().map((pg, i) =>
              typeof pg === 'string' ? (
                <span key={`ellipsis-${i}`} className="px-1.5 text-xs text-gray-400">…</span>
              ) : (
                <button
                  key={pg}
                  onClick={() => setCurrentPage(pg)}
                  className={`w-7 h-7 rounded-md text-xs font-medium transition cursor-pointer ${
                    pg === currentPage
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {pg}
                </button>
              )
            )}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </Card>

      {/* ─── TABLE ─── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCw size={20} className="animate-spin text-sky-500" />
        </div>
      ) : response.data.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ScrollText size={20} />}
            title="No audit logs found"
            description="Try adjusting your filters or check back later."
          />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 text-left text-[11px] text-gray-500 font-semibold uppercase tracking-wider">
                  <th className="px-4 py-3 whitespace-nowrap">Date & Time</th>
                  <th className="px-4 py-3 whitespace-nowrap">User</th>
                  <th className="px-4 py-3 whitespace-nowrap">Module</th>
                  <th className="px-4 py-3 whitespace-nowrap">Record Type</th>
                  <th className="px-4 py-3 whitespace-nowrap">Record ID</th>
                  <th className="px-4 py-3 whitespace-nowrap">Action</th>
                  <th className="px-4 py-3 whitespace-nowrap">Field Changed</th>
                  <th className="px-4 py-3 whitespace-nowrap text-right">Old Value</th>
                  <th className="px-4 py-3 whitespace-nowrap text-right">New Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {response.data.map(log => {
                  const actionMeta = ACTION_DISPLAY[log.action] || { label: log.action, color: 'bg-gray-100 text-gray-600 border-gray-200' };
                  const changes = getFieldChanges(log);
                  const module = MODULE_MAP[log.entityType] || log.entityType;
                  const recordType = RECORD_TYPE_MAP[log.entityType] || log.entityType;
                  const userName = log.user?.name || '—';

                  return (
                    <tr key={log.id} className="hover:bg-sky-50/30 transition group">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })},{' '}
                        {new Date(log.createdAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-gray-700 whitespace-nowrap">
                        {userName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700">
                          {module}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                        {recordType}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono whitespace-nowrap">
                        {log.entityId.length > 14 ? `${log.entityId.slice(0, 14)}…` : log.entityId}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${actionMeta.color}`}>
                          {actionMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {changes.field}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap text-right font-mono">
                        {changes.oldVal}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap text-right font-mono font-medium">
                        {changes.newVal}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom pagination info */}
          <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-500">
            <span>
              Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, response.total)} of {response.total.toLocaleString()} logs
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronLeft size={12} />
              </button>
              <span className="px-2 text-xs font-medium text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function AuditPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-16">
        <RefreshCw size={20} className="animate-spin text-sky-500" />
      </div>
    }>
      <AuditPageContent />
    </Suspense>
  );
}
