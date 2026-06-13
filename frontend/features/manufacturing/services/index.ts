import { fetchApi } from '../../../services/api';
import { ManufacturingOrder } from '../types';

export async function getManufacturingOrders(): Promise<ManufacturingOrder[]> {
  return fetchApi('/manufacturing');
}
