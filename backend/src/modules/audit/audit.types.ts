import { z } from 'zod';

// --- Zod Schemas ---

export const AuditQuerySchema = z.object({
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
});

// --- Types ---

export type AuditQueryInput = z.infer<typeof AuditQuerySchema>;

export interface CreateAuditLogInput {
  entityType: string;
  entityId: string;
  action: string;
  oldValue?: any;
  newValue?: any;
}
