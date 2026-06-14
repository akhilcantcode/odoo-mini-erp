import { prisma } from '../../config/prisma';
import { ManufacturingRepository } from './manufacturing.repository';
import { CreateManufacturingOrderSchema, ConsumedComponent } from './manufacturing.types';
import { ManufacturingStatus, StockMovementType } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

export class ManufacturingService {
  private repository: ManufacturingRepository;
  private auditService: AuditService;

  constructor() {
    this.repository = new ManufacturingRepository();
    this.auditService = new AuditService();
  }

  /**
   * List all manufacturing orders.
   */
  async list(companyId: string) {
    return this.repository.findAll(companyId);
  }

  /**
   * Get a single manufacturing order by ID.
   */
  async getById(id: string, companyId: string) {
    const mo = await this.repository.findById(id, companyId);
    if (!mo) {
      const error = new Error('Manufacturing order not found') as Error & { statusCode: number };
      error.statusCode = 404;
      throw error;
    }
    return mo;
  }

  /**
   * Create a new manufacturing order.
   */
  async create(data: unknown, companyId: string, userId?: string) {
    await this.verifyManufacturingWrite(userId, companyId);
    const parsed = CreateManufacturingOrderSchema.parse(data);
    const mo = await this.repository.create(parsed, companyId);
    await this.auditService.log('ManufacturingOrder', mo.id, 'CREATE', null, { productId: mo.productId, quantity: mo.quantity, status: mo.status }, companyId, userId);
    return mo;
  }

  /**
   * Confirm a manufacturing order (draft -> confirmed)
   */
  async confirm(id: string, companyId: string, userId?: string) {
    await this.verifyManufacturingWrite(userId, companyId);
    const mo = await this.getById(id, companyId);

    if (mo.status !== ManufacturingStatus.draft) {
      const error = new Error('Only draft manufacturing orders can be confirmed') as Error & { statusCode: number };
      error.statusCode = 400;
      throw error;
    }

    const updatedMo = await this.repository.updateStatus(id, ManufacturingStatus.confirmed);
    await this.auditService.log('ManufacturingOrder', id, 'CONFIRM', { status: 'draft' }, { status: 'confirmed' }, companyId, userId);
    return updatedMo;
  }

  /**
   * Cancel a manufacturing order (draft/confirmed/in_progress -> cancelled)
   */
  async cancel(id: string, companyId: string, userId?: string) {
    await this.verifyManufacturingWrite(userId, companyId);
    const mo = await this.getById(id, companyId);

    if (mo.status === ManufacturingStatus.completed || mo.status === ManufacturingStatus.cancelled) {
      const error = new Error('Cannot cancel a completed or already cancelled manufacturing order') as Error & { statusCode: number };
      error.statusCode = 400;
      throw error;
    }

    const updatedMo = await this.repository.updateStatus(id, ManufacturingStatus.cancelled);
    await this.auditService.log('ManufacturingOrder', id, 'CANCEL', { status: mo.status }, { status: 'cancelled' }, companyId, userId);
    return updatedMo;
  }

