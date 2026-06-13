import { prisma } from './config/prisma';

async function main() {
  const products = await prisma.product.findMany({
    include: {
      inventory: true
    }
  });
  console.log('Products & Inventories:');
  products.forEach(p => {
    console.log(`Product: ${p.name}, Cost Price: ${p.costPrice}, Sales Price: ${p.salesPrice}, On Hand Qty: ${p.inventory?.onHandQty}, CompanyId: ${p.companyId}`);
  });

  const salesOrders = await prisma.salesOrder.findMany({
    include: {
      items: {
        include: {
          product: true
        }
      }
    }
  });
  console.log('\nSales Orders:');
  salesOrders.forEach(o => {
    console.log(`Order ID: ${o.id}, Customer: ${o.customerName}, Status: ${o.status}, CompanyId: ${o.companyId}`);
    o.items.forEach(i => {
      console.log(`  - Item: ${i.product.name}, Qty: ${i.quantity}, Price: ${i.product.salesPrice}`);
    });
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
