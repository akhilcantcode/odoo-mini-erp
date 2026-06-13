import { fetchApi } from '../../../services/api';
import { PurchaseOrder } from '../types';

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  return fetchApi('/purchase');
}

export async function getPurchaseOrder(id: string): Promise<PurchaseOrder> {
  return fetchApi(`/purchase/${id}`);
}

export async function createPurchaseOrder(data: {
  vendorName: string;
  vendorAddress?: string;
  responsiblePersonId?: string;
  items: { productId: string; quantity: number }[];
}): Promise<PurchaseOrder> {
  return fetchApi('/purchase', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function confirmPurchaseOrder(id: string): Promise<PurchaseOrder> {
  return fetchApi(`/purchase/${id}/confirm`, {
    method: 'POST',
  });
}

export async function receivePurchaseOrder(id: string): Promise<PurchaseOrder> {
  return fetchApi(`/purchase/${id}/receive`, {
    method: 'POST',
  });
}
