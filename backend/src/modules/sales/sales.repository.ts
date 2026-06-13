import { prisma } from '../../config/prisma';
import { CreateSalesOrderInput } from './sales.types';
import { SalesOrderStatus, ReservationSourceType, StockMovementType } from '@prisma/client';

export class SalesRepository {
  /**
   * Create a Sales Order in draft status with its items in a transaction.
   */
  async create(data: CreateSalesOrderInput, companyId: string) {
    return prisma.$transaction(async (tx) => {
      // Get next SO sequence ID
      const lastOrder = await tx.salesOrder.findFirst({
        where: { id: { startsWith: 'SO-' } },
        orderBy: { id: 'desc' },
      });

      let nextId = 'SO-00001';
      if (lastOrder) {
        const parts = lastOrder.id.split('-');
        if (parts.length === 2) {
          const lastNum = parseInt(parts[1], 10);
          if (!isNaN(lastNum)) {
            nextId = `SO-${String(lastNum + 1).padStart(5, '0')}`;
          }
        }
      }

      const order = await tx.salesOrder.create({
        data: {
          id: nextId,
          customerName: data.customerName,
          customerAddress: data.customerAddress,
          responsiblePersonId: data.responsiblePersonId,
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
          responsiblePerson: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
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
        responsiblePerson: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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
        responsiblePerson: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  /**
   * Confirm a draft sales order, reserving available stock.
   */
  async confirm(id: string, companyId: string) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findFirst({
        where: { id, companyId },
        include: { items: { include: { product: true } } },
      });

      if (!order) {
        throw new Error('Sales order not found');
      }

      if (order.status !== SalesOrderStatus.draft) {
        throw new Error('Only draft sales orders can be confirmed');
      }

      // For each item, check inventory and reserve
      for (const item of order.items) {
        // Upsert inventory just in case it doesn't exist
        const inventory = await tx.inventory.upsert({
          where: { productId: item.productId },
          create: {
            productId: item.productId,
            companyId,
            onHandQty: 0,
            reservedQty: 0,
          },
          update: {},
        });

        const freeQty = inventory.onHandQty - inventory.reservedQty;
        const toReserve = Math.min(item.quantity, Math.max(0, freeQty));

        if (toReserve > 0) {
          await tx.inventory.update({
            where: { productId: item.productId },
            data: {
              reservedQty: { increment: toReserve },
            },
          });

          await tx.reservation.create({
            data: {
              productId: item.productId,
              reservedQty: toReserve,
              sourceType: ReservationSourceType.sales,
              sourceId: order.id,
              companyId,
            },
          });
        }
      }

      // Update Sales Order status to confirmed
      const updatedOrder = await tx.salesOrder.update({
        where: { id },
        data: { status: SalesOrderStatus.confirmed },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      return updatedOrder;
    });
  }

  /**
   * Deliver a confirmed or partial sales order, reducing inventory and recording stock ledger entries.
   */
  async deliver(id: string, companyId: string) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findFirst({
        where: { id, companyId },
        include: { items: { include: { product: true } } },
      });

      if (!order) {
        throw new Error('Sales order not found');
      }

      if (order.status !== SalesOrderStatus.confirmed && order.status !== SalesOrderStatus.partial) {
        throw new Error('Only confirmed or partial sales orders can be delivered');
      }

      // First check that we have enough stock on hand for all items to perform delivery
      for (const item of order.items) {
        const inventory = await tx.inventory.findUnique({
          where: { productId: item.productId },
        });

        const onHand = inventory ? inventory.onHandQty : 0;
        if (onHand < item.quantity) {
          throw new Error(`Insufficient stock to deliver product "${item.product.name}": need ${item.quantity}, have ${onHand}`);
        }
      }

      // Process delivery
      for (const item of order.items) {
        // Find if we have a reservation for this item & sales order
        const reservation = await tx.reservation.findFirst({
          where: {
            sourceId: order.id,
            productId: item.productId,
            sourceType: ReservationSourceType.sales,
          },
        });

        const reservedToRelease = reservation ? reservation.reservedQty : 0;

        // Decrement onHandQty, and decrement reservedQty by the reserved amount
        await tx.inventory.update({
          where: { productId: item.productId },
          data: {
            onHandQty: { decrement: item.quantity },
            reservedQty: { decrement: reservedToRelease },
          },
        });

        // Delete the reservation record if it exists
        if (reservation) {
          await tx.reservation.delete({
            where: { id: reservation.id },
          });
        }

        // Create a SALE type StockLedger entry
        await tx.stockLedger.create({
          data: {
            productId: item.productId,
            changeQty: -item.quantity,
            type: StockMovementType.SALE,
            referenceId: order.id,
            companyId,
          },
        });
      }

      // Update Sales Order status to delivered
      const updatedOrder = await tx.salesOrder.update({
        where: { id },
        data: { status: SalesOrderStatus.delivered },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      return updatedOrder;
    });
  }
}
