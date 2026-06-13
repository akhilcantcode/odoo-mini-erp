import { Router } from 'express';
import { SalesController } from './sales.controller';
import { authenticate, requirePermission } from '../auth/auth.middleware';
import { Module, PermissionAction } from '@prisma/client';

const router = Router();
const controller = new SalesController();

router.get(
  '/',
  authenticate,
  requirePermission(Module.SALES, PermissionAction.READ),
  controller.list
);

router.post(
  '/',
  authenticate,
  requirePermission(Module.SALES, PermissionAction.CREATE),
  controller.create
);

router.get(
  '/:id',
  authenticate,
  requirePermission(Module.SALES, PermissionAction.READ),
  controller.getById
);

export { router as salesRouter };
