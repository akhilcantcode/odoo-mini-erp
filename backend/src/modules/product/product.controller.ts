import { Request, Response, NextFunction } from 'express';
import { ProductService } from './product.service';

export class ProductController {
  private service: ProductService;

  constructor() {
    this.service = new ProductService();
  }

  /**
   * GET / — List all products.
   */
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = (req as any).user?.companyId || (req.headers['x-company-id'] as string);
      if (!companyId) {
        return res.status(400).json({ message: 'x-company-id header or authentication token is required' });
      }
      const filters = {
        procurementType: req.query.procurementType as string | undefined,
        procureOnDemand: req.query.procureOnDemand as string | undefined,
      };
      const products = await this.service.list(companyId, filters);
      res.json(products);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /:id — Get a single product.
   */
  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = (req as any).user?.companyId || (req.headers['x-company-id'] as string);
      if (!companyId) {
        return res.status(400).json({ message: 'x-company-id header or authentication token is required' });
      }
      const product = await this.service.getById(req.params.id, companyId);
      res.json(product);
    } catch (err: any) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ message: err.message });
      }
      next(err);
    }
  };

  /**
   * POST / — Create a new product.
   */
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = (req as any).user?.companyId || (req.headers['x-company-id'] as string);
      if (!companyId) {
        return res.status(400).json({ message: 'x-company-id header or authentication token is required' });
      }
      const product = await this.service.create(req.body, companyId);
      res.status(201).json(product);
    } catch (err: any) {
      if (err.name === 'ZodError') {
        return res.status(400).json({ message: 'Validation error', errors: err.errors });
      }
      next(err);
    }
  };

  /**
   * PUT /:id — Update a product.
   */
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = (req as any).user?.companyId || (req.headers['x-company-id'] as string);
      if (!companyId) {
        return res.status(400).json({ message: 'x-company-id header or authentication token is required' });
      }
      const product = await this.service.update(req.params.id, req.body, companyId);
      res.json(product);
    } catch (err: any) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ message: err.message });
      }
      if (err.name === 'ZodError') {
        return res.status(400).json({ message: 'Validation error', errors: err.errors });
      }
      next(err);
    }
  };

  /**
   * GET /:id/bom — Get Bill of Materials for a product.
   */
  getBom = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = (req as any).user?.companyId || (req.headers['x-company-id'] as string);
      if (!companyId) {
        return res.status(400).json({ message: 'x-company-id header or authentication token is required' });
      }
      const bom = await this.service.getBom(req.params.id, companyId);
      res.json(bom);
    } catch (err: any) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ message: err.message });
      }
      next(err);
    }
  };

  /**
   * POST /:id/bom — Set Bill of Materials for a product.
   */
  setBom = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = (req as any).user?.companyId || (req.headers['x-company-id'] as string);
      if (!companyId) {
        return res.status(400).json({ message: 'x-company-id header or authentication token is required' });
      }
      const bom = await this.service.setBom(req.params.id, req.body, companyId);
      res.status(200).json(bom);
    } catch (err: any) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ message: err.message });
      }
      if (err.name === 'ZodError') {
        return res.status(400).json({ message: 'Validation error', errors: err.errors });
      }
      next(err);
    }
  };
}
