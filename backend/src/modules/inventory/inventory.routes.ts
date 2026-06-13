import { Router } from 'express';
import { InventoryController } from './inventory.controller';

const router = Router();
const controller = new InventoryController();

router.get('/', controller.list);
router.post('/adjust', controller.adjust);
router.get('/ledger', controller.getLedger);

export { router as inventoryRouter };
