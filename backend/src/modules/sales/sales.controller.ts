import { Request, Response, NextFunction } from 'express';
import { SalesService } from './sales.service';

export class SalesController {
  private service: SalesService;

  constructor() {
    this.service = new SalesService();
  }

  // HTTP handlers for sales orders will be defined here
}
