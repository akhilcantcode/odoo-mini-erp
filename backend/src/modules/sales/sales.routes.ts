import { Router } from 'express';
import { SalesController } from './sales.controller';

const router = Router();
const controller = new SalesController();

// Sales routes will be defined here

export { router as salesRouter };
