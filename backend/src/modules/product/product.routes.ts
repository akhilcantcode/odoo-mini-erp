import { Router } from 'express';
import { ProductController } from './product.controller';

const router = Router();
const controller = new ProductController();

// Product routes will be defined here

export { router as productRouter };
