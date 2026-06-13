import { prisma } from '../../config/prisma';
import { CreateManufacturingOrderInput } from './manufacturing.types';
import { ManufacturingStatus } from '@prisma/client';

export class ManufacturingRepository {
  /**
   * List all manufacturing orders for a company, with product info.
   */
  async findAll(companyId: string) {
    return prisma.manufacturingOrder.findMany({
      where: { companyId },
      include: {
        product: { select: { id: true, name: true } },
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
      },
    });
  }

  /**
   * Create a manufacturing order in draft status.
   */
  async create(data: CreateManufacturingOrderInput, companyId: string) {
    return prisma.$transaction(async (tx) => {
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

      return tx.manufacturingOrder.create({
        data: {
          id: nextId,
          productId: data.productId,
          quantity: data.quantity,
          status: ManufacturingStatus.draft,
          companyId,
        },
        include: {
          product: { select: { id: true, name: true } },
        },
      });
    });
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
      },
    });
  }
}
