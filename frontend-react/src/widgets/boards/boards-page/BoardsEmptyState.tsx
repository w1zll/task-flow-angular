'use client';

import { Add, ViewKanban } from '@mui/icons-material';
import { Box, Button, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';

interface BoardsEmptyStateProps {
  titleKey: 'emptyWorkspaceTitle' | 'emptyTitle';
  actionKey: 'emptyAction' | 'newWorkspace';
  onAction: () => void;
  disabled?: boolean;
}

const BoardsEmptyState = ({
  titleKey,
  actionKey,
  onAction,
  disabled = false,
}: BoardsEmptyStateProps) => {
  const t = useTranslations('Boards');

  return (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      <ViewKanban sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {t(titleKey)}
      </Typography>
      <Button
        variant="contained"
        startIcon={<Add />}
        onClick={onAction}
        disabled={disabled}
        sx={{ mt: 1 }}
      >
        {t(actionKey)}
      </Button>
    </Box>
  );
};

export default BoardsEmptyState;
