import { Router } from 'express';
import { ManufacturingController } from './manufacturing.controller';

const router = Router();
const controller = new ManufacturingController();

router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.getById);
router.post('/:id/start', controller.start);
router.post('/:id/complete', controller.complete);

export { router as manufacturingRouter };
