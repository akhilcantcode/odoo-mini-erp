import { BaseEntity } from '../../../types';

export interface ManufacturingOrder extends BaseEntity {
  moNumber: string;
  productId: string;
  qtyToProduce: number;
  status: string;
}
