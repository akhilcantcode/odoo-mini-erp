import { BaseEntity } from '../../../types';
import { Product } from '../../product/types';

export interface ManufacturingOrderItem {
  id: string;
  manufacturingOrderId: string;
  productId: string;
  product?: Product;
  toConsumeQty: number;
  consumedQty: number;
}

export interface ManufacturingWorkOrder {
  id: string;
  manufacturingOrderId: string;
  operationName: string;
  workCenterName: string;
  plannedDuration: number;
  realDuration: number;
  status: 'pending' | 'in_progress' | 'finished';
}

export interface ManufacturingOrder extends BaseEntity {
  moNumber: string;
  productId: string;
  quantity: number;
  status: 'draft' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'done';
  companyId: string;
  product?: {
    id: string;
    name: string;
  };
  scheduleDate?: string;
  assigneeId?: string;
  assignee?: {
    id: string;
    name: string;
    email: string;
  } | null;
  bomId?: string;
  items?: ManufacturingOrderItem[];
  workOrders?: ManufacturingWorkOrder[];
}
