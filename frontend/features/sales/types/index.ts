import { BaseEntity } from '../../../types';

export interface SalesOrder extends BaseEntity {
  orderNumber: string;
  customerId: string;
  status: string;
}
