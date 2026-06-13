// Client-side mock database representing Odoo Mini ERP database models
// Using localStorage to persist data during client-side testing.

export interface Product {
  id: string;
  name: string;
  sku: string;
  salesPrice: number | null;
  costPrice: number | null;
  procurementType: 'purchase' | 'manufacture';
  procureOnDemand: boolean;
  createdAt: string;
}

export interface InventoryItem {
  productId: string;
  onHandQty: number;
  reservedQty: number;
  updatedAt: string;
  product?: Product;
}

export interface StockLedger {
  id: string;
  productId: string;
  changeQty: number;
  type: 'SALE' | 'PURCHASE' | 'MANUFACTURE_CONSUME' | 'MANUFACTURE_PRODUCE';
  referenceId: string | null;
  createdAt: string;
  productName?: string;
}

export interface SalesOrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  product?: Product;
}

export interface SalesOrder {
  id: string;
  customerName: string;
  status: 'draft' | 'confirmed' | 'partial' | 'delivered' | 'cancelled';
  createdAt: string;
  items: SalesOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  product?: Product;
}

export interface PurchaseOrder {
  id: string;
  vendorName: string;
  status: 'draft' | 'confirmed' | 'partial' | 'received';
  createdAt: string;
  items: PurchaseOrderItem[];
}

export interface BoMItem {
  id: string;
  bomId: string;
  componentId: string;
  quantity: number;
  componentName?: string;
}

export interface BoM {
  id: string;
  productId: string;
  items: BoMItem[];
}

export interface ManufacturingOrder {
  id: string;
  productId: string;
  quantity: number;
  status: 'draft' | 'in_progress' | 'completed';
  createdAt: string;
  productName?: string;
}

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  oldValue: any;
  newValue: any;
  createdAt: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  assignee: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}

// Helper to check environment
const isClient = typeof window !== 'undefined';

// Initial Seed Data
const SEED_CONTACTS: Contact[] = [
  { id: 'c-1', name: 'Leslie Alexander', email: 'leslie.alexander@example.com', phone: '(406) 555-0120', company: 'Acme Furnishings LLC', role: 'Purchasing Manager', status: 'active', createdAt: new Date(Date.now() - 40 * 86400000).toISOString() },
  { id: 'c-2', name: 'Floyd Miles', email: 'floyd.miles@example.com', phone: '(205) 555-0100', company: 'Globex Corporates', role: 'CEO', status: 'active', createdAt: new Date(Date.now() - 35 * 86400000).toISOString() },
  { id: 'c-3', name: 'Jerome Bell', email: 'jerome.bell@example.com', phone: '(217) 555-0113', company: 'Aria Design Studio', role: 'Lead Designer', status: 'active', createdAt: new Date(Date.now() - 20 * 86400000).toISOString() },
  { id: 'c-4', name: 'Kathryn Murphy', email: 'kathryn.murphy@example.com', phone: '(808) 555-0111', company: 'TimberLand Wood Co.', role: 'Sales Rep', status: 'inactive', createdAt: new Date(Date.now() - 10 * 86400000).toISOString() }
];

const SEED_TASKS: Task[] = [
  { id: 't-1', title: 'Review Q3 Supply Contracts', status: 'todo', assignee: 'Admin User', priority: 'high', createdAt: new Date().toISOString() },
  { id: 't-2', title: 'Onboard new supplier: SteelFab', status: 'in_progress', assignee: 'Admin User', priority: 'medium', createdAt: new Date().toISOString() },
  { id: 't-3', title: 'Approve pending PO #1024', status: 'done', assignee: 'Admin User', priority: 'high', createdAt: new Date().toISOString() },
  { id: 't-4', title: 'Quarterly Inventory Audit', status: 'todo', assignee: 'Jane Smith', priority: 'medium', createdAt: new Date().toISOString() }
];

