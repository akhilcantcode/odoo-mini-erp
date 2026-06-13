import { prisma } from '../../config/prisma';
import { CreateProductInput, UpdateProductInput } from './product.types';
import { ProcurementType } from '@prisma/client';

export class ProductRepository {
  /**
   * List all products for a company, with optional filtering.
   */
  async findAll(companyId: string, filters?: { procurementType?: string; procureOnDemand?: string }) {
    const where: any = { companyId };

    if (filters?.procurementType) {
      where.procurementType = filters.procurementType as ProcurementType;
    }
    if (filters?.procureOnDemand !== undefined) {
      where.procureOnDemand = filters.procureOnDemand === 'true';
    }

    return prisma.product.findMany({
      where,
      include: {
        inventory: { select: { onHandQty: true, reservedQty: true } },
        bom: {
          include: {
            items: {
              include: {
                component: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single product by ID, scoped to company.
   */
  async findById(id: string, companyId: string) {
    return prisma.product.findFirst({
      where: { id, companyId },
      include: {
        inventory: { select: { onHandQty: true, reservedQty: true } },
        bom: {
          include: {
            items: {
              include: {
                component: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Create a product and ensure an Inventory row exists for it.
   */
  async create(data: CreateProductInput, companyId: string) {
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: data.name,
          salesPrice: data.salesPrice ?? null,
          costPrice: data.costPrice ?? null,
          procurementType: data.procurementType as ProcurementType,
          procureOnDemand: data.procureOnDemand ?? false,
          companyId,
        },
      });

      await tx.inventory.create({
        data: {
          productId: product.id,
          companyId,
          onHandQty: 0,
          reservedQty: 0,
        },
      });

      return product;
    });
  }

  /**
   * Update product fields.
   */
  async update(id: string, data: UpdateProductInput, companyId: string) {
    return prisma.product.update({
      where: { id, companyId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.salesPrice !== undefined && { salesPrice: data.salesPrice }),
        ...(data.costPrice !== undefined && { costPrice: data.costPrice }),
        ...(data.procurementType !== undefined && {
          procurementType: data.procurementType as ProcurementType,
        }),
        ...(data.procureOnDemand !== undefined && { procureOnDemand: data.procureOnDemand }),
      },
    });
  }

  /**
   * Get BoM for a product, including component details.
   */
  async getBom(productId: string, companyId: string) {
    return prisma.boM.findFirst({
      where: { productId, companyId },
      include: {
        items: {
          include: {
            component: { select: { id: true, name: true, costPrice: true } },
          },
        },
      },
    });
  }

  /**
   * Set (create or replace) BoM for a product.
   * Deletes existing items and replaces them in a transaction.
   */
  async setBom(productId: string, items: { componentId: string; quantity: number }[], companyId: string) {
    return prisma.$transaction(async (tx) => {
      // Check if a BoM already exists for this product
      const existingBom = await tx.boM.findFirst({
        where: { productId, companyId },
      });

      if (existingBom) {
        // Delete existing items
        await tx.boMItem.deleteMany({
          where: { bomId: existingBom.id },
        });

        // Create new items
        await tx.boMItem.createMany({
          data: items.map((item) => ({
            bomId: existingBom.id,
            componentId: item.componentId,
            quantity: item.quantity,
          })),
        });

        // Return updated BoM
        return tx.boM.findFirst({
          where: { id: existingBom.id },
          include: {
            items: {
              include: {
                component: { select: { id: true, name: true, costPrice: true } },
              },
            },
          },
        });
      } else {
        // Get next BOM sequence ID
        const lastBom = await tx.boM.findFirst({
          where: { id: { startsWith: 'BOM-' } },
          orderBy: { id: 'desc' },
        });

        let nextId = 'BOM-0001';
        if (lastBom) {
          const parts = lastBom.id.split('-');
          if (parts.length === 2) {
            const lastNum = parseInt(parts[1], 10);
            if (!isNaN(lastNum)) {
              nextId = `BOM-${String(lastNum + 1).padStart(4, '0')}`;
            }
          }
        }

        // Create new BoM with items
        return tx.boM.create({
          data: {
            id: nextId,
            productId,
            companyId,
            items: {
              create: items.map((item) => ({
                componentId: item.componentId,
                quantity: item.quantity,
              })),
            },
          },
          include: {
            items: {
              include: {
                component: { select: { id: true, name: true, costPrice: true } },
              },
            },
          },
        });
      }
    });
  }
}
