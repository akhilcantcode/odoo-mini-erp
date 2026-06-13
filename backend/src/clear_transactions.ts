import { prisma } from './config/prisma';

async function main() {
  console.log('Clearing transaction and product data (preserving users and companies)...');
  
  await prisma.auditLog.deleteMany({});
  await prisma.stockLedger.deleteMany({});
  await prisma.reservation.deleteMany({});
  await prisma.inventory.deleteMany({});
  await prisma.boMItem.deleteMany({});
  await prisma.boM.deleteMany({});
  await prisma.purchaseOrderItem.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  await prisma.manufacturingOrder.deleteMany({});
  await prisma.salesOrderItem.deleteMany({});
  await prisma.salesOrder.deleteMany({});
  await prisma.product.deleteMany({});
  
  console.log('Transactions and products cleared successfully!');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
