import { z } from 'zod';

// --- Zod Schemas ---

export const CreateSalesOrderItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().positive('Quantity must be positive'),
});

export const ProcurementPurchaseOrderItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().positive('Quantity must be positive'),
});

export const ProcurementPurchaseOrderSchema = z.object({
  vendorName: z.string().min(1, 'Vendor name is required'),
  items: z.array(ProcurementPurchaseOrderItemSchema).min(1, 'At least one item is required'),
});

export const ProcurementSchema = z.object({
  purchaseOrders: z.array(ProcurementPurchaseOrderSchema).default([]),
});

export const CreateSalesOrderSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  items: z.array(CreateSalesOrderItemSchema).min(1, 'At least one item is required'),
  procurement: ProcurementSchema.optional(),
});

// --- Inferred Types ---

export type CreateSalesOrderInput = z.infer<typeof CreateSalesOrderSchema>;
export type CreateSalesOrderItemInput = z.infer<typeof CreateSalesOrderItemSchema>;
export type ProcurementInput = z.infer<typeof ProcurementSchema>;
export type ProcurementPurchaseOrderInput = z.infer<typeof ProcurementPurchaseOrderSchema>;
export type ProcurementPurchaseOrderItemInput = z.infer<typeof ProcurementPurchaseOrderItemSchema>;
