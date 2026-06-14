import { z } from 'zod';

// --- Zod Schemas ---

export const AuditQuerySchema = z.object({
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
  action: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

// --- Types ---

export type AuditQueryInput = z.infer<typeof AuditQuerySchema>;

export interface CreateAuditLogInput {
  entityType: string;
  entityId: string;
  action: string;
  oldValue?: any;
  newValue?: any;
  userId?: string;
}
