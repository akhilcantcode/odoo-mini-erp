import { prisma } from '../../config/prisma';
import { CreateSalesOrderInput } from './sales.types';
import { SalesOrderStatus } from '@prisma/client';

export class SalesRepository {
  /**
   * Create a Sales Order in draft status with its items in a transaction.
   */
  async create(data: CreateSalesOrderInput, companyId: string) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.create({
        data: {
          customerName: data.customerName,
          status: SalesOrderStatus.draft,
          companyId,
        },
      });

      const itemsData = data.items.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
      }));

      await tx.salesOrderItem.createMany({
        data: itemsData,
      });

      return tx.salesOrder.findUnique({
        where: { id: order.id },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    });
  }

  /**
   * List all sales orders for a company.
   */
  async findAll(companyId: string) {
    return prisma.salesOrder.findMany({
      where: { companyId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single sales order by ID.
   */
  async findById(id: string, companyId: string) {
    return prisma.salesOrder.findFirst({
      where: { id, companyId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }
}
