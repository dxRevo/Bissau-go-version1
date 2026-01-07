import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  init: () => void;
}

const getStoredAuth = () => {
  if (typeof window === 'undefined') {
    return { user: null, token: null };
  }
  try {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      return { user: parsed.user || null, token: parsed.token || null };
    }
  } catch (e) {
    // Ignore
  }
  return { user: null, token: null };
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  init: () => {
    const { user, token } = getStoredAuth();
    if (user && token) {
      set({ user, token, isAuthenticated: true });
    }
  },

  setAuth: (user: User, token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth-storage', JSON.stringify({ user, token }));
    }
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth-storage');
    }
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
