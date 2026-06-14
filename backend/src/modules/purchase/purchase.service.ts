import { PurchaseRepository } from './purchase.repository';
import { CreatePurchaseOrderSchema, CreatePurchaseOrderInput } from './purchase.types';
import { PurchaseOrderStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { prisma } from '../../config/prisma';

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
  async create(data: unknown, companyId: string, userId?: string) {
    await this.verifyPurchaseWrite(userId, companyId);
    const parsed = CreatePurchaseOrderSchema.parse(data);
    const po = await this.repository.create(parsed, companyId);
    await this.auditService.log('PurchaseOrder', po.id, 'CREATE', null, { vendorName: po.vendorName, status: po.status }, companyId, userId);
    return po;
  }

  /**
   * Confirm a draft purchase order.
   */
  async confirm(id: string, companyId: string, userId?: string) {
    await this.verifyPurchaseWrite(userId, companyId);
    const po = await this.getById(id, companyId);

    if (po.status !== PurchaseOrderStatus.draft) {
      const error = new Error('Only draft purchase orders can be confirmed') as Error & { statusCode: number };
      error.statusCode = 400;
      throw error;
    }

    const updated = await this.repository.updateStatus(id, PurchaseOrderStatus.confirmed, companyId);
    await this.auditService.log('PurchaseOrder', id, 'CONFIRM', { status: 'draft' }, { status: 'confirmed' }, companyId, userId);
    return updated;
  }

  /**
   * Receive a confirmed purchase order.
   * Increments inventory, writes stock ledger entries, updates status to received.
   */
  async receive(id: string, companyId: string, userId?: string) {
    await this.verifyPurchaseReceive(userId, companyId);
    const result = await this.repository.receive(id, companyId);
    await this.auditService.log('PurchaseOrder', id, 'RECEIVE', { status: 'confirmed' }, { status: 'received' }, companyId, userId);
    return result;
  }

  /**
   * Delete a purchase order and log a DELETE audit event.
   */
  async delete(id: string, companyId: string, userId?: string) {
    await this.verifyPurchaseWrite(userId, companyId);
    const po = await this.getById(id, companyId);
    const result = await this.repository.delete(id, companyId);
    await this.auditService.log(
      'PurchaseOrder',
      id,
      'DELETE',
      { vendorName: po.vendorName, status: po.status },
      null,
      companyId,
      userId
    );
    return result;
  }

  private async verifyPurchaseWrite(userId: string | undefined, companyId: string) {
    if (!userId) return;
    const user = await prisma.user.findFirst({
      where: { id: userId, companyId },
      include: { roles: { include: { role: true } } }
    });
    if (!user) return;
    const userRoles = user.roles.map(ur => ur.role.name);
    if (userRoles.some(r => r === 'OWNER' || r === 'ADMIN')) return;
    if (!userRoles.includes('PURCHASE') && !userRoles.includes('SALES')) {
      const error = new Error('Forbidden: Insufficient role privileges to modify Purchase Orders') as Error & { statusCode: number };
      error.statusCode = 403;
      throw error;
    }
  }

  private async verifyPurchaseReceive(userId: string | undefined, companyId: string) {
    if (!userId) return;
    const user = await prisma.user.findFirst({
      where: { id: userId, companyId },
      include: { roles: { include: { role: true } } }
    });
    if (!user) return;
    const userRoles = user.roles.map(ur => ur.role.name);
    if (userRoles.some(r => r === 'OWNER' || r === 'ADMIN')) return;
    if (!userRoles.includes('INVENTORY') && !userRoles.includes('INVENTORY_MANAGER')) {
      const error = new Error('Forbidden: Only Inventory Managers can receive Purchase Orders') as Error & { statusCode: number };
      error.statusCode = 403;
      throw error;
    }
  }
}
