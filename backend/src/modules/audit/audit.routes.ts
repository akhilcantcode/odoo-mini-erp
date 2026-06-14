import { Router } from 'express';
import { AuditController } from './audit.controller';
import { authenticate, requirePermission } from '../auth/auth.middleware';
import { Module, PermissionAction } from '@prisma/client';

const router = Router();
const controller = new AuditController();

router.get('/stats', authenticate, requirePermission(Module.AUDIT, PermissionAction.READ), controller.stats);
router.get('/', authenticate, requirePermission(Module.AUDIT, PermissionAction.READ), controller.list);

export { router as auditRouter };
