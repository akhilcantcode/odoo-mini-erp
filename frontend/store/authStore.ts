import { create } from 'zustand';

interface UserProfile {
  id: string;
  name: string;
  roles: string[];
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  setAuth: (user: UserProfile | null, token: string | null) => void;
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

export const useAuthStore = create<AuthState>((set) => ({
  user: getInitialUser(),
  token: getLocalStorageItem('erp_token'),
  setAuth: (user, token) => {
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('erp_token', token);
      } else {
        localStorage.removeItem('erp_token');
      }
      if (user) {
        localStorage.setItem('erp_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('erp_user');
      }
    }
    set({ user, token });
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('erp_token');
      localStorage.removeItem('erp_user');
    }
    set({ user: null, token: null });
  },
}));
