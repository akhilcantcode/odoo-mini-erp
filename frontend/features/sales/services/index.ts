import { fetchApi } from '../../../services/api';
import { SalesOrder } from '../types';

export async function getSalesOrders(): Promise<SalesOrder[]> {
  return fetchApi('/sales');
}
