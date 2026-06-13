import { BaseEntity } from '../../../types';

export interface PurchaseOrder extends BaseEntity {
  poNumber: string;
  vendorId: string;
  status: string;
}
