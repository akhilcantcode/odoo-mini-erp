import { BaseEntity } from '../../../types';

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    costPrice: number | null;
  };
}

export interface PurchaseOrder extends BaseEntity {
  poNumber: string;
  vendorName: string;
  status: 'draft' | 'confirmed' | 'received';
  companyId: string;
  items: PurchaseOrderItem[];
}
