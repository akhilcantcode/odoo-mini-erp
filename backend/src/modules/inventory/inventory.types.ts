export interface InventoryItem {
  id: string;
  productId: string;
  onHand: number;
  reserved: number;
  available: number;
}