const SEED_PRODUCTS: Product[] = [
  { id: 'comp-wood', name: 'Oak Wood Plank', sku: 'COMP-WOOD', salesPrice: null, costPrice: 20, procurementType: 'purchase', procureOnDemand: false, createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: 'comp-screws', name: 'Metal Screws Pack', sku: 'COMP-SCREW', salesPrice: null, costPrice: 5, procurementType: 'purchase', procureOnDemand: false, createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: 'comp-fabric', name: 'Fabric Upholstery Roll', sku: 'COMP-FABRIC', salesPrice: null, costPrice: 15, procurementType: 'purchase', procureOnDemand: false, createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: 'comp-foam', name: 'High-Density Foam Cushion', sku: 'COMP-FOAM', salesPrice: null, costPrice: 12, procurementType: 'purchase', procureOnDemand: false, createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: 'prod-chair', name: 'Ergonomic Luxury Chair', sku: 'PROD-CHAIR', salesPrice: 180, costPrice: 62, procurementType: 'manufacture', procureOnDemand: true, createdAt: new Date(Date.now() - 15 * 86400000).toISOString() },
  { id: 'prod-desk', name: 'Minimalist Standing Desk', sku: 'PROD-DESK', salesPrice: 350, costPrice: 140, procurementType: 'manufacture', procureOnDemand: true, createdAt: new Date(Date.now() - 15 * 86400000).toISOString() },
  { id: 'prod-cabinet', name: 'Walnut Storage Cabinet', sku: 'PROD-CABINET', salesPrice: 520, costPrice: 210, procurementType: 'manufacture', procureOnDemand: false, createdAt: new Date(Date.now() - 15 * 86400000).toISOString() }
];

const SEED_INVENTORY: InventoryItem[] = [
  { productId: 'comp-wood', onHandQty: 120, reservedQty: 0, updatedAt: new Date().toISOString() },
  { productId: 'comp-screws', onHandQty: 400, reservedQty: 0, updatedAt: new Date().toISOString() },
  { productId: 'comp-fabric', onHandQty: 60, reservedQty: 0, updatedAt: new Date().toISOString() },
  { productId: 'comp-foam', onHandQty: 80, reservedQty: 0, updatedAt: new Date().toISOString() },
  { productId: 'prod-chair', onHandQty: 12, reservedQty: 3, updatedAt: new Date().toISOString() },
  { productId: 'prod-desk', onHandQty: 5, reservedQty: 1, updatedAt: new Date().toISOString() },
  { productId: 'prod-cabinet', onHandQty: 4, reservedQty: 0, updatedAt: new Date().toISOString() }
];

const SEED_BOMS: BoM[] = [
  {
    id: 'bom-chair',
    productId: 'prod-chair',
    items: [
      { id: 'bi-chair-wood', bomId: 'bom-chair', componentId: 'comp-wood', quantity: 2 },
      { id: 'bi-chair-screws', bomId: 'bom-chair', componentId: 'comp-screws', quantity: 8 },
      { id: 'bi-chair-fabric', bomId: 'bom-chair', componentId: 'comp-fabric', quantity: 1 },
      { id: 'bi-chair-foam', bomId: 'bom-chair', componentId: 'comp-foam', quantity: 1 }
    ]
  },
  {
    id: 'bom-desk',
    productId: 'prod-desk',
    items: [
      { id: 'bi-desk-wood', bomId: 'bom-desk', componentId: 'comp-wood', quantity: 4 },
      { id: 'bi-desk-screws', bomId: 'bom-desk', componentId: 'comp-screws', quantity: 12 }
    ]
  },
  {
    id: 'bom-cabinet',
    productId: 'prod-cabinet',
    items: [
      { id: 'bi-cabinet-wood', bomId: 'bom-cabinet', componentId: 'comp-wood', quantity: 6 },
      { id: 'bi-cabinet-screws', bomId: 'bom-cabinet', componentId: 'comp-screws', quantity: 16 }
    ]
  }
];

const SEED_SALES: SalesOrder[] = [
  {
    id: 'so-1',
    customerName: 'Acme Furnishings LLC',
    status: 'confirmed',
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    items: [
      { id: 'so-1-i1', orderId: 'so-1', productId: 'prod-chair', quantity: 2 },
      { id: 'so-1-i2', orderId: 'so-1', productId: 'prod-desk', quantity: 1 }
    ]
  },
  {
    id: 'so-2',
    customerName: 'Globex Corporates',
    status: 'delivered',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    items: [
      { id: 'so-2-i1', orderId: 'so-2', productId: 'prod-chair', quantity: 1 }
    ]
  },
  {
    id: 'so-3',
    customerName: 'Aria Design Studio',
    status: 'draft',
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    items: [
      { id: 'so-3-i1', orderId: 'so-3', productId: 'prod-cabinet', quantity: 2 }
    ]
  }
];

const SEED_PURCHASES: PurchaseOrder[] = [
  {
    id: 'po-1',
    vendorName: 'TimberLand Wood Co.',
    status: 'received',
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    items: [
      { id: 'po-1-i1', orderId: 'po-1', productId: 'comp-wood', quantity: 50 }
    ]
  },
  {
    id: 'po-2',
    vendorName: 'Global Screws Supply',
    status: 'confirmed',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    items: [
      { id: 'po-2-i1', orderId: 'po-2', productId: 'comp-screws', quantity: 100 }
    ]
  }
];

