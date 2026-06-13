import { BaseEntity } from '../../../types';

export interface Product extends BaseEntity {
  name: string;
  sku: string;
  price: number;
}
