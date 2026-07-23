'use client';

import { Add } from '@mui/icons-material';
import { Box, Button, TextField } from '@mui/material';
import { useTranslations } from 'next-intl';

interface AddTaskComposerProps {
  isAddingTask: boolean;
  canEditBoardContent: boolean;
  newTaskTitle: string;
  isCreating: boolean;
  onTitleChange: (title: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onStartAdding: () => void;
}

const AddTaskComposer = ({
  isAddingTask,
  canEditBoardContent,
  newTaskTitle,
  isCreating,
  onTitleChange,
  onSubmit,
  onCancel,
  onStartAdding,
}: AddTaskComposerProps) => {
  const t = useTranslations('KanbanColumn');

  if (!canEditBoardContent) return null;

  if (isAddingTask) {
    return (
      <Box sx={{ px: 1.5, pb: 1.5 }}>
        <TextField
          autoFocus
          size="small"
          fullWidth
          multiline
          maxRows={4}
          placeholder={t('taskPlaceholder')}
          value={newTaskTitle}
          onChange={(event) => onTitleChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              onSubmit();
            }
            if (event.key === 'Escape') onCancel();
          }}
          sx={{ mb: 1 }}
        />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            size="small"
            onClick={onSubmit}
            disabled={isCreating}
          >
            {t('add')}
          </Button>
          <Button size="small" onClick={onCancel}>
            {t('cancel')}
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ px: 1.5, pb: 1.5 }}>
      <Button
        size="small"
        startIcon={<Add />}
        onClick={onStartAdding}
        sx={{
          width: '100%',
          justifyContent: 'flex-start',
          color: 'text.secondary',
        }}
      >
        {t('addTask')}
      </Button>
    </Box>
  );
};

export default AddTaskComposer;
