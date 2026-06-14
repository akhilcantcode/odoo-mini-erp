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
  ManagedRole,
  getRoleMatrix,
  updateUserRole,
  RoleMatrixResponse,
  getUserOverrides,
  setUserOverrides,
  resetUserOverrides,
  UserPermissionOverride,
} from '../../../services/auth';
import { useToast } from '../layout';
import { Btn, Card, Input, Select, EmptyState } from '../../../components/ui';
import {
  RefreshCw, Plus, Check, Trash, Mail, Phone, MapPin, X, Pencil,
  Shield, CheckSquare, XSquare, Info, ShieldAlert, Award,
  Users, UserCheck, UserCog, Search, Lock, LayoutGrid, List, Eye, EyeOff
} from 'lucide-react';

const OVERALL_MATRIX = [
  { module: 'Sales', action: 'View', admin: '✓', user: '✓', none: 'Optional' },
  { module: 'Sales', action: 'Create', admin: '✓', user: '✓', none: '✗' },
  { module: 'Sales', action: 'Edit', admin: '✓', user: 'Limited', none: '✗' },
  { module: 'Sales', action: 'Delete', admin: '✓', user: '✗', none: '✗' },
  { module: 'Sales', action: 'Approve(Confirm)', admin: '✓', user: '✗', none: '✗' },
  { module: 'Purchase', action: 'View', admin: '✓', user: '✓', none: 'Optional' },
  { module: 'Purchase', action: 'Approve', admin: '✓', user: '✗', none: '✗' },
  { module: 'Purchase', action: 'Edit', admin: '✓', user: 'Limited', none: '✗' },
  { module: 'Purchase', action: 'Create', admin: '✓', user: '✓', none: '✗' },
  { module: 'Manufacturing', action: 'Production Entry', admin: '✓', user: '✓', none: '✗' },
  { module: 'Manufacturing', action: 'Edit BOM', admin: '✓', user: '✗', none: '✗' },
  { module: 'Manufacturing', action: 'View', admin: '✓', user: '✓', none: 'Optional' },
  { module: 'Product', action: 'View', admin: '✓', user: '✓', none: 'Optional' },
  { module: 'Product', action: 'Create', admin: '✓', user: '✓', none: '✗' },
  { module: 'Product', action: 'Edit', admin: '✓', user: 'Limited', none: '✗' },
];

const getPositionFromRoles = (roles: string[]): string => {
  if (roles.includes('OWNER') || roles.includes('ADMIN')) return 'System Administrator';
  if (roles.includes('SALES')) return 'Sales Manager';
  if (roles.includes('PURCHASE')) return 'Purchase Manager';
  if (roles.includes('MANUFACTURING')) return 'Production Manager';
  if (roles.includes('INVENTORY')) return 'Inventory Manager';
  return 'Standard User';
};

const getRolesFromPosition = (position: string): string[] => {
  switch (position) {
    case 'System Administrator': return ['ADMIN'];
    case 'Sales Manager': return ['SALES'];
    case 'Purchase Manager': return ['PURCHASE'];
    case 'Production Manager': return ['MANUFACTURING'];
    case 'Inventory Manager': return ['INVENTORY'];
    default: return ['SALES'];
  }
};

interface PermissionRow {
  field: string;
  create: string | boolean;
  view: string | boolean;
  edit: string | boolean;
  delete: string | boolean;
}

