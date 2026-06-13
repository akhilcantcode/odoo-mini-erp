import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate, requireRole } from './auth.middleware';
import { RoleType } from '@prisma/client';

const router = Router();
const controller = new AuthController();

// General Auth Routes
router.post('/register', controller.register);
router.post('/login', controller.login);
router.post('/refresh', controller.refresh);
router.get('/me', authenticate, controller.me);

// RBAC User Management (Scoped to Owner/Admin)
router.post(
  '/users',
  authenticate,
  requireRole([RoleType.OWNER, RoleType.ADMIN]),
  controller.addUser
);
router.get(
  '/users',
  authenticate,
  requireRole([RoleType.OWNER, RoleType.ADMIN]),
  controller.listUsers
);
router.put(
  '/users/:id',
  authenticate,
  requireRole([RoleType.OWNER, RoleType.ADMIN]),
  controller.updateUser
);
router.delete(
  '/users/:id',
  authenticate,
  requireRole([RoleType.OWNER, RoleType.ADMIN]),
  controller.deleteUser
);

// RBAC Role & Permission Administration (Scoped to Owner/Admin)
router.get(
  '/roles',
  authenticate,
  requireRole([RoleType.OWNER, RoleType.ADMIN]),
  controller.listRoles
);
router.put(
  '/roles/:name/permissions',
  authenticate,
  requireRole([RoleType.OWNER, RoleType.ADMIN]),
  controller.updateRolePermissions
);

export { router as authRouter };
