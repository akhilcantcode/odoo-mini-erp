import { Request, Response, NextFunction } from 'express';
import { ManufacturingService } from './manufacturing.service';

export class ManufacturingController {
  private service: ManufacturingService;

  constructor() {
    this.service = new ManufacturingService();
  }

  /**
   * GET / — List all manufacturing orders.
   */
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.headers['x-company-id'] as string;
      if (!companyId) {
        return res.status(400).json({ message: 'x-company-id header is required' });
      }
      const orders = await this.service.list(companyId);
      res.json(orders);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /:id — Get a single manufacturing order.
   */
  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.headers['x-company-id'] as string;
      if (!companyId) {
        return res.status(400).json({ message: 'x-company-id header is required' });
      }
      const order = await this.service.getById(req.params.id, companyId);
      res.json(order);
    } catch (err: any) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ message: err.message });
      }
      next(err);
    }
  };

  /**
   * POST / — Create a new manufacturing order.
   */
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.headers['x-company-id'] as string;
      if (!companyId) {
        return res.status(400).json({ message: 'x-company-id header is required' });
      }
      const order = await this.service.create(req.body, companyId);
      res.status(201).json(order);
    } catch (err: any) {
      if (err.name === 'ZodError') {
        return res.status(400).json({ message: 'Validation error', errors: err.errors });
      }
      next(err);
    }
  };

  /**
   * POST /:id/start — Start manufacturing (consume components).
   */
  start = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.headers['x-company-id'] as string;
      if (!companyId) {
        return res.status(400).json({ message: 'x-company-id header is required' });
      }
      const result = await this.service.start(req.params.id, companyId);
      res.json(result);
    } catch (err: any) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ message: err.message });
      }
      if (err.message?.includes('Insufficient stock') || err.message?.includes('No Bill of Materials')) {
        return res.status(400).json({ message: err.message });
      }
      next(err);
    }
  };

  /**
   * POST /:id/complete — Complete manufacturing (produce finished goods).
   */
  complete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.headers['x-company-id'] as string;
      if (!companyId) {
        return res.status(400).json({ message: 'x-company-id header is required' });
      }
      const result = await this.service.complete(req.params.id, companyId);
      res.json(result);
    } catch (err: any) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ message: err.message });
      }
      next(err);
    }
  };
}
