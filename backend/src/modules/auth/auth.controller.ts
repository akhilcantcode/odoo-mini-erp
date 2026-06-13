import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { AuthenticatedRequest } from './auth.types';
import { RoleType } from '@prisma/client';

export class AuthController {
  private service: AuthService;

  constructor() {
    this.service = new AuthService();
  }

  /**
   * Handler for user registration.
   * Expects name, email, password, companyName.
   */
  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password, companyName } = req.body;
      if (!name || !email || !password || !companyName) {
        return res.status(400).json({
          message: 'All fields (name, email, password, companyName) are required',
        });
      }

      const result = await this.service.register(name, email, password, companyName);
      return res.status(201).json(result);
    } catch (error: any) {
      return res.status(400).json({ message: error.message || 'Registration failed' });
    }
  };

  /**
   * Handler for user login.
   * Expects email, password.
   */
  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({
          message: 'Email and password are required',
        });
      }

      const result = await this.service.login(email, password);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(401).json({ message: error.message || 'Login failed' });
    }
  };

  /**
   * Handler to refresh an access token.
   * Expects refreshToken.
   */
  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({
          message: 'Refresh token is required',
        });
      }

      const result = await this.service.refresh(refreshToken);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(401).json({ message: error.message || 'Token refresh failed' });
    }
  };

  /**
   * Handler to retrieve current user info, roles, and permissions.
   */
  me = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      return res.status(200).json(req.user);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || 'Failed to retrieve profile' });
    }
  };

  /**
   * Handler to create a new user under the same company.
   * Requires OWNER or ADMIN.
   */
  addUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
      const { name, email, password, roles } = req.body;
      if (!name || !email || !password || !roles || !Array.isArray(roles)) {
        return res.status(400).json({
          message: 'Fields (name, email, password, roles as array) are required',
        });
      }

      const result = await this.service.createUser(
        req.user.companyId,
        name,
        email,
        password,
        roles as RoleType[]
      );
      return res.status(201).json(result);
    } catch (error: any) {
      return res.status(400).json({ message: error.message || 'Failed to create user' });
    }
  };

  /**
   * Handler to list all users in the same company.
   * Requires OWNER or ADMIN.
   */
  listUsers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
      const result = await this.service.getUsers(req.user.companyId);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || 'Failed to retrieve users' });
    }
  };

  /**
   * Handler to update user details/roles.
   * Requires OWNER or ADMIN.
   */
  updateUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
      const { id } = req.params;
      const { name, email, roles } = req.body;

      const result = await this.service.updateUser(
        req.user.companyId,
        id,
        name,
        email,
        roles as RoleType[]
      );
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({ message: error.message || 'Failed to update user' });
    }
  };

  /**
   * Handler to delete a user.
   * Requires OWNER or ADMIN.
   */
  deleteUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
      const { id } = req.params;
      if (id === req.user.id) {
        return res.status(400).json({ message: 'Self-deletion is not permitted' });
      }

      const result = await this.service.deleteUser(req.user.companyId, id);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({ message: error.message || 'Failed to delete user' });
    }
  };

  /**
   * Handler to list all roles in the company and their permissions.
   * Requires OWNER or ADMIN.
   */
  listRoles = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
      const result = await this.service.getRoles(req.user.companyId);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || 'Failed to retrieve roles' });
    }
  };

  /**
   * Handler to update the mapped permissions for a company role.
   * Requires OWNER or ADMIN.
   */
  updateRolePermissions = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
      const { name } = req.params;
      const { permissions } = req.body;
      if (!permissions || !Array.isArray(permissions)) {
        return res.status(400).json({ message: 'Permissions array is required' });
      }

      const result = await this.service.updateRolePermissions(
        req.user.companyId,
        name as RoleType,
        permissions
      );
      return res.status(200).json(result);
    } catch (error: any) {
      return res
        .status(400)
        .json({ message: error.message || 'Failed to update role permissions' });
    }
  };
}
