'use client';

import type { Task } from '@/shared/api/api';
import {
  FormControlLabel,
  Switch,
  TextField,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import type { PatchTaskField, TaskDraft } from './types';

interface TaskTitleDescriptionFieldsProps {
  form: TaskDraft;
  canEdit: boolean;
  onPatch: PatchTaskField;
}

const TaskTitleDescriptionFields = ({
  form,
  canEdit,
  onPatch,
}: TaskTitleDescriptionFieldsProps) => {
  const t = useTranslations('TaskDetail');

  return (
    <>
      <TextField
        autoFocus={canEdit}
        label={t('title')}
        fullWidth
        value={form.title ?? ''}
        disabled={!canEdit}
        onChange={(event) => onPatch('title', event.target.value as Task['title'])}
        slotProps={{ htmlInput: { style: { fontWeight: 600 } } }}
      />

      <FormControlLabel
        control={
          <Switch
            checked={!!form.isCompleted}
            disabled={!canEdit}
            onChange={(event) =>
              onPatch('isCompleted', event.target.checked as Task['isCompleted'])
            }
            color="success"
          />
        }
        label={t('completed')}
        sx={{
          alignSelf: 'flex-start',
          m: 0,
          '& .MuiFormControlLabel-label': {
            fontSize: 14,
            fontWeight: 500,
          },
        }}
      />

      <TextField
        label={t('description')}
        fullWidth
        multiline
        rows={3}
        value={form.description ?? ''}
        disabled={!canEdit}
        onChange={(event) =>
          onPatch('description', event.target.value as Task['description'])
        }
        placeholder={t('descriptionPlaceholder')}
      />
    </>
  );
};

export default TaskTitleDescriptionFields;
