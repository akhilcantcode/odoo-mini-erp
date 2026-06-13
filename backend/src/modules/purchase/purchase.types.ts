import { z } from 'zod';

// --- Zod Schemas ---

export const CreatePurchaseOrderItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().positive('Quantity must be positive'),
});

export const CreatePurchaseOrderSchema = z.object({
  vendorName: z.string().min(1, 'Vendor name is required'),
  vendorAddress: z.string().optional().nullable(),
  responsiblePersonId: z.string().uuid('Invalid responsible person ID').optional().nullable(),
  items: z
    .array(CreatePurchaseOrderItemSchema)
    .min(1, 'At least one item is required'),
});

// --- Inferred Types ---

export type CreatePurchaseOrderInput = z.infer<typeof CreatePurchaseOrderSchema>;
export type CreatePurchaseOrderItemInput = z.infer<typeof CreatePurchaseOrderItemSchema>;
