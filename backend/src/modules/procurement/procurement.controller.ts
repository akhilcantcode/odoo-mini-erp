import { Request, Response, NextFunction } from 'express';
import { ProcurementService } from './procurement.service';

export class ProcurementController {
  private service: ProcurementService;

  constructor() {
    this.service = new ProcurementService();
  }

  /**
   * POST /run — Execute procurement automation runner.
   */
  run = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.headers['x-company-id'] as string;
      if (!companyId) {
        return res.status(400).json({ message: 'x-company-id header is required' });
      }
      const result = await this.service.run(companyId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };
}
