import { prisma } from '../../config/prisma';
import { CreatePurchaseOrderInput } from './purchase.types';
import { Prisma, PurchaseOrderStatus, StockMovementType } from '@prisma/client';

export class PurchaseRepository {
  /**
   * List all purchase orders for a company, with their items and product info.
   */
  async findAll(companyId: string) {
    return prisma.purchaseOrder.findMany({
      where: { companyId },
      include: {
        responsiblePerson: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: { product: { select: { id: true, name: true, costPrice: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single purchase order by ID, scoped to company.
   */
  async findById(id: string, companyId: string) {
    return prisma.purchaseOrder.findFirst({
      where: { id, companyId },
      include: {
        responsiblePerson: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: { product: { select: { id: true, name: true, costPrice: true } } },
        },
      },
    });
  }

  /**
   * Create a purchase order with nested items in draft status.
   * Also ensures Inventory rows exist for each product.
   */
  async create(data: CreatePurchaseOrderInput, companyId: string, txContext?: Prisma.TransactionClient) {
    const execute = async (tx: Prisma.TransactionClient) => {
      // Ensure Inventory rows exist for every product in the PO
      for (const item of data.items) {
        await tx.inventory.upsert({
          where: { productId: item.productId },
          create: {
            productId: item.productId,
            companyId,
            onHandQty: 0,
            reservedQty: 0,
          },
          update: {},
        });
      }

      // Get next PO sequence ID
      const lastOrder = await tx.purchaseOrder.findFirst({
        where: { id: { startsWith: 'PO-' } },
        orderBy: { id: 'desc' },
      });

      let nextId = 'PO-00001';
      if (lastOrder) {
        const parts = lastOrder.id.split('-');
        if (parts.length === 2) {
          const lastNum = parseInt(parts[1], 10);
          if (!isNaN(lastNum)) {
            nextId = `PO-${String(lastNum + 1).padStart(5, '0')}`;
          }
        }
      }

      return tx.purchaseOrder.create({
        data: {
          id: nextId,
          vendorName: data.vendorName,
          vendorAddress: data.vendorAddress,
          responsiblePersonId: data.responsiblePersonId,
          status: PurchaseOrderStatus.draft,
          companyId,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          responsiblePerson: {
            select: { id: true, name: true, email: true },
          },
          items: {
            include: { product: { select: { id: true, name: true, costPrice: true } } },
          },
        },
      });
    };

    return txContext ? execute(txContext) : prisma.$transaction(execute);
  }

  /**
   * Update PO status.
   */
  async updateStatus(id: string, status: PurchaseOrderStatus, companyId: string) {
    return prisma.purchaseOrder.update({
      where: { id, companyId },
      data: { status },
    });
  }

  /**
   * Receive a purchase order: increment inventory and write stock ledger entries.
   * Runs inside a transaction.
   */
  async receive(id: string, companyId: string) {
    return prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findFirst({
        where: { id, companyId },
        include: { items: true },
      });

      if (!po) {
        throw new Error('Purchase order not found');
      }

      if (po.status !== PurchaseOrderStatus.confirmed) {
        throw new Error('Purchase order must be confirmed before receiving');
      }

      // For each item: increment inventory and log to stock ledger
      for (const item of po.items) {
        await tx.inventory.upsert({
          where: { productId: item.productId },
          create: {
            productId: item.productId,
            companyId,
            onHandQty: item.quantity,
            reservedQty: 0,
          },
          update: {
            onHandQty: { increment: item.quantity },
          },
        });

        await tx.stockLedger.create({
          data: {
            productId: item.productId,
            changeQty: item.quantity,
            type: StockMovementType.PURCHASE,
            referenceId: po.id,
            companyId,
          },
        });
      }

      // Update PO status to received
      const updatedPo = await tx.purchaseOrder.update({
        where: { id },
        data: { status: PurchaseOrderStatus.received },
        include: {
          items: {
            include: { product: { select: { id: true, name: true, costPrice: true } } },
          },
        },
      });

      return updatedPo;
    });
  }
}
