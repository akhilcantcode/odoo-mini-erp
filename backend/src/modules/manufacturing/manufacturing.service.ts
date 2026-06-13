import { prisma } from '../../config/prisma';
import { ManufacturingRepository } from './manufacturing.repository';
import { CreateManufacturingOrderSchema, ConsumedComponent } from './manufacturing.types';
import { ManufacturingStatus, StockMovementType } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

export class ManufacturingService {
  private repository: ManufacturingRepository;
  private auditService: AuditService;

  constructor() {
    this.repository = new ManufacturingRepository();
    this.auditService = new AuditService();
  }

  /**
   * List all manufacturing orders.
   */
  async list(companyId: string) {
    return this.repository.findAll(companyId);
  }

  /**
   * Get a single manufacturing order by ID.
   */
  async getById(id: string, companyId: string) {
    const mo = await this.repository.findById(id, companyId);
    if (!mo) {
      const error = new Error('Manufacturing order not found') as Error & { statusCode: number };
      error.statusCode = 404;
      throw error;
    }
    return mo;
  }

  /**
   * Create a new manufacturing order.
   */
  async create(data: unknown, companyId: string) {
    const parsed = CreateManufacturingOrderSchema.parse(data);
    const mo = await this.repository.create(parsed, companyId);
    await this.auditService.log('ManufacturingOrder', mo.id, 'CREATE', null, { productId: mo.productId, quantity: mo.quantity, status: mo.status }, companyId);
    return mo;
  }

  /**
   * Start a manufacturing order — consume BoM components from inventory.
   *
   * Transaction:
   * 1. Validate MO is draft
   * 2. Fetch BoM for product
   * 3. For each BoM item: check & decrement inventory, write MANUFACTURE_CONSUME ledger
   * 4. Update MO status to in_progress
   */
  async start(id: string, companyId: string) {
    const mo = await this.getById(id, companyId);

    if (mo.status !== ManufacturingStatus.draft) {
      const error = new Error('Only draft manufacturing orders can be started') as Error & { statusCode: number };
      error.statusCode = 400;
      throw error;
    }

    const result = await prisma.$transaction(async (tx) => {
      // Fetch BoM for the product
      const bom = await tx.boM.findFirst({
        where: { productId: mo.productId, companyId },
        include: {
          items: {
            include: {
              component: { select: { id: true, name: true } },
            },
          },
        },
      });

      if (!bom || bom.items.length === 0) {
        throw new Error(`No Bill of Materials found for product ${mo.product.name}`);
      }

      const consumedComponents: ConsumedComponent[] = [];

      // For each BoM item: check inventory and consume
      for (const bomItem of bom.items) {
        const requiredQty = bomItem.quantity * mo.quantity;

        // Check inventory availability
        const inventory = await tx.inventory.findUnique({
          where: { productId: bomItem.componentId },
        });

        if (!inventory || inventory.onHandQty < requiredQty) {
          const available = inventory?.onHandQty ?? 0;
          throw new Error(
            `Insufficient stock for component "${bomItem.component.name}": ` +
            `need ${requiredQty}, have ${available}`
          );
        }

        // Decrement inventory
        await tx.inventory.update({
          where: { productId: bomItem.componentId },
          data: { onHandQty: { decrement: requiredQty } },
        });

        // Write stock ledger entry
        await tx.stockLedger.create({
          data: {
            productId: bomItem.componentId,
            changeQty: -requiredQty,
            type: StockMovementType.MANUFACTURE_CONSUME,
            referenceId: mo.id,
            companyId,
          },
        });

        consumedComponents.push({
          componentId: bomItem.componentId,
          componentName: bomItem.component.name,
          qtyConsumed: requiredQty,
        });
      }

      // Update MO status
      const updatedMo = await tx.manufacturingOrder.update({
        where: { id },
        data: { status: ManufacturingStatus.in_progress },
        include: {
          product: { select: { id: true, name: true } },
        },
      });

      return {
        ...updatedMo,
        componentsConsumed: consumedComponents,
      };
    });

    // Audit log after transaction completes (use the start result id)
    await this.auditService.log('ManufacturingOrder', id, 'START', { status: 'draft' }, { status: 'in_progress' }, companyId);
    return result;
  }

  /**
   * Complete a manufacturing order — produce finished goods into inventory.
   *
   * Transaction:
   * 1. Validate MO is in_progress
   * 2. Increment inventory for finished product
   * 3. Write MANUFACTURE_PRODUCE ledger entry
   * 4. Update MO status to completed
   */
  async complete(id: string, companyId: string) {
    const mo = await this.getById(id, companyId);

    if (mo.status !== ManufacturingStatus.in_progress) {
      const error = new Error('Only in-progress manufacturing orders can be completed') as Error & { statusCode: number };
      error.statusCode = 400;
      throw error;
    }

    const result = await prisma.$transaction(async (tx) => {
      // Increment finished product inventory
      await tx.inventory.upsert({
        where: { productId: mo.productId },
        create: {
          productId: mo.productId,
          companyId,
          onHandQty: mo.quantity,
          reservedQty: 0,
        },
        update: {
          onHandQty: { increment: mo.quantity },
        },
      });

      // Write stock ledger entry
      await tx.stockLedger.create({
        data: {
          productId: mo.productId,
          changeQty: mo.quantity,
          type: StockMovementType.MANUFACTURE_PRODUCE,
          referenceId: mo.id,
          companyId,
        },
      });

      // Update MO status
      const updatedMo = await tx.manufacturingOrder.update({
        where: { id },
        data: { status: ManufacturingStatus.completed },
        include: {
          product: { select: { id: true, name: true } },
        },
      });

      return updatedMo;
    });

    await this.auditService.log('ManufacturingOrder', id, 'COMPLETE', { status: 'in_progress' }, { status: 'completed' }, companyId);
    return result;
  }
}
