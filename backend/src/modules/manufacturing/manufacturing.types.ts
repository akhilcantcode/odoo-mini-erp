import { z } from 'zod';

// --- Zod Schemas ---

export const CreateManufacturingOrderSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().positive('Quantity must be positive'),
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
