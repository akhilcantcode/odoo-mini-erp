import { prisma } from '../../config/prisma';
import { CreateAuditLogInput } from './audit.types';

export class AuditRepository {
  /**
   * List audit logs for a company with filtering, pagination, and user info.
   */
  async findAll(
    companyId: string,
    filters?: {
      entityType?: string;
      entityId?: string;
      action?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      pageSize?: number;
    }
  ) {
    const where: any = { companyId };

    if (filters?.entityType) {
      where.entityType = filters.entityType;
    }
    if (filters?.entityId) {
      where.entityId = filters.entityId;
    }
    if (filters?.action) {
      where.action = filters.action;
    }
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        // Set end date to end of day
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 25;
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  /**
   * Get aggregate counts by action type.
   */
  async getStats(companyId: string) {
    const [total, creates, updates, deletes] = await Promise.all([
      prisma.auditLog.count({ where: { companyId } }),
      prisma.auditLog.count({ where: { companyId, action: { in: ['CREATE', 'SET'] } } }),
      prisma.auditLog.count({
        where: { companyId, action: { in: ['CONFIRM', 'RECEIVE', 'DELIVER', 'START', 'COMPLETE', 'ADJUST', 'UPDATE'] } },
      }),
      prisma.auditLog.count({ where: { companyId, action: { in: ['DELETE', 'CANCEL'] } } }),
    ]);

    return { total, creates, updates, deletes };
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
        userId: data.userId ?? undefined,
        companyId,
      },
    });
  }
}
