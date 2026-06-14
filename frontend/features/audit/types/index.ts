export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  createdAt: string;
  companyId: string;
  userId: string | null;
  user: { id: string; name: string } | null;
}

export interface AuditStats {
  total: number;
  creates: number;
  updates: number;
  deletes: number;
}

export interface AuditPaginatedResponse {
  data: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}
