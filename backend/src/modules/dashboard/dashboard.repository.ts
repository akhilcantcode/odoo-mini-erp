import { prisma } from '../../config/prisma';
import { DashboardStats } from './dashboard.types';
import { SalesOrderStatus, ManufacturingStatus } from '@prisma/client';

export class DashboardRepository {
  /**
   * Get aggregated dashboard stats for a company.
   */
  async getStats(companyId: string): Promise<DashboardStats> {
    // 1. Sales total: sum of (salesPrice × quantity) for delivered SO items
    const deliveredOrders = await prisma.salesOrder.findMany({
      where: {
        companyId,
        status: SalesOrderStatus.delivered,
      },
      include: {
        items: {
          include: {
            product: { select: { salesPrice: true } },
          },
        },
      },
    });

    let salesTotal = 0;
    for (const order of deliveredOrders) {
      for (const item of order.items) {
        salesTotal += (item.product.salesPrice ?? 0) * item.quantity;
      }
    }

    // 2. Inventory value: sum of (costPrice × onHandQty) for all inventory
    const inventories = await prisma.inventory.findMany({
      where: { companyId },
      include: {
        product: { select: { costPrice: true } },
      },
    });

    let inventoryValue = 0;
    for (const inv of inventories) {
      inventoryValue += (inv.product.costPrice ?? 0) * inv.onHandQty;
    }

    // 3. Manufacturing active count: MOs with status in_progress
    const manufacturingActiveCount = await prisma.manufacturingOrder.count({
      where: {
        companyId,
        status: ManufacturingStatus.in_progress,
      },
    });

    return {
      salesTotal: Math.round(salesTotal * 100) / 100,
      inventoryValue: Math.round(inventoryValue * 100) / 100,
      manufacturingActiveCount,
    };
  }
}
