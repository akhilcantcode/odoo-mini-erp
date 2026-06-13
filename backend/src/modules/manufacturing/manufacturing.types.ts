import { z } from 'zod';

// --- Zod Schemas ---

export const CreateManufacturingOrderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().positive(),
});

export const CreateManufacturingWorkOrderSchema = z.object({
  operationName: z.string().min(1),
  workCenterName: z.string().min(1),
  plannedDuration: z.number().positive(),
});

export const CreateManufacturingOrderSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().positive('Quantity must be positive'),
  scheduleDate: z.string().optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  bomId: z.string().uuid().optional().nullable(),
  items: z.array(CreateManufacturingOrderItemSchema).optional(),
  workOrders: z.array(CreateManufacturingWorkOrderSchema).optional(),
});

// --- Inferred Types ---

export type CreateManufacturingOrderInput = z.infer<typeof CreateManufacturingOrderSchema>;

/**
 * Represents a consumed component returned after MO start.
 */
export interface ConsumedComponent {
  componentId: string;
  componentName: string;
  qtyConsumed: number;
}
