import { prisma } from '../../config/prisma';
import { StockMovementType } from '@prisma/client';
import { InventoryWithFreeQty } from './inventory.types';

export class InventoryRepository {
  /**
   * List all inventory for a company, with product name and computed freeQty.
   */
  async findAll(companyId: string): Promise<InventoryWithFreeQty[]> {
    const inventories = await prisma.inventory.findMany({
      where: { companyId },
      include: {
        product: { select: { name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return inventories.map((inv) => ({
      productId: inv.productId,
      productName: inv.product.name,
      onHandQty: inv.onHandQty,
      reservedQty: inv.reservedQty,
      freeQty: inv.onHandQty - inv.reservedQty,
      updatedAt: inv.updatedAt,
    }));
  }

  /**
   * Get stock ledger entries, optionally filtered by productId.
   */
  async getLedger(companyId: string, productId?: string) {
    const where: any = { companyId };
    if (productId) {
      where.productId = productId;
    }

    return prisma.stockLedger.findMany({
      where,
      include: {
        product: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Adjust inventory and write a stock ledger entry.
   * Runs inside a transaction.
   */
  async adjust(productId: string, changeQty: number, reference: string | undefined, companyId: string) {
    return prisma.$transaction(async (tx) => {
      // Update inventory
      const inventory = await tx.inventory.upsert({
        where: { productId },
        create: {
          productId,
          companyId,
          onHandQty: changeQty,
          reservedQty: 0,
        },
        update: {
          onHandQty: { increment: changeQty },
        },
      });

      // Write ledger entry
      await tx.stockLedger.create({
        data: {
          productId,
          changeQty,
          type: StockMovementType.PURCHASE, // Using PURCHASE type for manual adjustments
          referenceId: reference ?? 'MANUAL_ADJUST',
          companyId,
        },
      });

      return {
        productId: inventory.productId,
        onHandQty: inventory.onHandQty,
        reservedQty: inventory.reservedQty,
        freeQty: inventory.onHandQty - inventory.reservedQty,
      };
    });
  }
}
