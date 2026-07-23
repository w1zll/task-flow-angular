import { alpha } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

interface TaskCardSxParams {
  isDragging: boolean;
  isHighlighted: boolean;
  isCardPending: boolean;
  isCompleted?: boolean;
  canEdit: boolean;
  priorityColor: string;
}

export const getTaskCardSx = ({
  isDragging,
  isHighlighted,
  isCardPending,
  isCompleted,
  canEdit,
  priorityColor,
}: TaskCardSxParams): SxProps<Theme> => ({
  mb: 1,
  border: '1px solid',
  borderColor: isHighlighted
    ? 'primary.main'
    : isDragging
      ? 'primary.main'
      : isCompleted
        ? 'success.light'
        : 'divider',
  bgcolor: isCompleted
    ? (theme) => alpha(theme.palette.success.main, 0.06)
    : 'background.paper',
  cursor: isCardPending ? 'progress' : canEdit ? 'grab' : 'pointer',
  '&:active': {
    cursor: isCardPending ? 'progress' : canEdit ? 'grabbing' : 'pointer',
  },
  '&:focus-visible': {
    outline: (theme) =>
      `3px solid ${alpha(theme.palette.primary.main, 0.42)}`,
    outlineOffset: 2,
  },
  transform: isDragging ? 'rotate(2deg)' : 'none',
  transition:
    'transform 0.15s, box-shadow 0.15s, opacity 0.15s, border-color 0.15s',
  position: 'relative',
  overflow: isCardPending ? 'hidden' : 'visible',
  opacity: isCardPending ? 0.78 : 1,
  scrollMargin: 96,
  boxShadow: isHighlighted
    ? (theme) =>
        `0 0 0 3px ${alpha(
          theme.palette.primary.main,
          0.28,
        )}, 0 14px 34px ${alpha(theme.palette.primary.main, 0.18)}`
    : undefined,
  animation: isCardPending
    ? 'taskCardPendingPulse 1.15s ease-in-out infinite'
    : isHighlighted
      ? 'taskCardHighlightPulse 1s ease-in-out 3'
      : undefined,
  '&::before': {
    content: '""',
    position: 'absolute',
    left: 0,
    top: 4,
    bottom: 4,
    width: 3,
    bgcolor: priorityColor,
    borderRadius: '0 2px 2px 0',
  },
  '&::after': isCardPending
    ? {
        content: '""',
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: (theme) =>
          `linear-gradient(90deg, transparent 0%, ${alpha(
            theme.palette.action.hover,
            0.9,
          )} 50%, transparent 100%)`,
        transform: 'translateX(-100%)',
        animation: 'taskCardPending 1.35s ease-in-out infinite',
      }
    : undefined,
  '@keyframes taskCardPending': {
    '0%': { transform: 'translateX(-100%)' },
    '100%': { transform: 'translateX(100%)' },
  },
  '@keyframes taskCardPendingPulse': {
    '0%': { boxShadow: '0 0 0 0 rgba(34, 197, 94, 0.26)' },
    '70%': { boxShadow: '0 0 0 7px rgba(34, 197, 94, 0)' },
    '100%': { boxShadow: '0 0 0 0 rgba(34, 197, 94, 0)' },
  },
  '@keyframes taskCardHighlightPulse': {
    '0%': {
      transform: 'scale(1)',
    },
    '50%': {
      transform: 'scale(1.025)',
    },
    '100%': {
      transform: 'scale(1)',
    },
  },
});
