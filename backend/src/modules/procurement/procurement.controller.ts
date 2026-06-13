import { Request, Response, NextFunction } from 'express';
import { ProcurementService } from './procurement.service';

export class ProcurementController {
  private service: ProcurementService;

  constructor() {
    this.service = new ProcurementService();
  }

  // HTTP handlers for procurement automation configuration will be defined here
}
