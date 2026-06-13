'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getAuditLogs } from '../../../features/audit/services';
import type { AuditLog } from '../../../features/audit/types';
import { Btn, Card, EmptyState, StatusBadge } from '../../../components/ui';
import { Search, RefreshCw, ScrollText } from 'lucide-react';

function AuditPageContent() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const searchParams = useSearchParams();

  useEffect(() => {
    const typeParam = searchParams.get('type');
    if (typeParam) {
      setFilterType(typeParam);
    }
  }, [searchParams]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setLogs(await getAuditLogs(filterType ? { entityType: filterType } : undefined));
    } catch {
      /* swallow */
    }
    setLoading(false);
  }, [filterType]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Audit Trail</h2>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Filter by entity type…"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 w-52"
            />
          </div>
          <Btn variant="ghost" size="sm" onClick={refresh}>
            <RefreshCw size={14} />
          </Btn>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCw size={20} className="animate-spin-slow text-sky-500" />
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ScrollText size={20} />}
            title="No audit logs"
            description="System actions will be recorded here."
          />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 text-left text-xs text-gray-500 font-medium">
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Entity Type</th>
                  <th className="px-5 py-3">Entity ID</th>
                  <th className="px-5 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-sky-50/30 transition">
                    <td className="px-5 py-3 font-medium text-gray-800">{log.action}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={log.entityType.toLowerCase()} />
                    </td>
                    <td className="px-5 py-3 text-gray-400 font-mono text-xs">
                      {log.entityId.slice(0, 12)}…
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
        <RefreshCw size={20} className="animate-spin-slow text-sky-500" />
      </div>
    }>
      <AuditPageContent />
    </Suspense>
  );
}
