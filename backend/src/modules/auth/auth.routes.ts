import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate, requireRole } from './auth.middleware';
import { RoleType } from '@prisma/client';
import { AuthenticatedRequest } from './auth.types';

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

// Per-User Permission Overrides (Scoped to Owner/Admin, or the user requesting their own overrides)
router.get(
  '/users/:id/overrides',
  authenticate,
  (req: AuthenticatedRequest, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const isAdmin = req.user.roles.some((role: string) => [RoleType.OWNER as string, RoleType.ADMIN as string].includes(role));
    const isSelf = req.user.id === req.params.id;
    if (!isAdmin && !isSelf) {
      return res.status(403).json({ message: 'Forbidden: Insufficient privileges' });
    }
    next();
  },
  controller.getUserOverrides
);
router.put(
  '/users/:id/overrides',
  authenticate,
  requireRole([RoleType.OWNER, RoleType.ADMIN]),
  controller.setUserOverrides
);
router.delete(
  '/users/:id/overrides',
  authenticate,
  requireRole([RoleType.OWNER, RoleType.ADMIN]),
  controller.resetUserOverrides
);

export { router as authRouter };