const SEED_MANUFACTURING: ManufacturingOrder[] = [
  { id: 'mo-1', productId: 'prod-chair', quantity: 5, status: 'completed', createdAt: new Date(Date.now() - 4 * 86400000).toISOString() },
  { id: 'mo-2', productId: 'prod-desk', quantity: 2, status: 'in_progress', createdAt: new Date(Date.now() - 1 * 86400000).toISOString() },
  { id: 'mo-3', productId: 'prod-chair', quantity: 3, status: 'draft', createdAt: new Date().toISOString() }
];

const SEED_LEDGER: StockLedger[] = [
  { id: 'sl-1', productId: 'comp-wood', changeQty: 50, type: 'PURCHASE', referenceId: 'po-1', createdAt: new Date(Date.now() - 8 * 86400000).toISOString() },
  { id: 'sl-2', productId: 'prod-chair', changeQty: 5, type: 'MANUFACTURE_PRODUCE', referenceId: 'mo-1', createdAt: new Date(Date.now() - 4 * 86400000).toISOString() },
  { id: 'sl-3', productId: 'comp-wood', changeQty: -10, type: 'MANUFACTURE_CONSUME', referenceId: 'mo-1', createdAt: new Date(Date.now() - 4 * 86400000).toISOString() },
  { id: 'sl-4', productId: 'comp-screws', changeQty: -40, type: 'MANUFACTURE_CONSUME', referenceId: 'mo-1', createdAt: new Date(Date.now() - 4 * 86400000).toISOString() },
  { id: 'sl-5', productId: 'comp-fabric', changeQty: -5, type: 'MANUFACTURE_CONSUME', referenceId: 'mo-1', createdAt: new Date(Date.now() - 4 * 86400000).toISOString() },
  { id: 'sl-6', productId: 'comp-foam', changeQty: -5, type: 'MANUFACTURE_CONSUME', referenceId: 'mo-1', createdAt: new Date(Date.now() - 4 * 86400000).toISOString() },
  { id: 'sl-7', productId: 'prod-chair', changeQty: -1, type: 'SALE', referenceId: 'so-2', createdAt: new Date(Date.now() - 5 * 86400000).toISOString() }
];

const SEED_AUDIT: AuditLog[] = [
  { id: 'al-1', entityType: 'SalesOrder', entityId: 'so-2', action: 'DELIVER', oldValue: { status: 'confirmed' }, newValue: { status: 'delivered' }, createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: 'al-2', entityType: 'ManufacturingOrder', entityId: 'mo-1', action: 'COMPLETE', oldValue: { status: 'in_progress' }, newValue: { status: 'completed' }, createdAt: new Date(Date.now() - 4 * 86400000).toISOString() },
  { id: 'al-3', entityType: 'SalesOrder', entityId: 'so-1', action: 'CONFIRM', oldValue: { status: 'draft' }, newValue: { status: 'confirmed' }, createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: 'al-4', entityType: 'PurchaseOrder', entityId: 'po-1', action: 'RECEIVE', oldValue: { status: 'confirmed' }, newValue: { status: 'received' }, createdAt: new Date(Date.now() - 8 * 86400000).toISOString() }
];

// Memory fallback database state
let memoryDb = {
  products: [...SEED_PRODUCTS],
  inventory: [...SEED_INVENTORY],
  salesOrders: [...SEED_SALES],
  purchaseOrders: [...SEED_PURCHASES],
  manufacturingOrders: [...SEED_MANUFACTURING],
  ledger: [...SEED_LEDGER],
  boms: [...SEED_BOMS],
  auditLogs: [...SEED_AUDIT],
  contacts: [...SEED_CONTACTS],
  tasks: [...SEED_TASKS]
};

