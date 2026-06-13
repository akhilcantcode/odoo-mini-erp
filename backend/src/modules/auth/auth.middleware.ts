import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, JWTPayload } from './auth.types';
import { AuthService } from './auth.service';
import { RoleType, Module, PermissionAction } from '@prisma/client';

const authService = new AuthService();
const jwtSecret = process.env.JWT_SECRET || 'super-secret-access-token-key-change-in-production';

/**
 * Middleware to authenticate requests via Bearer JWT.
 * Attaches the user's current identity, company, roles, and permissions to req.user.
 */
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header missing or invalid' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    const user = await authService.getMe(decoded.userId);

    req.user = user;
    next();
  } catch (error: any) {
    return res.status(401).json({ message: error.message || 'Unauthorized or token expired' });
  }
}

/**
 * Middleware to restrict access to specific roles.
 */
export function requireRole(allowedRoles: RoleType[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const hasRole = req.user.roles.some((role) => allowedRoles.includes(role));
    if (!hasRole) {
      return res.status(403).json({ message: 'Forbidden: Insufficient role privileges' });
    }

    next();
  };
}

/**
 * Middleware to restrict access to specific module permissions.
 */
export function requirePermission(module: Module, action: PermissionAction) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const hasPermission = req.user.permissions.some(
      (p) => p.module === module && p.action === action
    );

    if (!hasPermission) {
      return res.status(403).json({ message: 'Forbidden: Insufficient module permissions' });
    }

    next();
  };
}
