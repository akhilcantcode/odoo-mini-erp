
import { ProcurementRepository } from './procurement.repository';
import { ProcurementRunResult } from './procurement.types';
import { PurchaseOrderStatus, ManufacturingStatus } from '@prisma/client';
import { PurchaseRepository } from '../purchase/purchase.repository';
import { ManufacturingRepository } from '../manufacturing/manufacturing.repository';

const AUTO_VENDOR_NAME = 'Automatic Replenishment Vendor';

export class ProcurementService {
  private repository: ProcurementRepository;
  private purchaseRepository: PurchaseRepository;
  private manufacturingRepository: ManufacturingRepository;

  constructor() {
    this.repository = new ProcurementRepository();
    this.purchaseRepository = new PurchaseRepository();
    this.manufacturingRepository = new ManufacturingRepository();
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
      const po = await this.purchaseRepository.create({
        vendorName: AUTO_VENDOR_NAME,
        items: purchaseItems,
      }, companyId);

      triggeredPurchaseOrders.push({
        id: po.id,
        vendorName: po.vendorName,
        items: po.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });
    }

    // Create individual MOs for each manufacture shortfall
    for (const item of manufactureItems) {
      const mo = await this.manufacturingRepository.create({
        productId: item.productId,
        quantity: item.quantity,
      }, companyId);

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
