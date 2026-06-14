import { AuditRepository } from './audit.repository';
import { CreateAuditLogInput } from './audit.types';

export class AuditService {
  private repository: AuditRepository;

  constructor() {
    this.repository = new AuditRepository();
  }

  /**
   * List audit logs with optional filtering and pagination.
   */
  async list(
    companyId: string,
    filters?: {
      entityType?: string;
      entityId?: string;
      action?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      pageSize?: number;
    }
  ) {
    return this.repository.findAll(companyId, filters);
  }

  /**
   * Get aggregate stats (total, creates, updates, deletes).
   */
  async getStats(companyId: string) {
    return this.repository.getStats(companyId);
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
   * @param userId - the user who performed the action (optional)
   */
  async log(
    entityType: string,
    entityId: string,
    action: string,
    oldValue: any,
    newValue: any,
    companyId: string,
    userId?: string
  ) {
    return this.repository.create(
      { entityType, entityId, action, oldValue, newValue, userId },
      companyId
    );
  }
}
