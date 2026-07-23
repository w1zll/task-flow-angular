import { alpha } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

export const getColumnPaperSx = (isDragging: boolean): SxProps<Theme> => ({
  width: 280,
  flexShrink: 0,
  bgcolor: (theme) =>
    theme.palette.mode === 'dark'
      ? alpha(theme.palette.background.paper, isDragging ? 0.95 : 0.8)
      : alpha(theme.palette.grey[100], isDragging ? 1 : 0.8),
  border: '1px solid',
  borderColor: isDragging ? 'primary.main' : 'divider',
  borderRadius: '6px',
  display: 'flex',
  flexDirection: 'column',
  transition: 'border-color 0.15s',
});

export const getDropAreaSx = (isDraggingOver: boolean): SxProps<Theme> => ({
  flex: '0 1 auto',
  overflow: 'visible',
  px: 1.5,
  pb: 1,
  minHeight: 60,
  bgcolor: isDraggingOver
    ? (theme) => alpha(theme.palette.primary.main, 0.04)
    : 'transparent',
  transition: 'background-color 0.15s',
  borderRadius: '4px',
});
