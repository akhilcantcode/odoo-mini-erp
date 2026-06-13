export interface ProcurementRule {
  id: string;
  productId: string;
  strategy: 'MTS' | 'MTO';
  minQty: number;
  maxQty: number;
}
