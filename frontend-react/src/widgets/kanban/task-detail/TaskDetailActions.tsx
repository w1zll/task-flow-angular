'use client';

import { Delete, Save } from '@mui/icons-material';
import { Box, Button, DialogActions, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';

interface TaskDetailActionsProps {
  canEdit: boolean;
  canDelete?: boolean;
  isDirty: boolean;
  isUpdating: boolean;
  onClose: () => void;
  onDelete: () => void;
  onSave: () => void;
}

const TaskDetailActions = ({
  canEdit,
  canDelete = canEdit,
  isDirty,
  isUpdating,
  onClose,
  onDelete,
  onSave,
}: TaskDetailActionsProps) => {
  const t = useTranslations('TaskDetail');

  return (
    <DialogActions
      sx={{
        px: { xs: 2, sm: 3 },
        py: 2,
        justifyContent: 'space-between',
        flexDirection: { xs: 'column-reverse', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'center' },
        gap: 1.5,
      }}
    >
      {canEdit ? (
        <Button
          color="error"
          startIcon={<Delete />}
          onClick={onDelete}
          disabled={!canDelete}
          size="small"
        >
          {t('deleteTask')}
        </Button>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {t('readOnly')}
        </Typography>
      )}
      <Box
        sx={{
          display: 'flex',
          gap: 1.25,
          justifyContent: { xs: 'stretch', sm: 'flex-end' },
          alignItems: 'center',
          '& > button': {
            minHeight: { xs: 44, sm: 32 },
            flex: { xs: 1, sm: '0 0 auto' },
          },
        }}
      >
        <Button onClick={onClose} size="small">
          {canEdit ? t('cancel') : t('close')}
        </Button>
        {canEdit && (
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={onSave}
            disabled={!isDirty || isUpdating}
            size="small"
            sx={{
              minWidth: { xs: 0, sm: 116 },
              '& .MuiButton-startIcon': { mr: 0.75 },
            }}
          >
            {isUpdating ? t('saving') : t('save')}
          </Button>
        )}
      </Box>
    </DialogActions>
  );
};

export default TaskDetailActions;
