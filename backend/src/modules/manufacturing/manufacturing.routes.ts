import { Router } from 'express';
import { ManufacturingController } from './manufacturing.controller';

const router = Router();
const controller = new ManufacturingController();

// Manufacturing routes will be defined here

export { router as manufacturingRouter };
