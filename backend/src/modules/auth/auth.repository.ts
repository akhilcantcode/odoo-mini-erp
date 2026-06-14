import { prisma } from '../../config/prisma';
import { Module, PermissionAction, RoleType } from '@prisma/client';

export class AuthRepository {
  /**
   * Find a user by email, including their roles.
   */
  async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  /**
   * Find a user and include roles and full permissions.
   */
  async findUserWithRolesAndPermissions(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Transactional method to register a company and a user as owner,
   * seeding all default global permissions and company-specific roles.
   */
  async createCompanyWithUserAndRoles(
    userName: string,
    email: string,
    passwordHash: string,
    companyName: string
  ) {
    return prisma.$transaction(async (tx) => {
      // 1. Seed global permissions if they don't exist
      const permissionsToCreate = [];
      for (const m of Object.values(Module)) {
        for (const a of Object.values(PermissionAction)) {
          permissionsToCreate.push({ module: m, action: a });
        }
      }

      await tx.permission.createMany({
        data: permissionsToCreate,
        skipDuplicates: true,
      });

      // Fetch all permissions to link them to roles
      const allPermissions = await tx.permission.findMany();

      // 2. Create the Company
      const company = await tx.company.create({
        data: {
          name: companyName,
        },
      });

      // 3. Create Default Roles for this Company
      const rolesData = [
        { name: RoleType.OWNER },
        { name: RoleType.ADMIN },
        { name: RoleType.SALES },
        { name: RoleType.PURCHASE },
        { name: RoleType.MANUFACTURING },
        { name: RoleType.INVENTORY },
      ];

      const createdRoles = [];
      for (const rd of rolesData) {
        const role = await tx.role.create({
          data: {
            name: rd.name,
            companyId: company.id,
          },
        });
        createdRoles.push(role);
      }

      // 4. Link Permissions to Roles
      const rolePermissionsData: { roleId: string; permissionId: string }[] = [];
      const ownerRole = createdRoles.find((r) => r.name === RoleType.OWNER)!;
      const adminRole = createdRoles.find((r) => r.name === RoleType.ADMIN)!;
      const salesRole = createdRoles.find((r) => r.name === RoleType.SALES)!;
      const purchaseRole = createdRoles.find((r) => r.name === RoleType.PURCHASE)!;
      const manufacturingRole = createdRoles.find((r) => r.name === RoleType.MANUFACTURING)!;
      const inventoryRole = createdRoles.find((r) => r.name === RoleType.INVENTORY)!;

      for (const p of allPermissions) {
        // OWNER and ADMIN get ALL permissions
        rolePermissionsData.push({ roleId: ownerRole.id, permissionId: p.id });
        rolePermissionsData.push({ roleId: adminRole.id, permissionId: p.id });

        // SALES role permissions
        if (p.module === Module.SALES) {
          rolePermissionsData.push({ roleId: salesRole.id, permissionId: p.id });
        } else if (p.module === Module.PRODUCT && p.action === PermissionAction.READ) {
          rolePermissionsData.push({ roleId: salesRole.id, permissionId: p.id });
        }

        // PURCHASE role permissions
        if (p.module === Module.PURCHASE) {
          rolePermissionsData.push({ roleId: purchaseRole.id, permissionId: p.id });
        } else if (p.module === Module.PRODUCT && p.action === PermissionAction.READ) {
          rolePermissionsData.push({ roleId: purchaseRole.id, permissionId: p.id });
        }

        // MANUFACTURING role permissions
        if (p.module === Module.MANUFACTURING) {
          rolePermissionsData.push({ roleId: manufacturingRole.id, permissionId: p.id });
        } else if (p.module === Module.PRODUCT && p.action === PermissionAction.READ) {
          rolePermissionsData.push({ roleId: manufacturingRole.id, permissionId: p.id });
        }

        // INVENTORY role permissions
        if (p.module === Module.INVENTORY) {
          rolePermissionsData.push({ roleId: inventoryRole.id, permissionId: p.id });
        } else if (
          p.module === Module.PRODUCT &&
          (p.action === PermissionAction.READ ||
            p.action === PermissionAction.CREATE ||
            p.action === PermissionAction.UPDATE)
        ) {
          rolePermissionsData.push({ roleId: inventoryRole.id, permissionId: p.id });
        }
      }

      await tx.rolePermission.createMany({
        data: rolePermissionsData,
      });

      // 5. Create the User under the Company
      const user = await tx.user.create({
        data: {
          name: userName,
          email: email.toLowerCase(),
          password: passwordHash,
          companyId: company.id,
        },
      });

      // 6. Assign User to OWNER role
      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: ownerRole.id,
        },
      });

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        company: {
          id: company.id,
          name: company.name,
        },
      };
    });
  }

  /**
   * Find all users belonging to the company, including their roles.
   */
  async findUsersByCompany(companyId: string) {
    return prisma.user.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        email: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  /**
   * Create a new user in the company and assign requested roles.
   */
  async createUserInCompany(
    companyId: string,
    name: string,
    email: string,
    passwordHash: string,
    roles: RoleType[]
  ) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          password: passwordHash,
          companyId,
        },
      });

      // Find company roles matching requested RoleType enums
      const dbRoles = await tx.role.findMany({
        where: {
          companyId,
          name: { in: roles },
        },
      });

      const userRolesData = dbRoles.map((r) => ({
        userId: user.id,
        roleId: r.id,
      }));

      await tx.userRole.createMany({
        data: userRolesData,
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        companyId: user.companyId,
        roles: dbRoles.map((r) => r.name),
      };
    });
  }

  /**
   * Update user details and roles under a specific company boundary.
   */
  async updateUserInCompany(
    companyId: string,
    userId: string,
    name?: string,
    email?: string,
    roles?: RoleType[]
  ) {
    return prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findFirst({
        where: { id: userId, companyId },
      });
      if (!existingUser) {
        throw new Error('User not found in this company');
      }

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          ...(name && { name }),
          ...(email && { email: email.toLowerCase() }),
        },
      });

      let updatedRoles: RoleType[] = [];
      if (roles) {
        // Clear previous role assignments
        await tx.userRole.deleteMany({
          where: { userId },
        });

        // Find new role records
        const dbRoles = await tx.role.findMany({
          where: {
            companyId,
            name: { in: roles },
          },
        });

        const userRolesData = dbRoles.map((r) => ({
          userId,
          roleId: r.id,
        }));

        await tx.userRole.createMany({
          data: userRolesData,
        });

        updatedRoles = dbRoles.map((r) => r.name);
      } else {
        const currentRoles = await tx.userRole.findMany({
          where: { userId },
          include: { role: true },
        });
        updatedRoles = currentRoles.map((ur) => ur.role.name);
      }

      return {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        roles: updatedRoles,
      };
    });
  }

  /**
   * Delete a user record and their role links.
   */
  async deleteUserInCompany(companyId: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findFirst({
        where: { id: userId, companyId },
      });
      if (!existingUser) {
        throw new Error('User not found in this company');
      }

      await tx.userRole.deleteMany({
        where: { userId },
      });

      await tx.user.delete({
        where: { id: userId },
      });

      return { message: 'User deleted successfully' };
    });
  }

  /**
   * Find all company roles with their current permissions.
   */
  async findRolesWithPermissions(companyId: string) {
    return prisma.role.findMany({
      where: { companyId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  /**
   * Overwrite and configure the permissions for a company role.
   */
  async updateRolePermissions(
    companyId: string,
    roleName: RoleType,
    permissions: { module: Module; action: PermissionAction }[]
  ) {
    return prisma.$transaction(async (tx) => {
      const role = await tx.role.findFirst({
        where: { companyId, name: roleName },
      });
      if (!role) {
        throw new Error(`Role ${roleName} not found in this company`);
      }

      // Clear existing permissions
      await tx.rolePermission.deleteMany({
        where: { roleId: role.id },
      });

      if (permissions.length === 0) {
        return { role: roleName, permissions: [] };
      }

      // Fetch the requested global permissions
      const dbPermissions = await tx.permission.findMany({
        where: {
          OR: permissions.map((p) => ({
            module: p.module,
            action: p.action,
          })),
        },
      });

      const rolePermissionsData = dbPermissions.map((p) => ({
        roleId: role.id,
        permissionId: p.id,
      }));

      if (rolePermissionsData.length > 0) {
        await tx.rolePermission.createMany({
          data: rolePermissionsData,
        });
      }

      return {
        role: roleName,
        permissions: dbPermissions.map((p) => ({
          module: p.module,
          action: p.action,
        })),
      };
    });
  }

  /**
   * Find all per-user permission overrides for a user.
   */
  async findUserOverrides(companyId: string, userId: string) {
    return prisma.userPermissionOverride.findMany({
      where: { userId, companyId },
      select: { module: true, field: true, action: true, allowed: true },
    });
  }

  /**
   * Batch upsert per-user permission overrides.
   * Uses transaction to delete existing overrides for changed fields then re-insert.
   */
  async upsertUserOverrides(
    companyId: string,
    userId: string,
    overrides: { module: string; field: string; action: string; allowed: boolean }[]
  ) {
    return prisma.$transaction(async (tx) => {
      for (const override of overrides) {
        await tx.userPermissionOverride.upsert({
          where: {
            userId_module_field_action: {
              userId,
              module: override.module,
              field: override.field,
              action: override.action,
            },
          },
          create: {
            userId,
            module: override.module,
            field: override.field,
            action: override.action,
            allowed: override.allowed,
            companyId,
          },
          update: {
            allowed: override.allowed,
          },
        });
      }

      return tx.userPermissionOverride.findMany({
        where: { userId, companyId },
        select: { module: true, field: true, action: true, allowed: true },
      });
    });
  }

  /**
   * Delete all per-user permission overrides (reset to role defaults).
   */
  async deleteUserOverrides(companyId: string, userId: string) {
    return prisma.userPermissionOverride.deleteMany({
      where: { userId, companyId },
    });
  }
}
