import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { RoleType } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

export class RbacController {
  private auditService: AuditService;

  constructor() {
    this.auditService = new AuditService();
  }

  /**
   * GET /roles/matrix
   * Returns overall role permission matrix & dynamic field-level configurations.
   */
  getMatrix = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. Module & Action permissions comparison matrix (Drawing 1)
      const matrix = [
        { module: 'Sales', action: 'View', admin: '✓', user: '✓', none: 'Optional' },
        { module: 'Sales', action: 'Create', admin: '✓', user: '✓', none: '✗' },
        { module: 'Sales', action: 'Edit', admin: '✓', user: 'Limited', none: '✗' },
        { module: 'Sales', action: 'Delete', admin: '✓', user: '✗', none: '✗' },
        { module: 'Sales', action: 'Approve(Confirm)', admin: '✓', user: '✗', none: '✗' },
        { module: 'Purchase', action: 'View', admin: '✓', user: '✓', none: 'Optional' },
        { module: 'Purchase', action: 'Approve', admin: '✓', user: '✗', none: '✗' },
        { module: 'Purchase', action: 'Edit', admin: '✓', user: 'Limited', none: '✗' },
        { module: 'Purchase', action: 'Create', admin: '✓', user: '✓', none: '✗' },
        { module: 'Manufacturing', action: 'Production Entry', admin: '✓', user: '✓', none: '✗' },
        { module: 'Manufacturing', action: 'Edit BOM', admin: '✓', user: '✗', none: '✗' },
        { module: 'Manufacturing', action: 'View', admin: '✓', user: '✓', none: 'Optional' },
        { module: 'Product', action: 'View', admin: '✓', user: '✓', none: 'Optional' },
        { module: 'Product', action: 'Create', admin: '✓', user: '✓', none: '✗' },
        { module: 'Product', action: 'Edit', admin: '✓', user: 'Limited', none: '✗' },
      ];

      // 2. Field-level permission grids (Drawings 2-5 + Inventory)
      const fieldPermissions: Record<string, Record<string, any[]>> = {
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

      res.json({ matrix, fieldPermissions });
    } catch (err) {
      next(err);
    }
  };

  /**
   * PUT /users/:id/role
   * Updates user role and recalculates permissions.
   */
  updateUserRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = (req as any).user?.companyId || (req.headers['x-company-id'] as string);
      const adminUserId = (req as any).user?.id;
      if (!companyId) {
        return res.status(400).json({ message: 'x-company-id header or authentication token is required' });
      }

      const { id } = req.params;
      const { roles } = req.body; // e.g. ['SALES']

      if (!roles || !Array.isArray(roles)) {
        return res.status(400).json({ message: 'roles list is required' });
      }

      const user = await prisma.user.findFirst({
        where: { id, companyId },
        include: { roles: { include: { role: true } } }
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found in this company' });
      }

      const oldRoles = user.roles.map(ur => ur.role.name);

      const updatedUser = await prisma.$transaction(async (tx) => {
        // Clear old role assignments
        await tx.userRole.deleteMany({
          where: { userId: id }
        });

        // Map and assign new roles
        for (const roleName of roles) {
          // Robustly ensure role exists for this company
          let dbRole = await tx.role.findFirst({
            where: { companyId, name: roleName as RoleType }
          });

          if (!dbRole) {
            dbRole = await tx.role.create({
              data: {
                companyId,
                name: roleName as RoleType
              }
            });
          }

          await tx.userRole.create({
            data: {
              userId: id,
              roleId: dbRole.id
            }
          });
        }

        return tx.user.findUnique({
          where: { id },
          include: { roles: { include: { role: true } } }
        });
      });

      const newRoles = updatedUser?.roles.map(ur => ur.role.name) || [];

      // Log to Audit Trail
      await this.auditService.log(
        'User',
        id,
        'UPDATE_ROLE',
        { roles: oldRoles },
        { roles: newRoles },
        companyId,
        adminUserId
      );

      res.json({
        id: updatedUser?.id,
        name: updatedUser?.name,
        email: updatedUser?.email,
        roles: newRoles
      });
    } catch (err) {
      next(err);
    }
  };
}
