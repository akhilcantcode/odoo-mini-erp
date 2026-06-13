'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  getUsers,
  getRoles,
  addUser,
  updateUser,
  deleteUser,
  updateRolePermissions,
  ManagedUser,
  ManagedRole
} from '../../../services/auth';
import { useToast } from '../layout';
import { Btn, Card, Input, Select } from '../../../components/ui';
import { RefreshCw, Plus, Check, Trash } from 'lucide-react';

export default function UsersPage() {
  const toast = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'roles'>('users');
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [roles, setRoles] = useState<ManagedRole[]>([]);
  const [loading, setLoading] = useState(true);

  // User Form State
  const [showUserForm, setShowUserForm] = useState(false);
  const [uName, setUName] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uPassword, setUPassword] = useState('');
  const [uRoles, setURoles] = useState<string[]>([]);
  const [savingUser, setSavingUser] = useState(false);

  // Edit User State
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Role Mappings State
  const [selectedRoleName, setSelectedRoleName] = useState<string>('SALES');
  const [savingRole, setSavingRole] = useState(false);

  // List of all possible modules and actions
  const ALL_MODULES = ['PRODUCT', 'SALES', 'PURCHASE', 'MANUFACTURING', 'INVENTORY', 'AUDIT'];
  const ALL_ACTIONS = ['READ', 'CREATE', 'UPDATE', 'DELETE'];

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [u, r] = await Promise.all([getUsers(), getRoles()]);
      setUsers(u);
      setRoles(r);
    } catch {
      /* swallow */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uRoles.length === 0) {
      toast('Please assign at least one role to the user', 'error');
      return;
    }
    setSavingUser(true);
    try {
      if (editingUserId) {
        await updateUser(editingUserId, { name: uName, email: uEmail, roles: uRoles });
        toast('User updated successfully', 'success');
      } else {
        await addUser({ name: uName, email: uEmail, password: uPassword, roles: uRoles });
        toast('User created successfully', 'success');
      }
      setShowUserForm(false);
      setEditingUserId(null);
      setUName('');
      setUEmail('');
      setUPassword('');
      setURoles([]);
      refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to save user', 'error');
    }
    setSavingUser(false);
  };

  const handleEditClick = (user: ManagedUser) => {
    setEditingUserId(user.id);
    setUName(user.name);
    setUEmail(user.email);
    setUPassword(''); // leave empty
    setURoles(user.roles);
    setShowUserForm(true);
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await deleteUser(id);
      toast('User deleted successfully', 'success');
      refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to delete user', 'error');
    }
  };

  const toggleRoleCheckbox = (role: string) => {
    setURoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  };

  // Roles & Permissions state
  const selectedRole = roles.find((r) => r.role === selectedRoleName);
  const isPermissionChecked = (module: string, action: string) => {
    if (!selectedRole) return false;
    return selectedRole.permissions.some((p) => p.module === module && p.action === action);
  };

  const handleTogglePermission = async (module: string, action: string) => {
    if (!selectedRole) return;
    const isChecked = isPermissionChecked(module, action);
    let newPerms = [...selectedRole.permissions];
    if (isChecked) {
      newPerms = newPerms.filter((p) => !(p.module === module && p.action === action));
    } else {
      newPerms.push({ module, action });
    }

    // Update locally first for fast response
    setRoles((prev) => prev.map((r) => (r.role === selectedRoleName ? { ...r, permissions: newPerms } : r)));
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setSavingRole(true);
    try {
      await updateRolePermissions(selectedRoleName, selectedRole.permissions);
      toast('Permissions updated successfully', 'success');
      refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to update permissions', 'error');
    }
    setSavingRole(false);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Users & Permissions</h2>
        <Btn variant="ghost" size="sm" onClick={refresh}>
          <RefreshCw size={14} />
        </Btn>
      </div>

      {/* Sub-tabs toggle */}
      <div className="flex border-b border-gray-100 mb-4">
        <button
          onClick={() => setActiveSubTab('users')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition cursor-pointer ${
            activeSubTab === 'users' ? 'border-sky-500 text-sky-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Users List
        </button>
        <button
          onClick={() => setActiveSubTab('roles')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition cursor-pointer ${
            activeSubTab === 'roles' ? 'border-sky-500 text-sky-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Role Permissions
        </button>
      </div>

      {activeSubTab === 'users' ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Btn
              size="sm"
              onClick={() => {
                setEditingUserId(null);
                setUName('');
                setUEmail('');
                setUPassword('');
                setURoles([]);
                setShowUserForm(!showUserForm);
              }}
            >
              <Plus size={14} /> Add User
            </Btn>
          </div>

          {showUserForm && (
            <Card className="p-5 animate-fade-in">
              <form onSubmit={handleAddUser} className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-800">{editingUserId ? 'Edit User' : 'Create User'}</h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input label="Name" value={uName} onChange={(e) => setUName(e.target.value)} required />
                  <Input label="Email" type="email" value={uEmail} onChange={(e) => setUEmail(e.target.value)} required />
                  {!editingUserId && (
                    <Input
                      label="Password"
                      type="password"
                      value={uPassword}
                      onChange={(e) => setUPassword(e.target.value)}
                      required
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500">Assign Roles</label>
                  <div className="flex gap-4 flex-wrap">
                    {['OWNER', 'ADMIN', 'SALES', 'PURCHASE', 'MANUFACTURING', 'INVENTORY'].map((r) => (
                      <label key={r} className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={uRoles.includes(r)}
                          onChange={() => toggleRoleCheckbox(r)}
                          className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                        />
                        {r}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Btn type="button" variant="secondary" onClick={() => setShowUserForm(false)}>
                    Cancel
                  </Btn>
                  <Btn type="submit" disabled={savingUser}>
                    {savingUser ? <RefreshCw size={14} className="animate-spin-slow" /> : <Check size={14} />} Save User
                  </Btn>
                </div>
              </form>
            </Card>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <RefreshCw size={20} className="animate-spin-slow text-sky-500" />
            </div>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/80 text-left text-xs text-gray-500 font-medium">
                      <th className="px-5 py-3">Name</th>
                      <th className="px-5 py-3">Email</th>
                      <th className="px-5 py-3">Roles</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-sky-50/30 transition">
                        <td className="px-5 py-3 font-medium text-gray-800">{u.name}</td>
                        <td className="px-5 py-3 text-gray-600">{u.email}</td>
                        <td className="px-5 py-3">
                          <div className="flex gap-1 flex-wrap">
                            {u.roles.map((r) => (
                              <span
                                key={r}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-sky-50 text-sky-700"
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="inline-flex gap-2">
                            <Btn variant="ghost" size="sm" onClick={() => handleEditClick(u)}>
                              Edit
                            </Btn>
                            <Btn variant="danger" size="sm" onClick={() => handleDeleteUser(u.id)}>
                              Delete
                            </Btn>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      ) : (
        /* Roles and Permissions Tab */
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-64">
              <Select label="Role to Configure" value={selectedRoleName} onChange={(e) => setSelectedRoleName(e.target.value)}>
                {['OWNER', 'ADMIN', 'SALES', 'PURCHASE', 'MANUFACTURING', 'INVENTORY'].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </div>
            <Btn size="sm" className="mt-5" onClick={handleSavePermissions} disabled={savingRole}>
              {savingRole ? <RefreshCw size={14} className="animate-spin-slow" /> : <Check size={14} />} Save Role
              Permissions
            </Btn>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <RefreshCw size={20} className="animate-spin-slow text-sky-500" />
            </div>
          ) : (
            <Card className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {ALL_MODULES.map((module) => (
                  <div key={module} className="border border-gray-100 rounded-xl p-4 bg-gray-50/30 space-y-2">
                    <p className="text-sm font-semibold text-gray-800 border-b border-gray-100 pb-1.5">{module}</p>
                    <div className="flex flex-col gap-1.5 pt-1">
                      {ALL_ACTIONS.map((action) => {
                        const checked = isPermissionChecked(module, action);
                        const disabled = selectedRoleName === 'OWNER' || selectedRoleName === 'ADMIN';
                        return (
                          <label
                            key={action}
                            className={`flex items-center gap-2 text-xs font-medium cursor-pointer ${
                              disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={disabled}
                              onChange={() => handleTogglePermission(module, action)}
                              className="rounded border-gray-300 text-sky-600 focus:ring-sky-500 disabled:opacity-50"
                            />
                            {action}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {(selectedRoleName === 'OWNER' || selectedRoleName === 'ADMIN') && (
                <p className="text-xs text-amber-600 font-medium mt-4 bg-amber-50 border border-amber-100 rounded-lg p-2.5">
                  Note: OWNER and ADMIN roles are pre-configured with full permissions across all modules and cannot be
                  edited.
                </p>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
