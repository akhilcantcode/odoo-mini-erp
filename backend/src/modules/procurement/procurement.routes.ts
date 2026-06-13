import { Router } from 'express';
import { ProcurementController } from './procurement.controller';

const router = Router();
const controller = new ProcurementController();

// Procurement routes will be defined here

export { router as procurementRouter };
