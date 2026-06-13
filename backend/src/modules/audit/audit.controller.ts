import { Request, Response, NextFunction } from 'express';
import { AuditService } from './audit.service';

export class AuditController {
  private service: AuditService;

  constructor() {
    this.service = new AuditService();
  }

  // HTTP handlers for retrieving audit logs will be defined here
}
