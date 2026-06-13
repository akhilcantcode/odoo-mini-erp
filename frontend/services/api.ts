import { mockDb } from './mockDb';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

export async function fetchApi(path: string, options?: RequestInit) {
  const pathClean = path.split('?')[0];
  const method = options?.method || 'GET';

  // Check if we are running in the browser and mock is enabled or backend is unavailable
  const isMockEnabled = typeof window !== 'undefined';

  if (isMockEnabled) {
    // Add artificial delay to simulate network latency for a smoother user experience
    await new Promise(resolve => setTimeout(resolve, 250));

    try {
      if (pathClean === '/auth/login' && method === 'POST') {
        const body = JSON.parse(options?.body as string || '{}');
        return mockDb.login(body.email, body.password);
      }
      if (pathClean === '/contacts') {
        if (method === 'GET') return mockDb.getContacts();
        if (method === 'POST') {
          const body = JSON.parse(options?.body as string || '{}');
          return mockDb.createContact(body);
        }
      }
      if (pathClean === '/tasks') {
        if (method === 'GET') return mockDb.getTasks();
        if (method === 'POST') {
          const body = JSON.parse(options?.body as string || '{}');
          return mockDb.createTask(body);
        }
      }
      if (pathClean.startsWith('/tasks/') && method === 'PATCH') {
        const id = pathClean.split('/')[2];
        const body = JSON.parse(options?.body as string || '{}');
        return mockDb.updateTaskStatus(id, body.status);
      }
      if (pathClean === '/products') {
        if (method === 'GET') {
          return mockDb.getProducts();
        }
        if (method === 'POST') {
          const body = JSON.parse(options?.body as string || '{}');
          return mockDb.createProduct(
            body.name, 
            body.sku, 
            body.salesPrice, 
            body.costPrice, 
            body.procurementType, 
            body.procureOnDemand
          );
        }
      }

      if (pathClean === '/inventory') {
        return mockDb.getInventory();
      }

      if (pathClean === '/sales') {
        if (method === 'GET') {
          return mockDb.getSalesOrders();
        }
        if (method === 'POST') {
          const body = JSON.parse(options?.body as string || '{}');
          return mockDb.createSalesOrder(body.customerName, body.items);
        }
      }

      if (pathClean.startsWith('/sales/') && pathClean.endsWith('/confirm')) {
        const parts = pathClean.split('/');
        const id = parts[2];
        return mockDb.confirmSalesOrder(id);
      }

      if (pathClean.startsWith('/sales/') && pathClean.endsWith('/deliver')) {
        const parts = pathClean.split('/');
        const id = parts[2];
        return mockDb.deliverSalesOrder(id);
      }

      if (pathClean === '/purchase') {
        if (method === 'GET') {
          return mockDb.getPurchaseOrders();
        }
        if (method === 'POST') {
          const body = JSON.parse(options?.body as string || '{}');
          return mockDb.createPurchaseOrder(body.vendorName, body.items);
        }
      }

      if (pathClean.startsWith('/purchase/') && pathClean.endsWith('/receive')) {
        const parts = pathClean.split('/');
        const id = parts[2];
        return mockDb.receivePurchaseOrder(id);
      }

      if (pathClean === '/manufacturing') {
        if (method === 'GET') {
          return mockDb.getManufacturingOrders();
        }
        if (method === 'POST') {
          const body = JSON.parse(options?.body as string || '{}');
          return mockDb.createManufacturingOrder(body.productId, body.quantity);
        }
      }

      if (pathClean.startsWith('/manufacturing/') && pathClean.endsWith('/start')) {
        const parts = pathClean.split('/');
        const id = parts[2];
        return mockDb.startManufacturingOrder(id);
      }

      if (pathClean.startsWith('/manufacturing/') && pathClean.endsWith('/complete')) {
        const parts = pathClean.split('/');
        const id = parts[2];
        return mockDb.completeManufacturingOrder(id);
      }

      if (pathClean === '/procurement/run' && method === 'POST') {
        return mockDb.runProcurement();
      }

      if (pathClean === '/dashboard/stats') {
        return mockDb.getDashboardStats();
      }

      if (pathClean === '/audit') {
        return mockDb.getAuditLogs();
      }
    } catch (mockError: any) {
      console.error(`Mock database error for ${method} ${pathClean}:`, mockError);
      throw new Error(mockError.message || 'Mock database action failed');
    }
  }

  // Fallback to real backend API if mock logic is bypassed or not matching
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'API request failed');
  }

  return response.json();
}

