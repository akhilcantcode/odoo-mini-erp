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

router.post(
  '/check-procurement',
  authenticate,
  requirePermission(Module.SALES, PermissionAction.CREATE),
  controller.checkProcurement
);

router.get(
  '/:id',
  authenticate,
  requirePermission(Module.SALES, PermissionAction.READ),
  controller.getById
);

router.post(
  '/:id/confirm',
  authenticate,
  requirePermission(Module.SALES, PermissionAction.UPDATE),
  controller.confirm
);

router.post(
  '/:id/deliver',
  authenticate,
  requirePermission(Module.INVENTORY, PermissionAction.UPDATE),
  controller.deliver
);

export { router as salesRouter };
