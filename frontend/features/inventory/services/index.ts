import { fetchApi } from '../../../services/api';
import { InventoryItem, StockLedgerEntry } from '../types';

export async function getInventory(): Promise<InventoryItem[]> {
  return fetchApi('/inventory');
}

export async function adjustInventory(data: {
  productId: string;
  changeQty: number;
  reference?: string;
}): Promise<InventoryItem> {
  return fetchApi('/inventory/adjust', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getStockLedger(productId?: string): Promise<StockLedgerEntry[]> {
  const params = productId ? `?productId=${productId}` : '';
  return fetchApi(`/inventory/ledger${params}`);
}
