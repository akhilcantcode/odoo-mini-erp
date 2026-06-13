import { Router } from 'express';
import { PurchaseController } from './purchase.controller';

const router = Router();
const controller = new PurchaseController();

// Purchase routes will be defined here

export { router as purchaseRouter };
