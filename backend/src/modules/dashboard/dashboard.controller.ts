import { Request, Response, NextFunction } from 'express';
import { DashboardService } from './dashboard.service';

export class DashboardController {
  private service: DashboardService;

  constructor() {
    this.service = new DashboardService();
  }

  /**
   * GET /stats — Get dashboard statistics.
   */
  getStats = async (req: Request, res: Response, next: NextFunction) => {
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
