import { Request, Response, NextFunction } from 'express';
import { AuditService } from './audit.service';

export class AuditController {
  private service: AuditService;

  constructor() {
    this.service = new AuditService();
  }

  /**
   * GET / — List audit logs with optional filtering.
   */
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.headers['x-company-id'] as string;
      if (!companyId) {
        return res.status(400).json({ message: 'x-company-id header is required' });
      }
      const filters = {
        entityType: req.query.entityType as string | undefined,
        entityId: req.query.entityId as string | undefined,
      };
      const logs = await this.service.list(companyId, filters);
      res.json(logs);
    } catch (err) {
      next(err);
    }
  };
}
