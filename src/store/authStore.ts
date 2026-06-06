import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '@shared/types';

interface AuthState {
  user: User | null;
  token: string | null;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  hasRole: (roles: UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      login: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
      isAuthenticated: () => !!get().token,
      hasRole: (roles) => {
        const user = get().user;
        if (!user) return false;
        return roles.includes(user.role);
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
