import { Request, Response, NextFunction } from 'express';
import { ProductService } from './product.service';

export class ProductController {
  private service: ProductService;

  constructor() {
    this.service = new ProductService();
  }

  // HTTP request handlers for product operations will be defined here
}
