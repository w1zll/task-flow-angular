'use client';

import type { ThemeMode } from '@/shared/store/theme.store';
import { alpha, createTheme } from '@mui/material/styles';
import type { Theme, ThemeOptions } from '@mui/material/styles';

const primaryByMode: Record<ThemeMode, string> = {
  light: '#669266',
  dark: '#6aac6a',
};

const createGlobalScrollbarStyles = (theme: Theme) => {
  const thumb = alpha(theme.palette.text.primary, 0.24);
  const thumbHover = alpha(theme.palette.text.primary, 0.36);
  const scrollbarColor = `${alpha(theme.palette.text.primary, 0.28)} transparent`;

  return {
    html: {
      overflowY: 'scroll',
      scrollbarWidth: 'thin',
      scrollbarColor,
    },
    '*': {
      scrollbarWidth: 'thin',
      scrollbarColor,
    },
    '*::-webkit-scrollbar': {
      width: 8,
      height: 8,
    },
    '*::-webkit-scrollbar-track': {
      backgroundColor: 'transparent',
    },
    '*::-webkit-scrollbar-thumb': {
      backgroundColor: thumb,
      borderRadius: 999,
      border: '2px solid transparent',
      backgroundClip: 'content-box',
    },
    '*::-webkit-scrollbar-thumb:hover': {
      backgroundColor: thumbHover,
    },
    '@media (prefers-reduced-motion: reduce)': {
      '*, *::before, *::after': {
        animationDuration: '0.01ms !important',
        animationIterationCount: '1 !important',
        scrollBehavior: 'auto !important',
        transitionDuration: '0.01ms !important',
      },
    },
  };
};

const createPalette = (mode: ThemeMode): ThemeOptions['palette'] => {
  const isDark = mode === 'dark';
  const primaryMain = primaryByMode[mode];

  return {
    mode,
    primary: {
      main: primaryMain,
      contrastText: isDark ? '#202124' : '#ffffff',
    },
    secondary: {
      main: isDark ? '#9aa0a6' : '#64748b',
      contrastText: isDark ? '#202124' : '#ffffff',
    },
    error: { main: isDark ? '#f87171' : '#dc2626' },
    warning: { main: isDark ? '#fbbf24' : '#d97706' },
    success: { main: isDark ? '#34d399' : '#059669' },
    info: { main: isDark ? '#60a5fa' : '#2563eb' },
    background: isDark
      ? {
          default: '#202124',
          paper: '#292a2d',
        }
      : {
          default: '#f8fafc',
          paper: '#ffffff',
        },
    text: isDark
      ? {
          primary: '#f1f3f4',
          secondary: '#bdc1c6',
        }
      : {
          primary: '#172033',
          secondary: '#64748b',
        },
    divider: isDark
      ? 'rgba(255,255,255,0.10)'
      : 'rgba(15,23,42,0.12)',
    ...(isDark
      ? {
          action: {
            active: '#bdc1c6',
            hover: 'rgba(255,255,255,0.06)',
            selected: 'rgba(255,255,255,0.10)',
            disabled: 'rgba(255,255,255,0.30)',
            disabledBackground: 'rgba(255,255,255,0.08)',
            focus: 'rgba(255,255,255,0.12)',
            hoverOpacity: 0.06,
            selectedOpacity: 0.1,
            disabledOpacity: 0.38,
            focusOpacity: 0.12,
            activatedOpacity: 0.12,
          },
        }
      : {}),
  };
};

const createComponents = (
  mode: ThemeMode,
  primaryMain: string,
): ThemeOptions['components'] => {
  const isDark = mode === 'dark';

  return {
    MuiCssBaseline: {
      styleOverrides: (theme) => ({
        ...createGlobalScrollbarStyles(theme),
        body: {
          '--taskflow-primary-glow': alpha(
            primaryMain,
            isDark ? 0.26 : 0.18,
          ),
        },
      }),
    },
    MuiModal: {
      defaultProps: {
        disableScrollLock: true,
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 6,
          '&.MuiButton-containedPrimary': {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: `0 2px 8px ${alpha(primaryMain, isDark ? 0.2 : 0.24)}`,
            },
          },
        },
      },
    },
    MuiButtonBase: {
      styleOverrides: {
        root: ({ theme }) => ({
          '&.Mui-focusVisible': {
            outline: `3px solid ${alpha(theme.palette.primary.main, 0.42)}`,
            outlineOffset: 2,
          },
        }),
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          border: isDark
            ? '1px solid rgba(255,255,255,0.08)'
            : '1px solid rgba(15,23,42,0.08)',
          boxShadow: isDark
            ? '0 1px 2px rgba(0,0,0,0.24)'
            : '0 1px 3px rgba(15,23,42,0.08)',
          '&:hover': {
            boxShadow: isDark
              ? '0 3px 10px rgba(0,0,0,0.28)'
              : '0 4px 12px rgba(15,23,42,0.10)',
          },
          transition: 'box-shadow 0.2s ease',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 4, fontWeight: 500 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 6 },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: { borderRadius: 6 },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: { borderRadius: 6 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 6 },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 6 },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { borderRadius: 4 },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        rounded: { borderRadius: 6 },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
  };
};

export const createAppTheme = (mode: ThemeMode) => {
  const primaryMain = primaryByMode[mode];

  return createTheme({
    palette: createPalette(mode),
    typography: {
      fontFamily: '"DM Sans", "Inter", sans-serif',
      h1: { fontWeight: 700, letterSpacing: '-0.02em' },
      h2: { fontWeight: 700, letterSpacing: '-0.02em' },
      h3: { fontWeight: 600 },
      h4: { fontWeight: 600 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
    },
    shape: { borderRadius: 6 },
    components: createComponents(mode, primaryMain),
  });
};

export const lightTheme = createAppTheme('light');
export const darkTheme = createAppTheme('dark');
