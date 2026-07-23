'use client';

import type { AuthUser } from '@/shared/store/auth.store';

const AUTH_USER_STORAGE_KEY = 'taskflow.authUser';

const canUseStorage = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const readStoredAuthUser = () => {
  if (!canUseStorage()) return null;

  try {
    const value = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);
    return value ? (JSON.parse(value) as AuthUser) : null;
  } catch {
    return null;
  }
};

export const writeStoredAuthUser = (user: AuthUser | null) => {
  if (!canUseStorage()) return;

  try {
    if (user) {
      window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    }
  } catch {
    // Storage can be unavailable in private or hardened browser modes.
  }
};
