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
    return prisma.manufacturingOrder.create({
      data: {
        productId: data.productId,
        quantity: data.quantity,
        status: ManufacturingStatus.draft,
        companyId,
      },
      include: {
        product: { select: { id: true, name: true } },
      },
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
