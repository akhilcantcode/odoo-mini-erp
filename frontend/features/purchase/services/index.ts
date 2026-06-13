import { fetchApi } from '../../../services/api';
import { PurchaseOrder } from '../types';

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  return fetchApi('/purchase');
}
