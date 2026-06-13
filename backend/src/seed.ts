import { prisma } from './config/prisma';
import { SalesOrderStatus, PurchaseOrderStatus, ManufacturingStatus, ProcurementType } from '@prisma/client';

let salesOrderCounter = 1;
let purchaseOrderCounter = 1;
let manufacturingOrderCounter = 1;
let bomCounter = 1;

async function seedCompanyData(companyId: string, companyName: string) {
  console.log(`Seeding data for company: ${companyName} (${companyId})...`);

  // 1. Create Products
  const productsData = [
    { name: 'Solid Oak Desk', costPrice: 200, salesPrice: 450, procurementType: ProcurementType.manufacture, procureOnDemand: true },
    { name: 'Ergonomic Office Chair', costPrice: 70, salesPrice: 150, procurementType: ProcurementType.manufacture, procureOnDemand: true },
    { name: 'Premium Leather Sofa', costPrice: 550, salesPrice: 1200, procurementType: ProcurementType.manufacture, procureOnDemand: false },
    { name: 'Steel Screws Box', costPrice: 5, salesPrice: 12, procurementType: ProcurementType.purchase, procureOnDemand: false },
    { name: 'Wood Plank', costPrice: 6, salesPrice: 15, procurementType: ProcurementType.purchase, procureOnDemand: false },
    { name: 'LED Desk Lamp', costPrice: 20, salesPrice: 45, procurementType: ProcurementType.purchase, procureOnDemand: false },
  ];

  const products: Record<string, any> = {};

  for (const p of productsData) {
    // Check if product already exists
    let prod = await prisma.product.findFirst({
      where: { name: p.name, companyId }
    });

    if (!prod) {
      prod = await prisma.product.create({
        data: {
          ...p,
          companyId
        }
      });
    }
    products[p.name] = prod;
  }

  // 2. Set Up Inventory Balance & Ledger Entries
  const inventorySetup = [
    { productName: 'Wood Plank', qty: 120 },
    { productName: 'Steel Screws Box', qty: 250 },
    { productName: 'LED Desk Lamp', qty: 8 }, // Low stock (under 10) to trigger stock warnings!
    { productName: 'Solid Oak Desk', qty: 5 },
    { productName: 'Ergonomic Office Chair', qty: 4 }, // Low stock (under 10)
    { productName: 'Premium Leather Sofa', qty: 2 },
  ];

  for (const inv of inventorySetup) {
    const prod = products[inv.productName];
    if (!prod) continue;

    // Check or create inventory
    const existingInv = await prisma.inventory.findUnique({
      where: { productId: prod.id }
    });

    if (!existingInv) {
      await prisma.inventory.create({
        data: {
          productId: prod.id,
          onHandQty: inv.qty,
          reservedQty: 0,
          companyId
        }
      });

      // Add Stock Ledger Entry
      await prisma.stockLedger.create({
        data: {
          productId: prod.id,
          changeQty: inv.qty,
          type: 'PURCHASE',
          referenceId: 'Initial Seed Balance',
          companyId
        }
      });
    } else {
      // Update quantity to make sure it is populated
      await prisma.inventory.update({
        where: { productId: prod.id },
        data: { onHandQty: inv.qty }
      });
    }
  }

  // 3. Set Up Bill of Materials (BoM)
  const desk = products['Solid Oak Desk'];
  const chair = products['Ergonomic Office Chair'];
  const wood = products['Wood Plank'];
  const screws = products['Steel Screws Box'];

  if (desk && wood && screws) {
    const existingBom = await prisma.boM.findUnique({
      where: { productId: desk.id }
    });

    if (!existingBom) {
      const bom = await prisma.boM.create({
        data: {
          id: `BOM-${String(bomCounter++).padStart(4, '0')}`,
          productId: desk.id,
          companyId
        }
      });

      await prisma.boMItem.createMany({
        data: [
          { bomId: bom.id, componentId: wood.id, quantity: 4 },
          { bomId: bom.id, componentId: screws.id, quantity: 8 },
        ]
      });
    }
  }

  if (chair && screws) {
    const existingBom = await prisma.boM.findUnique({
      where: { productId: chair.id }
    });

    if (!existingBom) {
      const bom = await prisma.boM.create({
        data: {
          id: `BOM-${String(bomCounter++).padStart(4, '0')}`,
          productId: chair.id,
          companyId
        }
      });

      await prisma.boMItem.createMany({
        data: [
          { bomId: bom.id, componentId: screws.id, quantity: 4 },
        ]
      });
    }
  }

  // 4. Create Sales Orders (Mix of Delivered, Confirmed, Draft)
  const ordersSetup = [
    {
      customerName: 'Grand Furniture Mart',
      status: SalesOrderStatus.delivered,
      items: [
        { productName: 'Solid Oak Desk', qty: 2 },
        { productName: 'Ergonomic Office Chair', qty: 5 },
      ]
    },
    {
      customerName: 'Elite Resorts Ltd',
      status: SalesOrderStatus.delivered,
      items: [
        { productName: 'Premium Leather Sofa', qty: 1 },
        { productName: 'Solid Oak Desk', qty: 4 },
      ]
    },
    {
      customerName: 'Tech Office Space',
      status: SalesOrderStatus.delivered,
      items: [
        { productName: 'Ergonomic Office Chair', qty: 8 },
        { productName: 'Solid Oak Desk', qty: 3 },
      ]
    },
    {
      customerName: 'Luxury Hotels',
      status: SalesOrderStatus.confirmed,
      items: [
        { productName: 'Ergonomic Office Chair', qty: 10 },
        { productName: 'Premium Leather Sofa', qty: 2 },
      ]
    },
    {
      customerName: 'saqib',
      status: SalesOrderStatus.draft,
      items: [
        { productName: 'Solid Oak Desk', qty: 1 },
      ]
    }
  ];

  const defaultUser = await prisma.user.findFirst({
    where: { companyId }
  });
  const responsiblePersonId = defaultUser ? defaultUser.id : undefined;

  for (const o of ordersSetup) {
    // Check if order already exists for customer
    const existingOrder = await prisma.salesOrder.findFirst({
      where: { customerName: o.customerName, companyId, status: o.status }
    });

    if (!existingOrder) {
      const order = await prisma.salesOrder.create({
        data: {
          id: `SO-${String(salesOrderCounter++).padStart(5, '0')}`,
          customerName: o.customerName,
          customerAddress: '123 Business Rd, Suite 100',
          responsiblePersonId,
          status: o.status,
          companyId
        }
      });

      const items = o.items.map(item => {
        const prod = products[item.productName];
        return {
          orderId: order.id,
          productId: prod.id,
          quantity: item.qty
        };
      });

      await prisma.salesOrderItem.createMany({
        data: items
      });
    }
  }

  // 5. Create Purchase Orders
  const purchaseSetup = [
    {
      vendorName: 'Global Timber Supplies',
      status: PurchaseOrderStatus.received,
      items: [
        { productName: 'Wood Plank', qty: 50 },
      ]
    },
    {
      vendorName: 'Sino Electronics',
      status: PurchaseOrderStatus.confirmed,
      items: [
        { productName: 'LED Desk Lamp', qty: 20 },
      ]
    }
  ];

  for (const po of purchaseSetup) {
    const existingPo = await prisma.purchaseOrder.findFirst({
      where: { vendorName: po.vendorName, companyId, status: po.status }
    });

    if (!existingPo) {
      const order = await prisma.purchaseOrder.create({
        data: {
          id: `PO-${String(purchaseOrderCounter++).padStart(5, '0')}`,
          vendorName: po.vendorName,
          vendorAddress: '456 Supplier Ave, Industrial Zone',
          responsiblePersonId,
          status: po.status,
          companyId
        }
      });

      const items = po.items.map(item => {
        const prod = products[item.productName];
        return {
          orderId: order.id,
          productId: prod.id,
          quantity: item.qty
        };
      });

      await prisma.purchaseOrderItem.createMany({
        data: items
      });
    }
  }

  // 6. Create Manufacturing Orders
  const manufacturingSetup = [
    { productName: 'Solid Oak Desk', qty: 5, status: ManufacturingStatus.completed },
    { productName: 'Ergonomic Office Chair', qty: 10, status: ManufacturingStatus.in_progress },
  ];

  for (const mo of manufacturingSetup) {
    const prod = products[mo.productName];
    if (!prod) continue;

    const existingMo = await prisma.manufacturingOrder.findFirst({
      where: { productId: prod.id, companyId, status: mo.status, quantity: mo.qty }
    });

    if (!existingMo) {
      await prisma.manufacturingOrder.create({
        data: {
          id: `MO-${String(manufacturingOrderCounter++).padStart(4, '0')}`,
          productId: prod.id,
          quantity: mo.qty,
          status: mo.status,
          companyId
        }
      });
    }
  }

  console.log(`Seeding complete for company: ${companyName}.`);
}

async function main() {
  const companies = await prisma.company.findMany();
  if (companies.length === 0) {
    console.log('No companies found in database. Please register a company first in the frontend.');
    return;
  }

  for (const company of companies) {
    await seedCompanyData(company.id, company.name);
  }

  console.log('\nDatabase seeding finished successfully!');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
