import { Router } from 'express';
import { ProcurementController } from './procurement.controller';

const router = Router();
const controller = new ProcurementController();

router.post('/run', controller.run);

export { router as procurementRouter };
