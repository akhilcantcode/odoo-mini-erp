import { fetchApi } from '../../../services/api';
import { ManufacturingOrder } from '../types';

export async function getManufacturingOrders(): Promise<ManufacturingOrder[]> {
  return fetchApi('/manufacturing');
}

export async function getManufacturingOrder(id: string): Promise<ManufacturingOrder> {
  return fetchApi(`/manufacturing/${id}`);
}

export async function createManufacturingOrder(data: {
  productId: string;
  quantity: number;
}): Promise<ManufacturingOrder> {
  return fetchApi('/manufacturing', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function startManufacturingOrder(id: string): Promise<ManufacturingOrder> {
  return fetchApi(`/manufacturing/${id}/start`, {
    method: 'POST',
  });
}

export async function completeManufacturingOrder(id: string): Promise<ManufacturingOrder> {
  return fetchApi(`/manufacturing/${id}/complete`, {
    method: 'POST',
  });
}
