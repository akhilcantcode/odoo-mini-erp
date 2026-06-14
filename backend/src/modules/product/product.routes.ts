import { Router } from 'express';
import { ProductController } from './product.controller';
import { authenticate, requirePermission } from '../auth/auth.middleware';
import { Module, PermissionAction } from '@prisma/client';

const router = Router();
const controller = new ProductController();

router.get('/', authenticate, requirePermission(Module.PRODUCT, PermissionAction.READ), controller.list);
router.post('/', authenticate, requirePermission(Module.PRODUCT, PermissionAction.CREATE), controller.create);
router.post('/import', authenticate, requirePermission(Module.PRODUCT, PermissionAction.CREATE), controller.import);
router.get('/:id', authenticate, requirePermission(Module.PRODUCT, PermissionAction.READ), controller.getById);
router.put('/:id', authenticate, requirePermission(Module.PRODUCT, PermissionAction.UPDATE), controller.update);
router.get('/:id/bom', authenticate, requirePermission(Module.PRODUCT, PermissionAction.READ), controller.getBom);
router.post('/:id/bom', authenticate, requirePermission(Module.PRODUCT, PermissionAction.UPDATE), controller.setBom);
router.delete('/:id', authenticate, requirePermission(Module.PRODUCT, PermissionAction.DELETE), controller.delete);
router.delete('/:id/bom', authenticate, requirePermission(Module.PRODUCT, PermissionAction.DELETE), controller.deleteBom);

export { router as productRouter };
