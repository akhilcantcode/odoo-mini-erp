import { Router } from 'express';
import { ProductController } from './product.controller';

const router = Router();
const controller = new ProductController();

router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.getById);
router.put('/:id', controller.update);
router.get('/:id/bom', controller.getBom);
router.post('/:id/bom', controller.setBom);

export { router as productRouter };
