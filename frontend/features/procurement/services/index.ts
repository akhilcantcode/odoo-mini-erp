import { fetchApi } from '../../../services/api';

export interface ProcurementResult {
  message: string;
  createdPurchaseOrders: Record<string, unknown>[];
  createdManufacturingOrders: Record<string, unknown>[];
}

export async function runProcurement(): Promise<ProcurementResult> {
  return fetchApi('/procurement/run', {
    method: 'POST',
  });
}
