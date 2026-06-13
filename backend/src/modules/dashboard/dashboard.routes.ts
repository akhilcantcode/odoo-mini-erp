import { Router } from 'express';
import { DashboardController } from './dashboard.controller';

const router = Router();
const controller = new DashboardController();

// Dashboard routes will be defined here

export { router as dashboardRouter };
