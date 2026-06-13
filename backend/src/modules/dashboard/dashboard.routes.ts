import { Router } from 'express';
import { DashboardController } from './dashboard.controller';
import { authenticate } from '../auth/auth.middleware';

const router = Router();
const controller = new DashboardController();

router.get('/stats', authenticate, controller.getStats);

export { router as dashboardRouter };
