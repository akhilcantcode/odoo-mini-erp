import { ProcurementType, SalesOrderStatus, PurchaseOrderStatus, ManufacturingStatus, StockMovementType, ReservationSourceType, RoleType, Module, PermissionAction } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from './config/prisma';

async function main() {
  console.log('🌱 Starting realistic database seed...');

  // 1. Purge existing data in foreign-key-safe order
  console.log('🗑️ Purging existing records...');
  await prisma.userPermissionOverride.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.stockLedger.deleteMany();
  await prisma.salesOrderItem.deleteMany();
  await prisma.salesOrder.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.manufacturingOrderItem.deleteMany();
  await prisma.manufacturingWorkOrder.deleteMany();
  await prisma.manufacturingOrder.deleteMany();
  await prisma.boMItem.deleteMany();
  await prisma.boMOperation.deleteMany();
  await prisma.boM.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.company.deleteMany();

  console.log('✅ Existing records purged.');

  // 2. Seed global permissions
  console.log('🔑 Seeding global permissions...');
  const permissionsToCreate = [];
  for (const m of Object.values(Module)) {
    for (const a of Object.values(PermissionAction)) {
      permissionsToCreate.push({ module: m, action: a });
    }
  }
  await prisma.permission.createMany({
    data: permissionsToCreate,
    skipDuplicates: true,
  });
  const allPermissions = await prisma.permission.findMany();

  // 3. Create Company
  console.log('🏢 Creating Seed Industrial Corp...');
  const company = await prisma.company.create({
    data: {
      name: 'Seed Industrial Corp',
    },
  });

  // 4. Create Roles and assign permissions
  console.log('🛡️ Seeding roles and role-permission mappings...');
  const createdRoles: Record<RoleType, any> = {} as any;
  for (const rType of Object.values(RoleType)) {
    const role = await prisma.role.create({
      data: {
        name: rType,
        companyId: company.id,
      },
    });
    createdRoles[rType] = role;
  }

  // Link permissions to roles
  for (const rType of Object.values(RoleType)) {
    const roleId = createdRoles[rType].id;
    let allowedPerms = [];

    if (rType === RoleType.OWNER || rType === RoleType.ADMIN) {
      allowedPerms = allPermissions;
    } else if (rType === RoleType.SALES) {
      allowedPerms = allPermissions.filter(p => 
        p.module === Module.SALES || 
        (p.module === Module.PRODUCT && p.action === PermissionAction.READ) ||
        (p.module === Module.INVENTORY && p.action === PermissionAction.READ) ||
        p.module === Module.AUDIT
      );
    } else if (rType === RoleType.PURCHASE) {
      allowedPerms = allPermissions.filter(p => 
        p.module === Module.PURCHASE || 
        (p.module === Module.PRODUCT && p.action === PermissionAction.READ) ||
        (p.module === Module.INVENTORY && p.action === PermissionAction.READ) ||
        p.module === Module.AUDIT
      );
    } else if (rType === RoleType.MANUFACTURING) {
      allowedPerms = allPermissions.filter(p => 
        p.module === Module.MANUFACTURING || 
        (p.module === Module.PRODUCT && p.action === PermissionAction.READ) ||
        (p.module === Module.INVENTORY && p.action === PermissionAction.READ) ||
        p.module === Module.AUDIT
      );
    } else if (rType === RoleType.INVENTORY || rType === RoleType.INVENTORY_MANAGER) {
      allowedPerms = allPermissions.filter(p => 
        p.module === Module.INVENTORY || 
        (p.module === Module.PRODUCT && p.action === PermissionAction.READ) ||
        p.module === Module.AUDIT
      );
    } else {
      allowedPerms = allPermissions.filter(p => p.action === PermissionAction.READ);
    }

    await prisma.rolePermission.createMany({
      data: allowedPerms.map(p => ({
        roleId,
        permissionId: p.id,
      })),
    });
  }

  // 5. Create Users
  console.log('👤 Seeding users...');
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const usersData = [
    { name: 'Seed Admin', email: 'admin@seed.com', role: RoleType.OWNER },
    { name: 'Sales Rep', email: 'sales@seed.com', role: RoleType.SALES },
    { name: 'Purchasing Officer', email: 'purchase@seed.com', role: RoleType.PURCHASE },
    { name: 'Production Manager', email: 'production@seed.com', role: RoleType.MANUFACTURING },
    { name: 'Warehouse Supervisor', email: 'inventory@seed.com', role: RoleType.INVENTORY },
  ];

  const seededUsers: Record<string, any> = {};
  for (const u of usersData) {
    const user = await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        password: passwordHash,
        companyId: company.id,
      },
    });
    
    // Assign role
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: createdRoles[u.role].id,
      },
    });
    
    seededUsers[u.email] = user;
  }

  // 6. Create Products
  console.log('📦 Seeding products (finished goods & components)...');
  
  // 6.1 Raw materials / Components (Procure: purchase)
  const componentsList = [
    { name: 'Oak Wood Planks', cost: 12.5, price: 18.0, imageUrl: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=200&auto=format&fit=crop&q=60' },
    { name: 'Pine Wood Boards', cost: 6.0, price: 9.5, imageUrl: 'https://images.unsplash.com/photo-1541123437800-1bb1317badc2?w=200&auto=format&fit=crop&q=60' },
    { name: 'Steel Framing L', cost: 22.0, price: 30.0, imageUrl: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=200&auto=format&fit=crop&q=60' },
    { name: 'Foam Padding', cost: 4.5, price: 7.0, imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=200&auto=format&fit=crop&q=60' },
    { name: 'Premium Leather Roll', cost: 85.0, price: 120.0, imageUrl: 'https://images.unsplash.com/photo-1524295988346-04879a27f56b?w=200&auto=format&fit=crop&q=60' },
    { name: 'Fabric Mesh Panel', cost: 5.0, price: 8.0, imageUrl: 'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?w=200&auto=format&fit=crop&q=60' },
    { name: 'Screws & Bolts Box', cost: 2.5, price: 4.5, imageUrl: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?w=200&auto=format&fit=crop&q=60' },
    { name: 'LED Strip MultiColor', cost: 8.0, price: 15.0, imageUrl: 'https://images.unsplash.com/photo-1565814636199-ae8133055c1c?w=200&auto=format&fit=crop&q=60' },
    { name: 'Microprocessor Chip v3', cost: 18.5, price: 35.0, imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=200&auto=format&fit=crop&q=60' },
    { name: 'Controller Unit v1', cost: 14.0, price: 25.0, imageUrl: 'https://images.unsplash.com/photo-1555664424-778a1e5e1b48?w=200&auto=format&fit=crop&q=60' },
    { name: 'Electric Motor 12V', cost: 35.0, price: 60.0, imageUrl: 'https://images.unsplash.com/photo-1590986424791-2355385d0442?w=200&auto=format&fit=crop&q=60' },
    { name: 'Power Adapter 24W', cost: 7.5, price: 12.0, imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=200&auto=format&fit=crop&q=60' },
    { name: 'ABS Plastic Casing', cost: 3.0, price: 5.5, imageUrl: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=200&auto=format&fit=crop&q=60' },
    { name: 'Heating Element', cost: 11.5, price: 20.0, imageUrl: 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=200&auto=format&fit=crop&q=60' },
    { name: 'Water Pump Mini', cost: 9.0, price: 16.0, imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=200&auto=format&fit=crop&q=60' },
    { name: 'Glass Panel Beveled', cost: 15.0, price: 25.0, imageUrl: 'https://images.unsplash.com/photo-1561715276-a2d087060f1d?w=200&auto=format&fit=crop&q=60' },
    { name: 'Thermostat Chip', cost: 6.5, price: 12.0, imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&auto=format&fit=crop&q=60' },
    { name: 'Hinge Metal Heavy', cost: 1.5, price: 2.8, imageUrl: 'https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?w=200&auto=format&fit=crop&q=60' },
    { name: 'Rubber Seals Pack', cost: 2.0, price: 3.5, imageUrl: 'https://images.unsplash.com/photo-1605557202138-097824c3f9f4?w=200&auto=format&fit=crop&q=60' },
    { name: 'Gas Lift Cylinder', cost: 12.0, price: 22.0, imageUrl: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=200&auto=format&fit=crop&q=60' },
  ];

  const seededComponents: Record<string, any> = {};
  for (const c of componentsList) {
    const product = await prisma.product.create({
      data: {
        name: c.name,
        costPrice: c.cost,
        salesPrice: c.price,
        procurementType: ProcurementType.purchase,
        procureOnDemand: false,
        imageUrl: c.imageUrl,
        companyId: company.id,
      },
    });

    // Seed inventory for raw materials
    await prisma.inventory.create({
      data: {
        productId: product.id,
        onHandQty: 250.0, // generous raw material inventory
        reservedQty: 0.0,
        companyId: company.id,
      },
    });

    // Seed ledger entry for initial raw stock
    await prisma.stockLedger.create({
      data: {
        productId: product.id,
        changeQty: 250.0,
        type: StockMovementType.PURCHASE,
        companyId: company.id,
      },
    });

    seededComponents[c.name] = product;
  }

  // 6.2 Finished Goods (Procure: manufacture)
  const finishedList = [
    { name: 'Oak Dining Table', cost: 120.0, price: 399.0, imageUrl: 'https://images.unsplash.com/photo-1577140917170-285929fb55b7?w=400&auto=format&fit=crop&q=80' },
    { name: 'Pine Bookshelf Flat', cost: 45.0, price: 119.0, imageUrl: 'https://images.unsplash.com/photo-1594620302200-9a762244a156?w=400&auto=format&fit=crop&q=80' },
    { name: 'Ergonomic Office Chair', cost: 80.0, price: 249.0, imageUrl: 'https://images.unsplash.com/photo-1505797149-43b0069ec26b?w=400&auto=format&fit=crop&q=80' },
    { name: 'Premium Leather Sofa', cost: 450.0, price: 1199.0, imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&auto=format&fit=crop&q=80' },
    { name: 'Electric Standing Desk', cost: 180.0, price: 499.0, imageUrl: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=400&auto=format&fit=crop&q=80' },
    { name: 'Smart LED Desk Lamp', cost: 35.0, price: 89.0, imageUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&auto=format&fit=crop&q=80' },
    { name: 'Smart Digital Thermostat', cost: 40.0, price: 149.0, imageUrl: 'https://images.unsplash.com/photo-1545259741-2ea3ebf61fa3?w=400&auto=format&fit=crop&q=80' },
    { name: 'Smart Coffee Maker Plus', cost: 60.0, price: 199.0, imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c53b2d0bc6?w=400&auto=format&fit=crop&q=80' },
    { name: 'Steel File Cabinet', cost: 55.0, price: 149.0, imageUrl: 'https://images.unsplash.com/photo-1595515106969-1ce29566ff1c?w=400&auto=format&fit=crop&q=80' },
    { name: 'Glass Top Coffee Table', cost: 70.0, price: 189.0, imageUrl: 'https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=400&auto=format&fit=crop&q=80' },
  ];

  const seededFinished: Record<string, any> = {};
  for (const f of finishedList) {
    const product = await prisma.product.create({
      data: {
        name: f.name,
        costPrice: f.cost,
        salesPrice: f.price,
        procurementType: ProcurementType.manufacture,
        procureOnDemand: f.name === 'Electric Standing Desk' || f.name === 'Premium Leather Sofa', // procure standing desk/sofa on demand
        imageUrl: f.imageUrl,
        companyId: company.id,
      },
    });

    // Seed inventory for finished goods
    await prisma.inventory.create({
      data: {
        productId: product.id,
        onHandQty: 12.0, // initial stock
        reservedQty: 0.0,
        companyId: company.id,
      },
    });

    // Seed ledger entry
    await prisma.stockLedger.create({
      data: {
        productId: product.id,
        changeQty: 12.0,
        type: StockMovementType.MANUFACTURE_PRODUCE,
        companyId: company.id,
      },
    });

    seededFinished[f.name] = product;
  }

  // 7. Seed Bills of Materials (BoMs)
  console.log('📐 Seeding Bills of Materials (BoMs)...');
  
  // 7.1 Oak Dining Table BoM
  const tableBom = await prisma.boM.create({
    data: {
      id: 'BOM-0001',
      productId: seededFinished['Oak Dining Table'].id,
      quantity: 1,
      reference: 'OAK-TAB',
      companyId: company.id,
    },
  });
  await prisma.boMItem.createMany({
    data: [
      { bomId: tableBom.id, componentId: seededComponents['Oak Wood Planks'].id, quantity: 6 },
      { bomId: tableBom.id, componentId: seededComponents['Screws & Bolts Box'].id, quantity: 2 },
      { bomId: tableBom.id, componentId: seededComponents['Hinge Metal Heavy'].id, quantity: 4 },
    ],
  });
  await prisma.boMOperation.createMany({
    data: [
      { bomId: tableBom.id, operationName: 'Plank Cutting & Sanding', workCenterName: 'Woodwork Shop', plannedDuration: 45.0, companyId: company.id },
      { bomId: tableBom.id, operationName: 'Leg & Hinge Assembly', workCenterName: 'Assembly Bench A', plannedDuration: 60.0, companyId: company.id },
      { bomId: tableBom.id, operationName: 'Staining & Lacquering', workCenterName: 'Finishing Booth', plannedDuration: 30.0, companyId: company.id },
    ],
  });

  // 7.2 Ergonomic Office Chair BoM
  const chairBom = await prisma.boM.create({
    data: {
      id: 'BOM-0002',
      productId: seededFinished['Ergonomic Office Chair'].id,
      quantity: 1,
      reference: 'ERGO-CHR',
      companyId: company.id,
    },
  });
  await prisma.boMItem.createMany({
    data: [
      { bomId: chairBom.id, componentId: seededComponents['Steel Framing L'].id, quantity: 2 },
      { bomId: chairBom.id, componentId: seededComponents['Foam Padding'].id, quantity: 1 },
      { bomId: chairBom.id, componentId: seededComponents['Fabric Mesh Panel'].id, quantity: 1 },
      { bomId: chairBom.id, componentId: seededComponents['Gas Lift Cylinder'].id, quantity: 1 },
      { bomId: chairBom.id, componentId: seededComponents['Screws & Bolts Box'].id, quantity: 1 },
    ],
  });
  await prisma.boMOperation.createMany({
    data: [
      { bomId: chairBom.id, operationName: 'Frame Cutting & Welding', workCenterName: 'Metalworking Shop', plannedDuration: 30.0, companyId: company.id },
      { bomId: chairBom.id, operationName: 'Upholstery Padding', workCenterName: 'Fabric Workshop', plannedDuration: 40.0, companyId: company.id },
      { bomId: chairBom.id, operationName: 'Final Assembly & Gas Lift Test', workCenterName: 'Assembly Bench B', plannedDuration: 30.0, companyId: company.id },
    ],
  });

  // 7.3 Electric Standing Desk BoM
  const deskBom = await prisma.boM.create({
    data: {
      id: 'BOM-0003',
      productId: seededFinished['Electric Standing Desk'].id,
      quantity: 1,
      reference: 'E-DESK',
      companyId: company.id,
    },
  });
  await prisma.boMItem.createMany({
    data: [
      { bomId: deskBom.id, componentId: seededComponents['Oak Wood Planks'].id, quantity: 3 },
      { bomId: deskBom.id, componentId: seededComponents['Steel Framing L'].id, quantity: 4 },
      { bomId: deskBom.id, componentId: seededComponents['Electric Motor 12V'].id, quantity: 2 },
      { bomId: deskBom.id, componentId: seededComponents['Controller Unit v1'].id, quantity: 1 },
      { bomId: deskBom.id, componentId: seededComponents['Power Adapter 24W'].id, quantity: 1 },
      { bomId: deskBom.id, componentId: seededComponents['Screws & Bolts Box'].id, quantity: 2 },
    ],
  });
  await prisma.boMOperation.createMany({
    data: [
      { bomId: deskBom.id, operationName: 'Tabletop Finish', workCenterName: 'Woodwork Shop', plannedDuration: 25.0, companyId: company.id },
      { bomId: deskBom.id, operationName: 'Steel Base Construction', workCenterName: 'Metalworking Shop', plannedDuration: 50.0, companyId: company.id },
      { bomId: deskBom.id, operationName: 'Motor & Controller Integration', workCenterName: 'Electronics Lab', plannedDuration: 60.0, companyId: company.id },
      { bomId: deskBom.id, operationName: 'Calibration & QA testing', workCenterName: 'Assembly Bench B', plannedDuration: 20.0, companyId: company.id },
    ],
  });

  // 7.4 Smart Coffee Maker Plus BoM
  const coffeeBom = await prisma.boM.create({
    data: {
      id: 'BOM-0004',
      productId: seededFinished['Smart Coffee Maker Plus'].id,
      quantity: 1,
      reference: 'COF-MAK',
      companyId: company.id,
    },
  });
  await prisma.boMItem.createMany({
    data: [
      { bomId: coffeeBom.id, componentId: seededComponents['ABS Plastic Casing'].id, quantity: 1 },
      { bomId: coffeeBom.id, componentId: seededComponents['Heating Element'].id, quantity: 1 },
      { bomId: coffeeBom.id, componentId: seededComponents['Water Pump Mini'].id, quantity: 1 },
      { bomId: coffeeBom.id, componentId: seededComponents['Microprocessor Chip v3'].id, quantity: 1 },
      { bomId: coffeeBom.id, componentId: seededComponents['Thermostat Chip'].id, quantity: 1 },
      { bomId: coffeeBom.id, componentId: seededComponents['Glass Panel Beveled'].id, quantity: 1 },
      { bomId: coffeeBom.id, componentId: seededComponents['Rubber Seals Pack'].id, quantity: 1 },
    ],
  });
  await prisma.boMOperation.createMany({
    data: [
      { bomId: coffeeBom.id, operationName: 'Casing Prep & Sealed Base Fit', workCenterName: 'Assembly Bench A', plannedDuration: 20.0, companyId: company.id },
      { bomId: coffeeBom.id, operationName: 'Electronics & Pump Wiring', workCenterName: 'Electronics Lab', plannedDuration: 45.0, companyId: company.id },
      { bomId: coffeeBom.id, operationName: 'Water Pressure & Brew Quality QA', workCenterName: 'Testing Station', plannedDuration: 15.0, companyId: company.id },
    ],
  });

  // 8. Seed Sales Orders (at least 30 orders)
  console.log('🛍️ Seeding 30+ Sales Orders...');
  const customers = [
    'Acme Corp', 'Globex Corporation', 'Initech LLC', 'Umbrella Retailers', 
    'Hooli Inc', 'Vehement Capital', 'Stark Industries', 'Wayne Enterprises', 
    'Cyberdyne Systems', 'Tyrell Corp', 'Soylent Green Co', 'Dharma Initiative'
  ];

  for (let i = 1; i <= 32; i++) {
    const cust = customers[i % customers.length];
    // status: draft (1-5), confirmed (6-15), delivered (16-32)
    let status: SalesOrderStatus = SalesOrderStatus.delivered;
    if (i <= 5) status = SalesOrderStatus.draft;
    else if (i <= 15) status = SalesOrderStatus.confirmed;

    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    const order = await prisma.salesOrder.create({
      data: {
        id: `SO-${String(i).padStart(5, '0')}`,
        customerName: cust,
        customerAddress: `${100 + i} Commerce Blvd, Suite ${i}, Austin TX`,
        status,
        createdAt: date,
        responsiblePersonId: seededUsers['sales@seed.com'].id,
        companyId: company.id,
      },
    });

    // Add 1 to 3 items
    const numItems = (i % 3) + 1;
    const selectedProds = Object.keys(seededFinished).slice(0, numItems);
    for (const prodName of selectedProds) {
      await prisma.salesOrderItem.create({
        data: {
          orderId: order.id,
          productId: seededFinished[prodName].id,
          quantity: (i % 4) + 1.0,
        },
      });
      
      // If delivered, deduct stock and log stock ledger
      if (status === SalesOrderStatus.delivered) {
        const qty = (i % 4) + 1.0;
        await prisma.inventory.update({
          where: { productId: seededFinished[prodName].id },
          data: {
            onHandQty: { decrement: qty }
          }
        });
        await prisma.stockLedger.create({
          data: {
            productId: seededFinished[prodName].id,
            changeQty: -qty,
            type: StockMovementType.SALE,
            referenceId: order.id,
            companyId: company.id,
          }
        });
      }
    }
  }

  // 9. Seed Purchase Orders (at least 30 orders)
  console.log('🛒 Seeding 30+ Purchase Orders...');
  const vendors = [
    'Timberlands Log Co', 'Steelworkers Metal Supplies', 'Padding Specialists', 
    'Allied Components Inc', 'LED Manufacturers', 'ElectroParts Distributor', 
    'Hydraulics & Seals Corp', 'ABS Plastic Molding', 'MicroTech Distributors'
  ];

  for (let i = 1; i <= 32; i++) {
    const vend = vendors[i % vendors.length];
    // status: draft (1-5), confirmed (6-15), received (16-32)
    let status: PurchaseOrderStatus = PurchaseOrderStatus.received;
    if (i <= 5) status = PurchaseOrderStatus.draft;
    else if (i <= 15) status = PurchaseOrderStatus.confirmed;

    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    const order = await prisma.purchaseOrder.create({
      data: {
        id: `PO-${String(i).padStart(5, '0')}`,
        vendorName: vend,
        vendorAddress: `${500 + i} Industrial Dr, Sector ${i}, Chicago IL`,
        status,
        createdAt: date,
        responsiblePersonId: seededUsers['purchase@seed.com'].id,
        companyId: company.id,
      },
    });

    // Add 1 to 4 items
    const numItems = (i % 4) + 1;
    const selectedComponents = Object.keys(seededComponents).slice(0, numItems);
    for (const compName of selectedComponents) {
      await prisma.purchaseOrderItem.create({
        data: {
          orderId: order.id,
          productId: seededComponents[compName].id,
          quantity: ((i % 5) + 1) * 20.0,
        },
      });

      // If received, add to inventory and stock ledger
      if (status === PurchaseOrderStatus.received) {
        const qty = ((i % 5) + 1) * 20.0;
        await prisma.inventory.update({
          where: { productId: seededComponents[compName].id },
          data: {
            onHandQty: { increment: qty }
          }
        });
        await prisma.stockLedger.create({
          data: {
            productId: seededComponents[compName].id,
            changeQty: qty,
            type: StockMovementType.PURCHASE,
            referenceId: order.id,
            companyId: company.id,
          }
        });
      }
    }
  }

  // 10. Seed Manufacturing Orders (at least 30 orders)
  console.log('🏭 Seeding 30+ Manufacturing Orders...');
  
  const finishNames = Object.keys(seededFinished).slice(0, 4); // Dining Table, Bookshelf, Chair, Sofa

  for (let i = 1; i <= 31; i++) {
    const fName = finishNames[i % finishNames.length];
    const finishedProduct = seededFinished[fName];

    // status: draft (1-5), confirmed (6-10), in_progress (11-15), completed (16-31)
    let status: ManufacturingStatus = ManufacturingStatus.completed;
    if (i <= 5) status = ManufacturingStatus.draft;
    else if (i <= 10) status = ManufacturingStatus.confirmed;
    else if (i <= 15) status = ManufacturingStatus.in_progress;

    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    const mo = await prisma.manufacturingOrder.create({
      data: {
        id: `MO-${String(i).padStart(4, '0')}`,
        productId: finishedProduct.id,
        quantity: (i % 3) + 1.0,
        status,
        createdAt: date,
        scheduleDate: date,
        assigneeId: seededUsers['production@seed.com'].id,
        companyId: company.id,
      },
    });

    // Add components to consume based on table/chair boms
    let bomRecord = null;
    if (fName === 'Oak Dining Table') {
      bomRecord = tableBom;
      await prisma.manufacturingOrderItem.createMany({
        data: [
          { manufacturingOrderId: mo.id, productId: seededComponents['Oak Wood Planks'].id, toConsumeQty: 6 * mo.quantity, consumedQty: status === ManufacturingStatus.completed ? 6 * mo.quantity : 0, companyId: company.id },
          { manufacturingOrderId: mo.id, productId: seededComponents['Screws & Bolts Box'].id, toConsumeQty: 2 * mo.quantity, consumedQty: status === ManufacturingStatus.completed ? 2 * mo.quantity : 0, companyId: company.id },
          { manufacturingOrderId: mo.id, productId: seededComponents['Hinge Heavy Metal' as any]?.id || seededComponents['Hinge Metal Heavy'].id, toConsumeQty: 4 * mo.quantity, consumedQty: status === ManufacturingStatus.completed ? 4 * mo.quantity : 0, companyId: company.id },
        ],
      });
      await prisma.manufacturingWorkOrder.createMany({
        data: [
          { manufacturingOrderId: mo.id, operationName: 'Plank Cutting & Sanding', workCenterName: 'Woodwork Shop', plannedDuration: 45.0, status: status === ManufacturingStatus.completed ? 'completed' : 'pending', companyId: company.id },
          { manufacturingOrderId: mo.id, operationName: 'Leg & Hinge Assembly', workCenterName: 'Assembly Bench A', plannedDuration: 60.0, status: status === ManufacturingStatus.completed ? 'completed' : 'pending', companyId: company.id },
          { manufacturingOrderId: mo.id, operationName: 'Staining & Lacquering', workCenterName: 'Finishing Booth', plannedDuration: 30.0, status: status === ManufacturingStatus.completed ? 'completed' : 'pending', companyId: company.id },
        ],
      });
    } else {
      bomRecord = chairBom;
      await prisma.manufacturingOrderItem.createMany({
        data: [
          { manufacturingOrderId: mo.id, productId: seededComponents['Steel Framing L'].id, toConsumeQty: 2 * mo.quantity, consumedQty: status === ManufacturingStatus.completed ? 2 * mo.quantity : 0, companyId: company.id },
          { manufacturingOrderId: mo.id, productId: seededComponents['Foam Padding'].id, toConsumeQty: 1 * mo.quantity, consumedQty: status === ManufacturingStatus.completed ? 1 * mo.quantity : 0, companyId: company.id },
          { manufacturingOrderId: mo.id, productId: seededComponents['Fabric Mesh Panel'].id, toConsumeQty: 1 * mo.quantity, consumedQty: status === ManufacturingStatus.completed ? 1 * mo.quantity : 0, companyId: company.id },
          { manufacturingOrderId: mo.id, productId: seededComponents['Screws & Bolts Box'].id, toConsumeQty: 1 * mo.quantity, consumedQty: status === ManufacturingStatus.completed ? 1 * mo.quantity : 0, companyId: company.id },
        ],
      });
      await prisma.manufacturingWorkOrder.createMany({
        data: [
          { manufacturingOrderId: mo.id, operationName: 'Frame Cutting & Welding', workCenterName: 'Metalworking Shop', plannedDuration: 30.0, status: status === ManufacturingStatus.completed ? 'completed' : 'pending', companyId: company.id },
          { manufacturingOrderId: mo.id, operationName: 'Upholstery Padding', workCenterName: 'Fabric Workshop', plannedDuration: 40.0, status: status === ManufacturingStatus.completed ? 'completed' : 'pending', companyId: company.id },
        ],
      });
    }

    // Update reference
    await prisma.manufacturingOrder.update({
      where: { id: mo.id },
      data: { bomId: bomRecord.id }
    });

    // If completed, add finished stock and log ledger
    if (status === ManufacturingStatus.completed) {
      await prisma.inventory.update({
        where: { productId: finishedProduct.id },
        data: {
          onHandQty: { increment: mo.quantity }
        }
      });
      await prisma.stockLedger.create({
        data: {
          productId: finishedProduct.id,
          changeQty: mo.quantity,
          type: StockMovementType.MANUFACTURE_PRODUCE,
          referenceId: mo.id,
          companyId: company.id,
        }
      });
    }
  }

  // 11. Seed Audit Logs (at least 40 logs)
  console.log('📜 Seeding 40+ Audit Logs...');
  const auditActions = ['CREATE', 'UPDATE', 'DELETE', 'SET', 'CONFIRM', 'DELIVER', 'RECEIVE', 'START', 'COMPLETE'];
  const auditEntities = ['Product', 'SalesOrder', 'PurchaseOrder', 'ManufacturingOrder', 'BoM', 'Inventory'];
  
  const mockProducts = Object.values(seededFinished);
  
  for (let i = 1; i <= 45; i++) {
    const act = auditActions[i % auditActions.length];
    const ent = auditEntities[i % auditEntities.length];
    const user = seededUsers[Object.keys(seededUsers)[i % Object.keys(seededUsers).length]];

    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    await prisma.auditLog.create({
      data: {
        entityType: ent,
        entityId: mockProducts[i % mockProducts.length].id,
        action: act,
        oldValue: { status: 'draft' },
        newValue: { status: 'confirmed' },
        createdAt: date,
        companyId: company.id,
        userId: user.id,
      },
    });
  }

  console.log('✨ Seeding complete!');
  console.log('🎯 Total records created:');
  console.log(`- Companies: 1`);
  console.log(`- Roles: 8`);
  console.log(`- Users: 5`);
  console.log(`- Products: ${componentsList.length + finishedList.length}`);
  console.log(`- BoMs: 4`);
  console.log(`- Sales Orders: 32`);
  console.log(`- Purchase Orders: 32`);
  console.log(`- Manufacturing Orders: 31`);
  console.log(`- Audit Logs: 45`);
  console.log('🎉 DB successfully primed with realistic test data.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
