import { Request, Response, NextFunction } from 'express';
import { SalesService } from './sales.service';

export class SalesController {
  private service: SalesService;

  constructor() {
    this.service = new SalesService();
  }

  /**
   * POST / — Create a draft sales order.
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
      if (err.statusCode) {
        return res.status(err.statusCode).json({ message: err.message });
      }
      next(err);
    }
  };

  /**
   * POST /check-procurement — Check replenishment/procurement needs.
   */
  checkProcurement = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = (req as any).user?.companyId || (req.headers['x-company-id'] as string);
      if (!companyId) {
        return res.status(400).json({ message: 'x-company-id header or authentication token is required' });
      }

      const result = await this.service.checkProcurement(req.body, companyId);
      res.json(result);
    } catch (err: any) {
      if (err.name === 'ZodError') {
        return res.status(400).json({ message: 'Validation error', errors: err.errors });
      }
      if (err.statusCode) {
        return res.status(err.statusCode).json({ message: err.message });
      }
      next(err);
    }
  };

  /**
   * GET / — List all sales orders for a company.
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
   * GET /:id — Get a single sales order by ID.
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
   * POST /:id/confirm — Confirm a draft sales order.
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
      res.status(400).json({ message: err.message });
    }
  };

  /**
   * POST /:id/deliver — Deliver a confirmed sales order.
   */
  deliver = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = (req as any).user?.companyId || (req.headers['x-company-id'] as string);
      if (!companyId) {
        return res.status(400).json({ message: 'x-company-id header or authentication token is required' });
      }

      const order = await this.service.deliver(req.params.id, companyId, (req as any).user?.id);
      res.json(order);
    } catch (err: any) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ message: err.message });
      }
      res.status(400).json({ message: err.message });
    }
  };

  /**
   * DELETE /:id — Delete a sales order.
   */
  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = (req as any).user?.companyId || (req.headers['x-company-id'] as string);
      if (!companyId) {
        return res.status(400).json({ message: 'x-company-id header or authentication token is required' });
      }
      const result = await this.service.delete(req.params.id, companyId, (req as any).user?.id);
      res.json({ message: 'Sales order deleted successfully', result });
    } catch (err: any) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ message: err.message });
      }
      res.status(400).json({ message: err.message });
    }
  };
}
