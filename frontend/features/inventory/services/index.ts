import { fetchApi } from '../../../services/api';
import { InventoryItem } from '../types';

export async function getInventory(): Promise<InventoryItem[]> {
  return fetchApi('/inventory');
}
