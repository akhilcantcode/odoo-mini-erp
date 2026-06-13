import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthRepository } from './auth.repository';
import { JWTPayload } from './auth.types';
import { Module, PermissionAction, RoleType } from '@prisma/client';

export class AuthService {
  private repository: AuthRepository;
  private jwtSecret: string;
  private jwtRefreshSecret: string;

  constructor() {
    this.repository = new AuthRepository();
    this.jwtSecret = process.env.JWT_SECRET || 'super-secret-access-token-key-change-in-production';
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'super-secret-refresh-token-key-change-in-production';
  }

  /**
   * Registers a new company and user owner.
   */
  async register(name: string, email: string, password: UserSession | string, companyName: string) {
    const existingUser = await this.repository.findUserByEmail(email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password as string, salt);

    return this.repository.createCompanyWithUserAndRoles(
      name,
      email,
      passwordHash,
      companyName
    );
  }

  /**
   * Authenticates user and returns tokens.
   */
  async login(email: string, password: UserSession | string) {
    const user = await this.repository.findUserByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password as string, user.password);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    const payload: JWTPayload = {
      userId: user.id,
      companyId: user.companyId,
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, { expiresIn: '1h' });
    const refreshToken = jwt.sign(payload, this.jwtRefreshSecret, { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        roles: user.roles.map((ur) => ur.role.name),
      },
    };
  }

  /**
   * Validates refresh token and generates a new access token.
   */
  async refresh(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret) as JWTPayload;

      const payload: JWTPayload = {
        userId: decoded.userId,
        companyId: decoded.companyId,
      };

      const accessToken = jwt.sign(payload, this.jwtSecret, { expiresIn: '1h' });
      return { accessToken };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Retrieves full profile details including roles and permissions.
   */
  async getMe(userId: string) {
    const user = await this.repository.findUserWithRolesAndPermissions(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Accumulate all permissions from roles
    const permissionsMap = new Map<string, { module: any; action: any }>();
    
    user.roles.forEach((userRole) => {
      userRole.role.permissions.forEach((rolePerm) => {
        const key = `${rolePerm.permission.module}:${rolePerm.permission.action}`;
        permissionsMap.set(key, {
          module: rolePerm.permission.module,
          action: rolePerm.permission.action,
        });
      });
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      companyId: user.companyId,
      roles: user.roles.map((ur) => ur.role.name),
      permissions: Array.from(permissionsMap.values()),
    };
  }

  /**
   * List all users in a company.
   */
  async getUsers(companyId: string) {
    const users = await this.repository.findUsersByCompany(companyId);
    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      roles: u.roles.map((ur) => ur.role.name),
    }));
  }

  /**
   * Create a new user in the company and assign roles.
   */
  async createUser(
    companyId: string,
    name: string,
    email: string,
    password: UserSession | string,
    roles: RoleType[]
  ) {
    const existingUser = await this.repository.findUserByEmail(email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password as string, salt);

    return this.repository.createUserInCompany(
      companyId,
      name,
      email,
      passwordHash,
      roles
    );
  }

  /**
   * Update user details and roles.
   */
  async updateUser(
    companyId: string,
    userId: string,
    name?: string,
    email?: string,
    roles?: RoleType[]
  ) {
    return this.repository.updateUserInCompany(
      companyId,
      userId,
      name,
      email,
      roles
    );
  }

  /**
   * Delete a user in the company.
   */
  async deleteUser(companyId: string, userId: string) {
    return this.repository.deleteUserInCompany(companyId, userId);
  }

  /**
   * List all company roles and their mapped permissions.
   */
  async getRoles(companyId: string) {
    const roles = await this.repository.findRolesWithPermissions(companyId);
    return roles.map((r) => ({
      role: r.name,
      permissions: r.permissions.map((rp) => ({
        module: rp.permission.module,
        action: rp.permission.action,
      })),
    }));
  }

  /**
   * Update a company role's permissions.
   */
  async updateRolePermissions(
    companyId: string,
    roleName: RoleType,
    permissions: { module: Module; action: PermissionAction }[]
  ) {
    return this.repository.updateRolePermissions(companyId, roleName, permissions);
  }
}

// Inline placeholder import fix for compile
interface UserSession {
  userId: string;
  role: string;
  token: string;
}
