'use client';

import { Close } from '@mui/icons-material';
import { Box, DialogTitle, IconButton, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';

interface TaskDetailHeaderProps {
  columnTitle: string;
  onClose: () => void;
}

const TaskDetailHeader = ({
  columnTitle,
  onClose,
}: TaskDetailHeaderProps) => {
  const t = useTranslations('TaskDetail');

  return (
    <DialogTitle
      sx={{ pb: 1, display: 'flex', alignItems: 'flex-start', gap: 1 }}
    >
      <Box sx={{ flex: 1 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mb: 0.5 }}
        >
          {t('inColumn', { column: columnTitle })}
        </Typography>
      </Box>
      <IconButton
        size="small"
        onClick={onClose}
        aria-label={t('close')}
        sx={{ mt: -0.5, width: { xs: 44, sm: 32 }, height: { xs: 44, sm: 32 } }}
      >
        <Close fontSize="small" />
      </IconButton>
    </DialogTitle>
  );
};

export default TaskDetailHeader;
