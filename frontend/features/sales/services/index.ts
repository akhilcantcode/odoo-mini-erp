import { fetchApi } from '../../../services/api';
import { SalesOrder } from '../types';

export async function getSalesOrders(): Promise<SalesOrder[]> {
  return fetchApi('/sales');
}

export interface CreateSalesOrderResponse {
  order: SalesOrder;
  procuredMOs: { id: string; productName: string; quantity: number }[];
  procuredPOs: { id: string; vendorName: string; itemsCount: number }[];
}

export async function createSalesOrder(data: {
  customerName: string;
  customerAddress?: string;
  responsiblePersonId?: string;
  items: { productId: string; quantity: number }[];
  procurement?: {
    purchaseOrders: {
      vendorName: string;
      items: { productId: string; quantity: number }[];
    }[];
  };
}): Promise<CreateSalesOrderResponse> {
  return fetchApi('/sales', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function checkSalesOrderProcurement(data: {
  customerName: string;
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

export async function deleteSalesOrder(id: string): Promise<{ message: string }> {
  return fetchApi(`/sales/${id}`, {
    method: 'DELETE',
  });
}
