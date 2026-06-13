/**
 * Response type for the procurement runner.
 */
export interface ProcurementRunResult {
  status: 'success';
  triggeredPurchaseOrders: {
    id: string;
    vendorName: string;
    items: { productId: string; quantity: number }[];
  }[];
  triggeredManufacturingOrders: {
    id: string;
    productId: string;
    quantity: number;
  }[];
}
