export interface InventoryItem {
  productId: string;
  productName: string;
  productImageUrl?: string | null;
  onHandQty: number;
  reservedQty: number;
  freeQty: number;
  updatedAt: string;
}

export interface StockLedgerEntry {
  id: string;
  productId: string;
  product: {
    name: string;
    imageUrl?: string | null;
  };
  changeQty: number;
  type: 'SALE' | 'PURCHASE' | 'MANUFACTURE_CONSUME' | 'MANUFACTURE_PRODUCE' | 'ADJUSTMENT';
  referenceId: string | null;
  createdAt: string;
}
