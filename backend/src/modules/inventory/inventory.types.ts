import { z } from 'zod';

// --- Zod Schemas ---

export const AdjustInventorySchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  changeQty: z.number().refine((val) => val !== 0, 'Change quantity cannot be zero'),
  reference: z.string().optional(),
});

// --- Inferred Types ---

export type AdjustInventoryInput = z.infer<typeof AdjustInventorySchema>;

export interface InventoryWithFreeQty {
  productId: string;
  productName: string;
  onHandQty: number;
  reservedQty: number;
  freeQty: number;
  updatedAt: Date;
}
