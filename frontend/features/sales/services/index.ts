import { fetchApi } from '../../../services/api';
import { SalesOrder } from '../types';

export async function getSalesOrders(): Promise<SalesOrder[]> {
  return fetchApi('/sales');
}

export async function createSalesOrder(data: {
  customerName: string;
  items: { productId: string; quantity: number }[];
}): Promise<SalesOrder> {
  return fetchApi('/sales', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
