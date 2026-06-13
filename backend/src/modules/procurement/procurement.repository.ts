import { prisma } from '../../config/prisma';
import { SalesOrderStatus } from '@prisma/client';

export class ProcurementRepository {
  /**
   * Find all confirmed/partial sales order items where the product
   * has procureOnDemand=true and free stock is insufficient.
   *
   * Returns items grouped with their product procurement info.
   */
  async findShortfalls(companyId: string) {
    // Get all confirmed/partial sales orders with their items
    const salesOrders = await prisma.salesOrder.findMany({
      where: {
        companyId,
        status: { in: [SalesOrderStatus.confirmed, SalesOrderStatus.partial] },
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                inventory: true,
              },
            },
          },
        },
      },
    });

    // Calculate shortfalls for on-demand products
    const shortfalls: {
      productId: string;
      procurementType: string;
      shortfallQty: number;
    }[] = [];

    // Aggregate demand per product across all confirmed SOs
    const demandMap = new Map<string, { totalDemand: number; procurementType: string }>();

    for (const so of salesOrders) {
      for (const item of so.items) {
        if (!item.product.procureOnDemand) continue;

        const existing = demandMap.get(item.productId);
        if (existing) {
          existing.totalDemand += item.quantity;
        } else {
          demandMap.set(item.productId, {
            totalDemand: item.quantity,
            procurementType: item.product.procurementType,
          });
        }
      }
    }

    // Compare demand with available stock
    for (const [productId, { totalDemand, procurementType }] of demandMap) {
      // Get inventory for this product
      const inventory = await prisma.inventory.findUnique({
        where: { productId },
      });

      const onHand = inventory?.onHandQty ?? 0;
      const reserved = inventory?.reservedQty ?? 0;
      const freeQty = onHand - reserved;

      if (freeQty < totalDemand) {
        shortfalls.push({
          productId,
          procurementType,
          shortfallQty: totalDemand - Math.max(freeQty, 0),
        });
      }
    }

    return shortfalls;
  }
}
