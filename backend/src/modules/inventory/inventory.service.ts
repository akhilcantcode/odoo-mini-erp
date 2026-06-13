import { InventoryRepository } from './inventory.repository';
import { AdjustInventorySchema } from './inventory.types';
import { AuditService } from '../audit/audit.service';

export class InventoryService {
  private repository: InventoryRepository;
  private auditService: AuditService;

  constructor() {
    this.repository = new InventoryRepository();
    this.auditService = new AuditService();
  }

  /**
   * List all inventory with product names and free qty.
   */
  async list(companyId: string) {
    return this.repository.findAll(companyId);
  }

  /**
   * Get stock ledger entries.
   */
  async getLedger(companyId: string, productId?: string) {
    return this.repository.getLedger(companyId, productId);
  }

  /**
   * Perform a manual inventory adjustment.
   */
  async adjust(data: unknown, companyId: string) {
    const parsed = AdjustInventorySchema.parse(data);
    const result = await this.repository.adjust(parsed.productId, parsed.changeQty, parsed.reference, companyId);
    await this.auditService.log('Inventory', parsed.productId, 'ADJUST', null, { changeQty: parsed.changeQty, onHandQty: result.onHandQty }, companyId);
    return result;
  }
}