// LocalStorage Synchronization helper
function getDb(): typeof memoryDb {
  if (!isClient) return memoryDb;
  
  try {
    const products = localStorage.getItem('mock_erp_products');
    const inventory = localStorage.getItem('mock_erp_inventory');
    const salesOrders = localStorage.getItem('mock_erp_sales');
    const purchaseOrders = localStorage.getItem('mock_erp_purchases');
    const manufacturingOrders = localStorage.getItem('mock_erp_manufacturing');
    const ledger = localStorage.getItem('mock_erp_ledger');
    const boms = localStorage.getItem('mock_erp_boms');
    const auditLogs = localStorage.getItem('mock_erp_audit');
    const contacts = localStorage.getItem('mock_erp_contacts');
    const tasks = localStorage.getItem('mock_erp_tasks');

    if (!products) {
      // Seed first time
      saveDb(memoryDb);
      return memoryDb;
    }

    return {
      products: JSON.parse(products),
      inventory: JSON.parse(inventory || '[]'),
      salesOrders: JSON.parse(salesOrders || '[]'),
      purchaseOrders: JSON.parse(purchaseOrders || '[]'),
      manufacturingOrders: JSON.parse(manufacturingOrders || '[]'),
      ledger: JSON.parse(ledger || '[]'),
      boms: JSON.parse(boms || '[]'),
      auditLogs: JSON.parse(auditLogs || '[]'),
      contacts: JSON.parse(contacts || '[]'),
      tasks: JSON.parse(tasks || '[]')
    };
  } catch (e) {
    console.error("Failed to load mock DB, using memory fallback", e);
    return memoryDb;
  }
}

function saveDb(db: typeof memoryDb) {
  memoryDb = db;
  if (!isClient) return;
  try {
    localStorage.setItem('mock_erp_products', JSON.stringify(db.products));
    localStorage.setItem('mock_erp_inventory', JSON.stringify(db.inventory));
    localStorage.setItem('mock_erp_sales', JSON.stringify(db.salesOrders));
    localStorage.setItem('mock_erp_purchases', JSON.stringify(db.purchaseOrders));
    localStorage.setItem('mock_erp_manufacturing', JSON.stringify(db.manufacturingOrders));
    localStorage.setItem('mock_erp_ledger', JSON.stringify(db.ledger));
    localStorage.setItem('mock_erp_boms', JSON.stringify(db.boms));
    localStorage.setItem('mock_erp_audit', JSON.stringify(db.auditLogs));
    localStorage.setItem('mock_erp_contacts', JSON.stringify(db.contacts));
    localStorage.setItem('mock_erp_tasks', JSON.stringify(db.tasks));
  } catch (e) {
    console.error("Failed to save mock DB", e);
  }
}

// Transaction Log helper
function addAuditLog(entityType: string, entityId: string, action: string, oldValue: any, newValue: any) {
  const db = getDb();
  const newLog: AuditLog = {
    id: 'al-' + Math.random().toString(36).substr(2, 9),
    entityType,
    entityId,
    action,
    oldValue,
    newValue,
    createdAt: new Date().toISOString()
  };
  db.auditLogs.unshift(newLog); // Prepend to show newest first
  saveDb(db);
}

