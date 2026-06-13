import { Request, Response, NextFunction } from 'express';
import { InventoryService } from './inventory.service';

export class InventoryController {
  private service: InventoryService;

  constructor() {
    this.service = new InventoryService();
  }

  // HTTP request handlers for inventory operations will be defined here
}
