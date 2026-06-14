import { fetchApi } from './api';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    roles: string[];
  };
}

export interface RegisterResponse {
  user: {
    id: string;
    name: string;
    email: string;
  };
  company: {
    id: string;
    name: string;
  };
}

export async function loginUser(email: string, password: string): Promise<LoginResponse> {
  return fetchApi('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
  companyName: string;
}): Promise<RegisterResponse> {
  return fetchApi('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

export interface ManagedRole {
  role: string;
  permissions: {
    module: string;
    action: string;
  }[];
}

export async function getUsers(): Promise<ManagedUser[]> {
  return fetchApi('/auth/users');
}

export async function addUser(data: {
  name: string;
  email: string;
  password: string;
  roles: string[];
}): Promise<ManagedUser> {
  return fetchApi('/auth/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateUser(
  id: string,
  data: {
    name?: string;
    email?: string;
    roles?: string[];
  }
): Promise<ManagedUser> {
  return fetchApi(`/auth/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteUser(id: string): Promise<{ message: string }> {
  return fetchApi(`/auth/users/${id}`, {
    method: 'DELETE',
  });
}

export async function getRoles(): Promise<ManagedRole[]> {
  return fetchApi('/auth/roles');
}

export async function updateRolePermissions(
  roleName: string,
  permissions: { module: string; action: string }[]
): Promise<ManagedRole> {
  return fetchApi(`/auth/roles/${roleName}/permissions`, {
    method: 'PUT',
    body: JSON.stringify({ permissions }),
  });
}

export interface RoleMatrixResponse {
  matrix: { module: string; action: string; admin: string; user: string; none: string }[];
  fieldPermissions: Record<string, Record<string, { field: string; create: string; view: string; edit: string; delete: string }[]>>;
}

export async function getRoleMatrix(): Promise<RoleMatrixResponse> {
  return fetchApi('/roles/matrix');
}

export async function updateUserRole(
  userId: string,
  roles: string[]
): Promise<{ id: string; name: string; email: string; roles: string[] }> {
  return fetchApi(`/users/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ roles }),
  });
}

export interface UserPermissionOverride {
  module: string;
  field: string;
  action: string;
  allowed: boolean;
}

export async function getUserOverrides(userId: string): Promise<UserPermissionOverride[]> {
  return fetchApi(`/auth/users/${userId}/overrides`);
}

export async function setUserOverrides(
  userId: string,
  overrides: UserPermissionOverride[]
): Promise<UserPermissionOverride[]> {
  return fetchApi(`/auth/users/${userId}/overrides`, {
    method: 'PUT',
    body: JSON.stringify({ overrides }),
  });
}

export async function resetUserOverrides(userId: string): Promise<{ message: string }> {
  return fetchApi(`/auth/users/${userId}/overrides`, {
    method: 'DELETE',
  });
}