// Core DB Actions
export const mockDb = {
  // PRODUCTS
  getProducts(): Product[] {
    return getDb().products;
  },

  createProduct(name: string, sku: string, salesPrice: number | null, costPrice: number | null, procurementType: 'purchase' | 'manufacture', procureOnDemand: boolean): Product {
    const db = getDb();
    const id = 'prod-' + Math.random().toString(36).substr(2, 9);
    const newProduct: Product = {
      id,
      name,
      sku: sku.toUpperCase(),
      salesPrice,
      costPrice,
      procurementType,
      procureOnDemand,
      createdAt: new Date().toISOString()
    };
    
    db.products.push(newProduct);
    
    // Create stock entry
    const newInv: InventoryItem = {
      productId: id,
      onHandQty: 0,
      reservedQty: 0,
      updatedAt: new Date().toISOString()
    };
    db.inventory.push(newInv);
    
    // Create basic BoM if manufactured
    if (procurementType === 'manufacture') {
      db.boms.push({
        id: 'bom-' + id,
        productId: id,
        items: [
          { id: `bi-${id}-wood`, bomId: 'bom-' + id, componentId: 'comp-wood', quantity: 2 },
          { id: `bi-${id}-screws`, bomId: 'bom-' + id, componentId: 'comp-screws', quantity: 8 }
        ]
      });
    }

    saveDb(db);
    addAuditLog('Product', id, 'CREATE', null, newProduct);
    return newProduct;
  },

  getInventory(): any[] {
    const db = getDb();
    return db.inventory.map(inv => ({
      id: inv.productId,
      productId: inv.productId,
      onHand: inv.onHandQty,
      reserved: inv.reservedQty,
      available: inv.onHandQty - inv.reservedQty,
      updatedAt: inv.updatedAt,
      product: db.products.find(p => p.id === inv.productId)
    }));
  },

  getStockLedger(): StockLedger[] {
    const db = getDb();
    return db.ledger.map(l => ({
      ...l,
      productName: db.products.find(p => p.id === l.productId)?.name || 'Unknown Product'
    }));
  },

  getAuditLogs(): AuditLog[] {
    return getDb().auditLogs;
  },

  // SALES ORDERS
  getSalesOrders(): SalesOrder[] {
    const db = getDb();
    return db.salesOrders.map(so => ({
      ...so,
      items: so.items.map(item => ({
        ...item,
        product: db.products.find(p => p.id === item.productId)
      }))
    }));
  },

  createSalesOrder(customerName: string, items: { productId: string; quantity: number }[]): SalesOrder {
    const db = getDb();
    const orderId = 'so-' + Math.random().toString(36).substr(2, 9);
    const orderNumber = 'SO-' + String(db.salesOrders.length + 1).padStart(3, '0');
    
    const salesOrderItems: SalesOrderItem[] = items.map((item, idx) => ({
      id: `so-${orderId}-i${idx}`,
      orderId,
      productId: item.productId,
      quantity: item.quantity
    }));

    const newOrder: SalesOrder = {
      id: orderId,
      customerName,
      status: 'draft',
      createdAt: new Date().toISOString(),
      items: salesOrderItems
    };

    db.salesOrders.push(newOrder);
    saveDb(db);
    addAuditLog('SalesOrder', orderId, 'CREATE_DRAFT', null, { orderNumber, customerName, items });
    return newOrder;
  },

  confirmSalesOrder(id: string): SalesOrder {
    const db = getDb();
    const order = db.salesOrders.find(o => o.id === id);
    if (!order) throw new Error('Sales order not found');
    if (order.status !== 'draft') throw new Error('Only draft sales orders can be confirmed');

    // 1. Reserve quantities if available in inventory
    const updatedInventory = [...db.inventory];
    let inventoryShortfall = false;

    for (const item of order.items) {
      const inv = updatedInventory.find(i => i.productId === item.productId);
      if (inv) {
        // We reserve the quantity requested
        inv.reservedQty += item.quantity;
        inv.updatedAt = new Date().toISOString();
        
        const freeQty = inv.onHandQty - inv.reservedQty;
        if (freeQty < 0) {
          inventoryShortfall = true;
        }
      }
    }

    order.status = 'confirmed';
    db.inventory = updatedInventory;
    saveDb(db);

    addAuditLog('SalesOrder', id, 'CONFIRM', { status: 'draft' }, { status: 'confirmed', hasShortfall: inventoryShortfall });
    return order;
  },

  deliverSalesOrder(id: string): SalesOrder {
    const db = getDb();
    const order = db.salesOrders.find(o => o.id === id);
    if (!order) throw new Error('Sales order not found');
    if (order.status !== 'confirmed') throw new Error('Only confirmed sales orders can be delivered');

    // Verify inventory on hand (cannot deliver if onHandQty < quantity)
    const updatedInventory = [...db.inventory];
    const ledgersToAdd: StockLedger[] = [];

    for (const item of order.items) {
      const inv = updatedInventory.find(i => i.productId === item.productId);
      if (!inv || inv.onHandQty < item.quantity) {
        throw new Error(`Insufficient inventory on hand to deliver product: ${db.products.find(p => p.id === item?.productId)?.name}`);
      }
    }

    // Process delivery: deduct from onHandQty and reservedQty
    for (const item of order.items) {
      const inv = updatedInventory.find(i => i.productId === item.productId)!;
      inv.onHandQty -= item.quantity;
      inv.reservedQty -= item.quantity;
      inv.updatedAt = new Date().toISOString();

      ledgersToAdd.push({
        id: 'sl-' + Math.random().toString(36).substr(2, 9),
        productId: item.productId,
        changeQty: -item.quantity,
        type: 'SALE',
        referenceId: id,
        createdAt: new Date().toISOString()
      });
    }

    order.status = 'delivered';
    db.inventory = updatedInventory;
    db.ledger.push(...ledgersToAdd);
    saveDb(db);

    addAuditLog('SalesOrder', id, 'DELIVER', { status: 'confirmed' }, { status: 'delivered' });
    return order;
  },

  // PURCHASE ORDERS
  getPurchaseOrders(): PurchaseOrder[] {
    const db = getDb();
    return db.purchaseOrders.map(po => ({
      ...po,
      items: po.items.map(item => ({
        ...item,
        product: db.products.find(p => p.id === item.productId)
      }))
    }));
  },

  createPurchaseOrder(vendorName: string, items: { productId: string; quantity: number }[]): PurchaseOrder {
    const db = getDb();
    const orderId = 'po-' + Math.random().toString(36).substr(2, 9);
    
    const purchaseOrderItems: PurchaseOrderItem[] = items.map((item, idx) => ({
      id: `po-${orderId}-i${idx}`,
      orderId,
      productId: item.productId,
      quantity: item.quantity
    }));

    const newOrder: PurchaseOrder = {
      id: orderId,
      vendorName,
      status: 'confirmed', // Directly auto-confirm to simulate supplier order approval
      createdAt: new Date().toISOString(),
      items: purchaseOrderItems
    };

    db.purchaseOrders.unshift(newOrder);
    saveDb(db);
    addAuditLog('PurchaseOrder', orderId, 'CREATE_CONFIRMED', null, newOrder);
    return newOrder;
  },

  receivePurchaseOrder(id: string): PurchaseOrder {
    const db = getDb();
    const order = db.purchaseOrders.find(o => o.id === id);
    if (!order) throw new Error('Purchase order not found');
    if (order.status !== 'confirmed') throw new Error('Only confirmed purchase orders can be received');

    // Add to inventory onHandQty
    const updatedInventory = [...db.inventory];
    const ledgersToAdd: StockLedger[] = [];

    for (const item of order.items) {
      const inv = updatedInventory.find(i => i.productId === item.productId);
      if (inv) {
        inv.onHandQty += item.quantity;
        inv.updatedAt = new Date().toISOString();
      } else {
        updatedInventory.push({
          productId: item.productId,
          onHandQty: item.quantity,
          reservedQty: 0,
          updatedAt: new Date().toISOString()
        });
      }

      ledgersToAdd.push({
        id: 'sl-' + Math.random().toString(36).substr(2, 9),
        productId: item.productId,
        changeQty: item.quantity,
        type: 'PURCHASE',
        referenceId: id,
        createdAt: new Date().toISOString()
      });
    }

    order.status = 'received';
    db.inventory = updatedInventory;
    db.ledger.push(...ledgersToAdd);
    saveDb(db);

    addAuditLog('PurchaseOrder', id, 'RECEIVE', { status: 'confirmed' }, { status: 'received' });
    return order;
  },

  // MANUFACTURING ORDERS
  getManufacturingOrders(): ManufacturingOrder[] {
    const db = getDb();
    return db.manufacturingOrders.map(mo => ({
      ...mo,
      productName: db.products.find(p => p.id === mo.productId)?.name || 'Unknown Product'
    }));
  },

  createManufacturingOrder(productId: string, quantity: number): ManufacturingOrder {
    const db = getDb();
    const id = 'mo-' + Math.random().toString(36).substr(2, 9);
    
    const newMo: ManufacturingOrder = {
      id,
      productId,
      quantity,
      status: 'draft',
      createdAt: new Date().toISOString()
    };

    db.manufacturingOrders.unshift(newMo);
    saveDb(db);
    addAuditLog('ManufacturingOrder', id, 'CREATE_DRAFT', null, newMo);
    return newMo;
  },

  startManufacturingOrder(id: string): ManufacturingOrder {
    const db = getDb();
    const mo = db.manufacturingOrders.find(m => m.id === id);
    if (!mo) throw new Error('MO not found');
    if (mo.status !== 'draft') throw new Error('Only draft MOs can be started');

    // Consume BoM raw components from inventory
    const bom = db.boms.find(b => b.productId === mo.productId);
    if (!bom) throw new Error('No Bill of Materials configured for this product');

    // 1. Check material availability
    const updatedInventory = [...db.inventory];
    for (const bomItem of bom.items) {
      const neededQty = bomItem.quantity * mo.quantity;
      const inv = updatedInventory.find(i => i.productId === bomItem.componentId);
      
      if (!inv || inv.onHandQty < neededQty) {
        throw new Error(`Insufficient component stock: ${db.products.find(p => p.id === bomItem.componentId)?.name || bomItem.componentId}. Needed ${neededQty}, available ${inv ? inv.onHandQty : 0}`);
      }
    }

    // 2. Consume components
    const ledgersToAdd: StockLedger[] = [];
    for (const bomItem of bom.items) {
      const neededQty = bomItem.quantity * mo.quantity;
      const inv = updatedInventory.find(i => i.productId === bomItem.componentId)!;
      inv.onHandQty -= neededQty;
      inv.updatedAt = new Date().toISOString();

      ledgersToAdd.push({
        id: 'sl-' + Math.random().toString(36).substr(2, 9),
        productId: bomItem.componentId,
        changeQty: -neededQty,
        type: 'MANUFACTURE_CONSUME',
        referenceId: id,
        createdAt: new Date().toISOString()
      });
    }

    mo.status = 'in_progress';
    db.inventory = updatedInventory;
    db.ledger.push(...ledgersToAdd);
    saveDb(db);

    addAuditLog('ManufacturingOrder', id, 'START', { status: 'draft' }, { status: 'in_progress' });
    return mo;
  },

  completeManufacturingOrder(id: string): ManufacturingOrder {
    const db = getDb();
    const mo = db.manufacturingOrders.find(m => m.id === id);
    if (!mo) throw new Error('MO not found');
    if (mo.status !== 'in_progress') throw new Error('Only IN_PROGRESS MOs can be completed');

    // Add produced finished goods to inventory
    const updatedInventory = [...db.inventory];
    const inv = updatedInventory.find(i => i.productId === mo.productId);

    if (inv) {
      inv.onHandQty += mo.quantity;
      inv.updatedAt = new Date().toISOString();
    } else {
      updatedInventory.push({
        productId: mo.productId,
        onHandQty: mo.quantity,
        reservedQty: 0,
        updatedAt: new Date().toISOString()
      });
    }

    const newLedger: StockLedger = {
      id: 'sl-' + Math.random().toString(36).substr(2, 9),
      productId: mo.productId,
      changeQty: mo.quantity,
      type: 'MANUFACTURE_PRODUCE',
      referenceId: id,
      createdAt: new Date().toISOString()
    };

    mo.status = 'completed';
    db.inventory = updatedInventory;
    db.ledger.push(newLedger);
    saveDb(db);

    addAuditLog('ManufacturingOrder', id, 'COMPLETE', { status: 'in_progress' }, { status: 'completed' });
    return mo;
  },

  // PROCUREMENT ENGINE (MTO/MTS AUTOMATION)
  runProcurement(): { purchaseOrdersCreated: number; manufacturingOrdersCreated: number } {
    const db = getDb();
    
    // We scan confirmed sales orders and inventory shortfalls.
    // Shortfall = reservedQty - onHandQty.
    let purchaseOrdersCreated = 0;
    let manufacturingOrdersCreated = 0;

    const shortfalls: { [productId: string]: number } = {};

    // Calculate shortfalls for all inventory items
    for (const inv of db.inventory) {
      const freeQty = inv.onHandQty - inv.reservedQty;
      if (freeQty < 0) {
        shortfalls[inv.productId] = Math.abs(freeQty);
      }
    }

    // Now, for each product with a shortfall, check its procurement type
    const purchaseItemsToAdd: { productId: string; quantity: number }[] = [];
    
    for (const [productId, qtyNeeded] of Object.entries(shortfalls)) {
      const product = db.products.find(p => p.id === productId);
      if (!product) continue;

      if (product.procurementType === 'manufacture') {
        // Create a manufacturing order
        const moId = 'mo-' + Math.random().toString(36).substr(2, 9);
        db.manufacturingOrders.unshift({
          id: moId,
          productId,
          quantity: qtyNeeded,
          status: 'draft',
          createdAt: new Date().toISOString()
        });
        manufacturingOrdersCreated++;
        addAuditLog('ProcurementEngine', moId, 'AUTO_DRAFT_MO', null, { productId, quantity: qtyNeeded });

        // Let's check if manufacturing this order creates shortfalls for its raw materials! (BoM explosion)
        const bom = db.boms.find(b => b.productId === productId);
        if (bom) {
          for (const bomItem of bom.items) {
            const rawNeeded = bomItem.quantity * qtyNeeded;
            const rawInv = db.inventory.find(i => i.productId === bomItem.componentId);
            const rawOnHand = rawInv ? rawInv.onHandQty : 0;
            const rawReserved = rawInv ? rawInv.reservedQty : 0;
            
            const rawFree = rawOnHand - rawReserved;
            if (rawFree < rawNeeded) {
              const extraNeeded = rawNeeded - (rawFree > 0 ? rawFree : 0);
              // Accumulate purchase order request
              purchaseItemsToAdd.push({ productId: bomItem.componentId, quantity: extraNeeded });
            }
          }
        }
      } else {
        // Directly purchase
        purchaseItemsToAdd.push({ productId, quantity: qtyNeeded });
      }
    }

    // Handle purchase orders
    if (purchaseItemsToAdd.length > 0) {
      // Group all purchase items by vendor or just put them into a single PO for simplicity
      const poId = 'po-' + Math.random().toString(36).substr(2, 9);
      const purchaseOrderItems: PurchaseOrderItem[] = purchaseItemsToAdd.map((item, idx) => ({
        id: `po-${poId}-i${idx}`,
        orderId: poId,
        productId: item.productId,
        quantity: item.quantity
      }));

      db.purchaseOrders.unshift({
        id: poId,
        vendorName: 'Automated Procurement Supplier',
        status: 'confirmed', // Auto-confirmed
        createdAt: new Date().toISOString(),
        items: purchaseOrderItems
      });
      purchaseOrdersCreated++;
      addAuditLog('ProcurementEngine', poId, 'AUTO_DRAFT_PO', null, { vendorName: 'Automated Procurement Supplier', items: purchaseItemsToAdd });
    }

    saveDb(db);
    return { purchaseOrdersCreated, manufacturingOrdersCreated };
  },

  // STATS FOR DASHBOARD
  getDashboardStats() {
    const db = getDb();
    
    // salesTotal = sum of price * quantity of delivered sales orders
    let salesTotal = 0;
    const deliveredOrders = db.salesOrders.filter(so => so.status === 'delivered');
    for (const order of deliveredOrders) {
      for (const item of order.items) {
        const product = db.products.find(p => p.id === item.productId);
        if (product && product.salesPrice) {
          salesTotal += product.salesPrice * item.quantity;
        }
      }
    }

    // inventoryValue = sum of onHandQty * costPrice of all inventory items
    let inventoryValue = 0;
    for (const inv of db.inventory) {
      const product = db.products.find(p => p.id === inv.productId);
      if (product && product.costPrice) {
        inventoryValue += inv.onHandQty * product.costPrice;
      }
    }

    // manufacturingActiveCount = active manufacturing orders (draft & in_progress)
    const manufacturingActiveCount = db.manufacturingOrders.filter(mo => mo.status === 'draft' || mo.status === 'in_progress').length;

    return {
      salesTotal,
      inventoryValue,
      manufacturingActiveCount
    };
  },

  // AUTHENTICATION
  login(email: string, password: string) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }
    // Simulate successful login for any email
    const token = 'mock-jwt-token-' + Math.random().toString(36).substr(2, 9);
    const user = {
      id: 'usr-1',
      name: email.split('@')[0],
      email: email,
      role: 'admin',
    };
    addAuditLog('User', user.id, 'LOGIN', null, { email });
    return { user, token };
  },

  // CONTACTS
  getContacts(): Contact[] {
    return getDb().contacts;
  },

  createContact(contact: Partial<Contact>): Contact {
    const db = getDb();
    const newContact: Contact = {
      id: 'c-' + Math.random().toString(36).substr(2, 9),
      name: contact.name || 'New Contact',
      email: contact.email || '',
      phone: contact.phone || '',
      company: contact.company || '',
      role: contact.role || '',
      status: contact.status || 'active',
      createdAt: new Date().toISOString()
    };
    db.contacts.unshift(newContact);
    saveDb(db);
    addAuditLog('Contact', newContact.id, 'CREATE', null, newContact);
    return newContact;
  },

  // TASKS
  getTasks(): Task[] {
    return getDb().tasks;
  },

  createTask(task: Partial<Task>): Task {
    const db = getDb();
    const newTask: Task = {
      id: 't-' + Math.random().toString(36).substr(2, 9),
      title: task.title || 'New Task',
      status: task.status || 'todo',
      assignee: task.assignee || 'Unassigned',
      priority: task.priority || 'medium',
      createdAt: new Date().toISOString()
    };
    db.tasks.unshift(newTask);
    saveDb(db);
    addAuditLog('Task', newTask.id, 'CREATE', null, newTask);
    return newTask;
  },

  updateTaskStatus(id: string, status: Task['status']): Task {
    const db = getDb();
    const task = db.tasks.find(t => t.id === id);
    if (!task) throw new Error('Task not found');
    const oldStatus = task.status;
    task.status = status;
    saveDb(db);
    addAuditLog('Task', id, 'UPDATE_STATUS', { status: oldStatus }, { status });
    return task;
  },

  // RESET DATABASE TO SEEDS
  resetDb() {
    const db = {
      products: [...SEED_PRODUCTS],
      inventory: [...SEED_INVENTORY],
      salesOrders: [...SEED_SALES],
      purchaseOrders: [...SEED_PURCHASES],
      manufacturingOrders: [...SEED_MANUFACTURING],
      ledger: [...SEED_LEDGER],
      boms: [...SEED_BOMS],
      auditLogs: [...SEED_AUDIT],
      contacts: [...SEED_CONTACTS],
      tasks: [...SEED_TASKS]
    };
    saveDb(db);
    addAuditLog('System', 'RESET', 'RESET_DB', null, null);
  }
};
