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
  scheduleDate?: string;
  assigneeId?: string;
  bomId?: string;
  items?: { productId: string; quantity: number }[];
  workOrders?: { operationName: string; workCenterName: string; plannedDuration: number }[];
}): Promise<ManufacturingOrder> {
  return fetchApi('/manufacturing', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function confirmManufacturingOrder(id: string): Promise<ManufacturingOrder> {
  return fetchApi(`/manufacturing/${id}/confirm`, {
    method: 'POST',
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

export async function cancelManufacturingOrder(id: string): Promise<ManufacturingOrder> {
  return fetchApi(`/manufacturing/${id}/cancel`, {
    method: 'POST',
  });
}

export async function toggleWorkOrder(id: string, workOrderId: string): Promise<any> {
  return fetchApi(`/manufacturing/${id}/work-orders/${workOrderId}/toggle`, {
    method: 'POST',
  });
}

export async function deleteManufacturingOrder(id: string): Promise<{ message: string }> {
  return fetchApi(`/manufacturing/${id}`, {
    method: 'DELETE',
  });
}