  /**
   * Start a manufacturing order — consume components from inventory.
   * Allows transitioning from either draft or confirmed.
   */
  async start(id: string, companyId: string, userId?: string) {
    await this.verifyManufacturingWrite(userId, companyId);
    const mo = await this.getById(id, companyId);

    if (mo.status !== ManufacturingStatus.draft && mo.status !== ManufacturingStatus.confirmed) {
      const error = new Error('Manufacturing order must be draft or confirmed to start') as Error & { statusCode: number };
      error.statusCode = 400;
      throw error;
    }

    const result = await prisma.$transaction(async (tx) => {
      // Fetch the MO with items
      const moWithItems = await tx.manufacturingOrder.findUnique({
        where: { id },
        include: {
          items: {
            include: { product: true }
          }
        }
      });

      if (!moWithItems) {
        throw new Error('Manufacturing order not found');
      }

      const consumedComponents: ConsumedComponent[] = [];

      // For each item: check inventory and consume
      for (const item of moWithItems.items) {
        const requiredQty = item.toConsumeQty;

        // Check inventory availability
        const inventory = await tx.inventory.findUnique({
          where: { productId: item.productId },
        });

        if (!inventory || inventory.onHandQty < requiredQty) {
          const available = inventory?.onHandQty ?? 0;
          throw new Error(
            `Insufficient stock for component "${item.product.name}": ` +
            `need ${requiredQty}, have ${available}`
          );
        }

        // Decrement inventory, and cap reservedQty at the new onHandQty
        const nextOnHand = Math.max(0, (inventory?.onHandQty ?? 0) - requiredQty);
        const nextReserved = Math.min(inventory?.reservedQty ?? 0, nextOnHand);

        await tx.inventory.update({
          where: { productId: item.productId },
          data: {
            onHandQty: nextOnHand,
            reservedQty: nextReserved,
          },
        });

        // Update item's consumedQty
        await tx.manufacturingOrderItem.update({
          where: { id: item.id },
          data: { consumedQty: requiredQty },
        });

        // Write stock ledger entry
        await tx.stockLedger.create({
          data: {
            productId: item.productId,
            changeQty: -requiredQty,
            type: StockMovementType.MANUFACTURE_CONSUME,
            referenceId: mo.id,
            companyId,
          },
        });

        consumedComponents.push({
          componentId: item.productId,
          componentName: item.product.name,
          qtyConsumed: requiredQty,
        });
      }

      // Update MO status to in_progress
      const updatedMo = await tx.manufacturingOrder.update({
        where: { id },
        data: { status: ManufacturingStatus.in_progress },
        include: {
          product: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true, email: true } },
          bom: { select: { id: true } },
          items: {
            include: { product: { select: { id: true, name: true } } },
          },
          workOrders: true,
        },
      });

      return {
        ...updatedMo,
        componentsConsumed: consumedComponents,
      };
    });

    // Audit log after transaction completes
    await this.auditService.log('ManufacturingOrder', id, 'START', { status: mo.status }, { status: 'in_progress' }, companyId, userId);
    return result;
  }

  /**
   * Complete a manufacturing order — produce finished goods into inventory.
   */
  async complete(id: string, companyId: string, userId?: string) {
    await this.verifyManufacturingWrite(userId, companyId);
    const mo = await this.getById(id, companyId);

    if (mo.status !== ManufacturingStatus.in_progress) {
      const error = new Error('Only in-progress manufacturing orders can be completed') as Error & { statusCode: number };
      error.statusCode = 400;
      throw error;
    }

    const result = await prisma.$transaction(async (tx) => {
      // Increment finished product inventory
      await tx.inventory.upsert({
        where: { productId: mo.productId },
        create: {
          productId: mo.productId,
          companyId,
          onHandQty: mo.quantity,
          reservedQty: 0,
        },
        update: {
          onHandQty: { increment: mo.quantity },
        },
      });

      // Write stock ledger entry
      await tx.stockLedger.create({
        data: {
          productId: mo.productId,
          changeQty: mo.quantity,
          type: StockMovementType.MANUFACTURE_PRODUCE,
          referenceId: mo.id,
          companyId,
        },
      });

      // Update MO status to completed
      const updatedMo = await tx.manufacturingOrder.update({
        where: { id },
        data: { status: ManufacturingStatus.completed },
        include: {
          product: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true, email: true } },
          bom: { select: { id: true } },
          items: {
            include: { product: { select: { id: true, name: true } } },
          },
          workOrders: true,
        },
      });

      return updatedMo;
    });

    await this.auditService.log('ManufacturingOrder', id, 'COMPLETE', { status: 'in_progress' }, { status: 'completed' }, companyId, userId);
    return result;
  }

  /**
   * Toggle work order status and compute real duration.
   */
  async toggleWorkOrder(id: string, workOrderId: string, companyId: string) {
    // Verify MO exists
    await this.getById(id, companyId);

    const workOrder = await prisma.manufacturingWorkOrder.findFirst({
      where: { id: workOrderId, manufacturingOrderId: id, companyId },
    });

    if (!workOrder) {
      const error = new Error('Work order not found') as Error & { statusCode: number };
      error.statusCode = 404;
      throw error;
    }

    let newStatus = 'in_progress';
    let newRealDuration = workOrder.realDuration;

    if (workOrder.status === 'pending') {
      newStatus = 'in_progress';
    } else if (workOrder.status === 'in_progress') {
      newStatus = 'finished';
      newRealDuration = workOrder.plannedDuration;
    } else {
      newStatus = 'pending';
      newRealDuration = 0;
    }

    const updatedWo = await prisma.manufacturingWorkOrder.update({
      where: { id: workOrderId },
      data: { status: newStatus, realDuration: newRealDuration },
    });

    return updatedWo;
  }

  /**
   * Delete a manufacturing order and log a DELETE audit event.
   */
  async delete(id: string, companyId: string, userId?: string) {
    await this.verifyManufacturingWrite(userId, companyId);
    const mo = await this.getById(id, companyId);
    const result = await this.repository.delete(id, companyId);
    await this.auditService.log(
      'ManufacturingOrder',
      id,
      'DELETE',
      { productId: mo.productId, status: mo.status },
      null,
      companyId,
      userId
    );
    return result;
  }

  private async verifyManufacturingWrite(userId: string | undefined, companyId: string) {
    if (!userId) return;
    const user = await prisma.user.findFirst({
      where: { id: userId, companyId },
      include: { roles: { include: { role: true } } }
    });
    if (!user) return;
    const userRoles = user.roles.map(ur => ur.role.name);
    if (userRoles.some(r => r === 'OWNER' || r === 'ADMIN')) return;
    if (!userRoles.includes('MANUFACTURING') && !userRoles.includes('SALES')) {
      const error = new Error('Forbidden: Insufficient role privileges to modify Manufacturing Orders') as Error & { statusCode: number };
      error.statusCode = 403;
      throw error;
    }
  }
}
