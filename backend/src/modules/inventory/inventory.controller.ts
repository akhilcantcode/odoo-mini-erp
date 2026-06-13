import { Request, Response, NextFunction } from 'express';
import { InventoryService } from './inventory.service';

export class InventoryController {
  private service: InventoryService;

  constructor() {
    this.service = new InventoryService();
  }

  /**
   * GET / — List all inventory.
   */
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.headers['x-company-id'] as string;
      if (!companyId) {
        return res.status(400).json({ message: 'x-company-id header is required' });
      }
      const inventory = await this.service.list(companyId);
      res.json(inventory);
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /adjust — Perform manual inventory adjustment.
   */
  adjust = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.headers['x-company-id'] as string;
      if (!companyId) {
        return res.status(400).json({ message: 'x-company-id header is required' });
      }
      const result = await this.service.adjust(req.body, companyId);
      res.json(result);
    } catch (err: any) {
      if (err.name === 'ZodError') {
        return res.status(400).json({ message: 'Validation error', errors: err.errors });
      }
      next(err);
    }
  };

  /**
   * GET /ledger — Get stock ledger entries.
   */
  getLedger = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.headers['x-company-id'] as string;
      if (!companyId) {
        return res.status(400).json({ message: 'x-company-id header is required' });
      }
      const productId = req.query.productId as string | undefined;
      const ledger = await this.service.getLedger(companyId, productId);
      res.json(ledger);
    } catch (err) {
      next(err);
    }
  };
}
