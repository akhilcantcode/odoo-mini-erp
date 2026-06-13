import { z } from 'zod';

// --- Zod Schemas ---

export const CreateProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  salesPrice: z.number().nonnegative().nullable().optional(),
  costPrice: z.number().nonnegative().nullable().optional(),
  procurementType: z.enum(['purchase', 'manufacture']),
  procureOnDemand: z.boolean().optional().default(false),
});

export const UpdateProductSchema = z.object({
  name: z.string().min(1).optional(),
  salesPrice: z.number().nonnegative().nullable().optional(),
  costPrice: z.number().nonnegative().nullable().optional(),
  procurementType: z.enum(['purchase', 'manufacture']).optional(),
  procureOnDemand: z.boolean().optional(),
});

export const SetBomItemSchema = z.object({
  componentId: z.string().uuid('Invalid component ID'),
  quantity: z.number().positive('Quantity must be positive'),
});

export const SetBomOperationSchema = z.object({
  operationName: z.string().min(1, 'Operation name is required'),
  workCenterName: z.string().min(1, 'Work center name is required'),
  plannedDuration: z.number().nonnegative('Duration must be positive'),
});

export const SetBomSchema = z.object({
  quantity: z.number().positive('Quantity must be positive').optional().default(1.0),
  reference: z.string().max(8, 'Reference must be at most 8 characters').nullable().optional(),
  items: z.array(SetBomItemSchema),
  operations: z.array(SetBomOperationSchema).optional().default([]),
});

// --- Inferred Types ---

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type SetBomInput = z.infer<typeof SetBomSchema>;
