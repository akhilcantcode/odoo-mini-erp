import { BaseEntity } from '../../../types';

export interface ManufacturingOrder extends BaseEntity {
  moNumber: string;
  productId: string;
  qtyToProduce: number;
  status: 'draft' | 'confirmed' | 'in_progress' | 'done';
  companyId: string;
  product?: {
    id: string;
    name: string;
  };
}
