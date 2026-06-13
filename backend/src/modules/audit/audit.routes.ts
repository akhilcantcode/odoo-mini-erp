import { Router } from 'express';
import { AuditController } from './audit.controller';

const router = Router();
const controller = new AuditController();

// Audit routes will be defined here

export { router as auditRouter };
