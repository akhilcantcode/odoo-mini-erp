import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, JWTPayload, UserPayload } from './auth.types';
import { AuthService } from './auth.service';
import { RoleType, Module, PermissionAction } from '@prisma/client';

const authService = new AuthService();
const jwtSecret = process.env.JWT_SECRET || 'super-secret-access-token-key-change-in-production';

// ─── In-Memory User Cache ─────────────────────────────────────────────────────
// Caches the full user profile (roles + permissions) for 30 seconds per userId.
// This eliminates a DB round-trip on every authenticated request while keeping
// role/permission changes propagating within half a minute.
const USER_CACHE_TTL_MS = 30_000;

interface CachedUser {
  data: UserPayload;
  expiresAt: number;
}

const userCache = new Map<string, CachedUser>();

function getCachedUser(userId: string): UserPayload | null {
  const entry = userCache.get(userId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    userCache.delete(userId); // expired — evict
    return null;
  }
  return entry.data;
}

function setCachedUser(userId: string, data: UserPayload): void {
  userCache.set(userId, { data, expiresAt: Date.now() + USER_CACHE_TTL_MS });
}

/**
 * Call this when a user's roles or permissions are modified so the cached
 * profile is immediately invalidated (e.g., after updateUser / updateRolePermissions).
 */
export function invalidateUserCache(userId: string): void {
  userCache.delete(userId);
}

/**
 * Middleware to authenticate requests via Bearer JWT.
 * Attaches the user's current identity, company, roles, and permissions to req.user.
 * Uses a 30-second in-memory cache to avoid a DB hit on every request.
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

    // Check the in-memory cache first before hitting the DB
    const cached = getCachedUser(decoded.userId);
    if (cached) {
      req.user = cached;
      return next();
    }

    // Cache miss — fetch from DB and prime the cache
    const user = await authService.getMe(decoded.userId);
    setCachedUser(decoded.userId, user);

    req.user = user;
    next();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unauthorized or token expired';
    return res.status(401).json({ message });
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
