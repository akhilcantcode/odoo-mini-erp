import { BaseEntity } from '../../../types';

export interface Product extends BaseEntity {
  name: string;
  salesPrice: number | null;
  costPrice: number | null;
  procurementType: 'purchase' | 'manufacture';
  procureOnDemand: boolean;
  inventory?: {
    onHandQty: number;
    reservedQty: number;
  };
}

export interface BoMItem {
  id: string;
  bomId: string;
  componentId: string;
  quantity: number;
  component: {
    id: string;
    name: string;
    costPrice: number | null;
  };
}

export interface BoM {
  id: string;
  productId: string;
  companyId: string;
  items: BoMItem[];
}

