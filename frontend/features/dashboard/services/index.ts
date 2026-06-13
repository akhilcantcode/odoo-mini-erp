import { fetchApi } from '../../../services/api';
import { DashboardStats } from '../types';

export async function getDashboardStats(): Promise<DashboardStats> {
  return fetchApi('/dashboard/stats');
}
