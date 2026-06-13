import { Router } from 'express';
import { InventoryController } from './inventory.controller';

const router = Router();
const controller = new InventoryController();

// Inventory routes will be defined here

export { router as inventoryRouter };
