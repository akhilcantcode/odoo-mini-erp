import { fetchApi } from '../../../services/api';
import { Product, BoM } from '../types';

export async function getProducts(filters?: {
  procurementType?: string;
  procureOnDemand?: string;
}): Promise<Product[]> {
  const params = new URLSearchParams();
  if (filters?.procurementType) {
    params.append('procurementType', filters.procurementType);
  }
  if (filters?.procureOnDemand !== undefined) {
    params.append('procureOnDemand', filters.procureOnDemand);
  }
  const queryStr = params.toString() ? `?${params.toString()}` : '';
  return fetchApi(`/products${queryStr}`);
}

export async function getProduct(id: string): Promise<Product> {
  return fetchApi(`/products/${id}`);
}

export async function createProduct(data: {
  name: string;
  salesPrice?: number | null;
  costPrice?: number | null;
  procurementType: 'purchase' | 'manufacture';
  procureOnDemand?: boolean;
}): Promise<Product> {
  return fetchApi('/products', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProduct(
  id: string,
  data: {
    name?: string;
    salesPrice?: number | null;
    costPrice?: number | null;
    procurementType?: 'purchase' | 'manufacture';
    procureOnDemand?: boolean;
  }
): Promise<Product> {
  return fetchApi(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getBom(productId: string): Promise<BoM> {
  return fetchApi(`/products/${productId}/bom`);
}

export async function setBom(
  productId: string,
  data: {
    quantity: number;
    reference?: string | null;
    items: { componentId: string; quantity: number }[];
    operations?: { operationName: string; workCenterName: string; plannedDuration: number }[];
  }
): Promise<BoM> {
  return fetchApi(`/products/${productId}/bom`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

