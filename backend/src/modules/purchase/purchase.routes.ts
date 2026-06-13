import { Router } from 'express';
import { PurchaseController } from './purchase.controller';
import { authenticate, requirePermission } from '../auth/auth.middleware';
import { Module, PermissionAction } from '@prisma/client';

const router = Router();
const controller = new PurchaseController();

router.get('/', authenticate, requirePermission(Module.PURCHASE, PermissionAction.READ), controller.list);
router.get('/:id', authenticate, requirePermission(Module.PURCHASE, PermissionAction.READ), controller.getById);
router.post('/', authenticate, requirePermission(Module.PURCHASE, PermissionAction.CREATE), controller.create);
router.post('/:id/confirm', authenticate, requirePermission(Module.PURCHASE, PermissionAction.UPDATE), controller.confirm);
router.post('/:id/receive', authenticate, requirePermission(Module.PURCHASE, PermissionAction.UPDATE), controller.receive);

export { router as purchaseRouter };
