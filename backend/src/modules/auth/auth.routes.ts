import { Router } from 'express';
import { AuthController } from './auth.controller';

const router = Router();
const controller = new AuthController();

// Auth routes will be defined here

export { router as authRouter };
