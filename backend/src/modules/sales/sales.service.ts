import { SalesOrderStatus, PurchaseOrderStatus, ManufacturingStatus } from '@prisma/client';
import { SalesRepository } from './sales.repository';
import { CreateSalesOrderSchema } from './sales.types';
import { prisma } from '../../config/prisma';
import { AuditService } from '../audit/audit.service';
import { PurchaseRepository } from '../purchase/purchase.repository';
import { ManufacturingRepository } from '../manufacturing/manufacturing.repository';

export class SalesService {
  private repository: SalesRepository;
  private auditService: AuditService;
  private purchaseRepository: PurchaseRepository;
  private manufacturingRepository: ManufacturingRepository;

  constructor() {
    this.repository = new SalesRepository();
    this.auditService = new AuditService();
    this.purchaseRepository = new PurchaseRepository();
    this.manufacturingRepository = new ManufacturingRepository();
  }

  /**
   * Check inventory and determine replenishment requirements (POs/MOs) before Sales Order creation.
   */
  async checkProcurement(data: unknown, companyId: string) {
    const parsed = CreateSalesOrderSchema.parse(data);

    const autoManufacture: { productId: string; productName: string; quantity: number }[] = [];
    const globalCompReq = new Map<string, { productName: string; qty: number }>();
    const globalPurchaseReq = new Map<string, { productName: string; qty: number }>();

    for (const item of parsed.items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId, companyId },
      });
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      const inventory = await prisma.inventory.findUnique({
        where: { productId: item.productId },
      });

      const onHand = inventory ? inventory.onHandQty : 0;
      const reserved = inventory ? inventory.reservedQty : 0;
      const freeQty = onHand - reserved;

      const shortage = item.quantity - freeQty;

      if (shortage > 0) {
        if (product.procurementType === 'manufacture') {
          // Check if it has a BoM
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

          if (!bom || bom.items.length === 0) {
            // No BoM exists, fallback to purchasing the product
            const existing = globalPurchaseReq.get(item.productId) || { productName: product.name, qty: 0 };
            existing.qty += shortage;
            globalPurchaseReq.set(item.productId, existing);
          } else {
            // Accumulate component requirements globally
            for (const bomItem of bom.items) {
              const compId = bomItem.componentId;
              const existing = globalCompReq.get(compId) || { productName: bomItem.component.name, qty: 0 };
              existing.qty += shortage * bomItem.quantity;
              globalCompReq.set(compId, existing);
            }

            autoManufacture.push({
              productId: item.productId,
              productName: product.name,
              quantity: shortage,
            });
          }
        } else {
          // Procurement type is purchase
          const existing = globalPurchaseReq.get(item.productId) || { productName: product.name, qty: 0 };
          existing.qty += shortage;
          globalPurchaseReq.set(item.productId, existing);
        }
      }
    }

    const purchaseRequirements: {
      productId: string;
      productName: string;
      shortageQty: number;
      recommendedQty: number;
    }[] = [];

    // 1. Process direct purchase shortages
    for (const [productId, val] of globalPurchaseReq.entries()) {
      purchaseRequirements.push({
        productId,
        productName: val.productName,
        shortageQty: val.qty,
        recommendedQty: val.qty,
      });
    }

    // 2. Process component shortages
    for (const [compId, val] of globalCompReq.entries()) {
      const compInventory = await prisma.inventory.findUnique({
        where: { productId: compId },
      });

      const compOnHand = compInventory ? compInventory.onHandQty : 0;
      const compReserved = compInventory ? compInventory.reservedQty : 0;
      const compFreeQty = compOnHand - compReserved;

      if (compFreeQty < val.qty) {
        const compShortage = val.qty - compFreeQty;
        purchaseRequirements.push({
          productId: compId,
          productName: val.productName,
          shortageQty: compShortage,
          recommendedQty: compShortage,
        });
      }
    }

    const available = purchaseRequirements.length === 0;

    return {
      available,
      autoManufacture,
      purchaseRequirements,
    };
  }

  /**
   * Create a new sales order in draft status along with auto-generated MOs and POs in a transaction.
   */
  async create(data: unknown, companyId: string, userId?: string) {
    const parsed = CreateSalesOrderSchema.parse(data);

    return prisma.$transaction(async (tx) => {
      // 1. Create the Sales Order using the repository (generates SO-XXXXX sequence ID)
      const order = await this.repository.create(
        {
          customerName: parsed.customerName,
          customerAddress: parsed.customerAddress,
          responsiblePersonId: parsed.responsiblePersonId,
          items: parsed.items,
        },
        companyId,
        tx
      );

      if (!order) {
        throw new Error('Failed to create sales order');
      }

      // 2. Automatically trigger Manufacturing Orders for shortages of manufactured goods
      const procuredMOs: { id: string; productName: string; quantity: number }[] = [];
      for (const item of parsed.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId, companyId },
        });
        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }

        const inventory = await tx.inventory.findUnique({
          where: { productId: item.productId },
        });

        const onHand = inventory ? inventory.onHandQty : 0;
        const reserved = inventory ? inventory.reservedQty : 0;
        const freeQty = onHand - reserved;

        const shortage = item.quantity - freeQty;

        if (shortage > 0 && product.procurementType === 'manufacture') {
          // Check if it has a BoM
          const bom = await tx.boM.findFirst({
            where: { productId: item.productId, companyId },
          });

          if (bom) {
            const mo = await this.manufacturingRepository.create(
              {
                productId: item.productId,
                quantity: shortage,
              },
              companyId,
              tx
            );
            procuredMOs.push({
              id: mo.id,
              productName: product.name,
              quantity: shortage,
            });
            await this.auditService.log(
              'ManufacturingOrder',
              mo.id,
              'CREATE',
              null,
              { productId: mo.productId, quantity: mo.quantity, status: mo.status, sourceSalesOrderId: order.id },
              companyId,
              userId
            );
          }
        }
      }

      // 3. Create requested Purchase Orders if specified in procurement payload
      const procuredPOs: { id: string; vendorName: string; itemsCount: number }[] = [];
      if (parsed.procurement && parsed.procurement.purchaseOrders) {
        for (const po of parsed.procurement.purchaseOrders) {
          const createdPO = await this.purchaseRepository.create(
            {
              vendorName: po.vendorName,
              items: po.items,
            },
            companyId,
            tx
          );
          procuredPOs.push({
            id: createdPO.id,
            vendorName: createdPO.vendorName,
            itemsCount: createdPO.items.length,
          });
          await this.auditService.log(
            'PurchaseOrder',
            createdPO.id,
            'CREATE',
            null,
            { vendorName: createdPO.vendorName, status: createdPO.status, sourceSalesOrderId: order.id },
            companyId,
            userId
          );
        }
      }

      // Log SalesOrder creation
      await this.auditService.log(
        'SalesOrder',
        order.id,
        'CREATE',
        null,
        { customerName: order.customerName, status: order.status },
        companyId,
        userId
      );

      // 4. Return the created sales order with its items
      const fullOrder = await tx.salesOrder.findUnique({
        where: { id: order.id },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      return {
        order: fullOrder,
        procuredMOs,
        procuredPOs,
      };
    });
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
  async confirm(id: string, companyId: string, userId?: string) {
    const updated = await this.repository.confirm(id, companyId);
    await this.auditService.log(
      'SalesOrder',
      id,
      'CONFIRM',
      { status: 'draft' },
      { status: 'confirmed' },
      companyId,
      userId
    );
    return updated;
  }

  /**
   * Deliver a confirmed sales order.
   */
  async deliver(id: string, companyId: string, userId?: string) {
    const order = await this.getById(id, companyId);
    const updated = await this.repository.deliver(id, companyId);
    await this.auditService.log(
      'SalesOrder',
      id,
      'DELIVER',
      { status: order.status },
      { status: 'delivered' },
      companyId,
      userId
    );
    return updated;
  }
}
