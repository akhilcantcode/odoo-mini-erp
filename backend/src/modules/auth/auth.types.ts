import { Request } from 'express';
import { RoleType, Module, PermissionAction } from '@prisma/client';

export interface UserSession {
  userId: string;
  role: string;
  token: string;
}

export interface JWTPayload {
  userId: string;
  companyId: string;
}

export interface UserPayload {
  id: string;
  name: string;
  email: string;
  companyId: string;
  roles: RoleType[];
  permissions: {
    module: Module;
    action: PermissionAction;
  }[];
}

export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}
