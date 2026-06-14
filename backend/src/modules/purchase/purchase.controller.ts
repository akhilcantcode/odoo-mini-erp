import { Request, Response, NextFunction } from 'express';
import { PurchaseService } from './purchase.service';

export class PurchaseController {
  private service: PurchaseService;

  constructor() {
    this.service = new PurchaseService();
  }

  /**
   * GET / — List all purchase orders.
   */
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = (req as any).user?.companyId || (req.headers['x-company-id'] as string);
      if (!companyId) {
        return res.status(400).json({ message: 'x-company-id header or authentication token is required' });
      }
      const orders = await this.service.list(companyId);
      res.json(orders);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /:id — Get a single purchase order.
   */
  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = (req as any).user?.companyId || (req.headers['x-company-id'] as string);
      if (!companyId) {
        return res.status(400).json({ message: 'x-company-id header or authentication token is required' });
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
   * POST / — Create a new purchase order.
   */
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = (req as any).user?.companyId || (req.headers['x-company-id'] as string);
      if (!companyId) {
        return res.status(400).json({ message: 'x-company-id header or authentication token is required' });
      }
      const order = await this.service.create(req.body, companyId, (req as any).user?.id);
      res.status(201).json(order);
    } catch (err: any) {
      if (err.name === 'ZodError') {
        return res.status(400).json({ message: 'Validation error', errors: err.errors });
      }
      next(err);
    }
  };

  /**
   * POST /:id/confirm — Confirm a draft purchase order.
   */
  confirm = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = (req as any).user?.companyId || (req.headers['x-company-id'] as string);
      if (!companyId) {
        return res.status(400).json({ message: 'x-company-id header or authentication token is required' });
      }
      const order = await this.service.confirm(req.params.id, companyId, (req as any).user?.id);
      res.json(order);
    } catch (err: any) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ message: err.message });
      }
      next(err);
    }
  };

  /**
   * POST /:id/receive — Receive items from a confirmed purchase order.
   */
  receive = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = (req as any).user?.companyId || (req.headers['x-company-id'] as string);
      if (!companyId) {
        return res.status(400).json({ message: 'x-company-id header or authentication token is required' });
      }
      const order = await this.service.receive(req.params.id, companyId, (req as any).user?.id);
      res.json(order);
    } catch (err: any) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ message: err.message });
      }
      if (err.message?.includes('must be confirmed')) {
        return res.status(400).json({ message: err.message });
      }
      next(err);
    }
  };
}
