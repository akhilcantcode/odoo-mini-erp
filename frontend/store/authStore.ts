import { create } from 'zustand';

export interface UserPermissionOverride {
  module: string;
  field: string;
  action: string;
  allowed: boolean;
}

interface UserProfile {
  id: string;
  name: string;
  roles: string[];
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  refreshToken: string | null;
  overrides: UserPermissionOverride[];
  setAuth: (user: UserProfile | null, token: string | null, refreshToken?: string | null) => void;
  setToken: (token: string) => void; // silent access-token update after refresh
  setOverrides: (overrides: UserPermissionOverride[]) => void;
  logout: () => void;
}

// SSR safe helper to get item from localStorage
const getLocalStorageItem = (key: string): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(key);
  }
  return null;
};

const getInitialUser = (): UserProfile | null => {
  const userStr = getLocalStorageItem('erp_user');
  if (userStr) {
    try {
      return JSON.parse(userStr) as UserProfile;
    } catch {
      return null;
    }
  }
  return null;
};

const getInitialOverrides = (): UserPermissionOverride[] => {
  const overridesStr = getLocalStorageItem('erp_overrides');
  if (overridesStr) {
    try {
      return JSON.parse(overridesStr) as UserPermissionOverride[];
    } catch {
      return [];
    }
  }
  return [];
};

export const useAuthStore = create<AuthState>((set) => ({
  user: getInitialUser(),
  token: getLocalStorageItem('erp_token'),
  refreshToken: getLocalStorageItem('erp_refresh_token'),
  overrides: getInitialOverrides(),

  setAuth: (user, token, refreshToken = null) => {
    if (typeof window !== 'undefined') {
      // Access token
      if (token) {
        localStorage.setItem('erp_token', token);
      } else {
        localStorage.removeItem('erp_token');
      }
      // Refresh token
      if (refreshToken) {
        localStorage.setItem('erp_refresh_token', refreshToken);
      } else {
        localStorage.removeItem('erp_refresh_token');
      }
      // User profile
      if (user) {
        localStorage.setItem('erp_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('erp_user');
      }
    }
    set({ user, token, refreshToken });
  },

  // Called silently after a background token refresh — only updates the access token
  setToken: (token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('erp_token', token);
    }
    set({ token });
  },

  setOverrides: (overrides: UserPermissionOverride[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('erp_overrides', JSON.stringify(overrides));
    }
    set({ overrides });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('erp_token');
      localStorage.removeItem('erp_refresh_token');
      localStorage.removeItem('erp_user');
      localStorage.removeItem('erp_overrides');
    }
    set({ user: null, token: null, refreshToken: null, overrides: [] });
  },
}));

