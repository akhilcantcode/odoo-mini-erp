import app from './app';
import { prisma } from './config/prisma';
import { SalesOrderStatus } from '@prisma/client';

const PORT = 5002;
const BASE_URL = `http://localhost:${PORT}/api`;

async function makeRequest(
  url: string,
  method: string,
  body?: any,
  token?: string
): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const responseBody = isJson ? await response.json() : await response.text();

  return {
    status: response.status,
    body: responseBody,
  };
}

async function runTests() {
  console.log('--- STARTING END-TO-END E2E TEST FLOW WITH AUTH & RBAC ---');
  
  // Clean up any potential leftover data from previous runs if necessary
  // (We'll clean up our test company at the end anyway)
  
  const testEmail = `owner-${Date.now()}@company.com`;
  const salesEmail = `sales-${Date.now()}@company.com`;
  
  let ownerToken = '';
  let salesToken = '';
  let companyId = '';
  let woodId = '';
  let screwId = '';
  let tableId = '';
  let poId = '';
  let moId = '';

  try {
    // 1. Register a new company and user owner
    console.log('\nStep 1: Registering company and owner user...');
    const registerRes = await makeRequest(`${BASE_URL}/auth/register`, 'POST', {
      name: 'E2E Owner User',
      email: testEmail,
      password: 'ownerpassword123',
      companyName: 'E2E Auth Test Company',
    });

    if (registerRes.status !== 201) {
      throw new Error(`Registration failed: ${JSON.stringify(registerRes.body)}`);
    }
    console.log('Registration successful:', registerRes.body);

    // 2. Login as Owner to get token
    console.log('\nStep 2: Logging in as Owner...');
    const loginRes = await makeRequest(`${BASE_URL}/auth/login`, 'POST', {
      email: testEmail,
      password: 'ownerpassword123',
    });

    if (loginRes.status !== 200) {
      throw new Error(`Login failed: ${JSON.stringify(loginRes.body)}`);
    }
    ownerToken = loginRes.body.accessToken;
    console.log('Login successful, token retrieved.');

    // Fetch me to get companyId
    const meRes = await makeRequest(`${BASE_URL}/auth/me`, 'GET', undefined, ownerToken);
    companyId = meRes.body.companyId;
    console.log(`Company ID from profile: ${companyId}`);

    // 3. Create a Sales User to test RBAC restrictions
    console.log('\nStep 3: Creating a Sales User via RBAC management...');
    const addSalesUserRes = await makeRequest(`${BASE_URL}/auth/users`, 'POST', {
      name: 'Sales Rep User',
      email: salesEmail,
      password: 'salespassword123',
      roles: ['SALES'],
    }, ownerToken);

    if (addSalesUserRes.status !== 201) {
      throw new Error(`Failed to add sales user: ${JSON.stringify(addSalesUserRes.body)}`);
    }
    console.log('Sales user created successfully.');

    // Login as Sales User
    console.log('Logging in as Sales User...');
    const salesLoginRes = await makeRequest(`${BASE_URL}/auth/login`, 'POST', {
      email: salesEmail,
      password: 'salespassword123',
    });
    if (salesLoginRes.status !== 200) {
      throw new Error(`Sales user login failed: ${JSON.stringify(salesLoginRes.body)}`);
    }
    salesToken = salesLoginRes.body.accessToken;
    console.log('Sales user logged in successfully.');

    // 4. Test RBAC Permission Rejection (Sales User trying to create a product)
    console.log('\nStep 4: Testing RBAC Permission Rejection...');
    const rbacProductCreateRes = await makeRequest(`${BASE_URL}/products`, 'POST', {
      name: 'Oak Wood Plank',
      costPrice: 10,
      salesPrice: 15,
      procurementType: 'purchase',
      procureOnDemand: false,
    }, salesToken);

    console.log(`Sales User Product Create Response Code: ${rbacProductCreateRes.status} (Expected: 403)`);
    if (rbacProductCreateRes.status !== 403) {
      throw new Error(`RBAC Failure: Sales user was allowed to create a product! Status code: ${rbacProductCreateRes.status}`);
    }
    console.log('RBAC verified: Sales user blocked with 403 Forbidden.');

    // 5. Create Products using Owner token (Allowed)
    console.log('\nStep 5: Creating products using Owner token...');
    
    // Create Wood
    const woodRes = await makeRequest(`${BASE_URL}/products`, 'POST', {
      name: 'Oak Wood Plank',
      costPrice: 10,
      salesPrice: 15,
      procurementType: 'purchase',
      procureOnDemand: false,
    }, ownerToken);
    woodId = woodRes.body.id;
    console.log(`Product created: Wood (ID: ${woodId})`);

    // Create Screw
    const screwRes = await makeRequest(`${BASE_URL}/products`, 'POST', {
      name: 'Steel Screws (Box)',
      costPrice: 2,
      salesPrice: 4,
      procurementType: 'purchase',
      procureOnDemand: true,
    }, ownerToken);
    screwId = screwRes.body.id;
    console.log(`Product created: Screw (ID: ${screwId})`);

    // Create Table
    const tableRes = await makeRequest(`${BASE_URL}/products`, 'POST', {
      name: 'Wooden Coffee Table',
      costPrice: 25,
      salesPrice: 60,
      procurementType: 'manufacture',
      procureOnDemand: true,
    }, ownerToken);
    tableId = tableRes.body.id;
    console.log(`Product created: Table (ID: ${tableId})`);

    // 6. Set BoM for Table
    console.log('\nStep 6: Setting Bill of Materials (BoM) for Table...');
    const bomRes = await makeRequest(`${BASE_URL}/products/${tableId}/bom`, 'POST', {
      items: [
        { componentId: woodId, quantity: 2 },
        { componentId: screwId, quantity: 10 },
      ],
    }, ownerToken);

    if (bomRes.status !== 200 && bomRes.status !== 201) {
      throw new Error(`Failed to set BoM: ${JSON.stringify(bomRes.body)}`);
    }
    console.log('BoM set successfully:', JSON.stringify(bomRes.body.items, null, 2));

    // 7. Test RBAC Rejection for Manual Inventory Adjustment
    console.log('\nStep 7: Testing RBAC for Inventory Adjustment...');
    const rbacAdjustRes = await makeRequest(`${BASE_URL}/inventory/adjust`, 'POST', {
      productId: screwId,
      changeQty: 100,
      reference: 'Sales adjustment attempt',
    }, salesToken);
    
    console.log(`Sales User Inventory Adjust Response Code: ${rbacAdjustRes.status} (Expected: 403)`);
    if (rbacAdjustRes.status !== 403) {
      throw new Error(`RBAC Failure: Sales user allowed to adjust inventory! Status: ${rbacAdjustRes.status}`);
    }
    console.log('RBAC verified: Sales user blocked from adjustments.');

    // Adjust Screws stock using Owner token
    const adjustRes = await makeRequest(`${BASE_URL}/inventory/adjust`, 'POST', {
      productId: screwId,
      changeQty: 100,
      reference: 'Initial Screw Batch',
    }, ownerToken);
    console.log('Inventory adjusted successfully by Owner:', adjustRes.body);

    // 8. Purchase Order Lifecycle
    console.log('\nStep 8: Testing Purchase Order Lifecycle...');
    
    // Create PO
    const createPoRes = await makeRequest(`${BASE_URL}/purchase`, 'POST', {
      vendorName: 'Global Timber Supplies',
      items: [
        { productId: woodId, quantity: 50 },
      ],
    }, ownerToken);
    poId = createPoRes.body.id;
    console.log(`PO Created: ${poId} (Status: ${createPoRes.body.status})`);

    // Confirm PO
    const confirmPoRes = await makeRequest(`${BASE_URL}/purchase/${poId}/confirm`, 'POST', undefined, ownerToken);
    console.log(`PO Confirmed (Status: ${confirmPoRes.body.status})`);

    // Receive PO
    const receivePoRes = await makeRequest(`${BASE_URL}/purchase/${poId}/receive`, 'POST', undefined, ownerToken);
    console.log(`PO Received (Status: ${receivePoRes.body.status})`);

    // Verify inventory levels
    const invRes = await makeRequest(`${BASE_URL}/inventory`, 'GET', undefined, ownerToken);
    console.log('Current Inventory Status:', JSON.stringify(invRes.body, null, 2));

    // 9. Manufacturing Order Lifecycle
    console.log('\nStep 9: Testing Manufacturing Order Lifecycle...');
    
    // Create MO
    const createMoRes = await makeRequest(`${BASE_URL}/manufacturing`, 'POST', {
      productId: tableId,
      quantity: 5,
    }, ownerToken);
    moId = createMoRes.body.id;
    console.log(`MO Created: ${moId} (Status: ${createMoRes.body.status})`);

    // Start MO (consumes components)
    const startMoRes = await makeRequest(`${BASE_URL}/manufacturing/${moId}/start`, 'POST', undefined, ownerToken);
    console.log(`MO Started (Status: ${startMoRes.body.status})`);
    console.log('Components Consumed:', startMoRes.body.componentsConsumed);

    // Complete MO (produces finished goods)
    const completeMoRes = await makeRequest(`${BASE_URL}/manufacturing/${moId}/complete`, 'POST', undefined, ownerToken);
    console.log(`MO Completed (Status: ${completeMoRes.body.status})`);

    // Verify inventory levels again
    const invRes2 = await makeRequest(`${BASE_URL}/inventory`, 'GET', undefined, ownerToken);
    console.log('Inventory after manufacturing completion:', JSON.stringify(invRes2.body, null, 2));

    // 10. Test Procurement Automation
    console.log('\nStep 10: Testing Procurement Automation...');
    
    // Create confirmed Sales Order directly in the DB
    const salesOrder = await prisma.salesOrder.create({
      data: {
        customerName: 'E2E Loyal Customer',
        status: SalesOrderStatus.confirmed,
        companyId,
        items: {
          create: [
            { productId: tableId, quantity: 10 }, // demand 10 (onHand 5, shortfall 5)
            { productId: screwId, quantity: 200 }, // demand 200 (onHand 50, shortfall 150)
            { productId: woodId, quantity: 1000 }, // procureOnDemand is false, shortfall ignored
          ]
        }
      }
    });
    console.log(`Created confirmed Sales Order directly in DB: ${salesOrder.id}`);

    // Run procurement
    const runProcurementRes = await makeRequest(`${BASE_URL}/procurement/run`, 'POST', undefined, ownerToken);
    console.log('Procurement Run Response:', JSON.stringify(runProcurementRes.body, null, 2));

    if (runProcurementRes.status !== 200) {
      throw new Error(`Procurement run failed: ${JSON.stringify(runProcurementRes.body)}`);
    }

    // Verify triggered PO (Screws shortfall 150)
    const triggeredPos = runProcurementRes.body.triggeredPurchaseOrders;
    if (triggeredPos.length !== 1 || triggeredPos[0].items[0].productId !== screwId || triggeredPos[0].items[0].quantity !== 150) {
      throw new Error('E2E Procurement failed: Incorrect PO triggered!');
    }
    console.log('Triggered PO verified successfully.');

    // Verify triggered MO (Table shortfall 5)
    const triggeredMos = runProcurementRes.body.triggeredManufacturingOrders;
    if (triggeredMos.length !== 1 || triggeredMos[0].productId !== tableId || triggeredMos[0].quantity !== 5) {
      throw new Error('E2E Procurement failed: Incorrect MO triggered!');
    }
    console.log('Triggered MO verified successfully.');

    // 11. Verify Audit Logs
    console.log('\nStep 11: Retrieving Audit Logs...');
    const auditRes = await makeRequest(`${BASE_URL}/audit`, 'GET', undefined, ownerToken);
    console.log(`Retrieved ${auditRes.body.length} audit logs.`);
    for (const log of auditRes.body.slice(0, 5)) {
      console.log(`  [${log.action}] Entity: ${log.entityType} (ID: ${log.entityId})`);
    }

    // 12. Verify Dashboard Statistics
    console.log('\nStep 12: Retrieving Dashboard Stats...');
    
    // Mark Sales Order as delivered to get salesTotal metrics
    await prisma.salesOrder.update({
      where: { id: salesOrder.id },
      data: { status: SalesOrderStatus.delivered },
    });

    // Create an in_progress MO to test active MO count
    const tempMo = await prisma.manufacturingOrder.create({
      data: {
        productId: tableId,
        quantity: 1,
        status: 'in_progress',
        companyId,
      }
    });

    const dashboardRes = await makeRequest(`${BASE_URL}/dashboard/stats`, 'GET', undefined, ownerToken);
    console.log('Dashboard Stats Response:', dashboardRes.body);
    
    const stats = dashboardRes.body;
    // Sales total: 10 * 60 (table price) + 200 * 4 (screw price) + 1000 * 15 (wood price) = 600 + 800 + 15000 = 16400
    if (stats.salesTotal !== 16400) {
      throw new Error(`Dashboard stats verification failed: expected salesTotal 16400, got ${stats.salesTotal}`);
    }
    if (stats.manufacturingActiveCount !== 1) {
      throw new Error(`Dashboard stats verification failed: expected active MOs 1, got ${stats.manufacturingActiveCount}`);
    }
    console.log('Dashboard stats successfully verified.');

    console.log('\n=============================================================');
    console.log('ALL E2E INTEGRATION TESTS WITH AUTH AND RBAC PASSED SUCCESSFULLY!');
    console.log('=============================================================');

  } catch (error) {
    console.error('E2E End-to-End Test failed with error:', error);
    process.exit(1);
  } finally {
    // Database Cleanup
    console.log('\nCleaning up E2E test database records...');
    if (companyId) {
      await prisma.auditLog.deleteMany({ where: { companyId } });
      await prisma.stockLedger.deleteMany({ where: { companyId } });
      await prisma.inventory.deleteMany({ where: { companyId } });
      await prisma.boMItem.deleteMany({ where: { bom: { companyId } } });
      await prisma.boM.deleteMany({ where: { companyId } });
      await prisma.purchaseOrderItem.deleteMany({ where: { order: { companyId } } });
      await prisma.purchaseOrder.deleteMany({ where: { companyId } });
      await prisma.manufacturingOrder.deleteMany({ where: { companyId } });
      await prisma.salesOrderItem.deleteMany({ where: { order: { companyId } } });
      await prisma.salesOrder.deleteMany({ where: { companyId } });
      await prisma.userRole.deleteMany({ where: { user: { companyId } } });
      await prisma.rolePermission.deleteMany({ where: { role: { companyId } } });
      await prisma.role.deleteMany({ where: { companyId } });
      await prisma.user.deleteMany({ where: { companyId } });
      await prisma.product.deleteMany({ where: { companyId } });
      await prisma.company.delete({ where: { id: companyId } });
      console.log('Database cleanup complete.');
    }
    // Close the Express server
    server.close(() => {
      console.log('Test server shut down.');
    });
  }
}

const server = app.listen(PORT, async () => {
  console.log(`Express test server running on port ${PORT}`);
  await runTests();
});
