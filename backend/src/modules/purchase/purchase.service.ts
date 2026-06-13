import { PurchaseRepository } from './purchase.repository';
import { CreatePurchaseOrderSchema, CreatePurchaseOrderInput } from './purchase.types';
import { PurchaseOrderStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

export class PurchaseService {
  private repository: PurchaseRepository;
  private auditService: AuditService;

  constructor() {
    this.repository = new PurchaseRepository();
    this.auditService = new AuditService();
  }

  /**
   * List all purchase orders for the company.
   */
  async list(companyId: string) {
    return this.repository.findAll(companyId);
  }

  /**
   * Get a single purchase order by ID.
   * Throws 404 if not found.
   */
  async getById(id: string, companyId: string) {
    const po = await this.repository.findById(id, companyId);
    if (!po) {
      const error = new Error('Purchase order not found') as Error & { statusCode: number };
      error.statusCode = 404;
      throw error;
    }
    return po;
  }

  /**
   * Create a new purchase order in draft status.
   * Validates input with Zod.
   */
  async create(data: unknown, companyId: string) {
    const parsed = CreatePurchaseOrderSchema.parse(data);
    const po = await this.repository.create(parsed, companyId);
    await this.auditService.log('PurchaseOrder', po.id, 'CREATE', null, { vendorName: po.vendorName, status: po.status }, companyId);
    return po;
  }

  /**
   * Confirm a draft purchase order.
   */
  async confirm(id: string, companyId: string) {
    const po = await this.getById(id, companyId);

    if (po.status !== PurchaseOrderStatus.draft) {
      const error = new Error('Only draft purchase orders can be confirmed') as Error & { statusCode: number };
      error.statusCode = 400;
      throw error;
    }

    const updated = await this.repository.updateStatus(id, PurchaseOrderStatus.confirmed, companyId);
    await this.auditService.log('PurchaseOrder', id, 'CONFIRM', { status: 'draft' }, { status: 'confirmed' }, companyId);
    return updated;
  }

  /**
   * Receive a confirmed purchase order.
   * Increments inventory, writes stock ledger entries, updates status to received.
   */
  async receive(id: string, companyId: string) {
    const result = await this.repository.receive(id, companyId);
    await this.auditService.log('PurchaseOrder', id, 'RECEIVE', { status: 'confirmed' }, { status: 'received' }, companyId);
    return result;
  }
}
