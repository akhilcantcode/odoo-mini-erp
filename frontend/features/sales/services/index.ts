import { fetchApi } from '../../../services/api';
import { SalesOrder } from '../types';

export async function getSalesOrders(): Promise<SalesOrder[]> {
  return fetchApi('/sales');
}

export async function createSalesOrder(data: {
  customerName: string;
  customerAddress?: string;
  responsiblePersonId?: string;
  items: { productId: string; quantity: number }[];
}): Promise<SalesOrder> {
  return fetchApi('/sales', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function confirmSalesOrder(id: string): Promise<SalesOrder> {
  return fetchApi(`/sales/${id}/confirm`, {
    method: 'POST',
  });
}

export async function deliverSalesOrder(id: string): Promise<SalesOrder> {
  return fetchApi(`/sales/${id}/deliver`, {
    method: 'POST',
  });
}
