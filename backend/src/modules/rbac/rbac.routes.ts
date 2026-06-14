import { Router } from 'express';
import { RbacController } from './rbac.controller';
import { authenticate, requireRole } from '../auth/auth.middleware';
import { RoleType } from '@prisma/client';

const router = Router();
const controller = new RbacController();

router.get(
  '/roles/matrix',
  authenticate,
  requireRole([RoleType.OWNER, RoleType.ADMIN]),
  controller.getMatrix
);

router.put(
  '/users/:id/role',
  authenticate,
  requireRole([RoleType.OWNER, RoleType.ADMIN]),
  controller.updateUserRole
);

export { router as rbacRouter };
