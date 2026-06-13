import { fetchApi } from '../../../services/api';
import { AuditLog } from '../types';

export async function getAuditLogs(): Promise<AuditLog[]> {
  return fetchApi('/audit');
}
