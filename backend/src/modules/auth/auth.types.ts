import { Request } from 'express';
import { RoleType, Module, PermissionAction } from '@prisma/client';
import { z } from 'zod';

// --- Zod Schemas ---

export const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  companyName: z.string().min(2, 'Company name must be at least 2 characters long'),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string(),
});

export const AddUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  roles: z.array(z.nativeEnum(RoleType)).min(1, 'At least one role must be assigned'),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long').optional(),
  email: z.string().email('Invalid email format').optional(),
  roles: z.array(z.nativeEnum(RoleType)).min(1, 'At least one role must be assigned').optional(),
});

// --- Types ---

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type AddUserInput = z.infer<typeof AddUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

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

