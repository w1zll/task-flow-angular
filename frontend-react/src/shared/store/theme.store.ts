'use client';

import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark';

const defaultMode: ThemeMode = 'dark';
const themeCookieName = 'theme';
const themeMaxAge = 60 * 60 * 24 * 365;

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  hasHydrated: boolean;
  initialize: (serverMode: ThemeMode) => void;
  setMode: (mode: ThemeMode) => void;
  toggle: (currentMode?: ThemeMode) => void;
}

const isThemeMode = (value: string | null | undefined): value is ThemeMode =>
  value === 'light' || value === 'dark';

const getCookieMode = (): ThemeMode | null => {
  if (typeof document === 'undefined') return null;

  const cookieValue = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${themeCookieName}=`))
    ?.split('=')[1];

  return isThemeMode(cookieValue) ? cookieValue : null;
};

const getStoredMode = (serverMode: ThemeMode): ThemeMode => {
  if (typeof window === 'undefined') return serverMode;

  const cookieMode = getCookieMode();
  if (cookieMode) return cookieMode;

  const savedMode = localStorage.getItem(themeCookieName);
  return isThemeMode(savedMode) ? savedMode : serverMode;
};

const persistMode = (mode: ThemeMode) => {
  if (typeof window === 'undefined') return;

  localStorage.setItem(themeCookieName, mode);
  document.cookie = `${themeCookieName}=${mode}; path=/; max-age=${themeMaxAge}; SameSite=Lax`;
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: defaultMode,
  isDark: defaultMode === 'dark',
  hasHydrated: false,
  initialize: (serverMode) => {
    const mode = getStoredMode(serverMode);

    persistMode(mode);
    set({ mode, isDark: mode === 'dark', hasHydrated: true });
  },
  setMode: (mode) => {
    persistMode(mode);
    set({ mode, isDark: mode === 'dark', hasHydrated: true });
  },
  toggle: (currentMode) => {
    const nextMode = (currentMode ?? get().mode) === 'light' ? 'dark' : 'light';

    persistMode(nextMode);
    set({ mode: nextMode, isDark: nextMode === 'dark', hasHydrated: true });
  },
}));
