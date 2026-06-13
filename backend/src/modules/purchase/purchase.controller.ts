import { Request, Response, NextFunction } from 'express';
import { PurchaseService } from './purchase.service';

export class PurchaseController {
  private service: PurchaseService;

  constructor() {
    this.service = new PurchaseService();
  }

  // HTTP handlers for purchase order operations will be defined here
}
