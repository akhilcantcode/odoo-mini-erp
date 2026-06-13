import { Router } from 'express';
import { InventoryController } from './inventory.controller';
import { authenticate, requirePermission } from '../auth/auth.middleware';
import { Module, PermissionAction } from '@prisma/client';

const router = Router();
const controller = new InventoryController();

router.get('/', authenticate, requirePermission(Module.INVENTORY, PermissionAction.READ), controller.list);
router.post('/adjust', authenticate, requirePermission(Module.INVENTORY, PermissionAction.UPDATE), controller.adjust);
router.get('/ledger', authenticate, requirePermission(Module.INVENTORY, PermissionAction.READ), controller.getLedger);

export { router as inventoryRouter };
