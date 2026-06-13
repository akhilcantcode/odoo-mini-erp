import { fetchApi } from '../../../services/api';
import { AuditLog } from '../types';

export async function getAuditLogs(filters?: {
  entityType?: string;
  entityId?: string;
}): Promise<AuditLog[]> {
  const params = new URLSearchParams();
  if (filters?.entityType) params.append('entityType', filters.entityType);
  if (filters?.entityId) params.append('entityId', filters.entityId);
  const queryStr = params.toString() ? `?${params.toString()}` : '';
  return fetchApi(`/audit${queryStr}`);
}
