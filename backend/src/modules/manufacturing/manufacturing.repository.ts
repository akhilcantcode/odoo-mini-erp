import { prisma } from '../../config/prisma';
import { CreateManufacturingOrderInput } from './manufacturing.types';
import { Prisma, ManufacturingStatus } from '@prisma/client';

export class ManufacturingRepository {
  /**
   * List all manufacturing orders for a company, with product, assignee, items, and workOrders.
   */
  async findAll(companyId: string) {
    return prisma.manufacturingOrder.findMany({
      where: { companyId },
      include: {
        product: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, email: true } },
        bom: { select: { id: true } },
        items: {
          include: { product: { select: { id: true, name: true } } },
        },
        workOrders: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single manufacturing order by ID, scoped to company.
   */
  async findById(id: string, companyId: string) {
    return prisma.manufacturingOrder.findFirst({
      where: { id, companyId },
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
  }

  /**
   * Create a manufacturing order in draft status.
   * Also populates items from the BoM and creates default work orders.
   */
  async create(data: CreateManufacturingOrderInput, companyId: string, txContext?: Prisma.TransactionClient) {
    const execute = async (tx: Prisma.TransactionClient) => {
      // Get next MO sequence ID
      const lastOrder = await tx.manufacturingOrder.findFirst({
        where: { id: { startsWith: 'MO-' } },
        orderBy: { id: 'desc' },
      });

      let nextId = 'MO-0001';
      if (lastOrder) {
        const parts = lastOrder.id.split('-');
        if (parts.length === 2) {
          const lastNum = parseInt(parts[1], 10);
          if (!isNaN(lastNum)) {
            nextId = `MO-${String(lastNum + 1).padStart(4, '0')}`;
          }
        }
      }

      // Find the BoM to use (explicit bomId, or default for product)
      const bom = data.bomId
        ? await tx.boM.findFirst({
            where: { id: data.bomId, companyId },
            include: { items: true, operations: true },
          })
        : await tx.boM.findFirst({
            where: { productId: data.productId, companyId },
            include: { items: true, operations: true },
          });

      // 1. Fetch default BoM items if no custom components (items) are provided
      let itemsToCreate: { productId: string; toConsumeQty: number; companyId: string }[] = [];
      if (data.items && data.items.length > 0) {
        itemsToCreate = data.items.map(item => ({
          productId: item.productId,
          toConsumeQty: item.quantity,
          companyId,
        }));
      } else if (bom && bom.items) {
        itemsToCreate = bom.items.map(item => ({
          productId: item.componentId,
          toConsumeQty: item.quantity * (data.quantity / bom.quantity),
          companyId,
        }));
      }

      // 2. Fetch default work orders if no custom workOrders are provided
      let workOrdersToCreate: { operationName: string; workCenterName: string; plannedDuration: number; companyId: string }[] = [];
      if (data.workOrders && data.workOrders.length > 0) {
        workOrdersToCreate = data.workOrders.map(wo => ({
          operationName: wo.operationName,
          workCenterName: wo.workCenterName,
          plannedDuration: wo.plannedDuration,
          companyId,
        }));
      } else if (bom && bom.operations && bom.operations.length > 0) {
        workOrdersToCreate = bom.operations.map(op => ({
          operationName: op.operationName,
          workCenterName: op.workCenterName,
          plannedDuration: op.plannedDuration,
          companyId,
        }));
      } else {
        // Mockup default operation: "Assembly-1", "Work Center-1", duration 60.00
        workOrdersToCreate = [{
          operationName: 'Assembly-1',
          workCenterName: 'Work Center -1',
          plannedDuration: 60.00,
          companyId,
        }];
      }

      return tx.manufacturingOrder.create({
        data: {
          id: nextId,
          productId: data.productId,
          quantity: data.quantity,
          status: ManufacturingStatus.draft,
          companyId,
          scheduleDate: data.scheduleDate ? new Date(data.scheduleDate) : null,
          assigneeId: data.assigneeId,
          bomId: data.bomId || bom?.id || null,
          items: {
            create: itemsToCreate,
          },
          workOrders: {
            create: workOrdersToCreate,
          },
        },
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
    };

    return txContext ? execute(txContext) : prisma.$transaction(execute);
  }

  /**
   * Update MO status.
   */
  async updateStatus(id: string, status: ManufacturingStatus) {
    return prisma.manufacturingOrder.update({
      where: { id },
      data: { status },
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
  }
}
