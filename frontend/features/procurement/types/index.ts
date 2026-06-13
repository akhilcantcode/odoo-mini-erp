export interface ProcurementRunResult {
  message: string;
  createdPurchaseOrders: Record<string, unknown>[];
  createdManufacturingOrders: Record<string, unknown>[];
}
