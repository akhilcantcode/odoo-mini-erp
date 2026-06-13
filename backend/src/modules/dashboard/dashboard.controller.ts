import { Request, Response, NextFunction } from 'express';
import { DashboardService } from './dashboard.service';

export class DashboardController {
  private service: DashboardService;

  constructor() {
    this.service = new DashboardService();
  }

  // HTTP handlers for retrieving dashboard statistics will be defined here
}
