import { BaseEntity } from '../../../types';

export interface InventoryItem extends BaseEntity {
  productId: string;
  onHand: number;
  reserved: number;
  available: number;
}
