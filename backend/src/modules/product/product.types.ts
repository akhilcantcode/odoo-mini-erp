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

export const SetBomSchema = z.object({
  items: z
    .array(SetBomItemSchema)
    .min(1, 'At least one BoM item is required'),
});

// --- Inferred Types ---

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type SetBomInput = z.infer<typeof SetBomSchema>;
