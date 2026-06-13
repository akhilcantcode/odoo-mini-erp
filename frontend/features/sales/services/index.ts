import { fetchApi } from '../../../services/api';
import { SalesOrder } from '../types';

export async function getSalesOrders(): Promise<SalesOrder[]> {
  return fetchApi('/sales');
}

export async function createSalesOrder(data: {
  customerName: string;
  items: { productId: string; quantity: number }[];
  procurement?: {
    purchaseOrders: {
      vendorName: string;
      items: { productId: string; quantity: number }[];
    }[];
  };
}): Promise<SalesOrder> {
  return fetchApi('/sales', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function checkSalesOrderProcurement(data: {
  items: { productId: string; quantity: number }[];
}): Promise<{
  available: boolean;
  autoManufacture: { productId: string; productName: string; quantity: number }[];
  purchaseRequirements: { productId: string; productName: string; shortageQty: number; recommendedQty: number }[];
}> {
  return fetchApi('/sales/check-procurement', {
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
