import { Router } from 'express';
import { ProcurementController } from './procurement.controller';
import { authenticate } from '../auth/auth.middleware';

const router = Router();
const controller = new ProcurementController();

router.post('/run', authenticate, controller.run);

export { router as procurementRouter };
