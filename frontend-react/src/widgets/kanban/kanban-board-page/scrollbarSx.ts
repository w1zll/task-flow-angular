import { alpha } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

export const subtleScrollbarSx: SxProps<Theme> = {
  scrollbarWidth: 'thin',
  scrollbarColor: (theme) =>
    `${alpha(theme.palette.text.primary, 0.28)} transparent`,
  '&::-webkit-scrollbar': {
    height: 8,
  },
  '&::-webkit-scrollbar-track': {
    bgcolor: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    bgcolor: (theme) => alpha(theme.palette.text.primary, 0.24),
    borderRadius: 999,
    border: '2px solid transparent',
    backgroundClip: 'content-box',
  },
  '&::-webkit-scrollbar-thumb:hover': {
    bgcolor: (theme) => alpha(theme.palette.text.primary, 0.36),
  },
};
