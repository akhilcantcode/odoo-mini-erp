import { BaseEntity } from '../../../types';

export interface Product extends BaseEntity {
  name: string;
  salesPrice: number | null;
  costPrice: number | null;
  procurementType: 'purchase' | 'manufacture';
  procureOnDemand: boolean;
  imageUrl?: string | null;
  inventory?: {
    onHandQty: number;
    reservedQty: number;
  };
  bom?: BoM;
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

export interface BoMOperation {
  id: string;
  bomId: string;
  operationName: string;
  workCenterName: string;
  plannedDuration: number;
}

export interface BoM {
  id: string;
  productId: string;
  companyId: string;
  quantity: number;
  reference: string | null;
  items: BoMItem[];
  operations?: BoMOperation[];
}

