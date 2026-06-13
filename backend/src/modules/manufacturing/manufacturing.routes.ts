import { Router } from 'express';
import { ManufacturingController } from './manufacturing.controller';
import { authenticate, requirePermission } from '../auth/auth.middleware';
import { Module, PermissionAction } from '@prisma/client';

const router = Router();
const controller = new ManufacturingController();

router.get('/', authenticate, requirePermission(Module.MANUFACTURING, PermissionAction.READ), controller.list);
router.post('/', authenticate, requirePermission(Module.MANUFACTURING, PermissionAction.CREATE), controller.create);
router.get('/:id', authenticate, requirePermission(Module.MANUFACTURING, PermissionAction.READ), controller.getById);
router.post('/:id/confirm', authenticate, requirePermission(Module.MANUFACTURING, PermissionAction.UPDATE), controller.confirm);
router.post('/:id/start', authenticate, requirePermission(Module.MANUFACTURING, PermissionAction.UPDATE), controller.start);
router.post('/:id/complete', authenticate, requirePermission(Module.MANUFACTURING, PermissionAction.UPDATE), controller.complete);
router.post('/:id/cancel', authenticate, requirePermission(Module.MANUFACTURING, PermissionAction.UPDATE), controller.cancel);
router.post('/:id/work-orders/:workOrderId/toggle', authenticate, requirePermission(Module.MANUFACTURING, PermissionAction.UPDATE), controller.toggleWorkOrder);

export { router as manufacturingRouter };
