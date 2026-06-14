import { fetchApi } from '../../../services/api';
import { AuditPaginatedResponse, AuditStats } from '../types';

export async function getAuditLogs(filters?: {
  entityType?: string;
  entityId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}): Promise<AuditPaginatedResponse> {
  const params = new URLSearchParams();
  if (filters?.entityType) params.append('entityType', filters.entityType);
  if (filters?.entityId) params.append('entityId', filters.entityId);
  if (filters?.action) params.append('action', filters.action);
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.endDate) params.append('endDate', filters.endDate);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.pageSize) params.append('pageSize', filters.pageSize.toString());
  const queryStr = params.toString() ? `?${params.toString()}` : '';
  return fetchApi(`/audit${queryStr}`);
}

export async function getAuditStats(): Promise<AuditStats> {
  return fetchApi('/audit/stats');
}
