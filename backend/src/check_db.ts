import { prisma } from './config/prisma';

async function main() {
  const companies = await prisma.company.findMany();
  console.log('Companies:', companies);
  
  const users = await prisma.user.findMany({
    include: {
      roles: {
        include: {
          role: true
        }
      }
    }
  });
  console.log('Users:', users.map(u => ({ 
    id: u.id, 
    name: u.name, 
    email: u.email, 
    companyId: u.companyId,
    roles: u.roles.map(r => r.role.name)
  })));
  
  const products = await prisma.product.findMany();
  console.log('Products count:', products.length);
  
  const salesOrders = await prisma.salesOrder.findMany();
  console.log('Sales orders count:', salesOrders.length);
  console.log('Sales orders:', salesOrders);

  const inventories = await prisma.inventory.findMany();
  console.log('Inventories count:', inventories.length);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
