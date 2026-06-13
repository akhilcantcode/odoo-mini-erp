import { BaseEntity } from '../../../types';
import { Product } from '../../product/types';

export interface SalesOrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  product?: Product;
}

export interface SalesOrder extends BaseEntity {
  customerName: string;
  customerAddress?: string;
  responsiblePersonId?: string;
  responsiblePerson?: {
    id: string;
    name: string;
    email: string;
  };
  status: string;
  items?: SalesOrderItem[];
}
