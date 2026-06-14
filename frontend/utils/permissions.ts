export const getPositionFromRoles = (roles: string[]): string => {
  if (roles.includes('OWNER') || roles.includes('ADMIN')) return 'System Administrator';
  if (roles.includes('SALES')) return 'Sales Manager';
  if (roles.includes('PURCHASE')) return 'Purchase Manager';
  if (roles.includes('MANUFACTURING')) return 'Production Manager';
  if (roles.includes('INVENTORY') || roles.includes('INVENTORY_MANAGER')) return 'Inventory Manager';
  if (roles.includes('BUSINESS_OWNER')) return 'Business Owner';
  return 'Standard User';
};

// Static field permissions matrix matching the backend RbacController exactly
export const FIELD_PERMISSIONS_MATRIX: Record<string, Record<string, any[]>> = {
  'System Administrator': {
    sales: [
      { field: 'Customer', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Customer Address', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Sales Person', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Product', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Ordered Quantity', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Delivered Quantity', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Sales Price', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Status', create: '✓', view: '✓', edit: '✓', delete: '✗' },
      { field: 'Total', create: '✓', view: '✓', edit: 'Recomputed', delete: 'Recomputed' },
      { field: 'Creation Date', create: 'Auto Compute', view: '✓', edit: '✗', delete: '✗' },
    ],
    purchase: [
      { field: 'Vendor', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Vendor Address', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Responsible Person', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Product', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Ordered Quantity', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Received Quantity', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Cost Price', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Total', create: '✓', view: '✓', edit: 'Auto Recomputed', delete: 'Auto Recomputed' },
      { field: 'Creation Date', create: 'Auto Compute', view: '✓', edit: '✗', delete: '✗' },
    ],
    manufacturing: [
      { field: 'Product to Manufacture', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Product Quantity', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'BoM', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Responsible Person', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Finished Quantity', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Creation Date', create: 'Auto Compute', view: '✓', edit: '✗', delete: '✗' },
    ],
    product: [
      { field: 'Product', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Sales Price', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Cost Price', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'On Hand Qty', create: '✓', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Free To Use Qty', create: '✓', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Procure On Demand', create: 'Not Possible', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Procurement Method', create: 'Not Possible', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Vendor', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Bill of Materials (BoM)', create: '✓', view: '✓', edit: '✓', delete: '✓' },
    ],
    inventory: [
      { field: 'Product', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'On Hand Qty', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Reserved Qty', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Free Qty', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Stock Movement (Ledger)', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Adjust Inventory', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Updated Date', create: 'Auto Computed', view: '✓', edit: '✗', delete: '✗' },
    ]
  },
  'Sales Manager': {
    sales: [
      { field: 'Customer', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Customer Address', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Sales Person', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Product', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Ordered Quantity', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Delivered Quantity', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Sales Price', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Status', create: '✓', view: '✓', edit: '✓', delete: '✗' },
      { field: 'Total', create: '✓', view: '✓', edit: 'Recomputed', delete: 'Recomputed' },
      { field: 'Creation Date', create: 'Auto Compute', view: '✓', edit: '✗', delete: '✗' },
    ],
    purchase: [
      { field: 'Vendor', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Vendor Address', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Responsible Person', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Product', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Ordered Quantity', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Received Quantity', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Cost Price', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Total', create: '✓', view: '✓', edit: 'Auto Recomputed', delete: 'Auto Recomputed' },
      { field: 'Creation Date', create: 'Auto Compute', view: '✓', edit: '✗', delete: '✗' },
    ],
    manufacturing: [
      { field: 'Product to Manufacture', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Product Quantity', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'BoM', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Responsible Person', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Finished Quantity', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Creation Date', create: 'Auto Compute', view: '✓', edit: '✗', delete: '✗' },
    ],
    product: [
      { field: 'Product', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Sales Price', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Cost Price', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'On Hand Qty', create: '✓', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Free To Use Qty', create: '✓', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Procure On Demand', create: 'Not Possible', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Procurement Method', create: 'Not Possible', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Vendor', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Bill of Materials (BoM)', create: '✓', view: '✓', edit: '✓', delete: '✓' },
    ],
    inventory: [
      { field: 'Product', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'On Hand Qty', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Reserved Qty', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Free Qty', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Stock Movement (Ledger)', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Adjust Inventory', create: '✗', view: '✗', edit: '✗', delete: '✗' },
      { field: 'Updated Date', create: 'Auto Computed', view: '✓', edit: '✗', delete: '✗' },
    ]
  },
  'Purchase Manager': {
    sales: [
      { field: 'Customer', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Customer Address', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Sales Person', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Product', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Ordered Quantity', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Delivered Quantity', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Sales Price', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Status', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Total', create: '✗', view: '✓', edit: 'Read Only', delete: 'Read Only' },
      { field: 'Creation Date', create: 'Auto Compute', view: '✓', edit: '✗', delete: '✗' },
    ],
    purchase: [
      { field: 'Vendor', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Vendor Address', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Responsible Person', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Product', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Ordered Quantity', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Received Quantity', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Cost Price', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Total', create: '✓', view: '✓', edit: 'Auto Recomputed', delete: 'Auto Recomputed' },
      { field: 'Creation Date', create: 'Auto Compute', view: '✓', edit: '✗', delete: '✗' },
    ],
    manufacturing: [
      { field: 'Product to Manufacture', create: '✗', view: '✗', edit: '✗', delete: '✗' },
      { field: 'Product Quantity', create: '✗', view: '✗', edit: '✗', delete: '✗' },
      { field: 'BoM', create: '✗', view: '✗', edit: '✗', delete: '✗' },
      { field: 'Responsible Person', create: '✗', view: '✗', edit: '✗', delete: '✗' },
      { field: 'Finished Quantity', create: '✗', view: '✗', edit: '✗', delete: '✗' },
      { field: 'Creation Date', create: 'Auto Compute', view: '✗', edit: '✗', delete: '✗' },
    ],
    product: [
      { field: 'Product', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Sales Price', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Cost Price', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'On Hand Qty', create: '✓', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Free To Use Qty', create: '✓', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Procure On Demand', create: 'Not Possible', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Procurement Method', create: 'Not Possible', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Vendor', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Bill of Materials (BoM)', create: '✓', view: '✓', edit: '✓', delete: '✓' },
    ],
    inventory: [
      { field: 'Product', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'On Hand Qty', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Reserved Qty', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Free Qty', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Stock Movement (Ledger)', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Adjust Inventory', create: '✗', view: '✗', edit: '✗', delete: '✗' },
      { field: 'Updated Date', create: 'Auto Computed', view: '✓', edit: '✗', delete: '✗' },
    ]
  },
  'Production Manager': {
    sales: [
      { field: 'Customer', create: '✗', view: '✗', edit: '✗', delete: '✗' },
      { field: 'Customer Address', create: '✗', view: '✗', edit: '✗', delete: '✗' },
      { field: 'Sales Person', create: '✗', view: '✗', edit: '✗', delete: '✗' },
      { field: 'Product', create: '✗', view: '✗', edit: '✗', delete: '✗' },
      { field: 'Ordered Quantity', create: '✗', view: '✗', edit: '✗', delete: '✗' },
      { field: 'Delivered Quantity', create: '✗', view: '✗', edit: '✗', delete: '✗' },
      { field: 'Sales Price', create: '✗', view: '✗', edit: '✗', delete: '✗' },
      { field: 'Status', create: '✗', view: '✗', edit: '✗', delete: '✗' },
      { field: 'Total', create: '✗', view: '✗', edit: '✗', delete: '✗' },
      { field: 'Creation Date', create: 'Auto Compute', view: '✗', edit: '✗', delete: '✗' },
    ],
    purchase: [
      { field: 'Vendor', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Vendor Address', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Responsible Person', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Product', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Ordered Quantity', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Received Quantity', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Cost Price', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Total', create: '✗', view: '✓', edit: 'Read Only', delete: 'Read Only' },
      { field: 'Creation Date', create: 'Auto Compute', view: '✓', edit: '✗', delete: '✗' },
    ],
    manufacturing: [
      { field: 'Product to Manufacture', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Product Quantity', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'BoM', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Responsible Person', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Finished Quantity', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Creation Date', create: 'Auto Compute', view: '✓', edit: '✗', delete: '✗' },
    ],
    product: [
      { field: 'Product', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Sales Price', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Cost Price', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'On Hand Qty', create: '✓', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Free To Use Qty', create: '✓', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Procure On Demand', create: 'Not Possible', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Procurement Method', create: 'Not Possible', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Vendor', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Bill of Materials (BoM)', create: '✓', view: '✓', edit: '✓', delete: '✓' },
    ],
    inventory: [
      { field: 'Product', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'On Hand Qty', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Reserved Qty', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Free Qty', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Stock Movement (Ledger)', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Adjust Inventory', create: '✗', view: '✗', edit: '✗', delete: '✗' },
      { field: 'Updated Date', create: 'Auto Computed', view: '✓', edit: '✗', delete: '✗' },
    ]
  },
  'Inventory Manager': {
    sales: [
      { field: 'Customer', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Customer Address', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Sales Person', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Product', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Ordered Quantity', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Delivered Quantity', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Sales Price', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Status', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Total', create: '✗', view: '✓', edit: 'Read Only', delete: 'Read Only' },
      { field: 'Creation Date', create: 'Auto Compute', view: '✓', edit: '✗', delete: '✗' },
    ],
    purchase: [
      { field: 'Vendor', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Vendor Address', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Responsible Person', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Product', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Ordered Quantity', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Received Quantity', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Cost Price', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Total', create: '✗', view: '✓', edit: 'Read Only', delete: 'Read Only' },
      { field: 'Creation Date', create: 'Auto Compute', view: '✓', edit: '✗', delete: '✗' },
    ],
    manufacturing: [
      { field: 'Product to Manufacture', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Product Quantity', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'BoM', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Responsible Person', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Finished Quantity', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Creation Date', create: 'Auto Compute', view: '✓', edit: '✗', delete: '✗' },
    ],
    product: [
      { field: 'Product', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Sales Price', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Cost Price', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'On Hand Qty', create: '✓', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Free To Use Qty', create: '✓', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Procure On Demand', create: 'Not Possible', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Procurement Method', create: 'Not Possible', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Vendor', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Bill of Materials (BoM)', create: '✓', view: '✓', edit: '✓', delete: '✓' },
    ],
    inventory: [
      { field: 'Product', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'On Hand Qty', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Reserved Qty', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Free Qty', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Stock Movement (Ledger)', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Adjust Inventory', create: '✓', view: '✓', edit: '✓', delete: '✓' },
      { field: 'Updated Date', create: 'Auto Computed', view: '✓', edit: '✗', delete: '✗' },
    ]
  },
  'Business Owner': {
    sales: [
      { field: 'Customer', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Customer Address', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Sales Person', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Product', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Ordered Quantity', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Delivered Quantity', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Sales Price', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Status', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Total', create: '✗', view: '✓', edit: 'Read Only', delete: 'Read Only' },
      { field: 'Creation Date', create: 'Auto Compute', view: '✓', edit: '✗', delete: '✗' },
    ],
    purchase: [
      { field: 'Vendor', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Vendor Address', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Responsible Person', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Product', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Ordered Quantity', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Received Quantity', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Cost Price', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Total', create: '✗', view: '✓', edit: 'Read Only', delete: 'Read Only' },
      { field: 'Creation Date', create: 'Auto Compute', view: '✓', edit: '✗', delete: '✗' },
    ],
    manufacturing: [
      { field: 'Product to Manufacture', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Product Quantity', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'BoM', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Responsible Person', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Finished Quantity', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Creation Date', create: 'Auto Compute', view: '✓', edit: '✗', delete: '✗' },
    ],
    product: [
      { field: 'Product', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Sales Price', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Cost Price', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'On Hand Qty', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Free To Use Qty', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Procure On Demand', create: 'Not Possible', view: '✓', edit: 'Read Only', delete: 'Read Only' },
      { field: 'Procurement Method', create: 'Not Possible', view: '✓', edit: 'Read Only', delete: 'Read Only' },
      { field: 'Vendor', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Bill of Materials (BoM)', create: '✗', view: '✓', edit: '✗', delete: '✗' },
    ],
    inventory: [
      { field: 'Product', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'On Hand Qty', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Reserved Qty', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Free Qty', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Stock Movement (Ledger)', create: '✗', view: '✓', edit: '✗', delete: '✗' },
      { field: 'Adjust Inventory', create: '✗', view: '✗', edit: '✗', delete: '✗' },
      { field: 'Updated Date', create: 'Auto Computed', view: '✓', edit: '✗', delete: '✗' },
    ]
  }
};

export const hasFieldPermission = (
  roles: string[] | undefined,
  module: string,
  fieldName: string,
  action: 'create' | 'view' | 'edit' | 'delete',
  overrides?: { module: string; field: string; action: string; allowed: boolean }[]
): boolean => {
  if (!roles || roles.length === 0) return false;

  // 1. Check if there is an explicit per-user override first
  if (overrides && overrides.length > 0) {
    const override = overrides.find(
      (o) =>
        o.module.toLowerCase() === module.toLowerCase() &&
        o.field.toLowerCase() === fieldName.toLowerCase() &&
        o.action.toLowerCase() === action.toLowerCase()
    );
    if (override !== undefined) {
      return override.allowed; // true = explicitly grant, false = explicitly deny
    }
  }

  // 2. Fall back to role-default permissions matrix
  const position = getPositionFromRoles(roles);
  const modulePerms = FIELD_PERMISSIONS_MATRIX[position]?.[module];
  if (!modulePerms) return false;

  const row = modulePerms.find((r) => r.field.toLowerCase() === fieldName.toLowerCase());
  if (!row) return false;

  const cellVal = row[action];
  if (cellVal === '✓' || cellVal === true) return true;

  if (action === 'view') {
    // If not explicitly blocked with ✗ or x, it is viewable
    return cellVal !== '✗' && cellVal !== 'x' && cellVal !== false;
  }

  // For write actions (create, edit, delete), special labels like 'Recomputed', 'Read Only' mean false
  return false;
};

export const hasModuleViewPermission = (
  roles: string[] | undefined,
  module: string,
  overrides?: { module: string; field: string; action: string; allowed: boolean }[]
): boolean => {
  if (!roles || roles.length === 0) return false;
  const position = getPositionFromRoles(roles);
  const modulePerms = FIELD_PERMISSIONS_MATRIX[position]?.[module];
  if (!modulePerms) return false;

  // If at least one field has view permission !== '✗' and !== 'x'
  return modulePerms.some((row) => {
    if (overrides && overrides.length > 0) {
      const override = overrides.find(
        (o) =>
          o.module.toLowerCase() === module.toLowerCase() &&
          o.field.toLowerCase() === row.field.toLowerCase() &&
          o.action.toLowerCase() === 'view'
      );
      if (override !== undefined) {
        return override.allowed;
      }
    }
    const val = row.view;
    return val !== '✗' && val !== 'x' && val !== false;
  });
};

