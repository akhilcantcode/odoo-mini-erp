import { Router } from 'express';
import { PurchaseController } from './purchase.controller';

const router = Router();
const controller = new PurchaseController();

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.post('/:id/confirm', controller.confirm);
router.post('/:id/receive', controller.receive);

export { router as purchaseRouter };
