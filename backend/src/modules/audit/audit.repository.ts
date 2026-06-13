import { prisma } from '../../config/prisma';
import { CreateAuditLogInput } from './audit.types';

export class AuditRepository {
  /**
   * List audit logs for a company, with optional filtering by entity type/id.
   */
  async findAll(companyId: string, filters?: { entityType?: string; entityId?: string }) {
    const where: any = { companyId };

    if (filters?.entityType) {
      where.entityType = filters.entityType;
    }
    if (filters?.entityId) {
      where.entityId = filters.entityId;
    }

    return prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create an audit log entry.
   */
  async create(data: CreateAuditLogInput, companyId: string) {
    return prisma.auditLog.create({
      data: {
        entityType: data.entityType,
        entityId: data.entityId,
        action: data.action,
        oldValue: data.oldValue ?? undefined,
        newValue: data.newValue ?? undefined,
        companyId,
      },
    });
  }
}
