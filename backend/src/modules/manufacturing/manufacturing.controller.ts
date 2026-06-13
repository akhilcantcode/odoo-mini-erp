import { Request, Response, NextFunction } from 'express';
import { ManufacturingService } from './manufacturing.service';

export class ManufacturingController {
  private service: ManufacturingService;

  constructor() {
    this.service = new ManufacturingService();
  }

  // HTTP handlers for manufacturing orders and BoMs will be defined here
}
