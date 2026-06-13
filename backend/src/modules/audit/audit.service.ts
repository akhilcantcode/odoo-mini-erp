import { AuditRepository } from './audit.repository';
import { CreateAuditLogInput } from './audit.types';

export class AuditService {
  private repository: AuditRepository;

  constructor() {
    this.repository = new AuditRepository();
  }

  /**
   * List audit logs with optional filtering.
   */
  async list(companyId: string, filters?: { entityType?: string; entityId?: string }) {
    return this.repository.findAll(companyId, filters);
  }

  /**
   * Log an audit entry. Can be called from any service.
   *
   * @param entityType - e.g. "PurchaseOrder", "ManufacturingOrder", "Inventory"
   * @param entityId - UUID of the affected entity
   * @param action - e.g. "CREATE", "CONFIRM", "RECEIVE", "START", "COMPLETE", "ADJUST"
   * @param oldValue - previous state (optional)
   * @param newValue - new state (optional)
   * @param companyId - tenant company ID
   */
  async log(
    entityType: string,
    entityId: string,
    action: string,
    oldValue: any,
    newValue: any,
    companyId: string
  ) {
    return this.repository.create(
      { entityType, entityId, action, oldValue, newValue },
      companyId
    );
  }
}