const getFieldPermissions = (position: string, module: 'sales' | 'purchase' | 'manufacturing' | 'product'): PermissionRow[] => {
  const isAdmin = position === 'System Administrator';

  if (module === 'sales') {
    return [
      { field: 'Customer', create: true, view: true, edit: true, delete: true },
      { field: 'Customer Address', create: true, view: true, edit: true, delete: true },
      { field: 'Sales Person', create: true, view: true, edit: true, delete: true },
      { field: 'Product', create: true, view: true, edit: true, delete: true },
      { field: 'Ordered Quantity', create: true, view: true, edit: true, delete: true },
      { field: 'Delivered Quantity', create: true, view: true, edit: true, delete: true },
      { field: 'Sales Price', create: true, view: true, edit: true, delete: true },
      { field: 'Status', create: true, view: true, edit: true, delete: false },
      { field: 'Total', create: true, view: true, edit: 'Recomputed', delete: 'Recomputed' },
      { field: 'Creation Date', create: 'Auto Compute', view: true, edit: false, delete: false },
    ].map(row => {
      if (!isAdmin && position !== 'Sales Manager') {
        return {
          ...row,
          create: false,
          edit: false,
          delete: false,
          view: position === 'Purchase Manager' || position === 'Production Manager'
        };
      }
      return row;
    });
  }

  if (module === 'purchase') {
    return [
      { field: 'Vendor', create: true, view: true, edit: true, delete: true },
      { field: 'Vendor Address', create: true, view: true, edit: true, delete: true },
      { field: 'Responsible Person', create: true, view: true, edit: true, delete: true },
      { field: 'Product', create: true, view: true, edit: true, delete: true },
      { field: 'Ordered Quantity', create: true, view: true, edit: true, delete: true },
      { field: 'Received Quantity', create: true, view: true, edit: true, delete: true },
      { field: 'Cost Price', create: true, view: true, edit: true, delete: true },
      { field: 'Total', create: true, view: true, edit: 'Auto Recomputed', delete: 'Auto Recomputed' },
      { field: 'Creation Date', create: 'Auto Compute', view: true, edit: false, delete: false },
    ].map(row => {
      if (!isAdmin && position !== 'Purchase Manager' && position !== 'Sales Manager') {
        return {
          ...row,
          create: false,
          edit: false,
          delete: false,
          view: position === 'Production Manager'
        };
      }
      return row;
    });
  }

  if (module === 'manufacturing') {
    return [
      { field: 'Product to Manufacture', create: true, view: true, edit: true, delete: true },
      { field: 'Product Quantity', create: true, view: true, edit: true, delete: true },
      { field: 'BoM', create: true, view: true, edit: true, delete: true },
      { field: 'Responsible Person', create: true, view: true, edit: true, delete: true },
      { field: 'Finished Quantity', create: true, view: true, edit: true, delete: true },
      { field: 'Creation Date', create: 'Auto Compute', view: true, edit: false, delete: false },
    ].map(row => {
      if (!isAdmin && position !== 'Production Manager' && position !== 'Sales Manager') {
        return {
          ...row,
          create: false,
          edit: false,
          delete: false,
          view: position === 'Purchase Manager'
        };
      }
      return row;
    });
  }

  // product module
  return [
    { field: 'Product', create: true, view: true, edit: true, delete: true },
    { field: 'Sales Price', create: true, view: true, edit: true, delete: true },
    { field: 'Cost Price', create: true, view: true, edit: true, delete: true },
    { field: 'On Hand Qty', create: true, view: true, edit: false, delete: false },
    { field: 'Free To Use Qty', create: true, view: true, edit: false, delete: false },
    { field: 'Procure On Demand', create: 'Not Possible', view: true, edit: true, delete: true },
    { field: 'Procurement Method', create: 'Not Possible', view: true, edit: true, delete: true },
    { field: 'Vendor', create: true, view: true, edit: true, delete: true },
    { field: 'Bill of Materials (BoM)', create: true, view: true, edit: true, delete: true },
  ].map(row => {
    if (!isAdmin && position !== 'Sales Manager' && position !== 'Purchase Manager' && position !== 'Production Manager' && position !== 'Inventory Manager') {
      return {
        ...row,
        create: false,
        edit: false,
        delete: false,
        view: false
      };
    }
    return row;
  });
};

