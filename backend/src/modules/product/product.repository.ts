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
            operations: true,
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
            operations: true,
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
      // Check for duplicate name in same company
      const existing = await tx.product.findFirst({
        where: {
          companyId,
          name: {
            equals: data.name.trim(),
            mode: 'insensitive'
          }
        }
      });
      if (existing) {
        throw new Error(`Product with name "${data.name}" already exists.`);
      }

      const product = await tx.product.create({
        data: {
          name: data.name.trim(),
          salesPrice: data.salesPrice,
          costPrice: data.costPrice,
          procurementType: data.procurementType,
          procureOnDemand: data.procureOnDemand,
          imageUrl: data.imageUrl,
          companyId,
        },
      });

      // Create initial empty inventory
      await tx.inventory.create({
        data: {
          productId: product.id,
          onHandQty: 0,
          reservedQty: 0,
          companyId,
        },
      });

      return product;
    });
  }

  /**
   * Update a product.
   */
  async update(id: string, data: UpdateProductInput, companyId: string) {
    if (data.name) {
      const trimmedName = data.name.trim();
      const existing = await prisma.product.findFirst({
        where: {
          companyId,
          name: {
            equals: trimmedName,
            mode: 'insensitive'
          },
          NOT: { id }
        }
      });
      if (existing) {
        throw new Error(`Product with name "${data.name}" already exists.`);
      }
    }

    return prisma.product.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.salesPrice !== undefined && { salesPrice: data.salesPrice }),
        ...(data.costPrice !== undefined && { costPrice: data.costPrice }),
        ...(data.procurementType && { procurementType: data.procurementType }),
        ...(data.procureOnDemand !== undefined && { procureOnDemand: data.procureOnDemand }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
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
        operations: true,
      },
    });
  }

  /**
   * Set (create or replace) BoM for a product.
   * Deletes existing items and replaces them in a transaction.
   */
  async setBom(
    productId: string,
    data: {
      quantity: number;
      reference?: string | null;
      items: { componentId: string; quantity: number }[];
      operations?: { operationName: string; workCenterName: string; plannedDuration: number }[];
    },
    companyId: string
  ) {
    const { quantity, reference, items, operations = [] } = data;
    return prisma.$transaction(async (tx) => {
      // Check if a BoM already exists for this product
      const existingBom = await tx.boM.findFirst({
        where: { productId, companyId },
      });

      if (existingBom) {
        // Update BoM quantity and reference
        await tx.boM.update({
          where: { id: existingBom.id },
          data: {
            quantity,
            reference: reference || null,
          },
        });

        // Delete existing items
        await tx.boMItem.deleteMany({
          where: { bomId: existingBom.id },
        });

        // Delete existing operations
        await tx.boMOperation.deleteMany({
          where: { bomId: existingBom.id },
        });

        // Create new items
        if (items.length > 0) {
          await tx.boMItem.createMany({
            data: items.map((item) => ({
              bomId: existingBom.id,
              componentId: item.componentId,
              quantity: item.quantity,
            })),
          });
        }

        // Create new operations
        if (operations.length > 0) {
          await tx.boMOperation.createMany({
            data: operations.map((op) => ({
              bomId: existingBom.id,
              operationName: op.operationName,
              workCenterName: op.workCenterName,
              plannedDuration: op.plannedDuration,
              companyId,
            })),
          });
        }

        // Return updated BoM
        return tx.boM.findFirst({
          where: { id: existingBom.id },
          include: {
            items: {
              include: {
                component: { select: { id: true, name: true, costPrice: true } },
              },
            },
            operations: true,
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

        // Create new BoM with items and operations
        return tx.boM.create({
          data: {
            id: nextId,
            productId,
            companyId,
            quantity,
            reference: reference || null,
            items: {
              create: items.map((item) => ({
                componentId: item.componentId,
                quantity: item.quantity,
              })),
            },
            operations: {
              create: operations.map((op) => ({
                operationName: op.operationName,
                workCenterName: op.workCenterName,
                plannedDuration: op.plannedDuration,
                companyId,
              })),
            },
          },
          include: {
            items: {
              include: {
                component: { select: { id: true, name: true, costPrice: true } },
              },
            },
            operations: true,
          },
        });
      }
    });
  }

  /**
   * Delete a product and all of its associated inventory, ledger, reservations, and BoM if not in use.
   */
  async delete(id: string, companyId: string) {
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id, companyId },
      });
      if (!product) {
        throw new Error('Product not found');
      }

      // Check if referenced in transactional tables
      const soItemsCount = await tx.salesOrderItem.count({ where: { productId: id } });
      const poItemsCount = await tx.purchaseOrderItem.count({ where: { productId: id } });
      const moCount = await tx.manufacturingOrder.count({ where: { productId: id } });
      if (soItemsCount > 0 || poItemsCount > 0 || moCount > 0) {
        throw new Error('Cannot delete product because it is referenced in active sales, purchase, or manufacturing transactions.');
      }

      // Clean up dependencies
      await tx.reservation.deleteMany({ where: { productId: id } });
      await tx.boMItem.deleteMany({ where: { componentId: id } });
      await tx.boMItem.deleteMany({ where: { bom: { productId: id } } });
      await tx.boMOperation.deleteMany({ where: { bom: { productId: id } } });
      await tx.boM.deleteMany({ where: { productId: id } });
      await tx.stockLedger.deleteMany({ where: { productId: id } });
      await tx.inventory.deleteMany({ where: { productId: id } });
      return tx.product.delete({ where: { id } });
    });
  }

  /**
   * Delete the Bill of Materials for a product.
   */
  async deleteBom(productId: string, companyId: string) {
    return prisma.$transaction(async (tx) => {
      const bom = await tx.boM.findFirst({
        where: { productId, companyId },
      });
      if (!bom) {
        throw new Error('Bill of Materials not found for this product');
      }
      await tx.boMItem.deleteMany({ where: { bomId: bom.id } });
      await tx.boMOperation.deleteMany({ where: { bomId: bom.id } });
      return tx.boM.delete({ where: { id: bom.id } });
    });
  }

  /**
   * Import multiple products and create empty inventory rows for them.
   */
  async importMany(products: CreateProductInput[], companyId: string) {
    return prisma.$transaction(async (tx) => {
      // Find all existing products in this company to check duplicates by name
      const existingProducts = await tx.product.findMany({
        where: { companyId },
        select: { name: true }
      });
      const existingNamesSet = new Set(existingProducts.map(p => p.name.toLowerCase().trim()));

      // Also track names within the import data to check for duplicates in the CSV itself
      const seenNames = new Set<string>();

      for (const p of products) {
        const normalizedName = p.name.toLowerCase().trim();
        if (existingNamesSet.has(normalizedName)) {
          throw new Error(`Product with name "${p.name}" already exists.`);
        }
        if (seenNames.has(normalizedName)) {
          throw new Error(`Duplicate product name "${p.name}" found in import data.`);
        }
        seenNames.add(normalizedName);
      }

      let count = 0;
      for (const p of products) {
        // Create new product
        const product = await tx.product.create({
          data: {
            name: p.name.trim(),
            salesPrice: p.salesPrice,
            costPrice: p.costPrice,
            procurementType: p.procurementType,
            procureOnDemand: p.procureOnDemand ?? false,
            imageUrl: p.imageUrl,
            companyId,
          },
        });

        // Create inventory entry for the new product
        await tx.inventory.create({
          data: {
            productId: product.id,
            onHandQty: 0,
            reservedQty: 0,
            companyId,
          },
        });
        count++;
      }
      return { count };
    });
  }
}

