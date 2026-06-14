import { Request, Response, NextFunction } from 'express';
import { AuditService } from './audit.service';

export class AuditController {
  private service: AuditService;

  constructor() {
    this.service = new AuditService();
  }

  /**
   * GET / — List audit logs with optional filtering and pagination.
   */
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = (req as any).user?.companyId || (req.headers['x-company-id'] as string);
      if (!companyId) {
        return res.status(400).json({ message: 'x-company-id header or authentication token is required' });
      }
      const filters = {
        entityType: req.query.entityType as string | undefined,
        entityId: req.query.entityId as string | undefined,
        action: req.query.action as string | undefined,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
      };
      const result = await this.service.list(companyId, filters);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /stats — Get audit log statistics (counts by action type).
   */
  stats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = (req as any).user?.companyId || (req.headers['x-company-id'] as string);
      if (!companyId) {
        return res.status(400).json({ message: 'x-company-id header or authentication token is required' });
      }
      const stats = await this.service.getStats(companyId);
      res.json(stats);
    } catch (err) {
      next(err);
    }
  };
}
