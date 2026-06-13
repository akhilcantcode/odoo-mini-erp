import { SalesRepository } from './sales.repository';
import { CreateSalesOrderSchema } from './sales.types';
import { prisma } from '../../config/prisma';
import { AuditService } from '../audit/audit.service';

export class SalesService {
  private repository: SalesRepository;
  private auditService: AuditService;

  constructor() {
    this.repository = new SalesRepository();
    this.auditService = new AuditService();
  }

  /**
   * Create a new sales order in draft status with Zod validation.
   */
  async create(data: unknown, companyId: string) {
    const parsed = CreateSalesOrderSchema.parse(data);

    // Validate inventory availability
    for (const item of parsed.items) {
      const inventory = await prisma.inventory.findUnique({
        where: { productId: item.productId },
      });

      const onHand = inventory ? inventory.onHandQty : 0;
      const reserved = inventory ? inventory.reservedQty : 0;
      const freeQty = onHand - reserved;

      const shortage = item.quantity - freeQty;

      if (shortage > 0) {
        // Product has a shortage, check if it can be manufactured (has a BoM)
        const bom = await prisma.boM.findFirst({
          where: { productId: item.productId, companyId },
          include: {
            items: {
              include: {
                component: true,
              },
            },
          },
        });

        if (!bom) {
          // If no recipe exists and we have a shortage, reject the order
          const error = new Error('Insufficient items in inventory') as Error & { statusCode: number };
          error.statusCode = 400;
          throw error;
        }

        // Check if raw components are sufficient to manufacture the shortage quantity
        for (const bomItem of bom.items) {
          const requiredQty = shortage * bomItem.quantity;

          const compInventory = await prisma.inventory.findUnique({
            where: { productId: bomItem.componentId },
          });

          const compOnHand = compInventory ? compInventory.onHandQty : 0;
          const compReserved = compInventory ? compInventory.reservedQty : 0;
          const compFreeQty = compOnHand - compReserved;

          if (compFreeQty < requiredQty) {
            const error = new Error('Insufficient items in inventory') as Error & { statusCode: number };
            error.statusCode = 400;
            throw error;
          }
        }
      }
    }

    return this.repository.create(parsed, companyId);
  }

  /**
   * List all sales orders for a company.
   */
  async list(companyId: string) {
    return this.repository.findAll(companyId);
  }

  /**
   * Get a single sales order by ID.
   */
  async getById(id: string, companyId: string) {
    const order = await this.repository.findById(id, companyId);
    if (!order) {
      const error = new Error('Sales order not found') as Error & { statusCode: number };
      error.statusCode = 404;
      throw error;
    }
    return order;
  }

  /**
   * Confirm a draft sales order.
   */
  async confirm(id: string, companyId: string) {
    const updated = await this.repository.confirm(id, companyId);
    await this.auditService.log(
      'SalesOrder',
      id,
      'CONFIRM',
      { status: 'draft' },
      { status: 'confirmed' },
      companyId
    );
    return updated;
  }

  /**
   * Deliver a confirmed sales order.
   */
  async deliver(id: string, companyId: string) {
    const order = await this.getById(id, companyId);
    const updated = await this.repository.deliver(id, companyId);
    await this.auditService.log(
      'SalesOrder',
      id,
      'DELIVER',
      { status: order.status },
      { status: 'delivered' },
      companyId
    );
    return updated;
  }
}
