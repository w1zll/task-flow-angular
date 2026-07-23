'use client';

import { create } from 'zustand';
import { writeStoredAuthUser } from '@/shared/lib/auth-session';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  activeWorkspaceId?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  hydrate: (user: AuthUser | null) => void;
  logout: () => void;
  setActiveWorkspace: (workspaceId: string | null) => void;
}

const areAuthUsersEqual = (left: AuthUser | null, right: AuthUser | null) =>
  left === right ||
  (left !== null &&
    right !== null &&
    left.id === right.id &&
    left.email === right.email &&
    left.name === right.name &&
    left.avatar === right.avatar &&
    left.activeWorkspaceId === right.activeWorkspaceId);

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  setUser: (user) => {
    writeStoredAuthUser(user);
    set({ user, isAuthenticated: user !== null });
  },
  setLoading: (loading) => set({ isLoading: loading }),
  hydrate: (user) =>
    set((state) => {
      if (!state.isLoading && areAuthUsersEqual(state.user, user)) {
        return state;
      }

      writeStoredAuthUser(user);
      return {
        user,
        isLoading: false,
        isAuthenticated: user !== null,
      };
    }),
  logout: () => {
    writeStoredAuthUser(null);
    set({ user: null, isAuthenticated: false });
  },
  setActiveWorkspace: (activeWorkspaceId) =>
    set((state) => {
      const user = state.user ? { ...state.user, activeWorkspaceId } : null;
      writeStoredAuthUser(user);
      return { user };
    }),
}));
