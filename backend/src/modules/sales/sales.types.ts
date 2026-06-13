import { z } from 'zod';

// --- Zod Schemas ---

export const CreateSalesOrderItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().positive('Quantity must be positive'),
});

export const CreateSalesOrderSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  customerAddress: z.string().optional().nullable(),
  responsiblePersonId: z.string().uuid('Invalid responsible person ID').optional().nullable(),
  items: z.array(CreateSalesOrderItemSchema).min(1, 'At least one item is required'),
});

// --- Inferred Types ---

export type CreateSalesOrderInput = z.infer<typeof CreateSalesOrderSchema>;
export type CreateSalesOrderItemInput = z.infer<typeof CreateSalesOrderItemSchema>;
