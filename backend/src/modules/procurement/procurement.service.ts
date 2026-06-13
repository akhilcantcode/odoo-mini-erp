import { prisma } from '../../config/prisma';
import { ProcurementRepository } from './procurement.repository';
import { ProcurementRunResult } from './procurement.types';
import { PurchaseOrderStatus, ManufacturingStatus } from '@prisma/client';

const AUTO_VENDOR_NAME = 'Automatic Replenishment Vendor';

export class ProcurementService {
  private repository: ProcurementRepository;

  constructor() {
    this.repository = new ProcurementRepository();
  }

  /**
   * Run procurement automation:
   * - MTO: For confirmed SOs with procureOnDemand products where freeQty < demand,
   *   auto-create POs (for purchase type) or MOs (for manufacture type).
   */
  async run(companyId: string): Promise<ProcurementRunResult> {
    const shortfalls = await this.repository.findShortfalls(companyId);

    const triggeredPurchaseOrders: ProcurementRunResult['triggeredPurchaseOrders'] = [];
    const triggeredManufacturingOrders: ProcurementRunResult['triggeredManufacturingOrders'] = [];

    // Group purchase shortfalls into a single PO
    const purchaseItems: { productId: string; quantity: number }[] = [];
    const manufactureItems: { productId: string; quantity: number }[] = [];

    for (const shortfall of shortfalls) {
      if (shortfall.procurementType === 'purchase') {
        purchaseItems.push({
          productId: shortfall.productId,
          quantity: shortfall.shortfallQty,
        });
      } else if (shortfall.procurementType === 'manufacture') {
        manufactureItems.push({
          productId: shortfall.productId,
          quantity: shortfall.shortfallQty,
        });
      }
    }

    // Create a single PO for all purchase shortfalls
    if (purchaseItems.length > 0) {
      const po = await prisma.purchaseOrder.create({
        data: {
          vendorName: AUTO_VENDOR_NAME,
          status: PurchaseOrderStatus.draft,
          companyId,
          items: {
            create: purchaseItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          items: { select: { productId: true, quantity: true } },
        },
      });

      triggeredPurchaseOrders.push({
        id: po.id,
        vendorName: po.vendorName,
        items: po.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });
    }

    // Create individual MOs for each manufacture shortfall
    for (const item of manufactureItems) {
      const mo = await prisma.manufacturingOrder.create({
        data: {
          productId: item.productId,
          quantity: item.quantity,
          status: ManufacturingStatus.draft,
          companyId,
        },
      });

      triggeredManufacturingOrders.push({
        id: mo.id,
        productId: mo.productId,
        quantity: mo.quantity,
      });
    }

    return {
      status: 'success',
      triggeredPurchaseOrders,
      triggeredManufacturingOrders,
    };
  }
}