export default function UsersPage() {
  const toast = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'roles'>('users');
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [roles, setRoles] = useState<ManagedRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [showSearchBar, setShowSearchBar] = useState(true);

  // User Form State (Simple create/add)
  const [showUserForm, setShowUserForm] = useState(false);
  const [uName, setUName] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uPassword, setUPassword] = useState('');
  const [uRoles, setURoles] = useState<string[]>([]);
  const [savingUser, setSavingUser] = useState(false);
  const [suggestedPassword, setSuggestedPassword] = useState('');
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Edit User State
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (showUserForm && !editingUserId && uName.trim().length >= 2 && uEmail.includes('@')) {
      if (!suggestedPassword) {
        const randomNum = Math.floor(Math.random() * 10);
        const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
        const specialChars = '!@#$%^&*';
        const randomSpecial = specialChars[Math.floor(Math.random() * specialChars.length)];
        setSuggestedPassword(`${uName.split(' ')[0]}${randomPart}${randomNum}${randomSpecial}`);
      }
    } else {
      setSuggestedPassword('');
      setShowSuggestion(false);
    }
  }, [uName, uEmail, showUserForm, editingUserId, suggestedPassword]);

  // Form View detail modal state (Drawings 2-5)
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<ManagedUser | null>(null);
  const [formViewPosition, setFormViewPosition] = useState<string>('Sales Manager');
  const [activeFormViewTab, setActiveFormViewTab] = useState<'sales' | 'purchase' | 'manufacturing' | 'product' | 'inventory'>('sales');
  const [backendMatrix, setBackendMatrix] = useState<RoleMatrixResponse | null>(null);

  // Per-user permission overrides
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [userOverrides, setUserOverrides_State] = useState<UserPermissionOverride[]>([]);
  const [pendingOverrides, setPendingOverrides] = useState<UserPermissionOverride[]>([]);
  const [loadingOverrides, setLoadingOverrides] = useState(false);
  const [savingOverrides, setSavingOverrides] = useState(false);
  const [hasOverrideChanges, setHasOverrideChanges] = useState(false);

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
      const [u, r, m] = await Promise.all([getUsers(), getRoles(), getRoleMatrix()]);
      setUsers(u);
      setRoles(r);
      setBackendMatrix(m);
      setLastSyncTime(new Date());
    } catch (err) {
      console.error('Failed to load RBAC configuration', err);
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
    setSelectedUserForDetail(user);
    setFormViewPosition(getPositionFromRoles(user.roles));
    setActiveFormViewTab('sales');
    setUserOverrides_State([]);
    setPendingOverrides([]);
    setHasOverrideChanges(false);
    // Load existing overrides for this user
    setLoadingOverrides(true);
    getUserOverrides(user.id)
      .then((data) => {
        setUserOverrides_State(data);
        setPendingOverrides(data);
      })
      .catch(() => {})
      .finally(() => setLoadingOverrides(false));
  };

  const getOverrideForCell = (module: string, field: string, action: string): UserPermissionOverride | undefined => {
    return pendingOverrides.find(
      (o) => o.module === module && o.field.toLowerCase() === field.toLowerCase() && o.action === action
    );
  };

  const isSystemField = (val: string | boolean): boolean => {
    if (typeof val === 'boolean') return false;
    const locked = ['Auto Compute', 'Auto Computed', 'Auto Recomputed', 'Recomputed', 'Not Possible', 'Read Only'];
    return locked.includes(val);
  };

  const handleToggleOverride = (module: string, field: string, action: string, currentVal: string | boolean) => {
    // Determine the role-default value for this cell
    const roleDefault = currentVal === true || currentVal === '✓';
    // Check if there's already a pending override
    const existingIdx = pendingOverrides.findIndex(
      (o) => o.module === module && o.field.toLowerCase() === field.toLowerCase() && o.action === action
    );
    const currentEffective = existingIdx >= 0 ? pendingOverrides[existingIdx].allowed : roleDefault;
    const newAllowed = !currentEffective;
    let newOverrides: UserPermissionOverride[];
    if (existingIdx >= 0) {
      // Update existing pending override
      newOverrides = pendingOverrides.map((o, i) =>
        i === existingIdx ? { ...o, allowed: newAllowed } : o
      );
    } else {
      // Add new pending override
      newOverrides = [...pendingOverrides, { module, field, action, allowed: newAllowed }];
    }
    setPendingOverrides(newOverrides);
    setHasOverrideChanges(true);
  };

  const handleSaveOverrides = async () => {
    if (!selectedUserForDetail) return;
    setSavingOverrides(true);
    try {
      const saved = await setUserOverrides(selectedUserForDetail.id, pendingOverrides);
      setUserOverrides_State(saved);
      setPendingOverrides(saved);
      setHasOverrideChanges(false);
      toast('Permissions saved successfully', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to save permissions', 'error');
    }
    setSavingOverrides(false);
  };

  const handleResetOverrides = async () => {
    if (!selectedUserForDetail) return;
    if (!confirm('Reset all custom permissions to role defaults?')) return;
    setSavingOverrides(true);
    try {
      await resetUserOverrides(selectedUserForDetail.id);
      setUserOverrides_State([]);
      setPendingOverrides([]);
      setHasOverrideChanges(false);
      toast('Permissions reset to role defaults', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to reset permissions', 'error');
    }
    setSavingOverrides(false);
  };

  const handleSaveUserPosition = async () => {
    if (!selectedUserForDetail) return;
    setSavingUser(true);
    try {
      const backendRoles = getRolesFromPosition(formViewPosition);
      await updateUserRole(selectedUserForDetail.id, backendRoles);
      toast('User position updated successfully', 'success');
      setSelectedUserForDetail(null);
      refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to update position', 'error');
    }
    setSavingUser(false);
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

  const renderMatrixCell = (val: string) => {
    if (val === '✓') {
      return (
        <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-emerald-100 text-emerald-700 text-xs font-bold shadow-sm">
          ✓
        </span>
      );
    }
    if (val === '✗') {
      return (
        <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-red-100 text-red-700 text-xs font-bold shadow-sm">
          ✗
        </span>
      );
    }
    if (val === 'Limited') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 uppercase tracking-wider">
          Limited
        </span>
      );
    }
    if (val === 'Optional') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100 uppercase tracking-wider">
          Optional
        </span>
      );
    }
    return <span className="text-gray-400 text-xs">{val}</span>;
  };

  const renderPermissionCell = (val: string | boolean) => {
    if (val === true || val === '✓') {
      return (
        <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-emerald-100 text-emerald-700 text-xs font-bold shadow-sm">
          ✓
        </span>
      );
    }
    if (val === false || val === '✗') {
      return (
        <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-red-100 text-red-700 text-xs font-bold shadow-sm">
          ✗
        </span>
      );
    }
    let bg = 'bg-gray-100 text-gray-600 border border-gray-200';
    if (val === 'Recomputed' || val === 'Auto Computed' || val === 'Auto Recomputed' || val === 'Auto Compute') {
      bg = 'bg-blue-50 text-blue-600 border border-blue-100';
    } else if (val === 'Not Possible') {
      bg = 'bg-rose-50 text-rose-600 border border-rose-100';
    } else if (val === 'Read Only') {
      bg = 'bg-amber-50 text-amber-600 border border-amber-100';
    }
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${bg}`}>
        {val}
      </span>
    );
  };

  // Generate initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate a consistent color based on name
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-100 text-blue-700',
      'bg-purple-100 text-purple-700',
      'bg-emerald-100 text-emerald-700',
      'bg-amber-100 text-amber-700',
      'bg-rose-100 text-rose-700',
      'bg-cyan-100 text-cyan-700',
      'bg-indigo-100 text-indigo-700',
      'bg-teal-100 text-teal-700',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Format sync time
  const formatSyncTime = () => {
    if (!lastSyncTime) return '';
    const now = new Date();
    const diffMs = now.getTime() - lastSyncTime.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 5) return 'just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    return `${diffMin}m ago`;
  };

  // Role color badge
  const getRoleBadgeColor = (role: string) => {
    const map: Record<string, string> = {
      OWNER: 'bg-amber-50 text-amber-700 border-amber-200',
      ADMIN: 'bg-red-50 text-red-700 border-red-200',
      SALES: 'bg-blue-50 text-blue-700 border-blue-200',
      PURCHASE: 'bg-purple-50 text-purple-700 border-purple-200',
      MANUFACTURING: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      INVENTORY: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      INVENTORY_MANAGER: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      BUSINESS_OWNER: 'bg-amber-50 text-amber-700 border-amber-200',
    };
    return map[role] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  // Computed stats
  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.roles.includes('ADMIN') || u.roles.includes('OWNER')).length;
  const managerCount = users.filter((u) =>
    u.roles.includes('SALES') || u.roles.includes('PURCHASE') || u.roles.includes('MANUFACTURING') || u.roles.includes('INVENTORY')
  ).length;
  const totalRoles = roles.length;

  // Search filter
  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.roles.some((r) => r.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderUserKanbanCard = (u: ManagedUser) => {
    const initials = getInitials(u.name);
    const avatarColor = getAvatarColor(u.name);
    const position = getPositionFromRoles(u.roles);

    return (
      <div
        key={u.id}
        className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-sky-300 transition-all duration-200 flex flex-col justify-between min-h-[180px] group relative"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${avatarColor} flex-shrink-0`}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-bold text-gray-900 text-sm block leading-tight truncate">
                {u.name}
              </span>
              <span className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5 truncate font-medium">
                <Mail size={12} className="text-gray-400 flex-shrink-0" />
                {u.email}
              </span>
            </div>
          </div>

          <div className="flex gap-1 flex-wrap pt-1.5 border-t border-gray-50">
            {u.roles.map((r) => (
              <span
                key={r}
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${getRoleBadgeColor(r)}`}
              >
                {r}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">
            {position}
          </span>
          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Btn variant="ghost" size="sm" onClick={() => handleEditClick(u)} title="Edit user permissions">
              <Pencil size={13} />
            </Btn>
            <Btn variant="danger" size="sm" onClick={() => handleDeleteUser(u.id)} title="Delete user">
              <Trash size={13} />
            </Btn>
          </div>
        </div>
      </div>
    );
  };

  // Stat cards config
  const statCards = [
    {
      label: 'TOTAL USERS',
      value: totalUsers,
      sub: 'Registered accounts',
      icon: <Users size={18} />,
      iconBg: 'bg-blue-50 text-blue-500',
      borderColor: 'border-blue-100',
    },
    {
      label: 'ADMINISTRATORS',
      value: adminCount,
      sub: 'Full system access',
      icon: <ShieldAlert size={18} />,
      iconBg: 'bg-red-50 text-red-500',
      borderColor: 'border-red-100',
    },
    {
      label: 'MANAGERS',
      value: managerCount,
      sub: 'Department leads',
      icon: <UserCheck size={18} />,
      iconBg: 'bg-emerald-50 text-emerald-500',
      borderColor: 'border-emerald-100',
    },
    {
      label: 'ACTIVE ROLES',
      value: totalRoles,
      sub: 'Permission groups',
      icon: <Lock size={18} />,
      iconBg: 'bg-violet-50 text-violet-500',
      borderColor: 'border-violet-100',
    },
  ];

  return (
    <>
      <div className="space-y-5 animate-fade-in">
        {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-100">
            <Shield size={22} className="text-sky-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Users & Permissions</h2>
            <p className="text-xs text-gray-400 mt-0.5">Manage user accounts, role assignments, and access controls.</p>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card, idx) => (
          <div
            key={card.label}
            className={`relative overflow-hidden bg-white rounded-xl border ${card.borderColor} p-4 hover:shadow-md transition-all duration-300 group`}
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            <div className="flex items-start justify-between mb-2">
              <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">{card.label}</p>
              <div className={`p-1.5 rounded-lg ${card.iconBg} transition-transform duration-300 group-hover:scale-110`}>
                {card.icon}
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 tracking-tight">{card.value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{card.sub}</p>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
          </div>
        ))}
      </div>

      {/* ── Sub-tabs toggle ── */}
      <div className="flex items-center justify-between">
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveSubTab('users')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition cursor-pointer ${
              activeSubTab === 'users' ? 'border-sky-500 text-sky-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Users size={14} />
              Users List
            </span>
          </button>
          <button
            onClick={() => setActiveSubTab('roles')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition cursor-pointer ${
              activeSubTab === 'roles' ? 'border-sky-500 text-sky-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Shield size={14} />
              Role Permissions
            </span>
          </button>
        </div>
        {activeSubTab === 'users' && (
          <div className="flex items-center gap-2">
            <Btn variant={showSearchBar ? "primary" : "secondary"} size="sm" onClick={() => setShowSearchBar(!showSearchBar)} title="Toggle search bar">
              <Search size={14} />
            </Btn>
            <Btn variant="secondary" size="sm" onClick={() => setViewMode(viewMode === 'list' ? 'kanban' : 'list')} title={viewMode === 'list' ? 'Switch to Kanban' : 'Switch to List'}>
              {viewMode === 'list' ? <LayoutGrid size={14} /> : <List size={14} />}
              <span className="ml-1 hidden sm:inline">{viewMode === 'list' ? 'Kanban' : 'List'}</span>
            </Btn>
            <Btn size="sm" onClick={() => {
              setEditingUserId(null);
              setUName('');
              setUEmail('');
              setUPassword('');
              setURoles([]);
              setShowUserForm(!showUserForm);
            }}>
              <Plus size={14} /> Add User
            </Btn>
          </div>
        )}
      </div>

      {activeSubTab === 'users' ? (
        <div className="space-y-4">
          {/* ── Search & Sync Row ── */}
          {showSearchBar && (
            <div className="flex items-center justify-between animate-fade-in bg-gray-50/50 p-3 rounded-xl border border-gray-100">
              <div className="relative w-80">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users, emails, roles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition placeholder:text-gray-400 shadow-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Synced {formatSyncTime()} · {filteredUsers.length} of {users.length} users
              </div>
            </div>
          )}

          {/* ── Create Form ── */}
          {showUserForm && (
            <Card className="p-5 animate-fade-in border-sky-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
                  <Plus size={16} />
                </div>
                <h3 className="text-sm font-semibold text-gray-800">{editingUserId ? 'Edit User' : 'Create User'}</h3>
              </div>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input label="Name" value={uName} onChange={(e) => setUName(e.target.value)} required />
                  <Input label="Email" type="email" value={uEmail} onChange={(e) => setUEmail(e.target.value)} required />
                  {!editingUserId && (
                    <div className="relative">
                      <Input 
                        label="Password" 
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••" 
                        value={uPassword} 
                        onChange={e => {
                          setUPassword(e.target.value);
                          setShowSuggestion(false);
                        }}
                        onFocus={() => {
                          if (suggestedPassword && !uPassword) {
                            setShowSuggestion(true);
                          }
                        }}
                        onBlur={() => setTimeout(() => setShowSuggestion(false), 200)}
                        required 
                      />
                      <button
                        type="button"
                        className="absolute right-3 bottom-2.5 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                      >
                        {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                      
                      {/* Google-like Password Suggestion Popover */}
                      {showSuggestion && (
                        <div className="absolute top-[calc(100%+4px)] left-0 w-full z-50 bg-white border border-gray-200 rounded-lg shadow-xl shadow-sky-900/10 p-1.5 animate-fade-in origin-top">
                          <div className="flex items-start gap-3 p-2 hover:bg-sky-50/80 rounded-md cursor-pointer transition-colors"
                               onMouseDown={(e) => {
                                 e.preventDefault(); // Prevents input blur from firing before click
                                 setUPassword(suggestedPassword);
                                 setShowSuggestion(false);
                               }}>
                            <div className="mt-0.5 w-6 h-6 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                            </div>
                            <div>
                              <p className="text-[13px] font-semibold text-gray-900 leading-none">Use suggested password</p>
                              <p className="text-sm font-mono text-gray-700 mt-1.5 tracking-wide">{suggestedPassword}</p>
                              <p className="text-[10px] text-gray-400 mt-1 leading-tight">Mini ERP will securely save this strong password for this user.</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
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

          {/* ── Users Table ── */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <RefreshCw size={24} className="animate-spin-slow text-sky-500" />
              <p className="text-sm text-gray-400">Loading users…</p>
            </div>
          ) : users.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Users size={20} />}
                title="No users"
                description="Add your first user to get started."
              />
            </Card>
          ) : filteredUsers.length === 0 ? (
            <Card>
              <EmptyState icon={<Search size={20} />} title="No results" description={`No users match "${searchQuery}"`} />
            </Card>
          ) : viewMode === 'list' ? (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50/80 to-gray-50/40 text-left text-xs text-gray-500 font-semibold uppercase tracking-wider border-b border-gray-100">
                      <th className="px-5 py-3.5">User</th>
                      <th className="px-5 py-3.5">Email</th>
                      <th className="px-5 py-3.5">Position</th>
                      <th className="px-5 py-3.5">Roles</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredUsers.map((u, idx) => {
                      const initials = getInitials(u.name);
                      const avatarColor = getAvatarColor(u.name);
                      const position = getPositionFromRoles(u.roles);

                      return (
                        <tr
                          key={u.id}
                          className="hover:bg-sky-50/30 transition-colors duration-150 group"
                          style={{ animationDelay: `${idx * 30}ms` }}
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${avatarColor} transition-transform duration-200 group-hover:scale-105 flex-shrink-0`}
                              >
                                {initials}
                              </div>
                              <p className="font-semibold text-gray-900 leading-tight">{u.name}</p>
                            </div>
                          </td>

                          <td className="px-5 py-3.5">
                            <span className="text-gray-600 flex items-center gap-1.5">
                              <Mail size={12} className="text-gray-400" />
                              {u.email}
                            </span>
                          </td>

                          <td className="px-5 py-3.5">
                            <span className="text-xs font-medium text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                              {position}
                            </span>
                          </td>

                          <td className="px-5 py-3.5">
                            <div className="flex gap-1 flex-wrap">
                              {u.roles.map((r) => (
                                <span
                                  key={r}
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(r)}`}
                                >
                                  {r}
                                </span>
                              ))}
                            </div>
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            <div className="inline-flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <Btn variant="ghost" size="sm" onClick={() => handleEditClick(u)} title="Edit user permissions">
                                <Pencil size={13} />
                              </Btn>
                              <Btn variant="danger" size="sm" onClick={() => handleDeleteUser(u.id)} title="Delete user">
                                <Trash size={13} />
                              </Btn>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in w-full">
              {filteredUsers.map((u) => renderUserKanbanCard(u))}
            </div>
          )}
        </div>
      ) : (
        /* ── Roles and Permissions Tab ── */
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
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <RefreshCw size={24} className="animate-spin-slow text-sky-500" />
              <p className="text-sm text-gray-400">Loading permissions…</p>
            </div>
          ) : (
            <Card className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {ALL_MODULES.map((module) => (
                  <div key={module} className="border border-gray-100 rounded-xl p-4 bg-gray-50/30 space-y-2 hover:shadow-sm transition-shadow duration-200">
                    <div className="flex items-center gap-2 border-b border-gray-100 pb-1.5">
                      <div className="p-1 rounded-md bg-sky-50 text-sky-600">
                        <Shield size={12} />
                      </div>
                      <p className="text-sm font-semibold text-gray-800">{module}</p>
                    </div>
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
                <p className="text-xs text-amber-600 font-medium mt-4 bg-amber-50 border border-amber-100 rounded-lg p-2.5 flex items-center gap-2">
                  <Info size={14} />
                  Note: OWNER and ADMIN roles are pre-configured with full permissions across all modules and cannot be
                  edited.
                </p>
              )}
            </Card>
          )}
        </div>
      )}
      </div>

      {/* ── User Detail Modal/Overlay ── */}
      {selectedUserForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-gray-50/40">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold ${getAvatarColor(selectedUserForDetail.name)}`}>
                  {getInitials(selectedUserForDetail.name)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{selectedUserForDetail.name}</h3>
                  <p className="text-xs text-gray-400 flex items-center gap-1"><Mail size={10} /> {selectedUserForDetail.email}</p>
                </div>
              </div>
              <button onClick={() => setSelectedUserForDetail(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Contact Card (read-only) */}
            <div className="px-6 py-4">
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 bg-gray-50/30">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail size={14} className="text-gray-400" />
                    <span className="font-medium">{selectedUserForDetail.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Phone size={14} />
                    <span className="italic">Not available</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <MapPin size={14} />
                    <span className="italic">Not available</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Award size={14} className="text-gray-400" />
                    <span className="font-medium">{getPositionFromRoles(selectedUserForDetail.roles)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Position Selector */}
            <div className="px-6 pb-4">
              <div className="flex items-end gap-3">
                <div className="flex-1 max-w-xs">
                  <Select label="Position" value={formViewPosition} onChange={(e) => setFormViewPosition(e.target.value)}>
                    <option value="System Administrator">System Administrator</option>
                    <option value="Sales Manager">Sales Manager</option>
                    <option value="Purchase Manager">Purchase Manager</option>
                    <option value="Production Manager">Production Manager</option>
                    <option value="Inventory Manager">Inventory Manager</option>
                  </Select>
                </div>
                <Btn size="sm" onClick={handleSaveUserPosition} disabled={savingUser}>
                  {savingUser ? <RefreshCw size={14} className="animate-spin-slow" /> : <Check size={14} />} Save Position
                </Btn>
              </div>
            </div>

            {/* Module Tabs */}
            <div className="px-6 border-b border-gray-100">
              <div className="flex gap-0">
                {(['sales', 'purchase', 'manufacturing', 'product', 'inventory'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveFormViewTab(tab)}
                    className={`px-4 py-2.5 text-xs font-medium border-b-2 transition capitalize cursor-pointer ${
                      activeFormViewTab === tab
                        ? 'border-sky-500 text-sky-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Permission Grid */}
            <div className="px-6 py-4">
              {loadingOverrides ? (
                <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
                  <RefreshCw size={16} className="animate-spin-slow" />
                  <span className="text-sm">Loading permissions…</span>
                </div>
              ) : activeFormViewTab === 'inventory' ? (
                <div className="text-center py-8">
                  <div className="p-3 rounded-full bg-cyan-50 text-cyan-500 inline-flex mb-3">
                    <Shield size={20} />
                  </div>
                  <p className="text-sm font-medium text-gray-700">Inventory Permissions</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Inventory permissions are derived from the user&apos;s position and cannot be individually configured.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="flex items-center gap-2 mb-3 text-[11px] text-gray-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Blue dot = overridden from role default</span>
                    <span className="ml-3 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300 inline-block" /> Greyed = system-computed, not editable</span>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-gray-50/80 to-gray-50/40 text-left text-xs text-gray-500 font-semibold uppercase tracking-wider border-b border-gray-100">
                        <th className="px-4 py-3">Field</th>
                        <th className="px-4 py-3 text-center">Create</th>
                        <th className="px-4 py-3 text-center">View</th>
                        <th className="px-4 py-3 text-center">Edit</th>
                        <th className="px-4 py-3 text-center">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {getFieldPermissions(formViewPosition, activeFormViewTab).map((row, idx) => {
                        const renderEditableCell = (action: 'create' | 'view' | 'edit' | 'delete', val: string | boolean) => {
                          const isLocked = isSystemField(val);
                          const override = getOverrideForCell(activeFormViewTab, row.field, action);
                          const hasOverride = override !== undefined;
                          const effectiveAllowed = hasOverride ? override.allowed : (val === true || val === '✓');

                          if (isLocked) {
                            return renderPermissionCell(val);
                          }

                          return (
                            <button
                              title={hasOverride ? `Override active — click to toggle (role default: ${val === true || val === '✓' ? 'allowed' : 'denied'})` : 'Click to override'}
                              onClick={() => handleToggleOverride(activeFormViewTab, row.field, action, val)}
                              className="relative inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 hover:scale-110 cursor-pointer"
                            >
                              {hasOverride && (
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-500 border border-white z-10" />
                              )}
                              {effectiveAllowed ? (
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded ${hasOverride ? 'bg-emerald-200 ring-2 ring-emerald-400' : 'bg-emerald-100'} text-emerald-700 text-xs font-bold shadow-sm`}>✓</span>
                              ) : (
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded ${hasOverride ? 'bg-red-200 ring-2 ring-red-400' : 'bg-red-100'} text-red-700 text-xs font-bold shadow-sm`}>✗</span>
                              )}
                            </button>
                          );
                        };

                        return (
                          <tr key={row.field} className="hover:bg-sky-50/30 transition-colors duration-150" style={{ animationDelay: `${idx * 20}ms` }}>
                            <td className="px-4 py-2.5 font-medium text-gray-800 text-xs">{row.field}</td>
                            <td className="px-4 py-2.5 text-center">{renderEditableCell('create', row.create)}</td>
                            <td className="px-4 py-2.5 text-center">{renderEditableCell('view', row.view)}</td>
                            <td className="px-4 py-2.5 text-center">{renderEditableCell('edit', row.edit)}</td>
                            <td className="px-4 py-2.5 text-center">{renderEditableCell('delete', row.delete)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-2 rounded-b-2xl">
              <div className="flex items-center gap-2">
                {pendingOverrides.length > 0 && (
                  <button
                    onClick={handleResetOverrides}
                    disabled={savingOverrides}
                    className="text-xs text-rose-500 hover:text-rose-700 hover:underline cursor-pointer disabled:opacity-50 flex items-center gap-1 transition"
                  >
                    <RefreshCw size={11} />
                    Reset to Role Defaults ({pendingOverrides.length} override{pendingOverrides.length !== 1 ? 's' : ''})
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {hasOverrideChanges && (
                  <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                    Unsaved changes
                  </span>
                )}
                <Btn variant="secondary" size="sm" onClick={() => setSelectedUserForDetail(null)}>
                  Cancel
                </Btn>
                <Btn
                  size="sm"
                  onClick={handleSaveOverrides}
                  disabled={savingOverrides || !hasOverrideChanges}
                >
                  {savingOverrides ? <RefreshCw size={13} className="animate-spin-slow" /> : <Check size={13} />}
                  Save Permissions
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
